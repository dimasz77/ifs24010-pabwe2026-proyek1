// Server produksi tanpa dependency: menyajikan hasil build (dist/) dengan fallback SPA,
// dan meneruskan /api/* ke backend yang di-host terpisah (env API_URL, mis. https://api.contoh.app).
import { createServer, request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { spawnSync } from 'node:child_process';
import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createGzip } from 'node:zlib';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// Muat .env (platform hosting menulis PORT dan API_URL di sini). Node tidak memuatnya otomatis; nilai env yang sudah ada tidak ditimpa.
const envFile = join(root, '.env');
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*(?:export\s+)?([\w.-]+)\s*=\s*(.*?)\s*$/);
    if (!m || m[1].startsWith('#')) continue;
    let value = m[2];
    if (/^(["']).*\1$/.test(value)) value = value.slice(1, -1);
    else value = value.replace(/\s+#.*$/, '');
    if (process.env[m[1]] === undefined) process.env[m[1]] = value;
  }
}
const dist = join(root, 'dist');
const port = Number(process.env.PORT || process.env.APP_PORT) || 4000;
const apiUrl = (process.env.API_URL || '').replace(/\/$/, '');

// Bila dist/ belum ada (mis. postinstall dilewati), bangun sekarang supaya server tetap bisa melayani halaman.
if (!existsSync(join(dist, 'index.html'))) {
  const vite = join(root, 'node_modules', 'vite', 'bin', 'vite.js');
  if (existsSync(vite)) {
    console.log('[WEB] dist/ belum ada, membangun frontend...');
    spawnSync(process.execPath, [vite, 'build'], { cwd: root, stdio: 'inherit' });
  } else {
    console.error('[WEB] dist/ belum ada dan vite tidak terpasang; halaman tidak dapat disajikan.');
  }
}

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.txt': 'text/plain; charset=utf-8',
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

function serveFile(req, res, file, cache) {
  const compressible = /^(text\/|application\/(javascript|json|xml))|image\/svg\+xml/.test(TYPES[extname(file)] || '');
  const gzip = compressible && statSync(file).size >= 1024 && /\bgzip\b/.test(req.headers['accept-encoding'] || '');
  res.writeHead(200, {
    'Content-Type': TYPES[extname(file)] || 'application/octet-stream',
    'Cache-Control': cache,
    Vary: 'Accept-Encoding',
    ...(gzip ? { 'Content-Encoding': 'gzip' } : {}),
  });
  if (req.method === 'HEAD') return res.end();
  const stream = createReadStream(file);
  if (gzip) stream.pipe(createGzip()).pipe(res);
  else stream.pipe(res);
}

const server = createServer((req, res) => {
  const path = decodeURIComponent((req.url || '/').split('?')[0]);
  if (path === '/api' || path.startsWith('/api/')) return proxy(req, res);
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); return res.end(); }

  const file = normalize(join(dist, path));
  if (file.startsWith(dist + sep) && existsSync(file) && statSync(file).isFile()) {
    return serveFile(req, res, file, path.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache');
  }
  const index = join(dist, 'index.html');
  if (!existsSync(index)) return sendJson(res, 500, 'dist/ belum ada. Jalankan `npm run build`.');
  return serveFile(req, res, index, 'no-cache');
});

server.listen(port, () => console.log(`[WEB] Frontend berjalan di http://localhost:${port}  (API_URL: ${apiUrl || '(belum diatur)'})`));
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => server.close(() => process.exit(0)));
