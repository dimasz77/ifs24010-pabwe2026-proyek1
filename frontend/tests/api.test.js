import { api, ApiError } from '../src/lib/api';

const respond = (status, body) => Promise.resolve({ ok: status >= 200 && status < 300, status, json: () => Promise.resolve(body) });

afterEach(() => vi.restoreAllMocks());

describe('api client', () => {
  test('mengembalikan data dan meta, menyusun query string tanpa nilai kosong', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockReturnValue(respond(200, { success: true, data: [1], meta: { page: 1 } }));
    const res = await api.get('/motorcycles', { q: 'beat', type: '', page: 2 });
    expect(res).toEqual({ data: [1], meta: { page: 1 } });
    expect(spy.mock.calls[0][0]).toBe('/api/motorcycles?q=beat&page=2');
  });

  test('POST mengirim JSON', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockReturnValue(respond(201, { success: true, data: { id: 1 } }));
    await api.post('/customers', { a: 1 });
    expect(spy.mock.calls[0][1]).toMatchObject({ method: 'POST', body: '{"a":1}' });
  });

  test('error validasi dari server menjadi ApiError dengan details', async () => {
    vi.spyOn(globalThis, 'fetch').mockReturnValue(respond(422, { success: false, error: { code: 'VALIDATION_ERROR', message: 'Tidak valid', details: { plate: 'wajib' } } }));
    await expect(api.post('/motorcycles', {})).rejects.toMatchObject({ status: 422, code: 'VALIDATION_ERROR', details: { plate: 'wajib' } });
  });

  test('backend mati -> ApiError NETWORK', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));
    const err = await api.get('/health').catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.isNetwork).toBe(true);
  });

  test('respons non-JSON (misal 502) ditangani', async () => {
    vi.spyOn(globalThis, 'fetch').mockReturnValue(Promise.resolve({ ok: false, status: 502, json: () => Promise.reject(new Error('x')) }));
    await expect(api.get('/x')).rejects.toMatchObject({ status: 502, code: 'BAD_RESPONSE' });
  });
});
