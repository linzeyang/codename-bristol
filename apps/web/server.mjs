import http from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const PUBLIC_DIR = resolve(fileURLToPath(new URL('./dist/', import.meta.url)));
const API_ORIGIN = new URL(process.env.API_ORIGIN ?? 'http://127.0.0.1:3001');
const PORT = Number(process.env.PORT ?? 8080);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
  'Content-Security-Policy':
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; media-src 'self'; connect-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
};

function proxy(request, response) {
  const upstream = http.request(
    {
      hostname: API_ORIGIN.hostname,
      port: API_ORIGIN.port || 80,
      method: request.method,
      path: request.url,
      headers: {
        ...request.headers,
        host: API_ORIGIN.host,
        'x-forwarded-for': request.socket.remoteAddress ?? '',
        'x-forwarded-proto': 'http',
      },
    },
    (upstreamResponse) => {
      response.writeHead(upstreamResponse.statusCode ?? 502, upstreamResponse.headers);
      upstreamResponse.pipe(response);
    },
  );

  upstream.setTimeout(60_000, () => upstream.destroy(new Error('upstream timeout')));
  upstream.on('error', () => {
    if (!response.headersSent) {
      response.writeHead(502, { 'content-type': 'application/json; charset=utf-8', ...SECURITY_HEADERS });
    }
    response.end(JSON.stringify({ error: { code: 'bad_gateway', message: '上游服务暂时不可用' } }));
  });
  request.pipe(upstream);
}

async function sendFile(request, response, filePath, statusCode = 200) {
  const info = await stat(filePath);
  if (!info.isFile()) throw new Error('not a file');
  const extension = extname(filePath).toLowerCase();
  const isHtml = extension === '.html';
  const isAsset = filePath.includes(`${PUBLIC_DIR}/assets/`);
  response.writeHead(statusCode, {
    'Content-Type': MIME[extension] ?? 'application/octet-stream',
    'Content-Length': info.size,
    'Cache-Control': isHtml ? 'no-cache' : isAsset ? 'public, max-age=31536000, immutable' : 'public, max-age=3600',
    ...(isHtml ? SECURITY_HEADERS : {}),
  });
  if (request.method === 'HEAD') {
    response.end();
    return;
  }
  createReadStream(filePath).pipe(response);
}

const server = http.createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname);

    if (pathname.startsWith('/api/') || pathname === '/api' || pathname.startsWith('/media/')) {
      proxy(request, response);
      return;
    }

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.writeHead(405, { 'content-type': 'application/json; charset=utf-8', ...SECURITY_HEADERS });
      response.end(JSON.stringify({ error: { code: 'method_not_allowed', message: '不支持的方法' } }));
      return;
    }

    const candidate = resolve(PUBLIC_DIR, `.${pathname}`);
    if (!candidate.startsWith(PUBLIC_DIR)) {
      response.writeHead(403, { 'content-type': 'text/plain; charset=utf-8' });
      response.end('Forbidden');
      return;
    }

    try {
      await sendFile(request, response, candidate);
      return;
    } catch {
      // SPA 回退：没有扩展名的前端路由都返回 index.html
      if (!extname(pathname)) {
        await sendFile(request, response, resolve(PUBLIC_DIR, 'index.html'));
        return;
      }
      response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      response.end('Not found');
    }
  } catch {
    if (!response.headersSent) {
      response.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
    }
    response.end('Server error');
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[声屿 web] http://0.0.0.0:${PORT} → ${API_ORIGIN.origin}`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
  });
}