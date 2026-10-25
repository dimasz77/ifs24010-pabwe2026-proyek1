import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';

export const PROXY_TIMEOUT_MS = 10_000;

function sendJson(res, status, message) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ success: false, error: { code: status === 504 ? 'GATEWAY_TIMEOUT' : 'BAD_GATEWAY', message } }));
}

export function createApiProxy(apiUrl, timeoutMs = PROXY_TIMEOUT_MS) {
  return function proxy(req, res) {
    if (!apiUrl) return sendJson(res, 502, 'API_URL belum diatur: isi dengan alamat backend.');
    const target = new URL(apiUrl + req.url);
    const send = target.protocol === 'https:' ? httpsRequest : httpRequest;
    const upstream = send(target, { method: req.method, headers: { ...req.headers, host: target.host } }, (response) => {
      res.writeHead(response.statusCode, response.headers);
      response.pipe(res);
    });
    upstream.setTimeout(timeoutMs, () => {
      upstream.destroy();
      if (!res.headersSent) sendJson(res, 504, 'Backend tidak merespons dalam batas waktu.');
    });
    upstream.on('error', () => {
      if (!res.headersSent) sendJson(res, 502, 'Backend tidak dapat dihubungi.');
      else res.destroy();
    });
    req.pipe(upstream);
  };
}
