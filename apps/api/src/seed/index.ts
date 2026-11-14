import type { Db } from '../db/types.js';
import { hashPassword } from '../auth/passwords.js';
import {
  EDITORIAL_PLAYLISTS,
  LYRICS_POOLS,
  SEED_ALBUMS,
  SEED_ARTISTS,
  SEED_PODCASTS,
} from './data.js';

function hash(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

const POOL_KEYS = Object.keys(LYRICS_POOLS) as (keyof typeof LYRICS_POOLS)[];

function buildLyrics(albumIndex: number, trackIndex: number): { t: number; text: string }[] {
  const pool = LYRICS_POOLS[POOL_KEYS[albumIndex % POOL_KEYS.length]!]!;
  return Array.from({ length: 8 }, (_, i) => ({
    t: Math.round(i * 5.4 * 10) / 10,
    text: pool[(i + trackIndex * 2) % pool.length]!,
  }));
}

export interface SeedOptions {
  force?: boolean;
  log?: (message: string) => void;
}

export interface SeedSummary {
  seeded: boolean;
  tracks: number;
}

export async function seedDatabase(db: Db, options: SeedOptions = {}): Promise<SeedSummary> {
  const log = options.log ?? (() => {});
  const countResult = await db.query<{ count: string }>('SELECT count(*)::text AS count FROM tracks');
  const existingTracks = Number(countResult.rows[0]?.count ?? 0);
  if (existingTracks > 0 && !options.force) {
    log(`目录已有 ${existingTracks} 首曲目，跳过种子。`);
    return { seeded: false, tracks: existingTracks };
  }

  const [demoHash, adminHash] = await Promise.all([
    hashPassword('demo1234'),
    hashPassword('admin1234'),
  ]);

  const trackCatalog: { id: string; moods: string[]; artistId: string; albumId: string; energy: number; playCount: number }[] = [];

  await db.transaction(async (tx) => {
    for (const artist of SEED_ARTISTS) {
      await tx.query(
        `INSERT INTO artists (id, name, genre, bio, monthly_listeners, origin, accent, accent2, art_seed)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (id) DO NOTHING`,
        [artist.id, artist.name, artist.genre, artist.bio, artist.monthlyListeners, artist.origin, artist.accent, artist.accent2, artist.artSeed],
      );
    }

    for (const [albumIndex, album] of SEED_ALBUMS.entries()) {
      await tx.query(
        `INSERT INTO albums (id, artist_id, title, year, type, description, accent, accent2, art_seed)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (id) DO NOTHING`,
        [album.id, album.artistId, album.title, album.year, album.type, album.description, album.accent, album.accent2, album.artSeed],
      );
      const artist = SEED_ARTISTS.find((a) => a.id === album.artistId)!;
      const slug = album.id.replace(/^al-/, '');

      for (const [trackIndex, title] of album.tracks.entries()) {
        const trackId = `tr-${slug}-${trackIndex + 1}`;
        const energy = clamp01(album.energy + ((trackIndex % 3) - 1) * 0.07);
        const playCount = Math.floor(artist.monthlyListeners / 9) + (hash(trackId) % Math.max(1, Math.floor(artist.monthlyListeners / 3)));
        const audioKey = `loop-${String(((albumIndex + trackIndex) % 8) + 1).padStart(2, '0')}`;
        const moods = [...new Set([...album.moods, trackIndex % 2 === 0 ? '夜晚' : '白天'])];
        await tx.query(
          `INSERT INTO tracks
             (id, album_id, artist_id, title, duration_sec, track_no, audio_key, play_count, genre, moods, energy, lyrics, is_explicit)
           VALUES ($1,$2,$3,$4,45,$5,$6,$7,$8,$9,$10,$11::jsonb,false)
           ON CONFLICT (id) DO NOTHING`,
          [
            trackId,
            album.id,
            album.artistId,
            title,
            trackIndex + 1,
            audioKey,
            playCount,
            artist.genre,
            moods,
            energy,
            JSON.stringify(buildLyrics(albumIndex, trackIndex)),
          ],
        );
        trackCatalog.push({ id: trackId, moods, artistId: album.artistId, albumId: album.id, energy, playCount });
      }
    }

    for (const [podcastIndex, podcast] of SEED_PODCASTS.entries()) {
      await tx.query(
        `INSERT INTO podcasts (id, title, publisher, description, category, accent, accent2, art_seed)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (id) DO NOTHING`,
        [podcast.id, podcast.title, podcast.publisher, podcast.description, podcast.category, podcast.accent, podcast.accent2, podcast.artSeed],
      );
      for (const [episodeIndex, episode] of podcast.episodes.entries()) {
        const published = new Date(Date.now() - episode.daysAgo * 24 * 3600 * 1000);
        await tx.query(
          `INSERT INTO episodes (id, podcast_id, title, description, duration_sec, episode_no, published_at, audio_key)
           VALUES ($1,$2,$3,$4,45,$5,$6,$7) ON CONFLICT (id) DO NOTHING`,
          [
            `ep-${podcast.id.replace(/^pod-/, '')}-${episodeIndex + 1}`,
            podcast.id,
            episode.title,
            episode.description,
            podcast.episodes.length - episodeIndex,
            published,
            `loop-${String(((podcastIndex + episodeIndex) % 8) + 1).padStart(2, '0')}`,
          ],
        );
      }
    }

    await tx.query(
      `INSERT INTO users (id, email, password_hash, display_name, role, plan_id, avatar_hue)
       VALUES
         ('u-demo','demo@shengyu.app',$1,'小岛听众','listener','free',18),
         ('u-admin','admin@shengyu.app',$2,'内容管理员','admin','studio',168)
       ON CONFLICT (id) DO NOTHING`,
      [demoHash, adminHash],
    );
    await tx.query(
      `INSERT INTO user_settings (user_id, theme) VALUES ('u-demo','light'), ('u-admin','dark')
       ON CONFLICT (user_id) DO NOTHING`,
    );

    for (const demo of EDITORIAL_PLAYLISTS) {
      await tx.query(
        `INSERT INTO playlists (id, owner_id, title, description, is_editorial, accent, accent2, art_seed)
         VALUES ($1, NULL, $2, $3, true, $4, $5, $6) ON CONFLICT (id) DO NOTHING`,
        [demo.id, demo.title, demo.description, demo.accent, demo.accent2, demo.artSeed],
      );
      const matches = trackCatalog.filter((t) => t.moods.some((mood) => demo.moods.includes(mood)));
      const pool = matches.length >= 6 ? matches : [...matches, ...trackCatalog.filter((t) => !matches.includes(t))];
      const chosen = pool.slice(0, 8);
      for (const [position, track] of chosen.entries()) {
        await tx.query(
          `INSERT INTO playlist_tracks (playlist_id, track_id, position)
           VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
          [demo.id, track.id, position],
        );
      }
    }

    await tx.query(
      `INSERT INTO playlists (id, owner_id, title, description, is_editorial, accent, accent2, art_seed)
       VALUES ('pl-demo-night','u-demo','我的夜路','下班后绕远路回家的五首歌。',false,'#2B2B2B','#E8A33D',71)
       ON CONFLICT (id) DO NOTHING`,
    );
    const demoPlaylistTracks = ['tr-chaoxi-1', 'tr-yehang-1', 'tr-boli-2', 'tr-shenlan-3', 'tr-gonglu-2'];
    for (const [position, trackId] of demoPlaylistTracks.entries()) {
      await tx.query(
        `INSERT INTO playlist_tracks (playlist_id, track_id, position)
         VALUES ('pl-demo-night',$1,$2) ON CONFLICT DO NOTHING`,
        [trackId, position],
      );
    }

    for (const trackId of ['tr-chaoxi-1', 'tr-jiucheng-3', 'tr-rixiao-1', 'tr-shenlan-2']) {
      await tx.query(
        `INSERT INTO likes (user_id, track_id) VALUES ('u-demo',$1) ON CONFLICT DO NOTHING`,
        [trackId],
      );
    }
    for (const artistId of ['ar-linwanxing', 'ar-beiwei30', 'ar-lanjing']) {
      await tx.query(
        `INSERT INTO follows (user_id, artist_id) VALUES ('u-demo',$1) ON CONFLICT DO NOTHING`,
        [artistId],
      );
    }
    const demoPlays = ['tr-chaoxi-1', 'tr-yehang-2', 'tr-shanji-1', 'tr-jiucheng-2', 'tr-shuimian-2', 'tr-xiari-1', 'tr-haiyan-1'];
    for (const [index, trackId] of demoPlays.entries()) {
      const playedAt = new Date(Date.now() - (index + 1) * 5 * 3600 * 1000);
      await tx.query(
        `INSERT INTO plays (user_id, track_id, played_at) VALUES ('u-demo',$1,$2)`,
        [trackId, playedAt],
      );
    }
    await tx.query(
      `INSERT INTO search_history (user_id, query, searched_at) VALUES
         ('u-demo','深夜', now() - interval '2 hours'),
         ('u-demo','林晚星', now() - interval '1 day')`,
    );
    await tx.query(
      `INSERT INTO subscription_events (user_id, plan_id, action) VALUES ('u-admin','studio','seed')`,
    );
    await tx.query(
      `INSERT INTO meta (key, value) VALUES ('seed_version','1') ON CONFLICT (key) DO UPDATE SET value = excluded.value`,
    );
  });

  log(`种子完成：${SEED_ARTISTS.length} 位音乐人 / ${SEED_ALBUMS.length} 张专辑 / ${trackCatalog.length} 首曲目。`);
  return { seeded: true, tracks: trackCatalog.length };
}