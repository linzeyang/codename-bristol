import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAdmin, requireUser } from '../auth/session.js';
import { newId } from '../lib/id.js';
import { parse } from '../lib/http.js';
import { HttpError } from '../db/types.js';
import { queryTracks, trackById } from '../services/catalog.js';

const createTrackSchema = z.object({
  title: z.string().trim().min(1).max(80),
  albumId: z.string().trim().min(1).max(80),
  trackNo: z.number().int().min(1).max(99).optional(),
  audioKey: z.enum(['loop-01', 'loop-02', 'loop-03', 'loop-04', 'loop-05', 'loop-06', 'loop-07', 'loop-08']),
  genre: z.string().trim().min(1).max(40).optional(),
  moods: z.array(z.string().trim().min(1).max(12)).max(6).default([]),
  energy: z.number().min(0).max(1).default(0.5),
  isExplicit: z.boolean().default(false),
});

const updateTrackSchema = createTrackSchema.partial();

async function trackOrThrow(app: FastifyInstance, id: string) {
  const track = await trackById(app.db, null, id);
  if (!track) throw new HttpError(404, '曲目不存在', 'not_found');
  return track;
}

export async function adminRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('onRequest', async (request) => {
    requireUser(request);
    requireAdmin(request.user);
  });

  app.get('/admin/overview', async () => {
    const { rows } = await app.db.query<{
      tracks: string;
      artists: string;
      albums: string;
      users: string;
      playlists: string;
      podcasts: string;
    }>(
      `SELECT
         (SELECT count(*) FROM tracks) AS tracks,
         (SELECT count(*) FROM artists) AS artists,
         (SELECT count(*) FROM albums) AS albums,
         (SELECT count(*) FROM users) AS users,
         (SELECT count(*) FROM playlists) AS playlists,
         (SELECT count(*) FROM podcasts) AS podcasts`,
    );
    const row = rows[0]!;
    return {
      counts: {
        tracks: Number(row.tracks),
        artists: Number(row.artists),
        albums: Number(row.albums),
        users: Number(row.users),
        playlists: Number(row.playlists),
        podcasts: Number(row.podcasts),
      },
    };
  });

  app.get('/admin/tracks', async (request) => {
    const { q } = z.object({ q: z.string().trim().max(80).default('') }).parse(request.query);
    const tracks = q
      ? await queryTracks(app.db, null, { search: q, limit: 200, order: 'popular' })
      : await queryTracks(app.db, null, { limit: 200, order: 'album' });
    return { tracks };
  });

  app.get('/admin/albums', async () => {
    const { rows } = await app.db.query<{ id: string; title: string; artist_name: string }>(
      `SELECT al.id, al.title, ar.name AS artist_name FROM albums al JOIN artists ar ON ar.id = al.artist_id
       ORDER BY ar.name ASC, al.year DESC`,
    );
    return { albums: rows };
  });

  app.post('/admin/tracks', async (request, reply) => {
    const body = parse(createTrackSchema, request.body);
    const album = await app.db.query<{ artist_id: string; genre: string }>(
      `SELECT al.artist_id, ar.genre FROM albums al JOIN artists ar ON ar.id = al.artist_id WHERE al.id = $1`,
      [body.albumId],
    );
    const albumRow = album.rows[0];
    if (!albumRow) throw new HttpError(404, '专辑不存在', 'not_found');
    const nextNo = await app.db.query<{ next_no: number }>(
      'SELECT COALESCE(max(track_no), 0) + 1 AS next_no FROM tracks WHERE album_id = $1',
      [body.albumId],
    );
    const id = newId('tr');
    await app.db.query(
      `INSERT INTO tracks
        (id, album_id, artist_id, title, duration_sec, track_no, audio_key, play_count, genre, moods, energy, lyrics, is_explicit)
       VALUES ($1,$2,$3,$4,45,$5,$6,0,$7,$8,$9,'[]'::jsonb,$10)`,
      [
        id,
        body.albumId,
        albumRow.artist_id,
        body.title,
        body.trackNo ?? nextNo.rows[0]!.next_no,
        body.audioKey,
        body.genre ?? albumRow.genre,
        body.moods,
        body.energy,
        body.isExplicit,
      ],
    );
    return reply.code(201).send({ track: await trackOrThrow(app, id) });
  });

  app.patch('/admin/tracks/:id', async (request) => {
    const { id } = request.params as { id: string };
    const body = parse(updateTrackSchema, request.body);
    const existing = await trackOrThrow(app, id);
    let artistId: string | null = null;
    if (body.albumId) {
      const album = await app.db.query<{ artist_id: string }>('SELECT artist_id FROM albums WHERE id = $1', [body.albumId]);
      if (!album.rows[0]) throw new HttpError(404, '专辑不存在', 'not_found');
      artistId = album.rows[0].artist_id;
    }
    await app.db.query(
      `UPDATE tracks SET
         title = COALESCE($2, title),
         album_id = COALESCE($3, album_id),
         artist_id = COALESCE($4, artist_id),
         track_no = COALESCE($5, track_no),
         audio_key = COALESCE($6, audio_key),
         genre = COALESCE($7, genre),
         moods = COALESCE($8, moods),
         energy = COALESCE($9, energy),
         is_explicit = COALESCE($10, is_explicit)
       WHERE id = $1`,
      [
        id,
        body.title ?? null,
        body.albumId ?? null,
        artistId,
        body.trackNo ?? null,
        body.audioKey ?? null,
        body.genre ?? null,
        body.moods ?? null,
        body.energy ?? null,
        body.isExplicit ?? null,
      ],
    );
    return { track: await trackOrThrow(app, id), artistId: existing.artist.id };
  });

  app.delete('/admin/tracks/:id', async (request) => {
    const { id } = request.params as { id: string };
    const { rowCount } = await app.db.query('DELETE FROM tracks WHERE id = $1', [id]);
    if (rowCount === 0) throw new HttpError(404, '曲目不存在', 'not_found');
    return { ok: true };
  });
}