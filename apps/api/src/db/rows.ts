import type { AuthUser, SettingsDTO, UserDTO } from '../types.js';

declare module 'fastify' {
  interface FastifyRequest {
    user: AuthUser | null;
  }
}

export interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  display_name: string;
  role: 'listener' | 'admin';
  plan_id: string;
  token_version: number;
  avatar_hue: number;
  created_at: string | Date;
}

export function toAuthUser(row: UserRow): AuthUser {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    role: row.role,
    planId: row.plan_id,
    avatarHue: row.avatar_hue,
    tokenVersion: row.token_version,
  };
}

export function toUserDTO(row: UserRow): UserDTO {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    role: row.role,
    planId: row.plan_id,
    avatarHue: row.avatar_hue,
    createdAt: new Date(row.created_at).toISOString(),
  };
}

export interface SettingsRow {
  theme: 'light' | 'dark' | 'system';
  audio_quality: 'standard' | 'high' | 'lossless';
  normalize_volume: boolean;
  show_now_playing: boolean;
  private_session: boolean;
  autoplay_similar: boolean;
  reduce_motion: boolean;
  notify_new_release: boolean;
  notify_email: boolean;
}

export function toSettingsDTO(row: SettingsRow): SettingsDTO {
  return {
    theme: row.theme,
    audioQuality: row.audio_quality,
    normalizeVolume: row.normalize_volume,
    showNowPlaying: row.show_now_playing,
    privateSession: row.private_session,
    autoplaySimilar: row.autoplay_similar,
    reduceMotion: row.reduce_motion,
    notifyNewRelease: row.notify_new_release,
    notifyEmail: row.notify_email,
  };
}