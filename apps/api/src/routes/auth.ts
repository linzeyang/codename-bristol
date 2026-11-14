import type { FastifyInstance, FastifyReply } from 'fastify';
import { z } from 'zod';
import { hashPassword, verifyPassword } from '../auth/passwords.js';
import { clearSessionCookie, setSessionCookie } from '../auth/session.js';
import { signSession } from '../auth/tokens.js';
import { toSettingsDTO, toUserDTO, type SettingsRow, type UserRow } from '../db/rows.js';
import { HttpError } from '../db/types.js';
import { newId } from '../lib/id.js';
import { parse } from '../lib/http.js';
import type { Config } from '../config.js';

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(160)
  .refine((value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), '邮箱格式不正确');

const registerSchema = z.object({
  email: emailSchema,
  password: z.string().min(8, '密码至少 8 位').max(128, '密码过长'),
  displayName: z.string().trim().min(1, '请填写昵称').max(24, '昵称最多 24 个字符'),
});

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
});

async function userByEmail(db: FastifyInstance['db'], email: string): Promise<UserRow | null> {
  const { rows } = await db.query<UserRow>('SELECT * FROM users WHERE email = $1 LIMIT 1', [email]);
  return rows[0] ?? null;
}

async function settingsFor(db: FastifyInstance['db'], userId: string): Promise<SettingsRow> {
  const { rows } = await db.query<SettingsRow>('SELECT * FROM user_settings WHERE user_id = $1', [userId]);
  return rows[0]!;
}

async function issueSession(reply: FastifyReply, user: UserRow, config: Config) {
  const token = await signSession(user.id, user.token_version, config);
  setSessionCookie(reply, token, config);
}

export async function authRoutes(app: FastifyInstance): Promise<void> {
  app.post('/auth/register', { config: { rateLimit: { max: 12, timeWindow: '1 minute' } } }, async (request, reply) => {
    const body = parse(registerSchema, request.body);
    const existing = await userByEmail(app.db, body.email);
    if (existing) throw new HttpError(409, '该邮箱已注册，请直接登录', 'email_taken');

    const userId = newId('u');
    const passwordHash = await hashPassword(body.password);
    let user: UserRow;
    try {
      user = await app.db.transaction(async (tx) => {
        const inserted = await tx.query<UserRow>(
          `INSERT INTO users (id, email, password_hash, display_name, role, plan_id)
           VALUES ($1,$2,$3,$4,'listener','free') RETURNING *`,
          [userId, body.email, passwordHash, body.displayName],
        );
        await tx.query('INSERT INTO user_settings (user_id) VALUES ($1)', [userId]);
        return inserted.rows[0]!;
      });
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'code' in error && (error as { code: string }).code === '23505') {
        throw new HttpError(409, '该邮箱已注册，请直接登录', 'email_taken');
      }
      throw error;
    }

    await issueSession(reply, user, app.config);
    const settings = await settingsFor(app.db, user.id);
    return reply.code(201).send({ user: toUserDTO(user), settings: toSettingsDTO(settings) });
  });

  app.post('/auth/login', { config: { rateLimit: { max: 12, timeWindow: '1 minute' } } }, async (request, reply) => {
    const body = parse(loginSchema, request.body);
    const user = await userByEmail(app.db, body.email);
    if (!user) throw new HttpError(401, '邮箱或密码不正确', 'invalid_credentials');
    const valid = await verifyPassword(body.password, user.password_hash);
    if (!valid) throw new HttpError(401, '邮箱或密码不正确', 'invalid_credentials');

    await issueSession(reply, user, app.config);
    const settings = await settingsFor(app.db, user.id);
    return { user: toUserDTO(user), settings: toSettingsDTO(settings) };
  });

  app.post('/auth/logout', async (_request, reply) => {
    clearSessionCookie(reply, app.config);
    return { ok: true };
  });

  app.get('/auth/me', async (request) => {
    if (!request.user) throw new HttpError(401, '未登录', 'unauthorized');
    const user = await userById(app.db, request.user.id);
    return { user: toUserDTO(user) };
  });
}

async function userById(db: FastifyInstance['db'], id: string): Promise<UserRow> {
  const { rows } = await db.query<UserRow>('SELECT * FROM users WHERE id = $1', [id]);
  const user = rows[0];
  if (!user) throw new HttpError(401, '会话已失效', 'unauthorized');
  return user;
}

export { userById, settingsFor, emailSchema };