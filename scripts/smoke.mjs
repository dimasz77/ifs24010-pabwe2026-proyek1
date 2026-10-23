// Smoke test terhadap aplikasi yang sedang berjalan.  Pemakaian: node scripts/smoke.mjs http://localhost:4000
const base = (process.argv[2] || 'http://localhost:4000').replace(/\/$/, '');
let failed = 0;

let token = '';
async function call(method, path, body) {
  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(base + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, json: await res.json().catch(() => null), type: res.headers.get('content-type') || '' };
}
function check(name, cond, extra = '') {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${cond ? '' : `  ${extra}`}`);
  if (!cond) failed += 1;
}

const health = await call('GET', '/api/health');
check('GET /api/health = 200 dan database terhubung', health.status === 200 && health.json?.data?.database === 'connected');

const noAuth = await call('GET', '/api/motorcycles');
check('GET /api/motorcycles tanpa login = 401', noAuth.status === 401);

const email = `smoke${Date.now()}@example.com`;
const reg = await call('POST', '/api/auth/register', { name: 'Smoke Test', email, password: 'smoke-test-123' });
check('POST /api/auth/register = 201 (atau 403 bila registrasi ditutup)', reg.status === 201 || reg.status === 403, JSON.stringify(reg.json));
const login = reg.status === 201 ? reg : await call('POST', '/api/auth/login', { email: process.env.SMOKE_EMAIL, password: process.env.SMOKE_PASSWORD });
token = login.json?.data?.token || '';
check('Memperoleh token login', Boolean(token), 'registrasi ditutup? set SMOKE_EMAIL dan SMOKE_PASSWORD');

const dash = await call('GET', '/api/dashboard/summary');
check('GET /api/dashboard/summary memuat armada', dash.status === 200 && dash.json?.data?.fleet?.total >= 0);

const list = await call('GET', '/api/motorcycles?limit=3');
check('GET /api/motorcycles mengembalikan daftar + meta', list.status === 200 && Array.isArray(list.json?.data) && list.json?.meta?.total >= 0);

const plate = `BB ${Math.floor(1000 + Math.random() * 8999)} ZZ`;
const created = await call('POST', '/api/motorcycles', {
  plate, brand: 'Smoke', model: 'Test', type: 'matic', engine_cc: 110, year: 2024, price_per_day: 50000, location_id: 1,
});
check('POST /api/motorcycles = 201', created.status === 201, JSON.stringify(created.json));
const id = created.json?.data?.id;

const invalid = await call('POST', '/api/motorcycles', {});
check('POST body kosong = 422', invalid.status === 422);

if (id) {
  const got = await call('GET', `/api/motorcycles/${id}`);
  check('GET /api/motorcycles/:id = 200', got.status === 200 && got.json?.data?.plate === plate);
  const del = await call('DELETE', `/api/motorcycles/${id}`);
  check('DELETE /api/motorcycles/:id = 200', del.status === 200);
  const gone = await call('GET', `/api/motorcycles/${id}`);
  check('GET setelah DELETE = 404', gone.status === 404);
}

const front = await fetch(base + '/');
const html = front.ok ? await front.text() : '';
check('Frontend disajikan (GET / berisi aplikasi React)', front.ok && html.includes('id="root"'), `status ${front.status}`);

console.log(failed ? `\nSmoke test GAGAL (${failed})` : '\nSmoke test LULUS');
process.exit(failed ? 1 : 0);
