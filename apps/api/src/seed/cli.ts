import { loadConfig } from '../config.js';
import { applySchema, createPgDb, waitForDatabase } from '../db/pg.js';
import { seedDatabase } from './index.js';

const force = process.argv.includes('--force');
const config = loadConfig();
const { db, pool } = createPgDb(config.databaseUrl);
try {
  await waitForDatabase(pool);
  await applySchema(db);
  const result = await seedDatabase(db, { force, log: (message) => console.log(`[seed] ${message}`) });
  console.log(result.seeded ? `[seed] 完成，共 ${result.tracks} 首曲目。` : '[seed] 目录已存在，无需重复写入。');
} finally {
  await pool.end();
}