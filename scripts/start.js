// Server produksi tanpa dependency: menyajikan hasil build (dist/) dengan fallback SPA,
// dan meneruskan /api/* ke backend yang di-host terpisah (env API_URL, mis. https://api.contoh.app).
import { createServer, request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { dirname, extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const port = Number(process.env.PORT || process.env.APP_PORT) || 4000;
const apiUrl = (process.env.API_URL || '').replace(/\/$/, '');

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2', '.json': 'application/json', '.map': 'application/json',
};

function sendJson(res, status, message) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ success: false, error: { code: 'BAD_GATEWAY', message } }));
}

function proxy(req, res) {
  if (!apiUrl) return sendJson(res, 502, 'API_URL belum diatur: isi dengan alamat backend.');
  const target = new URL(apiUrl + req.url);
  const send = target.protocol === 'https:' ? httpsRequest : httpRequest;
  const upstream = send(target, { method: req.method, headers: { ...req.headers, host: target.host } }, (r) => {
    res.writeHead(r.statusCode, r.headers);
    r.pipe(res);
  });
  upstream.on('error', () => { if (!res.headersSent) sendJson(res, 502, 'Backend tidak dapat dihubungi.'); else res.destroy(); });
  req.pipe(upstream);
}

function serveFile(res, file, cache) {
  res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream', 'Cache-Control': cache });
  createReadStream(file).pipe(res);
}

const server = createServer((req, res) => {
  const path = decodeURIComponent((req.url || '/').split('?')[0]);
  if (path === '/api' || path.startsWith('/api/')) return proxy(req, res);
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); return res.end(); }

  const file = normalize(join(dist, path));
  if (file.startsWith(dist + sep) && existsSync(file) && statSync(file).isFile()) {
    return serveFile(res, file, path.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache');
  }
  const index = join(dist, 'index.html');
  if (!existsSync(index)) return sendJson(res, 500, 'dist/ belum ada. Jalankan `npm run build`.');
  return serveFile(res, index, 'no-cache');
});

server.listen(port, () => console.log(`[WEB] Frontend berjalan di http://localhost:${port}  (API_URL: ${apiUrl || '(belum diatur)'})`));
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => server.close(() => process.exit(0)));
