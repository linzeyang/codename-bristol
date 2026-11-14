import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';
import { schemaSqlPath } from '../src/db/pg.js';
import type { Db } from '../src/db/types.js';
import { seedDatabase } from '../src/seed/index.js';

function pgliteDb(pg: PGlite): Db {
  const db: Db = {
    async query<T = Record<string, unknown>>(text: string, params?: unknown[]) {
      const result = await pg.query<T>(text, params as never[]);
      const affected = result.affectedRows ?? 0;
      return {
        rows: result.rows,
        rowCount: affected > 0 ? affected : result.rows.length,
      };
    },
    async transaction<T>(fn: (tx: Db) => Promise<T>): Promise<T> {
      await pg.exec('BEGIN');
      try {
        const value = await fn(db);
        await pg.exec('COMMIT');
        return value;
      } catch (error) {
        await pg.exec('ROLLBACK');
        throw error;
      }
    },
  };
  return db;
}

export interface TestContext {
  app: FastifyInstance;
  db: Db;
  close: () => Promise<void>;
}

export async function createTestContext(): Promise<TestContext> {
  const pg = new PGlite();
  await pg.waitReady;
  await pg.exec(readFileSync(schemaSqlPath(), 'utf8'));
  const db = pgliteDb(pg);
  await seedDatabase(db, { log: () => {} });

  const config = loadConfig({
    nodeEnv: 'test',
    jwtSecret: 'test-secret-for-shengyu-integration-tests-only',
    cookieSecure: false,
    databaseUrl: '',
    seedOnEmpty: false,
    rateLimitMax: 100_000,
    allowedOrigins: ['http://localhost:5173', 'http://localhost:8080'],
  });
  const app = await buildApp({ db, config });

  return {
    app,
    db,
    close: async () => {
      await app.close();
      await pg.close();
    },
  };
}

export async function login(app: FastifyInstance, email = 'demo@shengyu.app', password = 'demo1234') {
  const response = await app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: { email, password },
  });
  if (response.statusCode !== 200) throw new Error(`login failed: ${response.statusCode} ${response.body}`);
  const cookie = response.cookies.find((item) => item.name === 'sy_session');
  if (!cookie) throw new Error('missing session cookie');
  return { cookie: cookie.value, body: response.json() as { user: { id: string; email: string; planId: string } } };
}

export async function register(app: FastifyInstance, email: string, displayName = '测试听众') {
  const response = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: { email, password: 'password123', displayName },
  });
  if (response.statusCode !== 201) throw new Error(`register failed: ${response.statusCode} ${response.body}`);
  const cookie = response.cookies.find((item) => item.name === 'sy_session');
  if (!cookie) throw new Error('missing session cookie');
  return { cookie: cookie.value, body: response.json() as { user: { id: string; email: string } } };
}

export function auth(cookie: string) {
  return { cookie: `sy_session=${cookie}` };
}