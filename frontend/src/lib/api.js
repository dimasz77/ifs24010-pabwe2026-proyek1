const BASE = `${(import.meta.env.VITE_API_URL || '').replace(/\/$/, '')}/api`;

const TOKEN_KEY = 'jenika_token';
export const getToken = () => { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } };
export const setToken = (t) => {
  try { if (t) localStorage.setItem(TOKEN_KEY, t); else localStorage.removeItem(TOKEN_KEY); } catch { /* penyimpanan tidak tersedia */ }
};

export class ApiError extends Error {
  constructor(message, { status = 0, code = 'UNKNOWN', details = null } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
  get isNetwork() { return this.code === 'NETWORK'; }
}

function buildUrl(path, params) {
  const qs = new URLSearchParams();
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') qs.set(k, v);
  });
  const s = qs.toString();
  const query = s ? `?${s}` : '';
  return `${BASE}${path}${query}`;
}

function expireSessionForUnauthorizedRequest(path) {
  if (path.startsWith('/auth/login')) return;
  if (path.startsWith('/auth/register')) return;
  setToken(null);
  globalThis.dispatchEvent(new Event('auth:expired'));
}

async function request(path, { method = 'GET', body, params, signal } = {}) {
  let res;
  try {
    const token = getToken();
    const headers = {};
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = `Bearer ${token}`;
    res = await fetch(buildUrl(path, params), {
      method,
      signal,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new ApiError('Server tidak dapat dihubungi. Periksa koneksi atau pastikan backend berjalan.', { code: 'NETWORK' });
  }

  let json = null;
  try { json = await res.json(); } catch { /* respons bukan JSON */ }

  if (res.status === 401) expireSessionForUnauthorizedRequest(path);

  if (res.ok && json && json.success !== false) {
    return { data: json.data, meta: json.meta || null };
  }

  const e = json?.error;
  throw new ApiError(
    e?.message || `Permintaan gagal (HTTP ${res.status}).`,
    { status: res.status, code: e?.code || 'BAD_RESPONSE', details: e?.details || null },
  );
}

export const api = {
  get: (path, params, signal) => request(path, { params, signal }),
  post: (path, body) => request(path, { method: 'POST', body }),
  put: (path, body) => request(path, { method: 'PUT', body }),
  patch: (path, body) => request(path, { method: 'PATCH', body }),
  del: (path) => request(path, { method: 'DELETE' }),
};
