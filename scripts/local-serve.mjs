// local-serve.mjs — servidor local do frontend (modo --local do run.sh).
// Serve frontend/build/web e faz proxy de /api, /uploads e /socket.io para o
// backend (espelho de frontend/nginx.conf, que só roda dentro do container).
import http from 'node:http';
import net from 'node:net';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WEB_DIR = process.env.WEB_DIR || path.join(ROOT, 'frontend', 'build', 'web');
const BACKEND_HOST = '127.0.0.1';
const BACKEND_PORT = Number(process.env.BACKEND_PORT || 3001);
const PORT = Number(process.env.FRONTEND_PORT || 8080);

const PROXY_PREFIXES = ['/api/', '/uploads/', '/socket.io/'];

// Espelho das regras de cache do frontend/nginx.conf.
const NO_CACHE = new Set([
  '/index.html',
  '/flutter_bootstrap.js',
  '/main.dart.js',
  '/flutter.js',
  '/flutter_service_worker.js',
  '/version.json',
]);
const IMMUTABLE_DIRS = ['/canvaskit/'];

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.wasm': 'application/wasm',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.webmanifest': 'application/manifest+json',
};

// Hop-by-hop: não podem ser repassadas como estão (framing do Node muda).
const HOP_HEADERS = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailers',
  'transfer-encoding',
  'upgrade',
]);

function isProxied(pathname) {
  return PROXY_PREFIXES.some(
    (p) => pathname === p.slice(0, -1) || pathname.startsWith(p),
  );
}

function stripHop(headers) {
  const out = {};
  for (const [k, v] of Object.entries(headers)) {
    if (!HOP_HEADERS.has(k.toLowerCase())) out[k] = v;
  }
  return out;
}

function proxyHttp(req, res, target) {
  const upstream = http.request(
    {
      host: BACKEND_HOST,
      port: BACKEND_PORT,
      method: req.method,
      path: target,
      headers: { ...stripHop(req.headers), host: `${BACKEND_HOST}:${BACKEND_PORT}` },
    },
    (up) => {
      res.writeHead(up.statusCode ?? 502, stripHop(up.headers));
      up.pipe(res);
    },
  );
  upstream.on('error', () => {
    if (!res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
    }
    res.end(JSON.stringify({ error: 'backend indisponível' }));
  });
  req.pipe(upstream);
}

function cacheHeader(pathname) {
  if (NO_CACHE.has(pathname)) return 'no-cache';
  if (pathname === '/' || IMMUTABLE_DIRS.some((d) => pathname.startsWith(d))) {
    return 'no-cache';
  }
  return 'public, max-age=604800';
}

function sendFile(res, file, pathname, status = 200) {
  const ext = path.extname(file).toLowerCase();
  const type = MIME[ext] || 'application/octet-stream';
  let stat;
  try {
    stat = fs.statSync(file);
  } catch {
    res.writeHead(500).end('stat error');
    return;
  }
  res.writeHead(status, {
    'Content-Type': type,
    'Content-Length': stat.size,
    'Cache-Control': cacheHeader(pathname),
  });
  if (res.req.method === 'HEAD') {
    res.end();
    return;
  }
  fs.createReadStream(file).pipe(res);
}

function serveStatic(req, res, pathname) {
  const clean = decodeURIComponent(pathname);
  let file = path.normalize(path.join(WEB_DIR, clean));
  if (file !== WEB_DIR && !file.startsWith(WEB_DIR + path.sep)) {
    res.writeHead(403).end('forbidden');
    return;
  }
  if (clean.endsWith('/')) file = path.join(file, 'index.html');

  let stat = null;
  try {
    stat = fs.statSync(file);
  } catch {
    stat = null;
  }
  if (stat?.isDirectory()) {
    file = path.join(file, 'index.html');
    stat = fs.existsSync(file) ? fs.statSync(file) : null;
  }
  if (stat?.isFile()) {
    sendFile(res, file, pathname === '/' ? '/index.html' : pathname);
    return;
  }
  // SPA: rotas sem extensão caem no index.html (history fallback do nginx).
  if (!path.extname(clean)) {
    sendFile(res, path.join(WEB_DIR, 'index.html'), '/index.html');
    return;
  }
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('not found');
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (isProxied(url.pathname)) {
    proxyHttp(req, res, url.pathname + url.search);
    return;
  }
  serveStatic(req, res, url.pathname);
});

// WebSocket (socket.io transporte 'websocket' do app): tuba cru para o backend.
server.on('upgrade', (req, socket, head) => {
  const pathname = req.url.split('?')[0];
  if (!isProxied(pathname)) {
    socket.destroy();
    return;
  }
  const upstream = net.connect(BACKEND_PORT, BACKEND_HOST, () => {
    const lines = [`${req.method} ${req.url} HTTP/1.1`];
    for (let i = 0; i < req.rawHeaders.length; i += 2) {
      lines.push(`${req.rawHeaders[i]}: ${req.rawHeaders[i + 1]}`);
    }
    upstream.write(`${lines.join('\r\n')}\r\n\r\n`);
    if (head && head.length) upstream.write(head);
    socket.pipe(upstream);
    upstream.pipe(socket);
  });
  const teardown = () => {
    upstream.destroy();
    socket.destroy();
  };
  upstream.on('error', teardown);
  socket.on('error', teardown);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(
    `[local-serve] http://localhost:${PORT} -> build/web, proxy /api /uploads /socket.io -> ${BACKEND_HOST}:${BACKEND_PORT}`,
  );
});
