import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, api, qs } from './client';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('API 客户端', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('携带 Cookie 并解析 JSON', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ user: { id: 'u1' } }));
    vi.stubGlobal('fetch', fetchMock);
    const result = await api.get<{ user: { id: string } }>('/me');
    expect(result.user.id).toBe('u1');
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/me',
      expect.objectContaining({ method: 'GET', credentials: 'include' }),
    );
  });

  it('POST 自动序列化 JSON', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ok: true }, 201));
    vi.stubGlobal('fetch', fetchMock);
    await api.post('/playlists', { title: '夜路' });
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe('POST');
    expect(init.body).toBe(JSON.stringify({ title: '夜路' }));
    expect((init.headers as Record<string, string>)['content-type']).toBe('application/json');
  });

  it('将服务端错误转换为 ApiError', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({
      error: { code: 'forbidden', message: '没有权限', details: [{ path: 'x' }] },
    }, 403)));
    await expect(api.get('/admin')).rejects.toMatchObject({
      name: 'ApiError',
      status: 403,
      code: 'forbidden',
      message: '没有权限',
    });
  });

  it('网络失败返回可读错误', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    await expect(api.get('/home')).rejects.toMatchObject({
      status: 0,
      code: 'network_error',
    });
  });

  it('204 返回 undefined', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 204 })));
    await expect(api.delete('/me')).resolves.toBeUndefined();
  });

  it('查询串忽略空值并编码', () => {
    expect(qs({ q: '雨夜', type: 'all', empty: '', zero: 0 })).toBe('?q=%E9%9B%A8%E5%A4%9C&type=all&zero=0');
    expect(qs({ empty: '' })).toBe('');
  });

  it('ApiError 保留状态与细节', () => {
    const error = new ApiError(400, '参数错误', 'invalid_request', { field: 'email' });
    expect(error.status).toBe(400);
    expect(error.details).toEqual({ field: 'email' });
  });
});