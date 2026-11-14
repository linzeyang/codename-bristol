import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireUser } from '../auth/session.js';
import { HttpError } from '../db/types.js';
import { parse } from '../lib/http.js';
import {
  listAlbums,
  listArtists,
  listPlaylists,
  listPodcasts,
  queryTracks,
  trackById,
  tracksByIds,
} from '../services/catalog.js';

const historySchema = z.object({ trackId: z.string().trim().min(1).max(80) });

type ToggleKind = 'track' | 'artist' | 'album' | 'podcast';

const TABLES: Record<ToggleKind, string> = {
  track: 'tracks',
  artist: 'artists',
  album: 'albums',
  podcast: 'podcasts',
};

async function assertExists(app: FastifyInstance, kind: ToggleKind, id: string): Promise<void> {
  const { rowCount } = await app.db.query(`SELECT 1 FROM ${TABLES[kind]} WHERE id = $1`, [id]);
  if (rowCount === 0) throw new HttpError(404, '内容不存在', 'not_found');
}

async function toggle(
  app: FastifyInstance,
  table: 'likes' | 'follows' | 'saved_albums' | 'podcast_follows',
  column: 'track_id' | 'artist_id' | 'album_id' | 'podcast_id',
  kind: ToggleKind,
  userId: string,
  itemId: string,
): Promise<boolean> {
  await assertExists(app, kind, itemId);
  const { rowCount } = await app.db.query(
    `DELETE FROM ${table} WHERE user_id = $1 AND ${column} = $2`,
    [userId, itemId],
  );
  if (rowCount > 0) return false;
  await app.db.query(`INSERT INTO ${table} (user_id, ${column}) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [userId, itemId]);
  return true;
}

export async function libraryRoutes(app: FastifyInstance): Promise<void> {
  app.get('/library', async (request) => {
    const current = requireUser(request);
    const [likeRows, playlists, artists, albums, podcasts, recentRows] = await Promise.all([
      app.db.query<{ track_id: string }>(
        'SELECT track_id FROM likes WHERE user_id = $1 ORDER BY created_at DESC LIMIT 500',
        [current.id],
      ),
      listPlaylists(app.db, current.id, 'mine'),
      listArtists(app.db, current.id, 100),
      listAlbums(app.db, current.id, 100),
      listPodcasts(app.db, current.id),
      app.db.query<{ track_id: string }>(
        `SELECT track_id FROM plays WHERE user_id = $1 GROUP BY track_id ORDER BY max(played_at) DESC LIMIT 20`,
        [current.id],
      ),
    ]);

    const likedTracks = await tracksByIds(app.db, current.id, likeRows.rows.map((row) => row.track_id));
    const recentTracks = await tracksByIds(app.db, current.id, recentRows.rows.map((row) => row.track_id));
    const followedArtists = artists.filter((artist) => artist.following);
    const savedAlbums = albums.filter((album) => album.saved);
    const followedPodcasts = podcasts.filter((podcast) => podcast.following);

    return {
      likedTracks,
      playlists,
      followedArtists,
      savedAlbums,
      followedPodcasts,
      recentTracks,
      counts: {
        likedTracks: likedTracks.length,
        playlists: playlists.length,
        followedArtists: followedArtists.length,
        savedAlbums: savedAlbums.length,
        followedPodcasts: followedPodcasts.length,
        recentTracks: recentTracks.length,
      },
    };
  });

  app.post('/likes/:trackId', async (request) => {
    const current = requireUser(request);
    const { trackId } = request.params as { trackId: string };
    const liked = await toggle(app, 'likes', 'track_id', 'track', current.id, trackId);
    return { liked };
  });

  app.post('/follows/:artistId', async (request) => {
    const current = requireUser(request);
    const { artistId } = request.params as { artistId: string };
    const following = await toggle(app, 'follows', 'artist_id', 'artist', current.id, artistId);
    return { following };
  });

  app.post('/saved-albums/:albumId', async (request) => {
    const current = requireUser(request);
    const { albumId } = request.params as { albumId: string };
    const saved = await toggle(app, 'saved_albums', 'album_id', 'album', current.id, albumId);
    return { saved };
  });

  app.post('/podcast-follows/:podcastId', async (request) => {
    const current = requireUser(request);
    const { podcastId } = request.params as { podcastId: string };
    const following = await toggle(app, 'podcast_follows', 'podcast_id', 'podcast', current.id, podcastId);
    return { following };
  });

  app.post('/history', async (request) => {
    const current = requireUser(request);
    const body = parse(historySchema, request.body);
    const track = await trackById(app.db, current.id, body.trackId);
    if (!track) throw new HttpError(404, '曲目不存在', 'not_found');
    const settings = await app.db.query<{ private_session: boolean }>(
      'SELECT private_session FROM user_settings WHERE user_id = $1',
      [current.id],
    );
    if (settings.rows[0]?.private_session) {
      return { recorded: false, reason: 'private_session' };
    }
    await app.db.transaction(async (tx) => {
      await tx.query('INSERT INTO plays (user_id, track_id) VALUES ($1,$2)', [current.id, body.trackId]);
    });
    return { recorded: true };
  });

  app.delete('/history', async (request) => {
    const current = requireUser(request);
    await app.db.query('DELETE FROM plays WHERE user_id = $1', [current.id]);
    return { ok: true };
  });

  app.get('/liked-tracks', async (request) => {
    const current = requireUser(request);
    const { rows } = await app.db.query<{ track_id: string }>(
      'SELECT track_id FROM likes WHERE user_id = $1 ORDER BY created_at DESC',
      [current.id],
    );
    return { tracks: await tracksByIds(app.db, current.id, rows.map((row) => row.track_id)) };
  });

  app.get('/recent-tracks', async (request) => {
    const current = requireUser(request);
    const { rows } = await app.db.query<{ track_id: string }>(
      `SELECT track_id FROM plays WHERE user_id = $1 GROUP BY track_id ORDER BY max(played_at) DESC LIMIT 20`,
      [current.id],
    );
    return { tracks: await tracksByIds(app.db, current.id, rows.map((row) => row.track_id)) };
  });

  app.get('/library/search', async (request) => {
    const current = requireUser(request);
    const query = z.object({ q: z.string().trim().max(80).default('') }).parse(request.query);
    return { tracks: query.q ? await queryTracks(app.db, current.id, { search: query.q, limit: 30 }) : [] };
  });
}