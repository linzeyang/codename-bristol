import { loadConfig } from './config.js';
import { applySchema, createPgDb, waitForDatabase } from './db/pg.js';
import { seedDatabase } from './seed/index.js';
import { buildApp } from './app.js';

async function main(): Promise<void> {
  const config = loadConfig();
  const { db, pool } = createPgDb(config.databaseUrl);

  try {
    await waitForDatabase(pool);
    await applySchema(db);

    if (config.seedOnEmpty) {
      const result = await seedDatabase(db, { log: (message) => console.log(`[seed] ${message}`) });
      if (result.seeded) console.log(`[seed] 已写入示例目录（${result.tracks} 首曲目）。`);
    }

    const app = await buildApp({ db, config });
    await app.listen({ port: config.port, host: '0.0.0.0' });
    console.log(`[声屿] API 已启动：http://localhost:${config.port}/api/health`);

    const shutdown = async (signal: string) => {
      console.log(`[声屿] 收到 ${signal}，正在关闭…`);
      await app.close();
      await pool.end();
      process.exit(0);
    };
    process.on('SIGTERM', () => void shutdown('SIGTERM'));
    process.on('SIGINT', () => void shutdown('SIGINT'));
  } catch (error) {
    console.error('[声屿] 启动失败：', error);
    await pool.end().catch(() => undefined);
    process.exit(1);
  }
}

void main();