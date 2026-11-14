import type { Db } from '../db/types.js';
import { toSettingsDTO, type SettingsRow } from '../db/rows.js';
import type { SettingsDTO } from '../types.js';

export async function loadSettings(db: Db, userId: string): Promise<SettingsDTO> {
  const { rows } = await db.query<SettingsRow>('SELECT * FROM user_settings WHERE user_id = $1', [userId]);
  if (rows[0]) return toSettingsDTO(rows[0]);
  await db.query('INSERT INTO user_settings (user_id) VALUES ($1) ON CONFLICT DO NOTHING', [userId]);
  const created = await db.query<SettingsRow>('SELECT * FROM user_settings WHERE user_id = $1', [userId]);
  return toSettingsDTO(created.rows[0]!);
}