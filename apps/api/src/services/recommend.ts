import type { Db } from '../db/types.js';
import type { TrackDTO } from '../types.js';
import { queryTracks } from './catalog.js';

export const GENRE_LABELS: Record<string, string> = {
  'indie-pop': '独立流行',
  'post-rock': '后摇',
  folk: '民谣',
  electronic: '电子',
  'dream-pop': '梦幻流行',
  'singer-songwriter': '唱作',
  'hip-hop': '说唱',
  rock: '摇滚',
  ambient: '氛围',
  'city-pop': '城市流行',
};

export function genreLabel(genre: string): string {
  return GENRE_LABELS[genre] ?? genre;
}

export interface Tuner {
  familiarity: number;
  energy: number;
  novelty: number;
}

export interface Recommendation {
  track: TrackDTO;
  reason: string;
}

interface Signals {
  likedTrackIds: Set<string>;
  likedGenres: Set<string>;
  followedArtistIds: Set<string>;
  playedArtistIds: Set<string>;
  recentTrackIds: Set<string>;
  genreAffinity: Map<string, number>;
  artistAffinity: Map<string, number>;
  hasSignals: boolean;
}

async function collectSignals(db: Db, userId: string, tracks: TrackDTO[]): Promise<Signals> {
  const [likes, follows, plays] = await Promise.all([
    db.query<{ track_id: string }>('SELECT track_id FROM likes WHERE user_id = $1', [userId]),
    db.query<{ artist_id: string; genre: string }>(
      `SELECT f.artist_id, ar.genre FROM follows f JOIN artists ar ON ar.id = f.artist_id WHERE f.user_id = $1`,
      [userId],
    ),
    db.query<{ track_id: string; artist_id: string; genre: string; played_at: string | Date }>(
      `SELECT p.track_id, t.artist_id, t.genre, p.played_at
       FROM plays p JOIN tracks t ON t.id = p.track_id
       WHERE p.user_id = $1 AND p.played_at > now() - interval '60 days'
       ORDER BY p.played_at DESC LIMIT 200`,
      [userId],
    ),
  ]);

  const trackMap = new Map(tracks.map((t) => [t.id, t]));
  const likedTrackIds = new Set(likes.rows.map((r) => r.track_id));
  const likedGenres = new Set<string>();
  const genreAffinity = new Map<string, number>();
  const artistAffinity = new Map<string, number>();
  const followedArtistIds = new Set(follows.rows.map((r) => r.artist_id));
  const playedArtistIds = new Set<string>();
  const recentTrackIds = new Set<string>();

  const bump = (map: Map<string, number>, key: string, amount: number) => {
    map.set(key, (map.get(key) ?? 0) + amount);
  };

  for (const trackId of likedTrackIds) {
    const track = trackMap.get(trackId);
    if (!track) continue;
    likedGenres.add(track.genre);
    bump(genreAffinity, track.genre, 3);
    bump(artistAffinity, track.artist.id, 2);
  }
  for (const row of follows.rows) {
    bump(genreAffinity, row.genre, 2);
    bump(artistAffinity, row.artist_id, 2.5);
  }
  const recentCutoff = Date.now() - 7 * 24 * 3600 * 1000;
  for (const row of plays.rows) {
    bump(genreAffinity, row.genre, 0.7);
    bump(artistAffinity, row.artist_id, 0.8);
    playedArtistIds.add(row.artist_id);
    if (new Date(row.played_at).getTime() > recentCutoff) recentTrackIds.add(row.track_id);
  }

  return {
    likedTrackIds,
    likedGenres,
    followedArtistIds,
    playedArtistIds,
    recentTrackIds,
    genreAffinity,
    artistAffinity,
    hasSignals: likedTrackIds.size + follows.rows.length + plays.rows.length > 0,
  };
}

function reasonFor(track: TrackDTO, signals: Signals): string {
  if (signals.followedArtistIds.has(track.artist.id)) {
    return `因为你关注了 ${track.artist.name}`;
  }
  if (signals.likedGenres.has(track.genre)) {
    return `因为你喜欢${genreLabel(track.genre)}`;
  }
  if (signals.playedArtistIds.has(track.artist.id)) {
    return `最近常听 ${track.artist.name}`;
  }
  const mood = track.moods[0];
  return mood ? `编辑精选 · ${mood}` : '编辑精选';
}

export function recommendTracks(
  tracks: TrackDTO[],
  signals: Signals | null,
  tuner: Tuner,
  limit = 10,
): Recommendation[] {
  const familiarity = Math.max(0, Math.min(1, tuner.familiarity));
  const targetEnergy = Math.max(0, Math.min(1, tuner.energy));
  const novelty = Math.max(0, Math.min(1, tuner.novelty));
  const maxGenre = Math.max(1, ...(signals ? [...signals.genreAffinity.values()] : [1]));
  const maxArtist = Math.max(1, ...(signals ? [...signals.artistAffinity.values()] : [1]));

  const scored = tracks.map((track) => {
    const genreAffinity = signals ? (signals.genreAffinity.get(track.genre) ?? 0) / maxGenre : 0;
    const artistAffinity = signals ? (signals.artistAffinity.get(track.artist.id) ?? 0) / maxArtist : 0;
    const energyFit = 1 - Math.abs(track.energy - targetEnergy);
    const popularity = Math.log10(track.plays + 1) / 7;
    const recentlyPlayed = signals?.recentTrackIds.has(track.id) ? 0.45 : 0;
    const score =
      genreAffinity * (0.35 + familiarity) * 0.9 +
      artistAffinity * 0.3 +
      energyFit * 0.45 +
      (1 - novelty) * popularity * 0.55 +
      novelty * (1 - popularity) * 0.35 -
      recentlyPlayed;
    return { track, score };
  });

  scored.sort((a, b) => b.score - a.score || a.track.title.localeCompare(b.track.title, 'zh'));

  const picks: Recommendation[] = [];
  const perArtist = new Map<string, number>();
  for (const entry of scored) {
    const count = perArtist.get(entry.track.artist.id) ?? 0;
    if (count >= 2) continue;
    perArtist.set(entry.track.artist.id, count + 1);
    picks.push({
      track: entry.track,
      reason: signals?.hasSignals ? reasonFor(entry.track, signals) : '编辑精选 · 为你开场',
    });
    if (picks.length >= limit) break;
  }
  return picks;
}

export async function personalizedPicks(
  db: Db,
  userId: string,
  tuner: Tuner,
  limit = 10,
): Promise<Recommendation[]> {
  const tracks = await queryTracks(db, userId, { limit: 200 });
  const signals = await collectSignals(db, userId, tracks);
  return recommendTracks(tracks, signals, tuner, limit);
}

export async function guestPicks(db: Db, tuner: Tuner, limit = 10): Promise<Recommendation[]> {
  const tracks = await queryTracks(db, null, { limit: 200 });
  return recommendTracks(tracks, null, tuner, limit);
}