import type { Episode, Track } from '../api/types';

export type RepeatMode = 'off' | 'all' | 'one';
export type NowPlayingTab = 'lyrics' | 'queue' | 'info';

export interface QueueArt {
  seed: number;
  accent: string;
  accent2: string;
}

export interface QueueItem {
  key: string;
  kind: 'track' | 'episode';
  id: string;
  title: string;
  subtitle: string;
  audioUrl: string;
  durationSec: number;
  art: QueueArt;
  artistId?: string;
  albumId?: string;
  podcastId?: string;
  track?: Track;
  episode?: Episode;
  reason?: string;
}

export function trackToItem(track: Track, reason?: string): QueueItem {
  return {
    key: `track:${track.id}`,
    kind: 'track',
    id: track.id,
    title: track.title,
    subtitle: track.artist.name,
    audioUrl: track.audioUrl,
    durationSec: track.durationSec,
    art: { seed: track.album.artSeed, accent: track.album.accent, accent2: track.album.accent2 },
    artistId: track.artist.id,
    albumId: track.album.id,
    track,
    reason,
  };
}

export function episodeToItem(episode: Episode): QueueItem {
  return {
    key: `episode:${episode.id}`,
    kind: 'episode',
    id: episode.id,
    title: episode.title,
    subtitle: episode.podcastTitle,
    audioUrl: episode.audioUrl,
    durationSec: episode.durationSec,
    art: { seed: episode.artSeed, accent: episode.accent, accent2: episode.accent2 },
    podcastId: episode.podcastId,
    episode,
  };
}

export function shuffledWithCurrent(
  queue: QueueItem[],
  index: number,
  random: () => number = Math.random,
): { queue: QueueItem[]; index: number } {
  if (queue.length <= 1) return { queue, index };
  const current = queue[index];
  if (!current) return { queue, index: 0 };
  const rest = queue.filter((_, i) => i !== index);
  for (let i = rest.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [rest[i], rest[j]] = [rest[j]!, rest[i]!];
  }
  return { queue: [current, ...rest], index: 0 };
}

export function restoredOrder(original: QueueItem[], currentKey: string | undefined): { queue: QueueItem[]; index: number } {
  if (original.length === 0) return { queue: original, index: 0 };
  const index = currentKey ? original.findIndex((item) => item.key === currentKey) : -1;
  return { queue: original, index: index < 0 ? 0 : index };
}

export function cycleRepeat(mode: RepeatMode): RepeatMode {
  if (mode === 'off') return 'all';
  if (mode === 'all') return 'one';
  return 'off';
}

export function nextRepeatLabel(mode: RepeatMode): string {
  return mode === 'off' ? '循环：关' : mode === 'all' ? '循环：全部' : '循环：单曲';
}

export function clampIndex(index: number, length: number): number {
  if (length <= 0) return 0;
  return Math.max(0, Math.min(length - 1, index));
}

export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const total = Math.floor(seconds);
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return `${minutes}:${String(rest).padStart(2, '0')}`;
}

export function playsLabel(plays: number): string {
  if (plays >= 100_000_000) return `${(plays / 100_000_000).toFixed(1)} 亿`;
  if (plays >= 10_000) return `${(plays / 10_000).toFixed(1)} 万`;
  return String(plays);
}

export function listenersLabel(count: number): string {
  if (count >= 100_000_000) return `${(count / 100_000_000).toFixed(1)} 亿`;
  if (count >= 10_000) return `${(count / 10_000).toFixed(1)} 万`;
  return String(count);
}