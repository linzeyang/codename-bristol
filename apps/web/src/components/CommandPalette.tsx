import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { SearchResults } from '../api/types';
import { useAuth } from '../context/AuthContext';
import { usePlayer } from '../context/PlayerContext';
import { useDebouncedValue, useFetch } from '../hooks/useFetch';
import { trackToItem } from '../lib/player';
import { Modal } from './Modal';
import { CoverArt } from './CoverArt';
import {
  CommandIcon,
  CompassIcon,
  HeartIcon,
  HomeIcon,
  KeyboardIcon,
  LibraryIcon,
  PauseIcon,
  PlayIcon,
  QueueIcon,
  RadioIcon,
  SearchIcon,
  SparklesIcon,
  UserIcon,
} from './Icons';

type PaletteItem = {
  id: string;
  label: string;
  sub?: string;
  group: string;
  icon: React.ReactNode;
  action: () => void;
  art?: { seed: number; accent: string; accent2: string };
};

export function CommandPalette({
  open,
  onClose,
  onOpenShortcuts,
}: {
  open: boolean;
  onClose: () => void;
  onOpenShortcuts: () => void;
}) {
  const navigate = useNavigate();
  const player = usePlayer();
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const debounced = useDebouncedValue(query, 260);
  const { data } = useFetch<{ query: string; results: SearchResults }>(
    open && debounced.trim().length > 0 ? `/search?q=${encodeURIComponent(debounced.trim())}` : null,
    [debounced, open],
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setActiveIndex(0);
    }
  }, [open]);

  const commands: PaletteItem[] = useMemo(
    () => [
      { id: 'home', label: '发现', sub: '回到首页货架', group: '跳转', icon: <HomeIcon size={18} />, action: () => navigate('/') },
      { id: 'search', label: '搜索', sub: '歌曲、艺人、专辑、播客', group: '跳转', icon: <SearchIcon size={18} />, action: () => navigate('/search') },
      { id: 'library', label: '音乐库', sub: '喜欢、歌单与关注', group: '跳转', icon: <LibraryIcon size={18} />, action: () => navigate('/library') },
      { id: 'guide', label: '声屿向导', sub: '用一句话找歌', group: '跳转', icon: <SparklesIcon size={18} />, action: () => navigate('/guide') },
      { id: 'plans', label: '订阅方案', sub: '免费 / 靠岸 Plus / 共听 Studio', group: '跳转', icon: <RadioIcon size={18} />, action: () => navigate('/plans') },
      ...(user
        ? [{ id: 'account', label: '账户与设置', sub: user.email, group: '跳转', icon: <UserIcon size={18} />, action: () => navigate('/account') }]
        : [
            { id: 'login', label: '登录', sub: '进入你的音乐库', group: '跳转', icon: <UserIcon size={18} />, action: () => navigate('/login') },
          ]),
      {
        id: 'play',
        label: player.isPlaying ? '暂停播放' : '继续播放',
        sub: player.current ? `${player.current.title} · ${player.current.subtitle}` : '队列为空',
        group: '播放',
        icon: player.isPlaying ? <PauseIcon size={18} /> : <PlayIcon size={18} />,
        action: () => player.toggle(),
      },
      {
        id: 'queue',
        label: '打开播放队列',
        sub: `${player.queue.length} 首`,
        group: '播放',
        icon: <QueueIcon size={18} />,
        action: () => player.openNowPlaying('queue'),
      },
      {
        id: 'shortcuts',
        label: '键盘快捷键',
        sub: '按 ? 也可以打开',
        group: '帮助',
        icon: <KeyboardIcon size={18} />,
        action: onOpenShortcuts,
      },
    ],
    [navigate, onOpenShortcuts, player, user],
  );

  const results = data?.results;
  const dynamicItems: PaletteItem[] = useMemo(() => {
    if (!debounced.trim()) return [];
    const items: PaletteItem[] = [];
    items.push({
      id: 'ask',
      label: `向向导提问：「${debounced.trim()}」`,
      sub: '用自然语言描述场景或情绪',
      group: '向导',
      icon: <SparklesIcon size={18} />,
      action: () => navigate(`/guide?q=${encodeURIComponent(debounced.trim())}`),
    });
    if (!results) return items;
    for (const track of results.tracks.slice(0, 5)) {
      items.push({
        id: `track-${track.id}`,
        label: track.title,
        sub: `${track.artist.name} · ${track.album.title}`,
        group: '歌曲',
        icon: <PlayIcon size={17} />,
        art: { seed: track.album.artSeed, accent: track.album.accent, accent2: track.album.accent2 },
        action: () => player.playItems([trackToItem(track)], 0),
      });
    }
    for (const artist of results.artists.slice(0, 3)) {
      items.push({
        id: `artist-${artist.id}`,
        label: artist.name,
        sub: `音乐人 · ${artist.genre}`,
        group: '音乐人',
        icon: <UserIcon size={17} />,
        art: { seed: artist.artSeed, accent: artist.accent, accent2: artist.accent2 },
        action: () => navigate(`/artist/${artist.id}`),
      });
    }
    for (const album of results.albums.slice(0, 3)) {
      items.push({
        id: `album-${album.id}`,
        label: album.title,
        sub: `${album.artist.name} · ${album.year}`,
        group: '专辑',
        icon: <LibraryIcon size={17} />,
        art: { seed: album.artSeed, accent: album.accent, accent2: album.accent2 },
        action: () => navigate(`/album/${album.id}`),
      });
    }
    if (user) {
      for (const playlist of results.playlists.slice(0, 2)) {
        items.push({
          id: `playlist-${playlist.id}`,
          label: playlist.title,
          sub: `歌单 · ${playlist.trackCount} 首`,
          group: '歌单',
          icon: <HeartIcon size={17} />,
          action: () => navigate(`/playlist/${playlist.id}`),
        });
      }
    }
    return items;
  }, [navigate, player, results, user, debounced]);

  const items = useMemo(() => {
    const term = query.trim().toLowerCase();
    const matchedCommands = term
      ? commands.filter((command) => `${command.label}${command.sub ?? ''}`.toLowerCase().includes(term))
      : commands;
    return [...dynamicItems, ...matchedCommands];
  }, [commands, dynamicItems, query]);

  useEffect(() => {
    setActiveIndex(0);
  }, [items.length, query]);

  useEffect(() => {
    const node = listRef.current?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`);
    node?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  const run = (item: PaletteItem | undefined) => {
    if (!item) return;
    item.action();
    onClose();
  };

  const groups = items.reduce<Record<string, PaletteItem[]>>((acc, item) => {
    (acc[item.group] ??= []).push(item);
    return acc;
  }, {});
  let runningIndex = -1;

  return (
    <Modal open={open} title="命令面板" kicker="⌘K · 去任何地方" size="large" onClose={onClose} initialFocusSelector="#palette-input">
      <div className="palette">
        <div className="palette-search">
          <SearchIcon size={20} />
          <input
            id="palette-input"
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索，或直接说出你想听什么…"
            aria-label="命令面板搜索"
            aria-controls="palette-results"
            aria-activedescendant={items[activeIndex] ? `palette-item-${items[activeIndex]!.id}` : undefined}
            autoComplete="off"
            onKeyDown={(event) => {
              if (event.key === 'ArrowDown') {
                event.preventDefault();
                setActiveIndex((index) => (items.length === 0 ? 0 : (index + 1) % items.length));
              } else if (event.key === 'ArrowUp') {
                event.preventDefault();
                setActiveIndex((index) => (items.length === 0 ? 0 : (index - 1 + items.length) % items.length));
              } else if (event.key === 'Enter') {
                event.preventDefault();
                run(items[activeIndex]);
              }
            }}
          />
          <kbd>esc</kbd>
        </div>

        <div className="palette-results" id="palette-results" role="listbox" aria-label="命令与搜索结果" ref={listRef}>
          {Object.entries(groups).map(([group, groupItems]) => (
            <div key={group} className="palette-group" role="group" aria-label={group}>
              <p className="palette-group-label">{group}</p>
              {groupItems.map((item) => {
                runningIndex += 1;
                const index = runningIndex;
                return (
                  <button
                    key={item.id}
                    type="button"
                    id={`palette-item-${item.id}`}
                    role="option"
                    aria-selected={index === activeIndex}
                    data-index={index}
                    className={`palette-item${index === activeIndex ? ' is-active' : ''}`}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => run(item)}
                  >
                    <span className="palette-icon">
                      {item.art ? (
                        <CoverArt
                          seed={item.art.seed}
                          accent={item.art.accent}
                          accent2={item.art.accent2}
                          label={item.label}
                          className="palette-art"
                        />
                      ) : (
                        item.icon
                      )}
                    </span>
                    <span className="palette-text">
                      <strong>{item.label}</strong>
                      {item.sub ? <small>{item.sub}</small> : null}
                    </span>
                    <span className="palette-enter" aria-hidden="true">
                      ↵
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
          {items.length === 0 ? <p className="palette-empty">没有找到结果，试试「雨夜」或「林晚星」。</p> : null}
        </div>

        <footer className="palette-foot">
          <span><kbd>↑</kbd><kbd>↓</kbd> 移动</span>
          <span><kbd>↵</kbd> 打开</span>
          <span><kbd>esc</kbd> 关闭</span>
          <span className="palette-brand"><CommandIcon size={14} /> 声屿命令</span>
        </footer>
      </div>
    </Modal>
  );
}