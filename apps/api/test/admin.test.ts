import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { auth, createTestContext, login, type TestContext } from './helpers.js';

describe('管理员内容管理', () => {
  let ctx: TestContext;
  let app: FastifyInstance;

  beforeAll(async () => {
    ctx = await createTestContext();
    app = ctx.app;
  });

  afterAll(async () => {
    await ctx.close();
  });

  it('听众访问管理接口返回 403，未登录返回 401', async () => {
    expect((await app.inject({ method: 'GET', url: '/api/admin/overview' })).statusCode).toBe(401);
    const listener = await login(app);
    const response = await app.inject({ method: 'GET', url: '/api/admin/overview', headers: auth(listener.cookie) });
    expect(response.statusCode).toBe(403);
  });

  it('管理员可查看概览、专辑与曲目', async () => {
    const admin = await login(app, 'admin@shengyu.app', 'admin1234');
    const overview = await app.inject({ method: 'GET', url: '/api/admin/overview', headers: auth(admin.cookie) });
    expect(overview.statusCode).toBe(200);
    expect(overview.json()).toMatchObject({ counts: { tracks: 58, artists: 10, albums: 16 } });

    const albums = await app.inject({ method: 'GET', url: '/api/admin/albums', headers: auth(admin.cookie) });
    expect((albums.json() as { albums: unknown[] }).albums).toHaveLength(16);

    const tracks = await app.inject({ method: 'GET', url: '/api/admin/tracks', headers: auth(admin.cookie) });
    expect((tracks.json() as { tracks: unknown[] }).tracks).toHaveLength(58);
  });

  it('管理员可新增、编辑与删除曲目', async () => {
    const admin = await login(app, 'admin@shengyu.app', 'admin1234');
    const created = await app.inject({
      method: 'POST',
      url: '/api/admin/tracks',
      headers: auth(admin.cookie),
      payload: {
        title: '测试新曲',
        albumId: 'al-chaoxi',
        audioKey: 'loop-08',
        genre: 'indie-pop',
        moods: ['深夜', '专注'],
        energy: 0.32,
        isExplicit: false,
      },
    });
    expect(created.statusCode).toBe(201);
    const track = (created.json() as { track: { id: string; title: string; artist: { name: string }; trackNo: number } }).track;
    expect(track.title).toBe('测试新曲');
    expect(track.artist.name).toBe('林晚星');
    expect(track.trackNo).toBe(6);

    const search = await app.inject({
      method: 'GET',
      url: '/api/admin/tracks?q=%E6%B5%8B%E8%AF%95%E6%96%B0%E6%9B%B2',
      headers: auth(admin.cookie),
    });
    expect((search.json() as { tracks: unknown[] }).tracks).toHaveLength(1);

    const updated = await app.inject({
      method: 'PATCH',
      url: `/api/admin/tracks/${track.id}`,
      headers: auth(admin.cookie),
      payload: { title: '测试新曲（改）', energy: 0.8, audioKey: 'loop-03' },
    });
    expect(updated.statusCode).toBe(200);
    expect(updated.json()).toMatchObject({ track: { title: '测试新曲（改）', energy: 0.8, audioUrl: '/media/audio/loop-03.mp3' } });

    const deleted = await app.inject({
      method: 'DELETE',
      url: `/api/admin/tracks/${track.id}`,
      headers: auth(admin.cookie),
    });
    expect(deleted.json()).toEqual({ ok: true });

    const gone = await app.inject({ method: 'DELETE', url: `/api/admin/tracks/${track.id}`, headers: auth(admin.cookie) });
    expect(gone.statusCode).toBe(404);
  });

  it('管理员接口校验参数与权限', async () => {
    const admin = await login(app, 'admin@shengyu.app', 'admin1234');
    const badAudio = await app.inject({
      method: 'POST',
      url: '/api/admin/tracks',
      headers: auth(admin.cookie),
      payload: { title: '坏音频', albumId: 'al-chaoxi', audioKey: 'loop-99' },
    });
    expect(badAudio.statusCode).toBe(400);

    const missingAlbum = await app.inject({
      method: 'POST',
      url: '/api/admin/tracks',
      headers: auth(admin.cookie),
      payload: { title: '坏专辑', albumId: 'al-nope', audioKey: 'loop-01' },
    });
    expect(missingAlbum.statusCode).toBe(404);

    const listener = await login(app);
    const forbidden = await app.inject({
      method: 'POST',
      url: '/api/admin/tracks',
      headers: auth(listener.cookie),
      payload: { title: '无权新增', albumId: 'al-chaoxi', audioKey: 'loop-01' },
    });
    expect(forbidden.statusCode).toBe(403);
  });
});