import Fastify, { type FastifyInstance } from 'fastify';
import cookie from '@fastify/cookie';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import type { Config } from './config.js';
import type { Db } from './db/types.js';
import { HttpError } from './db/types.js';
import { toAuthUser, type UserRow } from './db/rows.js';
import { SESSION_COOKIE, verifySession } from './auth/tokens.js';
import { authRoutes } from './routes/auth.js';
import { accountRoutes } from './routes/account.js';
import { settingsRoutes } from './routes/settings.js';
import { discoveryRoutes } from './routes/discovery.js';
import { libraryRoutes } from './routes/library.js';
import { playlistRoutes } from './routes/playlists.js';
import { planRoutes } from './routes/plans.js';
import { assistantRoutes } from './routes/assistant.js';
import { adminRoutes } from './routes/admin.js';

export interface BuildAppOptions {
  db: Db;
  config: Config;
}

export async function buildApp({ db, config }: BuildAppOptions): Promise<FastifyInstance> {
  const app = Fastify({
    logger:
      config.nodeEnv === 'test'
        ? false
        : {
            level: config.nodeEnv === 'production' ? 'info' : 'info',
            redact: ['req.headers.cookie', 'req.headers.authorization'],
          },
    trustProxy: true,
    bodyLimit: 64 * 1024,
  });

  app.decorate('db', db);
  app.decorate('config', config);
  app.decorateRequest('user', null);

  await app.register(cookie);
  await app.register(helmet, {
    contentSecurityPolicy: false,
    hsts: false,
    crossOriginResourcePolicy: { policy: 'same-origin' },
  });
  await app.register(fastifyStatic, {
    root: config.mediaDir,
    prefix: '/media/',
    index: false,
    maxAge: '1d',
  });

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof HttpError) {
      return reply.status(error.status).send({
        error: { code: error.code, message: error.message, details: error.details },
      });
    }
    const statusCode = (error as { statusCode?: number }).statusCode ?? 500;
    if (statusCode === 413) {
      return reply.status(413).send({ error: { code: 'payload_too_large', message: '请求内容过大' } });
    }
    if (statusCode === 415) {
      return reply.status(415).send({ error: { code: 'unsupported_media_type', message: '仅支持 JSON 请求' } });
    }
    if (statusCode >= 400 && statusCode < 500) {
      return reply.status(statusCode).send({ error: { code: 'bad_request', message: '请求无法处理' } });
    }
    request.log.error({ err: error }, 'unhandled_api_error');
    return reply.status(500).send({ error: { code: 'internal_error', message: '服务器开小差了，请稍后再试' } });
  });

  app.setNotFoundHandler((request, reply) => {
    if (request.url.startsWith('/api/')) {
      return reply.status(404).send({ error: { code: 'not_found', message: '接口不存在' } });
    }
    return reply.status(404).send({ error: { code: 'not_found', message: '资源不存在' } });
  });

  await app.register(
    async (api) => {
      await api.register(rateLimit, {
        global: true,
        max: config.rateLimitMax,
        timeWindow: '1 minute',
        allowList: [],
        skip: () => config.nodeEnv === 'test',
      });

      api.addHook('onRequest', async (request, reply) => {
        const origin = request.headers.origin;
        const mutating = !['GET', 'HEAD', 'OPTIONS'].includes(request.method);
        if (mutating && origin && !config.allowedOrigins.includes(origin)) {
          request.log.warn({ origin }, 'blocked_cross_origin_mutation');
          return reply.status(403).send({ error: { code: 'origin_not_allowed', message: '请求来源不被允许' } });
        }
        const token = request.cookies[SESSION_COOKIE];
        if (!token) {
          request.user = null;
          return;
        }
        const claims = await verifySession(token, config);
        if (!claims) {
          request.user = null;
          return;
        }
        const { rows } = await db.query<UserRow>('SELECT * FROM users WHERE id = $1', [claims.userId]);
        const row = rows[0];
        if (!row || row.token_version !== claims.tokenVersion) {
          request.user = null;
          return;
        }
        request.user = toAuthUser(row);
      });

      api.get('/health', async () => {
        const { rows } = await db.query<{ ok: number }>('SELECT 1 AS ok');
        return { ok: rows[0]?.ok === 1, product: '声屿', time: new Date().toISOString() };
      });

      await api.register(authRoutes);
      await api.register(accountRoutes);
      await api.register(settingsRoutes);
      await api.register(discoveryRoutes);
      await api.register(libraryRoutes);
      await api.register(playlistRoutes);
      await api.register(planRoutes);
      await api.register(assistantRoutes);
      await api.register(adminRoutes);
    },
    { prefix: '/api' },
  );

  return app;
}