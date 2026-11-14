import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { auth, createTestContext, login, register, type TestContext } from './helpers.js';

describe('认证与账户', () => {
  let ctx: TestContext;
  let app: FastifyInstance;

  beforeAll(async () => {
    ctx = await createTestContext();
    app = ctx.app;
  });

  afterAll(async () => {
    await ctx.close();
  });

  it('健康检查返回服务状态', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/health' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ ok: true, product: '声屿' });
  });

  it('未登录访问 /api/me 返回 401', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/me' });
    expect(response.statusCode).toBe(401);
  });

  it('注册成功并保持会话', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: 'newlistener@example.com', password: 'password123', displayName: '新听众' },
    });
    expect(response.statusCode).toBe(201);
    expect(response.cookies.some((cookie) => cookie.name === 'sy_session')).toBe(true);
    const body = response.json() as { user: { email: string; role: string; planId: string } };
    expect(body.user).toMatchObject({ email: 'newlistener@example.com', role: 'listener', planId: 'free' });

    const cookie = response.cookies.find((item) => item.name === 'sy_session')!;
    const me = await app.inject({ method: 'GET', url: '/api/me', headers: auth(cookie.value) });
    expect(me.statusCode).toBe(200);
    expect(me.json()).toMatchObject({ user: { displayName: '新听众' }, settings: { theme: 'light' } });
  });

  it('重复邮箱注册返回 409，弱密码与非法邮箱返回 400', async () => {
    const duplicate = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: 'newlistener@example.com', password: 'password123', displayName: '重复' },
    });
    expect(duplicate.statusCode).toBe(409);

    const weak = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: 'weak@example.com', password: '123', displayName: '弱密码' },
    });
    expect(weak.statusCode).toBe(400);

    const invalid = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: 'not-an-email', password: 'password123', displayName: '错误邮箱' },
    });
    expect(invalid.statusCode).toBe(400);
  });

  it('演示账号可登录，错误密码被拒绝', async () => {
    const ok = await login(app);
    expect(ok.body.user.email).toBe('demo@shengyu.app');

    const bad = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'demo@shengyu.app', password: 'wrong-password' },
    });
    expect(bad.statusCode).toBe(401);
  });

  it('可以修改昵称与头像色相', async () => {
    const { cookie } = await register(app, 'profile@example.com', '旧名字');
    const response = await app.inject({
      method: 'PATCH',
      url: '/api/me',
      headers: auth(cookie),
      payload: { displayName: '海边的人', avatarHue: 210 },
    });
    expect(response.statusCode).toBe(200);
    const me = await app.inject({ method: 'GET', url: '/api/me', headers: auth(cookie) });
    expect(me.json()).toMatchObject({ user: { displayName: '海边的人', avatarHue: 210 } });
  });

  it('修改密码后旧会话失效，新会话可用', async () => {
    const { cookie: oldCookie } = await register(app, 'password@example.com', '改密用户');
    const response = await app.inject({
      method: 'POST',
      url: '/api/me/password',
      headers: auth(oldCookie),
      payload: { currentPassword: 'password123', newPassword: 'newpassword456' },
    });
    expect(response.statusCode).toBe(200);
    const newCookie = response.cookies.find((item) => item.name === 'sy_session')!;
    expect(newCookie).toBeTruthy();

    const withOld = await app.inject({ method: 'GET', url: '/api/me', headers: auth(oldCookie) });
    expect(withOld.statusCode).toBe(401);
    const withNew = await app.inject({ method: 'GET', url: '/api/me', headers: auth(newCookie.value) });
    expect(withNew.statusCode).toBe(200);

    const login = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'password@example.com', password: 'newpassword456' },
    });
    expect(login.statusCode).toBe(200);
  });

  it('所有设备退出后令牌立即失效', async () => {
    const { cookie } = await register(app, 'logoutall@example.com', '退出用户');
    const response = await app.inject({ method: 'POST', url: '/api/me/logout-all', headers: auth(cookie) });
    expect(response.statusCode).toBe(200);
    const me = await app.inject({ method: 'GET', url: '/api/me', headers: auth(cookie) });
    expect(me.statusCode).toBe(401);
  });

  it('数据导出不包含密码哈希', async () => {
    const { cookie } = await login(app);
    const response = await app.inject({ method: 'GET', url: '/api/me/export', headers: auth(cookie) });
    expect(response.statusCode).toBe(200);
    expect(response.headers['content-disposition']).toContain('attachment');
    expect(response.body).not.toContain('password_hash');
    const payload = response.json() as { user: { email: string }; likes: unknown[]; settings: unknown };
    expect(payload.user.email).toBe('demo@shengyu.app');
    expect(Array.isArray(payload.likes)).toBe(true);
    expect(payload.settings).toBeTruthy();
  });

  it('删除账号需要邮箱与密码双重确认', async () => {
    const { cookie } = await register(app, 'delete@example.com', '待删除');
    const wrong = await app.inject({
      method: 'DELETE',
      url: '/api/me',
      headers: auth(cookie),
      payload: { password: 'password123', confirmEmail: 'other@example.com' },
    });
    expect(wrong.statusCode).toBe(400);

    const ok = await app.inject({
      method: 'DELETE',
      url: '/api/me',
      headers: auth(cookie),
      payload: { password: 'password123', confirmEmail: 'delete@example.com' },
    });
    expect(ok.statusCode).toBe(200);

    const loginAfter = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'delete@example.com', password: 'password123' },
    });
    expect(loginAfter.statusCode).toBe(401);
  });
});