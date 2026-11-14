import type { Db } from './db/types.js';
import type { Config } from './config.js';

declare module 'fastify' {
  interface FastifyInstance {
    db: Db;
    config: Config;
  }
}