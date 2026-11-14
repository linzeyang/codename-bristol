import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { parse } from '../lib/http.js';
import { answer } from '../services/assistant.js';

const assistantSchema = z.object({
  message: z.string().trim().min(1, '请说说想听什么').max(200, '问题最多 200 个字符'),
});

export async function assistantRoutes(app: FastifyInstance): Promise<void> {
  app.post('/assistant', { config: { rateLimit: { max: 30, timeWindow: '1 minute' } } }, async (request) => {
    const body = parse(assistantSchema, request.body);
    const result = await answer(app.db, request.user?.id ?? null, body.message, app.config);
    return result;
  });
}