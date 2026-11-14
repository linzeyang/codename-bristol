import { loadConfig } from '../config.js';
import { applySchema, createPgDb, waitForDatabase } from './pg.js';

const config = loadConfig();
const { db, pool } = createPgDb(config.databaseUrl);
try {
  await waitForDatabase(pool);
  await applySchema(db);
  console.log('[声屿] schema 已应用。');
} finally {
  await pool.end();
}