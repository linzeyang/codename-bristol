import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { api } from '../api/client';
import type { Track, TrackDetail } from '../api/types';
import {
  clampIndex,
  cycleRepeat,
  episodeToItem,
  formatTime,
  restoredOrder,
  shuffledWithCurrent,
  trackToItem,
  type NowPlayingTab,
  type QueueItem,
  type RepeatMode,
} from '../lib/player';
import { useAuth } from './AuthContext';
import { useSettings } from './SettingsContext';
import { useToast } from './ToastContext';

const PLAYER_KEY = 'sy:player';

interface PersistedPlayer {
  queue: QueueItem[];
  originalQueue: QueueItem[];
  index: number;
  shuffle: boolean;
  volume: number;
  muted: boolean;
}

function loadPersisted(): PersistedPlayer {
  try {
    const raw = localStorage.getItem(PLAYER_KEY);
    if (!raw) throw new Error('empty');
    const parsed = JSON.parse(raw) as Partial<PersistedPlayer>;
    const queue = Array.isArray(parsed.queue)
      ? parsed.queue.slice(0, 100).map((item) => ({ ...item, reason: undefined }))
      : [];
    const originalQueue = Array.isArray(parsed.originalQueue)
      ? parsed.originalQueue.slice(0, 100).map((item) => ({ ...item, reason: undefined }))
      : queue;
    return {
      queue,
      originalQueue,
      index: clampIndex(Number(parsed.index ?? 0), queue.length),
      shuffle: Boolean(parsed.shuffle),
      volume: typeof parsed.volume === 'number' ? Math.max(0, Math.min(1, parsed.volume)) : 0.8,
      muted: Boolean(parsed.muted),
    };
  } catch {
    return { queue: [], originalQueue: [], index: 0, shuffle: false, volume: 0.8, muted: false };
  }
}

