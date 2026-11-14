import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { auth, createTestContext, login, register, type TestContext } from './helpers.js';

describe('音乐库、互动、历史与歌单', () => {
  let ctx: TestContext;
  let app: FastifyInstance;

  beforeAll(async () => {
    ctx = await createTestContext();
    app = ctx.app;
  });

  afterAll(async () => {
    await ctx.close();
  });

  it('音乐库需要登录，演示账号有收藏数据', async () => {
    expect((await app.inject({ method: 'GET', url: '/api/library' })).statusCode).toBe(401);

    const { cookie } = await login(app);
    const response = await app.inject({ method: 'GET', url: '/api/library', headers: auth(cookie) });
    expect(response.statusCode).toBe(200);
    const body = response.json() as {
      likedTracks: unknown[];
      playlists: unknown[];
      followedArtists: unknown[];
      savedAlbums: unknown[];
      recentTracks: unknown[];
      counts: { likedTracks: number; playlists: number };
    };
    expect(body.likedTracks.length).toBeGreaterThanOrEqual(4);
    expect(body.playlists.length).toBeGreaterThanOrEqual(1);
    expect(body.followedArtists.length).toBeGreaterThanOrEqual(3);
    expect(body.recentTracks.length).toBeGreaterThan(0);
    expect(body.counts.likedTracks).toBe(body.likedTracks.length);
  });

  it('喜欢、关注、收藏、关注播客可以双向切换', async () => {
    const { cookie } = await login(app);
    const like1 = await app.inject({ method: 'POST', url: '/api/likes/tr-chaoxi-2', headers: auth(cookie) });
    expect(like1.json()).toEqual({ liked: true });
    const like2 = await app.inject({ method: 'POST', url: '/api/likes/tr-chaoxi-2', headers: auth(cookie) });
    expect(like2.json()).toEqual({ liked: false });

    const follow1 = await app.inject({ method: 'POST', url: '/api/follows/ar-boli', headers: auth(cookie) });
    expect(follow1.json()).toEqual({ following: true });
    const follow2 = await app.inject({ method: 'POST', url: '/api/follows/ar-boli', headers: auth(cookie) });
    expect(follow2.json()).toEqual({ following: false });

    const saved = await app.inject({ method: 'POST', url: '/api/saved-albums/al-yehang', headers: auth(cookie) });
    expect(saved.json()).toEqual({ saved: true });
    const library = await app.inject({ method: 'GET', url: '/api/library', headers: auth(cookie) });
    expect((library.json() as { savedAlbums: unknown[] }).savedAlbums.length).toBeGreaterThan(0);

    const podcast = await app.inject({ method: 'POST', url: '/api/podcast-follows/pod-chengshi', headers: auth(cookie) });
    expect(podcast.json()).toEqual({ following: true });
    await app.inject({ method: 'POST', url: '/api/podcast-follows/pod-chengshi', headers: auth(cookie) });

    const missing = await app.inject({ method: 'POST', url: '/api/likes/nope', headers: auth(cookie) });
    expect(missing.statusCode).toBe(404);
  });

  it('隐私模式不写入播放历史，关闭后恢复记录', async () => {
    const { cookie } = await login(app);
    await app.inject({
      method: 'PATCH',
      url: '/api/settings',
      headers: auth(cookie),
      payload: { privateSession: true },
    });
    const privatePlay = await app.inject({
      method: 'POST',
      url: '/api/history',
      headers: auth(cookie),
      payload: { trackId: 'tr-boli-1' },
    });
    expect(privatePlay.json()).toMatchObject({ recorded: false, reason: 'private_session' });

    let library = await app.inject({ method: 'GET', url: '/api/library', headers: auth(cookie) });
    expect((library.json() as { recentTracks: { id: string }[] }).recentTracks.some((t) => t.id === 'tr-boli-1')).toBe(false);

    await app.inject({
      method: 'PATCH',
      url: '/api/settings',
      headers: auth(cookie),
      payload: { privateSession: false },
    });
    const publicPlay = await app.inject({
      method: 'POST',
      url: '/api/history',
      headers: auth(cookie),
      payload: { trackId: 'tr-boli-1' },
    });
    expect(publicPlay.json()).toEqual({ recorded: true });
    library = await app.inject({ method: 'GET', url: '/api/library', headers: auth(cookie) });
    expect((library.json() as { recentTracks: { id: string }[] }).recentTracks[0]?.id).toBe('tr-boli-1');

    const clear = await app.inject({ method: 'DELETE', url: '/api/history', headers: auth(cookie) });
    expect(clear.json()).toEqual({ ok: true });
    const after = await app.inject({ method: 'GET', url: '/api/library', headers: auth(cookie) });
    expect((after.json() as { recentTracks: unknown[] }).recentTracks).toHaveLength(0);
  });

  it('歌单支持创建、加曲、去重、排序、移除与删除', async () => {
    const { cookie } = await register(app, 'playlistowner@example.com', '歌单主人');

    const created = await app.inject({
      method: 'POST',
      url: '/api/playlists',
      headers: auth(cookie),
      payload: { title: '写代码时听', description: '不要人声' },
    });
    expect(created.statusCode).toBe(201);
    const playlistId = (created.json() as { playlist: { id: string } }).playlist.id;

    await app.inject({
      method: 'POST',
      url: `/api/playlists/${playlistId}/tracks`,
      headers: auth(cookie),
      payload: { trackId: 'tr-shuimian-1' },
    });
    await app.inject({
      method: 'POST',
      url: `/api/playlists/${playlistId}/tracks`,
      headers: auth(cookie),
      payload: { trackId: 'tr-shenlan-1' },
    });
    const duplicate = await app.inject({
      method: 'POST',
      url: `/api/playlists/${playlistId}/tracks`,
      headers: auth(cookie),
      payload: { trackId: 'tr-shuimian-1' },
    });
    expect((duplicate.json() as { tracks: unknown[] }).tracks).toHaveLength(2);

    const reordered = await app.inject({
      method: 'PUT',
      url: `/api/playlists/${playlistId}/order`,
      headers: auth(cookie),
      payload: { trackIds: ['tr-shenlan-1', 'tr-shuimian-1'] },
    });
    expect(reordered.statusCode).toBe(200);
    const orderedTracks = (reordered.json() as { tracks: { id: string }[] }).tracks;
    expect(orderedTracks.map((track) => track.id)).toEqual(['tr-shenlan-1', 'tr-shuimian-1']);

    const badOrder = await app.inject({
      method: 'PUT',
      url: `/api/playlists/${playlistId}/order`,
      headers: auth(cookie),
      payload: { trackIds: ['tr-shenlan-1'] },
    });
    expect(badOrder.statusCode).toBe(400);

    const removed = await app.inject({
      method: 'DELETE',
      url: `/api/playlists/${playlistId}/tracks/tr-shenlan-1`,
      headers: auth(cookie),
    });
    expect((removed.json() as { tracks: unknown[] }).tracks).toHaveLength(1);

    const list = await app.inject({ method: 'GET', url: '/api/playlists', headers: auth(cookie) });
    expect((list.json() as { playlists: unknown[] }).playlists).toHaveLength(1);

    const deleted = await app.inject({ method: 'DELETE', url: `/api/playlists/${playlistId}`, headers: auth(cookie) });
    expect(deleted.json()).toEqual({ ok: true });
    const after = await app.inject({ method: 'GET', url: `/api/playlists/${playlistId}`, headers: auth(cookie) });
    expect(after.statusCode).toBe(404);
  });

  it('不能编辑他人歌单或编辑精选歌单', async () => {
    const owner = await login(app);
    const stranger = await register(app, 'stranger@example.com', '陌生人');

    const created = await app.inject({
      method: 'POST',
      url: '/api/playlists',
      headers: auth(owner.cookie),
      payload: { title: '私有测试歌单' },
    });
    const id = (created.json() as { playlist: { id: string } }).playlist.id;

    const forbidden = await app.inject({
      method: 'PATCH',
      url: `/api/playlists/${id}`,
      headers: auth(stranger.cookie),
      payload: { title: '偷改' },
    });
    expect(forbidden.statusCode).toBe(403);

    const editorial = await app.inject({
      method: 'PATCH',
      url: '/api/playlists/pl-shenye',
      headers: auth(owner.cookie),
      payload: { title: '改编辑精选' },
    });
    expect(editorial.statusCode).toBe(403);

    const invalid = await app.inject({
      method: 'POST',
      url: '/api/playlists',
      headers: auth(owner.cookie),
      payload: { title: '   ' },
    });
    expect(invalid.statusCode).toBe(400);

    await app.inject({ method: 'DELETE', url: `/api/playlists/${id}`, headers: auth(owner.cookie) });
  });
});