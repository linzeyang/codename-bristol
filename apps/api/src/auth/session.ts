import type { FastifyReply, FastifyRequest } from 'fastify';
import type { Config } from '../config.js';
import { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from './tokens.js';
import { HttpError } from '../db/types.js';
import type { AuthUser } from '../types.js';

export function setSessionCookie(reply: FastifyReply, token: string, config: Config): void {
  reply.setCookie(SESSION_COOKIE, token, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: config.cookieSecure,
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export function clearSessionCookie(reply: FastifyReply, config: Config): void {
  reply.clearCookie(SESSION_COOKIE, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: config.cookieSecure,
  });
}

export function requireUser(request: FastifyRequest): AuthUser {
  if (!request.user) throw new HttpError(401, '请先登录', 'unauthorized');
  return request.user;
}

export function requireAdmin(user: { role: string } | null): void {
  if (!user) throw new HttpError(401, '请先登录', 'unauthorized');
  if (user.role !== 'admin') throw new HttpError(403, '需要管理员权限', 'forbidden');
}