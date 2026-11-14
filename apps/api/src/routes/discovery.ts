import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { HttpError } from '../db/types.js';
import { parse } from '../lib/http.js';
import { STATIONS, findStation } from '../data/stations.js';
import {
  albumDetail,
  artistDetail,
  listAlbums,
  listArtists,
  listPlaylists,
  listPodcasts,
  playlistDetail,
  podcastDetail,
  queryTracks,
  searchAll,
  trackById,
  tracksByIds,
} from '../services/catalog.js';
import { guestPicks, personalizedPicks } from '../services/recommend.js';
import type { TrackDTO } from '../types.js';

const tunerSchema = z.object({
  familiarity: z.coerce.number().min(0).max(1).default(0.55),
  energy: z.coerce.number().min(0).max(1).default(0.5),
  novelty: z.coerce.number().min(0).max(1).default(0.45),
});

const searchSchema = z.object({
  q: z.string().trim().max(100).default(''),
  type: z.enum(['all', 'tracks', 'artists', 'albums', 'playlists', 'podcasts']).default('all'),
  record: z.enum(['0', '1']).default('0'),
});

const HOT_SEARCHES = ['林晚星', '深夜', '雨天', '专注', '纸飞机', '播客'];

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 6) return '夜深了，听点轻的';
  if (hour < 12) return '早上好，先听一首';
  if (hour < 18) return '下午好，换口气';
  return '晚上好，靠岸听歌';
}

async function recentTracks(app: FastifyInstance, userId: string): Promise<TrackDTO[]> {
  const { rows } = await app.db.query<{ track_id: string }>(
    `SELECT track_id FROM plays WHERE user_id = $1 GROUP BY track_id ORDER BY max(played_at) DESC LIMIT 6`,
    [userId],
  );
  return tracksByIds(app.db, userId, rows.map((row) => row.track_id));
}

export async function discoveryRoutes(app: FastifyInstance): Promise<void> {
  app.get('/home', async (request) => {
    const tuner = parse(tunerSchema, request.query);
    const userId = request.user?.id ?? null;
    const [picks, trending, artists, releases, playlists, podcasts, continueListening] = await Promise.all([
      userId ? personalizedPicks(app.db, userId, tuner, 10) : guestPicks(app.db, tuner, 10),
      queryTracks(app.db, userId, { limit: 10, order: 'popular' }),
      listArtists(app.db, userId, 10),
      listAlbums(app.db, userId, 8),
      listPlaylists(app.db, userId, 'editorial'),
      listPodcasts(app.db, userId),
      userId ? recentTracks(app, userId) : Promise.resolve([]),
    ]);
    return {
      greeting: greeting(),
      personalized: Boolean(userId),
      tuner,
      picks,
      trending,
      artists,
      releases,
      playlists,
      podcasts,
      stations: STATIONS,
      continueListening,
    };
  });

  app.get('/search', async (request) => {
    const params = parse(searchSchema, request.query);
    const userId = request.user?.id ?? null;
    if (params.q.length === 0) {
      return { query: '', results: { tracks: [], artists: [], albums: [], playlists: [], podcasts: [] } };
    }
    if (userId && params.record === '1' && params.q.length >= 2) {
      await app.db.query('INSERT INTO search_history (user_id, query) VALUES ($1, $2)', [userId, params.q]);
      await app.db.query(
        `DELETE FROM search_history WHERE user_id = $1 AND id NOT IN (
           SELECT id FROM search_history WHERE user_id = $1 ORDER BY searched_at DESC, id DESC LIMIT 8
         )`,
        [userId],
      );
    }
    const results = await searchAll(app.db, userId, params.q, params.type);
    return { query: params.q, results };
  });

  app.get('/search/suggestions', async (request) => {
    const userId = request.user?.id ?? null;
    let recent: string[] = [];
    if (userId) {
      const { rows } = await app.db.query<{ query: string }>(
        `SELECT query FROM search_history WHERE user_id = $1 GROUP BY query ORDER BY max(searched_at) DESC LIMIT 8`,
        [userId],
      );
      recent = rows.map((row) => row.query);
    }
    return { recent, hot: HOT_SEARCHES };
  });

  app.get('/stations', async () => ({ stations: STATIONS }));

  app.get('/stations/:id', async (request) => {
    const { id } = request.params as { id: string };
    const station = findStation(id);
    if (!station) throw new HttpError(404, '电台不存在', 'not_found');
    const tracks = await queryTracks(app.db, request.user?.id ?? null, {
      moods: station.moods,
      limit: 20,
      order: 'popular',
    });
    return { station, tracks };
  });

  app.get('/artists/:id', async (request) => {
    const { id } = request.params as { id: string };
    const detail = await artistDetail(app.db, request.user?.id ?? null, id);
    if (!detail) throw new HttpError(404, '音乐人不存在', 'not_found');
    return detail;
  });

  app.get('/albums/:id', async (request) => {
    const { id } = request.params as { id: string };
    const detail = await albumDetail(app.db, request.user?.id ?? null, id);
    if (!detail) throw new HttpError(404, '专辑不存在', 'not_found');
    return detail;
  });

  app.get('/tracks/:id', async (request) => {
    const { id } = request.params as { id: string };
    const userId = request.user?.id ?? null;
    const track = await trackById(app.db, userId, id);
    if (!track) throw new HttpError(404, '曲目不存在', 'not_found');
    const [sameArtist, sameGenre] = await Promise.all([
      queryTracks(app.db, userId, { artistId: track.artist.id, limit: 8, order: 'popular' }),
      queryTracks(app.db, userId, { genre: track.genre, limit: 10, order: 'popular' }),
    ]);
    const related: TrackDTO[] = [];
    const seen = new Set<string>([track.id]);
    for (const candidate of [...sameArtist, ...sameGenre]) {
      if (seen.has(candidate.id)) continue;
      seen.add(candidate.id);
      related.push(candidate);
      if (related.length >= 8) break;
    }
    const appearsOnRows = await app.db.query<{ id: string }>(
      `SELECT DISTINCT p.id FROM playlists p JOIN playlist_tracks pt ON pt.playlist_id = p.id
       WHERE pt.track_id = $1 AND p.is_editorial = true LIMIT 6`,
      [id],
    );
    const appearsOn = [];
    for (const row of appearsOnRows.rows) {
      const detail = await playlistDetail(app.db, userId, row.id);
      if (detail && detail !== 'forbidden') appearsOn.push(detail.playlist);
    }
    return { track, related, appearsOn, album: track.album, artist: track.artist };
  });

  app.get('/playlists/:id', async (request) => {
    const { id } = request.params as { id: string };
    const detail = await playlistDetail(app.db, request.user?.id ?? null, id);
    if (detail === 'forbidden') throw new HttpError(403, '该歌单是私有的', 'forbidden');
    if (!detail) throw new HttpError(404, '歌单不存在', 'not_found');
    return detail;
  });

  app.get('/podcasts', async (request) => {
    return { podcasts: await listPodcasts(app.db, request.user?.id ?? null) };
  });

  app.get('/podcasts/:id', async (request) => {
    const { id } = request.params as { id: string };
    const detail = await podcastDetail(app.db, request.user?.id ?? null, id);
    if (!detail) throw new HttpError(404, '播客不存在', 'not_found');
    return detail;
  });
}