interface PlayerContextValue {
  queue: QueueItem[];
  index: number;
  current: QueueItem | null;
  isPlaying: boolean;
  position: number;
  duration: number;
  volume: number;
  muted: boolean;
  shuffle: boolean;
  repeat: RepeatMode;
  currentLiked: boolean;
  nowPlayingOpen: boolean;
  nowPlayingTab: NowPlayingTab;
  playItems: (items: QueueItem[], startIndex?: number, options?: { autoOpen?: boolean }) => void;
  playTracks: (tracks: Track[], startIndex?: number) => void;
  playEpisodes: (episodes: Parameters<typeof episodeToItem>[0][], startIndex?: number) => void;
  toggle: () => void;
  next: () => void;
  previous: () => void;
  seek: (seconds: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  cycleRepeatMode: () => void;
  addToQueue: (items: QueueItem[]) => void;
  playNext: (items: QueueItem[]) => void;
  removeAt: (position: number) => void;
  move: (from: number, to: number) => void;
  clearUpcoming: () => void;
  jumpTo: (position: number) => void;
  toggleLikeCurrent: () => Promise<void>;
  openNowPlaying: (tab?: NowPlayingTab) => void;
  closeNowPlaying: () => void;
  setNowPlayingTab: (tab: NowPlayingTab) => void;
  timeLabel: string;
  durationLabel: string;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { settings } = useSettings();
  const { show } = useToast();

  const initialRef = useRef<PersistedPlayer | null>(null);
  if (!initialRef.current) initialRef.current = loadPersisted();
  const initial = initialRef.current;

  const [queue, setQueue] = useState<QueueItem[]>(initial.queue);
  const [originalQueue, setOriginalQueue] = useState<QueueItem[]>(initial.originalQueue);
  const [index, setIndex] = useState(initial.index);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(initial.volume);
  const [muted, setMuted] = useState(initial.muted);
  const [shuffle, setShuffle] = useState(initial.shuffle);
  const [repeat, setRepeat] = useState<RepeatMode>('off');
  const [nowPlayingOpen, setNowPlayingOpen] = useState(false);
  const [nowPlayingTab, setNowPlayingTabState] = useState<NowPlayingTab>('lyrics');

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const current = queue[index] ?? null;
  const currentKey = current?.key;
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;
  const recordedKeys = useRef<Set<string>>(new Set());
  const lastErrorKey = useRef<string | null>(null);
  const currentKeyRef = useRef<string | undefined>(currentKey);
  currentKeyRef.current = currentKey;
  const showRef = useRef(show);
  showRef.current = show;

  const safePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    void audio.play().catch((error: unknown) => {
      if ((error as Error)?.name === 'AbortError') return;
      setIsPlaying(false);
    });
  }, []);

  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'metadata';
    audioRef.current = audio;
    const onTime = () => setPosition(audio.currentTime);
    const onMeta = () => setDuration(audio.duration || 0);
    const onError = () => {
      if (lastErrorKey.current === currentKeyRef.current) return;
      lastErrorKey.current = currentKeyRef.current ?? null;
      setIsPlaying(false);
      showRef.current('音频加载失败，请检查网络后重试', 'error');
    };
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('loadedmetadata', onMeta);
    audio.addEventListener('error', onError);
    return () => {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('loadedmetadata', onMeta);
      audio.removeEventListener('error', onError);
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !current) return;
    if (audio.dataset.itemKey !== current.key) {
      audio.dataset.itemKey = current.key;
      audio.src = current.audioUrl;
      audio.currentTime = 0;
      lastErrorKey.current = null;
      setPosition(0);
      setDuration(current.durationSec || 0);
      if (isPlayingRef.current) safePlay();
    }
  }, [current, currentKey, safePlay]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !current) return;
    if (isPlaying) {
      safePlay();
    } else {
      audio.pause();
    }
  }, [isPlaying, current, currentKey, safePlay]);

  const effectiveVolume = useMemo(() => {
    const base = muted ? 0 : volume;
    return Math.max(0, Math.min(1, base * (settings.normalizeVolume ? 0.95 : 1)));
  }, [muted, volume, settings.normalizeVolume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.volume = effectiveVolume;
  }, [effectiveVolume, currentKey]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const handleEnded = () => {
      if (repeat === 'one') {
        audio.currentTime = 0;
        safePlay();
        return;
      }
      if (index + 1 < queue.length) {
        setIndex(index + 1);
        setIsPlaying(true);
        return;
      }
      if (repeat === 'all' && queue.length > 0) {
        setIndex(0);
        setIsPlaying(true);
        return;
      }
      if (settings.autoplaySimilar && current?.track) {
        const trackId = current.track.id;
        api
          .get<TrackDetail>(`/tracks/${trackId}`)
          .then((detail) => {
            const existing = new Set(queue.map((item) => item.key));
            const additions = detail.related
              .map((track) => trackToItem(track))
              .filter((item) => !existing.has(item.key))
              .slice(0, 6);
            if (additions.length === 0) {
              setIsPlaying(false);
              return;
            }
            setQueue((previous) => [...previous, ...additions]);
            setOriginalQueue((previous) => [...previous, ...additions]);
            setIndex(index + 1);
            setIsPlaying(true);
            show('已按你的播放偏好续上相似曲目', 'info');
          })
          .catch(() => setIsPlaying(false));
        return;
      }
      setIsPlaying(false);
    };
    audio.addEventListener('ended', handleEnded);
    return () => audio.removeEventListener('ended', handleEnded);
  }, [repeat, queue, index, settings.autoplaySimilar, current, show, safePlay]);

  useEffect(() => {
    if (!isPlaying || !current?.track || !user || settings.privateSession) return;
    if (recordedKeys.current.has(current.key)) return;
    const timer = window.setTimeout(() => {
      recordedKeys.current.add(current.key);
      api.post('/history', { trackId: current.track!.id }).catch(() => {});
    }, 4000);
    return () => window.clearTimeout(timer);
  }, [isPlaying, current, currentKey, user, settings.privateSession]);

  useEffect(() => {
    const clearForLogout = () => {
      const audio = audioRef.current;
      if (audio) {
        audio.pause();
        audio.removeAttribute('src');
        audio.dataset.itemKey = '';
      }
      setQueue([]);
      setOriginalQueue([]);
      setIndex(0);
      setIsPlaying(false);
      setNowPlayingOpen(false);
      recordedKeys.current.clear();
      localStorage.removeItem('sy:player');
    };
    window.addEventListener('sy:logout', clearForLogout);
    return () => window.removeEventListener('sy:logout', clearForLogout);
  }, []);

  useEffect(() => {
    const payload: PersistedPlayer = {
      queue: queue.slice(0, 100),
      originalQueue: originalQueue.slice(0, 100),
      index,
      shuffle,
      volume,
      muted,
    };
    try {
      localStorage.setItem(PLAYER_KEY, JSON.stringify(payload));
    } catch {
      // 本地存储已满时静默忽略，播放不受影响
    }
  }, [queue, originalQueue, index, shuffle, volume, muted]);

  const openNowPlaying = useCallback((tab: NowPlayingTab = 'lyrics') => {
    setNowPlayingTabState(tab);
    setNowPlayingOpen(true);
  }, []);

  const closeNowPlaying = useCallback(() => setNowPlayingOpen(false), []);

  const playItems = useCallback(
    (items: QueueItem[], startIndex = 0, options?: { autoOpen?: boolean }) => {
      if (items.length === 0) return;
      const safeIndex = clampIndex(startIndex, items.length);
      const target = items[safeIndex];
      if (target && target.key === current?.key) {
        const audio = audioRef.current;
        if (audio) {
          audio.currentTime = 0;
          safePlay();
        }
        setIsPlaying(true);
        const wide = window.matchMedia?.('(min-width: 1100px)').matches;
        if (options?.autoOpen !== false && wide && settings.showNowPlaying) {
          openNowPlaying('lyrics');
        }
        return;
      }
      setQueue(items);
      setOriginalQueue(items);
      setIndex(safeIndex);
      setIsPlaying(true);
      const wide = window.matchMedia?.('(min-width: 1100px)').matches;
      if (options?.autoOpen !== false && wide && settings.showNowPlaying) {
        openNowPlaying('lyrics');
      }
    },
    [current?.key, openNowPlaying, settings.showNowPlaying, safePlay],
  );

  const playTracks = useCallback(
    (tracks: Track[], startIndex = 0) => playItems(tracks.map((track) => trackToItem(track)), startIndex),
    [playItems],
  );

  const playEpisodes = useCallback(
    (episodes: Parameters<typeof episodeToItem>[0][], startIndex = 0) =>
      playItems(episodes.map((episode) => episodeToItem(episode)), startIndex),
    [playItems],
  );

  const toggle = useCallback(() => {
    if (!current) return;
    setIsPlaying((previous) => !previous);
  }, [current]);

  const seek = useCallback((seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    const next = Math.max(0, Math.min(audio.duration || seconds, seconds));
    audio.currentTime = next;
    setPosition(next);
  }, []);

  const next = useCallback(() => {
    if (queue.length === 0) return;
    if (index + 1 < queue.length) {
      setIndex(index + 1);
      setIsPlaying(true);
    } else if (repeat === 'all') {
      setIndex(0);
      setIsPlaying(true);
    } else {
      const audio = audioRef.current;
      if (audio) audio.currentTime = 0;
      setPosition(0);
      setIsPlaying(false);
    }
  }, [queue.length, index, repeat]);

  const previous = useCallback(() => {
    const audio = audioRef.current;
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0;
      setPosition(0);
      return;
    }
    if (index > 0) {
      setIndex(index - 1);
      setIsPlaying(true);
    } else if (audio) {
      audio.currentTime = 0;
      setPosition(0);
    }
  }, [index]);

  const setVolume = useCallback((value: number) => {
    setVolumeState(Math.max(0, Math.min(1, value)));
    if (value > 0) setMuted(false);
  }, []);

  const toggleMute = useCallback(() => setMuted((previous) => !previous), []);

  const toggleShuffle = useCallback(() => {
    if (shuffle) {
      const restored = restoredOrder(originalQueue, current?.key);
      setQueue(restored.queue);
      setIndex(restored.index);
      setShuffle(false);
      show('已关闭随机播放', 'info');
    } else {
      const snapshot = queue;
      const shuffled = shuffledWithCurrent(snapshot, index);
      setOriginalQueue(snapshot);
      setQueue(shuffled.queue);
      setIndex(shuffled.index);
      setShuffle(true);
      show('已开启随机播放', 'info');
    }
  }, [shuffle, originalQueue, current?.key, queue, index, show]);

  const cycleRepeatMode = useCallback(() => {
    const nextMode = cycleRepeat(repeat);
    setRepeat(nextMode);
    show(nextMode === 'off' ? '循环已关闭' : nextMode === 'all' ? '循环：全部曲目' : '循环：单曲', 'info');
  }, [repeat, show]);

  const addToQueue = useCallback(
    (items: QueueItem[]) => {
      if (items.length === 0) return;
      const existing = new Set(queue.map((item) => item.key));
      const additions = items.filter((item) => !existing.has(item.key));
      if (additions.length === 0) {
        show('这些曲目已经在队列里了', 'info');
        return;
      }
      setQueue([...queue, ...additions]);
      setOriginalQueue([...originalQueue, ...additions]);
      show(`已加入队列（${additions.length}）`, 'success');
    },
    [queue, originalQueue, show],
  );

  const playNext = useCallback(
    (items: QueueItem[]) => {
      if (items.length === 0) return;
      const existing = new Set(queue.map((item) => item.key));
      const additions = items.filter((item) => !existing.has(item.key));
      if (additions.length === 0) {
        show('这些曲目已经在队列里了', 'info');
        return;
      }
      setQueue((previous) => [...previous.slice(0, index + 1), ...additions, ...previous.slice(index + 1)]);
      setOriginalQueue((previous) => {
        const currentKey = queue[index]?.key;
        const at = currentKey ? previous.findIndex((item) => item.key === currentKey) : previous.length - 1;
        return [...previous.slice(0, at + 1), ...additions, ...previous.slice(at + 1)];
      });
      show('已设为下一首播放', 'success');
    },
    [queue, index, show],
  );

  const removeAt = useCallback(
    (position: number) => {
      const removed = queue[position];
      if (!removed) return;
      const newQueue = queue.filter((_, i) => i !== position);
      setQueue(newQueue);
      setOriginalQueue((previous) => previous.filter((item) => item.key !== removed.key));
      if (position === index) {
        setIsPlaying(false);
        setIndex(clampIndex(index, newQueue.length));
      } else if (position < index) {
        setIndex(index - 1);
      }
      show('已从队列移除', 'info');
    },
    [queue, index, show],
  );

  const move = useCallback(
    (from: number, to: number) => {
      if (from === to || from < 0 || to < 0 || from >= queue.length || to >= queue.length) return;
      const nextQueue = [...queue];
      const [item] = nextQueue.splice(from, 1);
      if (!item) return;
      nextQueue.splice(to, 0, item);
      const currentKey = queue[index]?.key;
      setQueue(nextQueue);
      const nextIndex = currentKey ? nextQueue.findIndex((entry) => entry.key === currentKey) : 0;
      setIndex(nextIndex < 0 ? 0 : nextIndex);
    },
    [queue, index],
  );

  const clearUpcoming = useCallback(() => {
    const currentItem = queue[index];
    if (!currentItem) return;
    setQueue(queue.slice(0, index + 1));
    setOriginalQueue((previous) => {
      const at = previous.findIndex((item) => item.key === currentItem.key);
      return at < 0 ? previous : previous.slice(0, at + 1);
    });
    show('已清空待播队列', 'info');
  }, [queue, index, show]);

  const jumpTo = useCallback((position: number) => {
    if (position < 0 || position >= queue.length) return;
    setIndex(position);
    setIsPlaying(true);
  }, [queue.length]);

  const toggleLikeCurrent = useCallback(async () => {
    if (!current?.track) {
      show('播客单集暂不支持收藏', 'info');
      return;
    }
    if (!user) {
      show('登录后即可收藏喜欢的歌', 'info');
      return;
    }
    try {
      const response = await api.post<{ liked: boolean }>(`/likes/${current.track.id}`);
      const update = (items: QueueItem[]) =>
        items.map((item) =>
          item.track?.id === current.track!.id
            ? { ...item, track: { ...item.track!, liked: response.liked } }
            : item,
        );
      setQueue(update);
      setOriginalQueue(update);
      show(response.liked ? '已加入「喜欢」' : '已取消喜欢', 'success');
    } catch {
      show('操作失败，请稍后再试', 'error');
    }
  }, [current, user, show]);

  const setNowPlayingTab = useCallback((tab: NowPlayingTab) => setNowPlayingTabState(tab), []);

  const value = useMemo<PlayerContextValue>(
    () => ({
      queue,
      index,
      current,
      isPlaying,
      position,
      duration,
      volume,
      muted,
      shuffle,
      repeat,
      currentLiked: current?.track?.liked ?? false,
      nowPlayingOpen,
      nowPlayingTab,
      playItems,
      playTracks,
      playEpisodes,
      toggle,
      next,
      previous,
      seek,
      setVolume,
      toggleMute,
      toggleShuffle,
      cycleRepeatMode,
      addToQueue,
      playNext,
      removeAt,
      move,
      clearUpcoming,
      jumpTo,
      toggleLikeCurrent,
      openNowPlaying,
      closeNowPlaying,
      setNowPlayingTab,
      timeLabel: formatTime(position),
      durationLabel: formatTime(duration || current?.durationSec || 0),
    }),
    [
      queue, index, current, isPlaying, position, duration, volume, muted, shuffle, repeat,
      nowPlayingOpen, nowPlayingTab, playItems, playTracks, playEpisodes, toggle, next, previous,
      seek, setVolume, toggleMute, toggleShuffle, cycleRepeatMode, addToQueue, playNext, removeAt,
      move, clearUpcoming, jumpTo, toggleLikeCurrent, openNowPlaying, closeNowPlaying, setNowPlayingTab,
    ],
  );

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer(): PlayerContextValue {
  const context = useContext(PlayerContext);
  if (!context) throw new Error('usePlayer must be used within PlayerProvider');
  return context;
}