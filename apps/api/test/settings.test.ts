import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { auth, createTestContext, login, type TestContext } from './helpers.js';

describe('设置、订阅与跨域防护', () => {
  let ctx: TestContext;
  let app: FastifyInstance;

  beforeAll(async () => {
    ctx = await createTestContext();
    app = ctx.app;
  });

  afterAll(async () => {
    await ctx.close();
  });

  it('设置项持久化并校验枚举值', async () => {
    const { cookie } = await login(app);
    const initial = await app.inject({ method: 'GET', url: '/api/settings', headers: auth(cookie) });
    expect(initial.statusCode).toBe(200);

    const patch = await app.inject({
      method: 'PATCH',
      url: '/api/settings',
      headers: auth(cookie),
      payload: { theme: 'dark', audioQuality: 'lossless', notifyEmail: true, reduceMotion: true },
    });
    expect(patch.statusCode).toBe(200);
    expect(patch.json()).toMatchObject({
      settings: { theme: 'dark', audioQuality: 'lossless', notifyEmail: true, reduceMotion: true },
    });

    const reload = await app.inject({ method: 'GET', url: '/api/settings', headers: auth(cookie) });
    expect(reload.json()).toMatchObject({ settings: { theme: 'dark', reduceMotion: true } });

    const invalid = await app.inject({
      method: 'PATCH',
      url: '/api/settings',
      headers: auth(cookie),
      payload: { theme: 'neon' },
    });
    expect(invalid.statusCode).toBe(400);

    await app.inject({
      method: 'PATCH',
      url: '/api/settings',
      headers: auth(cookie),
      payload: { theme: 'light', audioQuality: 'standard', notifyEmail: false, reduceMotion: false },
    });
  });

  it('游客可查看套餐，但切换套餐必须登录', async () => {
    const guest = await app.inject({ method: 'GET', url: '/api/plans' });
    expect(guest.statusCode).toBe(200);
    const body = guest.json() as { plans: unknown[]; currentPlanId: string; demoNotice: string; isGuest: boolean };
    expect(body.plans).toHaveLength(3);
    expect(body.currentPlanId).toBe('free');
    expect(body.isGuest).toBe(true);
    expect(body.demoNotice).toContain('不会产生真实扣款');

    const unauthorized = await app.inject({
      method: 'POST',
      url: '/api/subscription',
      payload: { planId: 'plus' },
    });
    expect(unauthorized.statusCode).toBe(401);
  });

  it('切换套餐立即生效并记录订阅事件', async () => {
    const { cookie, body } = await login(app);
    const response = await app.inject({
      method: 'POST',
      url: '/api/subscription',
      headers: auth(cookie),
      payload: { planId: 'plus' },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ user: { planId: 'plus' }, plan: { id: 'plus' } });

    const me = await app.inject({ method: 'GET', url: '/api/me', headers: auth(cookie) });
    expect(me.json()).toMatchObject({ user: { id: body.user.id, planId: 'plus' } });

    const subscription = await app.inject({ method: 'GET', url: '/api/subscription', headers: auth(cookie) });
    const events = (subscription.json() as { events: { planId: string }[] }).events;
    expect(events[0]?.planId).toBe('plus');

    const invalid = await app.inject({
      method: 'POST',
      url: '/api/subscription',
      headers: auth(cookie),
      payload: { planId: 'enterprise' },
    });
    expect(invalid.statusCode).toBe(400);

    await app.inject({ method: 'POST', url: '/api/subscription', headers: auth(cookie), payload: { planId: 'free' } });
  });

  it('拒绝来自未知 Origin 的写操作，允许白名单 Origin', async () => {
    const { cookie } = await login(app);
    const blocked = await app.inject({
      method: 'POST',
      url: '/api/likes/tr-chaoxi-1',
      headers: { ...auth(cookie), origin: 'https://evil.example' },
    });
    expect(blocked.statusCode).toBe(403);

    const allowed = await app.inject({
      method: 'POST',
      url: '/api/likes/tr-chaoxi-1',
      headers: { ...auth(cookie), origin: 'http://localhost:5173' },
    });
    expect(allowed.statusCode).toBe(200);
    await app.inject({ method: 'POST', url: '/api/likes/tr-chaoxi-1', headers: auth(cookie) });
  });
});