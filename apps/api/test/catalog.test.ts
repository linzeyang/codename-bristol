import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { auth, createTestContext, login, register, type TestContext } from './helpers.js';

describe('发现、内容详情与搜索', () => {
  let ctx: TestContext;
  let app: FastifyInstance;

  beforeAll(async () => {
    ctx = await createTestContext();
    app = ctx.app;
  });

  afterAll(async () => {
    await ctx.close();
  });

  it('游客首页返回完整货架与编辑推荐', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/home' });
    expect(response.statusCode).toBe(200);
    const body = response.json() as {
      personalized: boolean;
      picks: unknown[];
      trending: unknown[];
      artists: unknown[];
      releases: unknown[];
      playlists: unknown[];
      podcasts: unknown[];
      stations: unknown[];
      continueListening: unknown[];
      tuner: { familiarity: number };
    };
    expect(body.personalized).toBe(false);
    expect(body.picks).toHaveLength(10);
    expect(body.trending).toHaveLength(10);
    expect(body.artists).toHaveLength(10);
    expect(body.releases).toHaveLength(8);
    expect(body.playlists).toHaveLength(4);
    expect(body.podcasts).toHaveLength(3);
    expect(body.stations).toHaveLength(6);
    expect(body.continueListening).toHaveLength(0);
    expect(body.tuner.familiarity).toBeCloseTo(0.55);
  });

  it('登录后首页带有个性化推荐与可解释理由', async () => {
    const { cookie } = await login(app);
    const response = await app.inject({
      method: 'GET',
      url: '/api/home?familiarity=0.8&energy=0.3&novelty=0.2',
      headers: auth(cookie),
    });
    expect(response.statusCode).toBe(200);
    const body = response.json() as {
      personalized: boolean;
      picks: { reason: string; track: { title: string } }[];
      continueListening: unknown[];
      tuner: { familiarity: number; energy: number; novelty: number };
    };
    expect(body.personalized).toBe(true);
    expect(body.tuner).toMatchObject({ familiarity: 0.8, energy: 0.3, novelty: 0.2 });
    expect(body.continueListening.length).toBeGreaterThan(0);
    const reasons = body.picks.map((pick) => pick.reason);
    expect(reasons.some((reason) => reason.includes('关注') || reason.includes('喜欢') || reason.includes('常听'))).toBe(true);
    expect(body.picks.every((pick) => pick.reason.length > 0)).toBe(true);
  });

  it('非法调音参数被拒绝', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/home?energy=3' });
    expect(response.statusCode).toBe(400);
  });

  it('跨类型搜索返回歌曲、艺人、专辑', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/search?q=%E6%BD%AE%E6%B1%90' });
    expect(response.statusCode).toBe(200);
    const body = response.json() as {
      results: { tracks: { title: string }[]; artists: unknown[]; albums: { title: string }[] };
    };
    expect(body.results.tracks.some((track) => track.title.includes('潮汐'))).toBe(true);
    expect(body.results.albums.some((album) => album.title.includes('潮汐'))).toBe(true);
  });

  it('按类型搜索与搜索历史', async () => {
    const { cookie } = await login(app);
    const artists = await app.inject({
      method: 'GET',
      url: '/api/search?q=%E6%9E%97%E6%99%9A%E6%98%9F&type=artists',
      headers: auth(cookie),
    });
    expect(artists.statusCode).toBe(200);
    const body = artists.json() as { results: { artists: { name: string }[]; tracks: unknown[] } };
    expect(body.results.artists[0]?.name).toBe('林晚星');
    expect(body.results.tracks).toHaveLength(0);

    await app.inject({
      method: 'GET',
      url: '/api/search?q=%E9%9B%A8%E5%A4%9C&record=1',
      headers: auth(cookie),
    });
    const suggestions = await app.inject({
      method: 'GET',
      url: '/api/search/suggestions',
      headers: auth(cookie),
    });
    const suggestionBody = suggestions.json() as { recent: string[]; hot: string[] };
    expect(suggestionBody.recent).toContain('雨夜');
    expect(suggestionBody.hot.length).toBeGreaterThan(0);
  });

  it('艺人页包含热门曲目、专辑、相似艺人与关注状态', async () => {
    const { cookie } = await login(app);
    const response = await app.inject({
      method: 'GET',
      url: '/api/artists/ar-linwanxing',
      headers: auth(cookie),
    });
    expect(response.statusCode).toBe(200);
    const body = response.json() as {
      artist: { name: string; following: boolean; monthlyListeners: number; genre: string };
      popularTracks: unknown[];
      albums: unknown[];
      similarArtists: unknown[];
      appearsOn: unknown[];
    };
    expect(body.artist).toMatchObject({ name: '林晚星', following: true, genre: 'indie-pop' });
    expect(body.artist.monthlyListeners).toBeGreaterThan(1_000_000);
    expect(body.popularTracks.length).toBeGreaterThan(2);
    expect(body.albums).toHaveLength(2);
    expect(body.similarArtists.length).toBeGreaterThan(0);
  });

  it('专辑页返回曲目与总时长', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/albums/al-chaoxi' });
    expect(response.statusCode).toBe(200);
    const body = response.json() as {
      album: { title: string; artist: { name: string }; saved: boolean };
      tracks: { title: string }[];
      totalDurationSec: number;
      moreByArtist: unknown[];
    };
    expect(body.album.title).toBe('潮汐信箱');
    expect(body.album.artist.name).toBe('林晚星');
    expect(body.tracks).toHaveLength(5);
    expect(body.totalDurationSec).toBe(225);
    expect(body.moreByArtist.length).toBeGreaterThan(0);
  });

  it('歌曲页返回歌词、相关推荐与收录歌单', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/tracks/tr-chaoxi-1' });
    expect(response.statusCode).toBe(200);
    const body = response.json() as {
      track: { title: string; lyrics: { t: number; text: string }[]; audioUrl: string };
      related: unknown[];
      appearsOn: unknown[];
    };
    expect(body.track.title).toBe('潮汐信箱');
    expect(body.track.audioUrl).toBe('/media/audio/loop-01.mp3');
    expect(body.track.lyrics).toHaveLength(8);
    expect(body.track.lyrics[0]).toHaveProperty('text');
    expect(body.related.length).toBeGreaterThan(0);
  });

  it('编辑歌单公开可见，私有歌单仅所有者可见', async () => {
    const editorial = await app.inject({ method: 'GET', url: '/api/playlists/pl-shenye' });
    expect(editorial.statusCode).toBe(200);
    const body = editorial.json() as { playlist: { isEditorial: boolean }; tracks: unknown[] };
    expect(body.playlist.isEditorial).toBe(true);
    expect(body.tracks).toHaveLength(8);

    const other = await register(app, 'playlistviewer@example.com', '路过的人');
    const forbidden = await app.inject({
      method: 'GET',
      url: '/api/playlists/pl-demo-night',
      headers: auth(other.cookie),
    });
    expect(forbidden.statusCode).toBe(403);

    const demo = await login(app);
    const allowed = await app.inject({
      method: 'GET',
      url: '/api/playlists/pl-demo-night',
      headers: auth(demo.cookie),
    });
    expect(allowed.statusCode).toBe(200);
    const privateBody = allowed.json() as { isOwner: boolean; tracks: unknown[] };
    expect(privateBody.isOwner).toBe(true);
    expect(privateBody.tracks).toHaveLength(5);
  });

  it('播客列表与节目详情包含单集', async () => {
    const list = await app.inject({ method: 'GET', url: '/api/podcasts' });
    expect(list.statusCode).toBe(200);
    expect((list.json() as { podcasts: unknown[] }).podcasts).toHaveLength(3);

    const detail = await app.inject({ method: 'GET', url: '/api/podcasts/pod-shenye' });
    expect(detail.statusCode).toBe(200);
    const body = detail.json() as { podcast: { title: string }; episodes: { audioUrl: string }[] };
    expect(body.podcast.title).toBe('深夜声场');
    expect(body.episodes).toHaveLength(4);
    expect(body.episodes[0]!.audioUrl).toMatch(/^\/media\/audio\/loop-0[1-8]\.mp3$/);
  });

  it('电台按情绪返回播放队列，未知资源返回 404', async () => {
    const station = await app.inject({ method: 'GET', url: '/api/stations/night' });
    expect(station.statusCode).toBe(200);
    const body = station.json() as { station: { title: string }; tracks: unknown[] };
    expect(body.station.title).toBe('深夜靠岸');
    expect(body.tracks.length).toBeGreaterThanOrEqual(5);

    expect((await app.inject({ method: 'GET', url: '/api/stations/nope' })).statusCode).toBe(404);
    expect((await app.inject({ method: 'GET', url: '/api/artists/nope' })).statusCode).toBe(404);
    expect((await app.inject({ method: 'GET', url: '/api/albums/nope' })).statusCode).toBe(404);
    expect((await app.inject({ method: 'GET', url: '/api/tracks/nope' })).statusCode).toBe(404);
  });
});