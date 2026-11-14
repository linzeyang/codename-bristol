import { SignJWT, jwtVerify } from 'jose';
import type { Config } from '../config.js';

const ISSUER = 'shengyu';
const AUDIENCE = 'shengyu-web';
const SESSION_DAYS = 7;

function secret(config: Config): Uint8Array {
  return new TextEncoder().encode(config.jwtSecret);
}

export interface SessionClaims {
  userId: string;
  tokenVersion: number;
}

export async function signSession(userId: string, tokenVersion: number, config: Config): Promise<string> {
  return new SignJWT({ ver: tokenVersion })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secret(config));
}

export async function verifySession(token: string, config: Config): Promise<SessionClaims | null> {
  try {
    const { payload } = await jwtVerify(token, secret(config), {
      issuer: ISSUER,
      audience: AUDIENCE,
    });
    if (!payload.sub || typeof payload.ver !== 'number') return null;
    return { userId: payload.sub, tokenVersion: payload.ver };
  } catch {
    return null;
  }
}

export const SESSION_COOKIE = 'sy_session';
export const SESSION_MAX_AGE_SECONDS = SESSION_DAYS * 24 * 60 * 60;