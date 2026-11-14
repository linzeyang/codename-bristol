import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { createTestContext, type TestContext } from './helpers.js';

describe('声屿向导（离线意图引擎）', () => {
  let ctx: TestContext;
  let app: FastifyInstance;

  beforeAll(async () => {
    ctx = await createTestContext();
    app = ctx.app;
  });

  afterAll(async () => {
    await ctx.close();
  });

  it('根据情绪与场景返回带理由的曲目', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/assistant',
      payload: { message: '适合雨夜写代码的歌' },
    });
    expect(response.statusCode).toBe(200);
    const body = response.json() as {
      reply: string;
      tracks: { reason: string; moods: string[] }[];
      source: string;
      intent: { moods: string[] };
      suggestions: string[];
    };
    expect(body.source).toBe('local');
    expect(body.tracks.length).toBeGreaterThanOrEqual(3);
    expect(body.tracks.every((track) => track.reason.length > 0)).toBe(true);
    expect(body.intent.moods).toEqual(expect.arrayContaining(['专注']));
    expect(body.reply).toContain('首');
    expect(body.suggestions).toHaveLength(4);
  });

  it('识别艺人名并优先返回该艺人作品', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/assistant',
      payload: { message: '想听林晚星，来五首' },
    });
    expect(response.statusCode).toBe(200);
    const body = response.json() as { tracks: { artist: { name: string } }[]; reply: string };
    expect(body.tracks.length).toBe(5);
    expect(body.tracks.slice(0, 3).every((track) => track.artist.name === '林晚星')).toBe(true);
    expect(body.reply).toContain('林晚星');
  });

  it('无明确意图时返回兜底推荐而不报错', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/assistant',
      payload: { message: '推荐一点' },
    });
    expect(response.statusCode).toBe(200);
    const body = response.json() as { tracks: unknown[]; reply: string };
    expect(body.tracks.length).toBeGreaterThan(0);
    expect(body.reply.length).toBeGreaterThan(0);
  });

  it('拒绝空消息与超长消息', async () => {
    expect((await app.inject({ method: 'POST', url: '/api/assistant', payload: { message: '  ' } })).statusCode).toBe(400);
    expect(
      (await app.inject({ method: 'POST', url: '/api/assistant', payload: { message: '歌'.repeat(201) } })).statusCode,
    ).toBe(400);
  });
});