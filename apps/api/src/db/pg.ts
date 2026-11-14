import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import pg from 'pg';
import type { Db, QueryResult } from './types.js';

const { Pool } = pg;

type Queryable = {
  query(text: string, params?: unknown[]): Promise<{ rows: unknown[]; rowCount: number | null }>;
};

function wrap(client: Queryable): Db {
  const db: Db = {
    async query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<QueryResult<T>> {
      const result = await client.query(text, params);
      return { rows: result.rows as T[], rowCount: result.rowCount ?? 0 };
    },
    async transaction<T>(fn: (tx: Db) => Promise<T>): Promise<T> {
      await client.query('BEGIN');
      try {
        const out = await fn(db);
        await client.query('COMMIT');
        return out;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    },
  };
  return db;
}

export interface PgHandle {
  db: Db;
  pool: pg.Pool;
}

export function createPgDb(connectionString: string): PgHandle {
  const pool = new Pool({ connectionString, max: 10, idleTimeoutMillis: 30_000 });
  const db: Db = {
    async query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<QueryResult<T>> {
      const result = await pool.query(text, params);
      return { rows: result.rows as T[], rowCount: result.rowCount ?? 0 };
    },
    async transaction<T>(fn: (tx: Db) => Promise<T>): Promise<T> {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const scoped = wrap(client);
        const out = await fn(scoped);
        await client.query('COMMIT');
        return out;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    },
  };
  return { db, pool };
}

export function schemaSqlPath(): string {
  const candidates = [
    resolve(process.cwd(), 'db/schema.sql'),
    resolve(process.cwd(), 'apps/api/db/schema.sql'),
    resolve(import.meta.dirname ?? '.', '../db/schema.sql'),
  ];
  const found = candidates.find((p) => existsSync(p));
  if (!found) throw new Error(`找不到数据库 schema，尝试过：${candidates.join(', ')}`);
  return found;
}

export async function applySchema(db: Db): Promise<void> {
  const sql = readFileSync(schemaSqlPath(), 'utf8');
  await db.query(sql);
}

export async function waitForDatabase(pool: pg.Pool, attempts = 30, delayMs = 1000): Promise<void> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i += 1) {
    try {
      await pool.query('SELECT 1');
      return;
    } catch (error) {
      lastError = error;
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw lastError;
}