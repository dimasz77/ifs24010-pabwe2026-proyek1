import { createServer } from 'node:http';
import { afterEach, describe, expect, test } from 'vitest';
import { createApiProxy } from '../scripts/proxy.js';

const servers = [];

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      server.removeListener('error', reject);
      servers.push(server);
      resolve(`http://127.0.0.1:${server.address().port}`);
    });
  });
}

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise((resolve) => {
    server.closeAllConnections();
    server.close(resolve);
  })));
});

describe('API reverse proxy', () => {
  test('forwards requests and preserves backend session cookies', async () => {
    const upstream = createServer((req, res) => {
      expect(req.url).toBe('/api/auth/login');
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Set-Cookie': 'jenika_session=session-value; HttpOnly; Path=/api',
      });
      res.end('{"success":true}');
    });
    const upstreamUrl = await listen(upstream);
    const proxyServer = createServer(createApiProxy(upstreamUrl));
    const proxyUrl = await listen(proxyServer);

    const response = await fetch(`${proxyUrl}/api/auth/login`);

    expect(response.status).toBe(200);
    expect(response.headers.get('set-cookie')).toContain('HttpOnly');
    expect(await response.json()).toEqual({ success: true });
  });

  test('returns a gateway timeout when the backend stops responding', async () => {
    const upstream = createServer(() => {});
    const upstreamUrl = await listen(upstream);
    const proxyServer = createServer(createApiProxy(upstreamUrl, 30));
    const proxyUrl = await listen(proxyServer);

    const response = await fetch(`${proxyUrl}/api/health`);

    expect(response.status).toBe(504);
    expect(await response.json()).toMatchObject({
      success: false,
      error: { code: 'GATEWAY_TIMEOUT' },
    });
  });
});
