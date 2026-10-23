const { buildApp } = require('../helpers');
const { signToken, verifyToken, hashPassword, verifyPassword } = require('../../src/utils/auth');

describe('util auth', () => {
  test('hash kata sandi: benar/salah dan salt berbeda', () => {
    const h1 = hashPassword('rahasia123');
    const h2 = hashPassword('rahasia123');
    expect(h1).not.toBe(h2);
    expect(verifyPassword('rahasia123', h1)).toBe(true);
    expect(verifyPassword('salah', h1)).toBe(false);
    expect(verifyPassword('x', 'format-rusak')).toBe(false);
  });
  test('token: valid, dimanipulasi, dan kedaluwarsa', () => {
    const t = signToken({ sub: 1 }, 's', 60, 1_000_000);
    expect(verifyToken(t, 's', 1_000_000).sub).toBe(1);
    expect(verifyToken(t, 'kunci-lain', 1_000_000)).toBeNull();
    expect(verifyToken(t + 'x', 's', 1_000_000)).toBeNull();
    expect(verifyToken(t, 's', 1_000_000 + 61_000)).toBeNull();
    expect(verifyToken('bukan.token', 's')).toBeNull();
  });
});

describe('API /api/auth', () => {
  let ctx;
  beforeEach(() => { ctx = buildApp({ seed: false }); });
  afterEach(() => ctx.db.close());
  const user = { name: 'Dimas Sidabutar', email: 'Dimas@Contoh.id', password: 'kataSandi123' };

  test('registrasi berhasil: 201, email dinormalkan, token valid, hash tidak bocor', async () => {
    const res = await ctx.raw.post('/api/auth/register').send(user);
    expect(res.status).toBe(201);
    expect(res.body.data.user).toEqual({ id: expect.any(Number), name: user.name, email: 'dimas@contoh.id' });
    expect(res.body.data.token).toBeTruthy();
    expect(JSON.stringify(res.body)).not.toMatch(/scrypt|password_hash/);
    const stored = ctx.db.prepare('SELECT password_hash FROM users WHERE email = ?').get('dimas@contoh.id');
    expect(stored.password_hash).not.toContain(user.password);
  });

  test('registrasi: validasi (kosong, email salah, sandi < 8) dan email duplikat 409', async () => {
    const empty = await ctx.raw.post('/api/auth/register').send({});
    expect(empty.status).toBe(422);
    expect(Object.keys(empty.body.error.details)).toEqual(['name', 'email', 'password']);
    const bad = await ctx.raw.post('/api/auth/register').send({ ...user, email: 'x', password: '123' });
    expect(Object.keys(bad.body.error.details)).toEqual(expect.arrayContaining(['email', 'password']));
    await ctx.raw.post('/api/auth/register').send(user);
    const dup = await ctx.raw.post('/api/auth/register').send({ ...user, email: 'DIMAS@contoh.id' });
    expect(dup.status).toBe(409);
    expect(dup.body.error.details.email).toBe('Email sudah terdaftar');
  });

  test('registrasi dapat ditutup lewat konfigurasi (403)', async () => {
    ctx.app.locals.config.allowRegistration = false;
    const res = await ctx.raw.post('/api/auth/register').send(user);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('REGISTRATION_CLOSED');
  });

  test('login berhasil lalu token dapat dipakai untuk /auth/me', async () => {
    await ctx.raw.post('/api/auth/register').send(user);
    const login = await ctx.raw.post('/api/auth/login').send({ email: 'dimas@contoh.id', password: user.password });
    expect(login.status).toBe(200);
    const me = await ctx.raw.get('/api/auth/me').set('Authorization', `Bearer ${login.body.data.token}`);
    expect(me.status).toBe(200);
    expect(me.body.data.email).toBe('dimas@contoh.id');
  });

  test('login gagal: sandi salah dan email tidak terdaftar memberi pesan yang sama (401)', async () => {
    await ctx.raw.post('/api/auth/register').send(user);
    const wrong = await ctx.raw.post('/api/auth/login').send({ email: 'dimas@contoh.id', password: 'salahsalah' });
    const unknown = await ctx.raw.post('/api/auth/login').send({ email: 'tidakada@contoh.id', password: 'kataSandi123' });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body.error.message).toBe(unknown.body.error.message);
    expect((await ctx.raw.post('/api/auth/login').send({})).status).toBe(422);
  });

  test('endpoint data wajib login: tanpa/dengan token rusak/kedaluwarsa -> 401; health tetap publik', async () => {
    for (const path of ['/api/motorcycles', '/api/customers', '/api/rentals', '/api/dashboard/summary', '/api/locations', '/api/auth/me']) {
      expect((await ctx.raw.get(path)).status).toBe(401);
    }
    expect((await ctx.raw.post('/api/motorcycles').send({})).status).toBe(401);
    expect((await ctx.raw.get('/api/motorcycles').set('Authorization', 'Bearer rusak.rusak.rusak')).status).toBe(401);
    const expired = signToken({ sub: 1 }, ctx.config.jwtSecret, 60, Date.now() - 120_000);
    expect((await ctx.raw.get('/api/motorcycles').set('Authorization', `Bearer ${expired}`)).status).toBe(401);
    expect((await ctx.raw.get('/api/health')).status).toBe(200);
  });

  test('token milik pengguna yang sudah dihapus ditolak', async () => {
    const res = await ctx.raw.post('/api/auth/register').send(user);
    ctx.db.prepare('DELETE FROM users WHERE id = ?').run(res.body.data.user.id);
    expect((await ctx.raw.get('/api/auth/me').set('Authorization', `Bearer ${res.body.data.token}`)).status).toBe(401);
  });

  test('database kosong: dashboard dan daftar tetap berfungsi', async () => {
    const dash = await ctx.api.get('/api/dashboard/summary');
    expect(dash.status).toBe(200);
    expect(dash.body.data.fleet.total).toBe(0);
    expect((await ctx.api.get('/api/motorcycles')).body.meta.total).toBe(0);
    expect((await ctx.api.get('/api/locations')).body.data).toHaveLength(5);
  });
});
