import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireUser } from '../auth/session.js';
import { HttpError } from '../db/types.js';
import { newId } from '../lib/id.js';
import { parse } from '../lib/http.js';
import { playlistDetail } from '../services/catalog.js';

const createSchema = z.object({
  title: z.string().trim().min(1, '请填写歌单名称').max(60, '名称最多 60 个字符'),
  description: z.string().trim().max(300, '简介最多 300 个字符').default(''),
});

const updateSchema = z.object({
  title: z.string().trim().min(1).max(60).optional(),
  description: z.string().trim().max(300).optional(),
});

const trackSchema = z.object({ trackId: z.string().trim().min(1).max(80) });

const orderSchema = z.object({
  trackIds: z.array(z.string().trim().min(1)).max(500),
});

async function assertOwner(app: FastifyInstance, playlistId: string, userId: string): Promise<void> {
  const { rows } = await app.db.query<{ owner_id: string | null; is_editorial: boolean }>(
    'SELECT owner_id, is_editorial FROM playlists WHERE id = $1',
    [playlistId],
  );
  const row = rows[0];
  if (!row) throw new HttpError(404, '歌单不存在', 'not_found');
  if (row.is_editorial || row.owner_id !== userId) {
    throw new HttpError(403, '只能编辑自己的歌单', 'forbidden');
  }
}

async function detailOrThrow(app: FastifyInstance, playlistId: string, userId: string) {
  const detail = await playlistDetail(app.db, userId, playlistId);
  if (detail === 'forbidden' || !detail) throw new HttpError(404, '歌单不存在', 'not_found');
  return detail;
}

export async function playlistRoutes(app: FastifyInstance): Promise<void> {
  app.get('/playlists', async (request) => {
    const current = requireUser(request);
    const { rows } = await app.db.query(
      `SELECT p.*, (SELECT count(*) FROM playlist_tracks pt WHERE pt.playlist_id = p.id) AS track_count
       FROM playlists p WHERE p.owner_id = $1 ORDER BY p.updated_at DESC`,
      [current.id],
    );
    return {
      playlists: rows.map((row) => {
        const r = row as Record<string, unknown>;
        return {
          id: r.id,
          title: r.title,
          description: r.description,
          trackCount: Number(r.track_count),
          accent: r.accent,
          accent2: r.accent2,
          artSeed: r.art_seed,
        };
      }),
    };
  });

  app.post('/playlists', async (request, reply) => {
    const current = requireUser(request);
    const body = parse(createSchema, request.body);
    const id = newId('pl');
    await app.db.query(
      `INSERT INTO playlists (id, owner_id, title, description, accent, accent2, art_seed)
       VALUES ($1,$2,$3,$4,'#0D6E66','#9BD1C5',$5)`,
      [id, current.id, body.title, body.description, 20 + Math.floor(Math.random() * 40)],
    );
    const detail = await detailOrThrow(app, id, current.id);
    return reply.code(201).send(detail);
  });

  app.patch('/playlists/:id', async (request) => {
    const current = requireUser(request);
    const { id } = request.params as { id: string };
    const body = parse(updateSchema, request.body);
    await assertOwner(app, id, current.id);
    await app.db.query(
      `UPDATE playlists SET title = COALESCE($2, title), description = COALESCE($3, description), updated_at = now()
       WHERE id = $1`,
      [id, body.title ?? null, body.description ?? null],
    );
    return detailOrThrow(app, id, current.id);
  });

  app.delete('/playlists/:id', async (request) => {
    const current = requireUser(request);
    const { id } = request.params as { id: string };
    await assertOwner(app, id, current.id);
    await app.db.query('DELETE FROM playlists WHERE id = $1', [id]);
    return { ok: true };
  });

  app.post('/playlists/:id/tracks', async (request) => {
    const current = requireUser(request);
    const { id } = request.params as { id: string };
    const body = parse(trackSchema, request.body);
    await assertOwner(app, id, current.id);
    const track = await app.db.query('SELECT 1 FROM tracks WHERE id = $1', [body.trackId]);
    if (track.rowCount === 0) throw new HttpError(404, '曲目不存在', 'not_found');
    const position = await app.db.query<{ next_position: number }>(
      'SELECT COALESCE(max(position), -1) + 1 AS next_position FROM playlist_tracks WHERE playlist_id = $1',
      [id],
    );
    await app.db.query(
      `INSERT INTO playlist_tracks (playlist_id, track_id, position) VALUES ($1,$2,$3)
       ON CONFLICT (playlist_id, track_id) DO NOTHING`,
      [id, body.trackId, position.rows[0]!.next_position],
    );
    await app.db.query('UPDATE playlists SET updated_at = now() WHERE id = $1', [id]);
    return detailOrThrow(app, id, current.id);
  });

  app.delete('/playlists/:id/tracks/:trackId', async (request) => {
    const current = requireUser(request);
    const { id, trackId } = request.params as { id: string; trackId: string };
    await assertOwner(app, id, current.id);
    await app.db.query('DELETE FROM playlist_tracks WHERE playlist_id = $1 AND track_id = $2', [id, trackId]);
    await app.db.query('UPDATE playlists SET updated_at = now() WHERE id = $1', [id]);
    return detailOrThrow(app, id, current.id);
  });

  app.put('/playlists/:id/order', async (request) => {
    const current = requireUser(request);
    const { id } = request.params as { id: string };
    const body = parse(orderSchema, request.body);
    await assertOwner(app, id, current.id);
    const currentTracks = await app.db.query<{ track_id: string }>(
      'SELECT track_id FROM playlist_tracks WHERE playlist_id = $1',
      [id],
    );
    const existing = new Set(currentTracks.rows.map((row) => row.track_id));
    if (body.trackIds.length !== existing.size || body.trackIds.some((trackId) => !existing.has(trackId))) {
      throw new HttpError(400, '排序列表必须包含歌单中的全部曲目且不可重复', 'invalid_order');
    }
    await app.db.transaction(async (tx) => {
      for (const [position, trackId] of body.trackIds.entries()) {
        await tx.query('UPDATE playlist_tracks SET position = $3 WHERE playlist_id = $1 AND track_id = $2', [id, trackId, position]);
      }
      await tx.query('UPDATE playlists SET updated_at = now() WHERE id = $1', [id]);
    });
    return detailOrThrow(app, id, current.id);
  });
}