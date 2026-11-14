import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireUser } from '../auth/session.js';
import { toSettingsDTO, type SettingsRow } from '../db/rows.js';
import { parse } from '../lib/http.js';
import { loadSettings } from '../services/settings.js';

const settingsSchema = z
  .object({
    theme: z.enum(['light', 'dark', 'system']).optional(),
    audioQuality: z.enum(['standard', 'high', 'lossless']).optional(),
    normalizeVolume: z.boolean().optional(),
    showNowPlaying: z.boolean().optional(),
    privateSession: z.boolean().optional(),
    autoplaySimilar: z.boolean().optional(),
    reduceMotion: z.boolean().optional(),
    notifyNewRelease: z.boolean().optional(),
    notifyEmail: z.boolean().optional(),
  })
  .strict();

const COLUMN_MAP: Record<string, string> = {
  theme: 'theme',
  audioQuality: 'audio_quality',
  normalizeVolume: 'normalize_volume',
  showNowPlaying: 'show_now_playing',
  privateSession: 'private_session',
  autoplaySimilar: 'autoplay_similar',
  reduceMotion: 'reduce_motion',
  notifyNewRelease: 'notify_new_release',
  notifyEmail: 'notify_email',
};

export async function settingsRoutes(app: FastifyInstance): Promise<void> {
  app.get('/settings', async (request) => {
    const current = requireUser(request);
    return { settings: await loadSettings(app.db, current.id) };
  });

  app.patch('/settings', async (request) => {
    const current = requireUser(request);
    const body = parse(settingsSchema, request.body);
    await loadSettings(app.db, current.id);
    const params: unknown[] = [current.id];
    const sets: string[] = [];
    for (const [key, value] of Object.entries(body)) {
      if (value === undefined) continue;
      params.push(value);
      sets.push(`${COLUMN_MAP[key]} = $${params.length}`);
    }
    if (sets.length === 0) {
      return { settings: await loadSettings(app.db, current.id) };
    }
    sets.push('updated_at = now()');
    const { rows } = await app.db.query<SettingsRow>(
      `UPDATE user_settings SET ${sets.join(', ')} WHERE user_id = $1 RETURNING *`,
      params,
    );
    return { settings: toSettingsDTO(rows[0]!) };
  });
}