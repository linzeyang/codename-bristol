import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { hashPassword, verifyPassword } from '../auth/passwords.js';
import { clearSessionCookie, requireUser, setSessionCookie } from '../auth/session.js';
import { signSession } from '../auth/tokens.js';
import { toSettingsDTO, toUserDTO } from '../db/rows.js';
import { HttpError } from '../db/types.js';
import { parse } from '../lib/http.js';
import { loadSettings } from '../services/settings.js';
import { settingsFor, userById } from './auth.js';

const profileSchema = z.object({
  displayName: z.string().trim().min(1).max(24).optional(),
  avatarHue: z.number().int().min(0).max(360).optional(),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: z.string().min(8, '新密码至少 8 位').max(128),
});

const deleteSchema = z.object({
  password: z.string().min(1).max(128),
  confirmEmail: z.string().trim().toLowerCase().max(160),
});

export async function accountRoutes(app: FastifyInstance): Promise<void> {
  app.get('/me', async (request) => {
    const current = requireUser(request);
    const [user, settings] = await Promise.all([
      userById(app.db, current.id),
      loadSettings(app.db, current.id),
    ]);
    return { user: toUserDTO(user), settings };
  });

  app.patch('/me', async (request) => {
    const current = requireUser(request);
    const body = parse(profileSchema, request.body);
    const { rows } = await app.db.query(
      `UPDATE users SET display_name = COALESCE($2, display_name), avatar_hue = COALESCE($3, avatar_hue)
       WHERE id = $1 RETURNING *`,
      [current.id, body.displayName ?? null, body.avatarHue ?? null],
    );
    return { user: toUserDTO(rows[0] as never) };
  });

  app.post('/me/password', { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } }, async (request, reply) => {
    const current = requireUser(request);
    const body = parse(passwordSchema, request.body);
    const user = await userById(app.db, current.id);
    const valid = await verifyPassword(body.currentPassword, user.password_hash);
    if (!valid) throw new HttpError(400, '当前密码不正确', 'invalid_password');
    if (body.currentPassword === body.newPassword) {
      throw new HttpError(400, '新密码不能与当前密码相同', 'same_password');
    }
    const hash = await hashPassword(body.newPassword);
    const { rows } = await app.db.query<{ token_version: number }>(
      `UPDATE users SET password_hash = $2, token_version = token_version + 1 WHERE id = $1 RETURNING token_version`,
      [current.id, hash],
    );
    const token = await signSession(current.id, rows[0]!.token_version, app.config);
    setSessionCookie(reply, token, app.config);
    return { ok: true };
  });

  app.post('/me/logout-all', async (request, reply) => {
    const current = requireUser(request);
    await app.db.query('UPDATE users SET token_version = token_version + 1 WHERE id = $1', [current.id]);
    clearSessionCookie(reply, app.config);
    return { ok: true };
  });

  app.get('/me/export', async (request, reply) => {
    const current = requireUser(request);
    const [user, settings, likes, follows, savedAlbums, podcastFollows, playlists, playlistTracks, plays, searches, subscriptions] =
      await Promise.all([
        userById(app.db, current.id),
        settingsFor(app.db, current.id),
        app.db.query(
          `SELECT t.id, t.title, ar.name AS artist, l.created_at AS liked_at
           FROM likes l JOIN tracks t ON t.id = l.track_id JOIN artists ar ON ar.id = t.artist_id
           WHERE l.user_id = $1 ORDER BY l.created_at DESC`,
          [current.id],
        ),
        app.db.query(
          `SELECT ar.id, ar.name, ar.genre, f.created_at AS followed_at
           FROM follows f JOIN artists ar ON ar.id = f.artist_id WHERE f.user_id = $1`,
          [current.id],
        ),
        app.db.query(
          `SELECT al.id, al.title, ar.name AS artist, sa.created_at AS saved_at
           FROM saved_albums sa JOIN albums al ON al.id = sa.album_id JOIN artists ar ON ar.id = al.artist_id
           WHERE sa.user_id = $1`,
          [current.id],
        ),
        app.db.query(
          `SELECT p.id, p.title, p.publisher, pf.created_at AS followed_at
           FROM podcast_follows pf JOIN podcasts p ON p.id = pf.podcast_id WHERE pf.user_id = $1`,
          [current.id],
        ),
        app.db.query('SELECT id, title, description, created_at, updated_at FROM playlists WHERE owner_id = $1', [current.id]),
        app.db.query(
          `SELECT p.id AS playlist_id, pt.track_id, t.title, pt.position
           FROM playlist_tracks pt JOIN playlists p ON p.id = pt.playlist_id
           JOIN tracks t ON t.id = pt.track_id WHERE p.owner_id = $1 ORDER BY p.id, pt.position`,
          [current.id],
        ),
        app.db.query(
          `SELECT track_id, played_at FROM plays WHERE user_id = $1 ORDER BY played_at DESC LIMIT 500`,
          [current.id],
        ),
        app.db.query('SELECT query, searched_at FROM search_history WHERE user_id = $1 ORDER BY searched_at DESC LIMIT 100', [current.id]),
        app.db.query('SELECT plan_id, action, created_at FROM subscription_events WHERE user_id = $1 ORDER BY created_at DESC', [current.id]),
      ]);

    const payload = {
      exportedAt: new Date().toISOString(),
      product: '声屿',
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        role: user.role,
        planId: user.plan_id,
        createdAt: user.created_at,
      },
      settings: toSettingsDTO(settings),
      likes: likes.rows,
      followedArtists: follows.rows,
      savedAlbums: savedAlbums.rows,
      followedPodcasts: podcastFollows.rows,
      playlists: playlists.rows,
      playlistTracks: playlistTracks.rows,
      recentPlays: plays.rows,
      searchHistory: searches.rows,
      subscriptionEvents: subscriptions.rows,
    };
    reply.header('Content-Type', 'application/json; charset=utf-8');
    reply.header('Content-Disposition', `attachment; filename="shengyu-export-${user.id}.json"`);
    return payload;
  });

  app.delete('/me', async (request, reply) => {
    const current = requireUser(request);
    const body = parse(deleteSchema, request.body);
    const user = await userById(app.db, current.id);
    if (body.confirmEmail !== user.email) {
      throw new HttpError(400, '确认邮箱不匹配', 'email_mismatch');
    }
    const valid = await verifyPassword(body.password, user.password_hash);
    if (!valid) throw new HttpError(400, '密码不正确', 'invalid_password');
    await app.db.query('DELETE FROM users WHERE id = $1', [current.id]);
    clearSessionCookie(reply, app.config);
    return { ok: true };
  });
}