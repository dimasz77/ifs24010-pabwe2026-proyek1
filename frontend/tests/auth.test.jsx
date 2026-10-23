import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '../src/context/AuthContext';
import { api, getToken, setToken } from '../src/lib/api';
import Login from '../src/pages/Login';
import Register, { validateRegister } from '../src/pages/Register';

const json = (status, body) => Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(body) });
const wrap = (ui, path = '/masuk') => render(
  <MemoryRouter initialEntries={[path]}>
    <AuthProvider>
      <Routes>
        <Route path="/masuk" element={ui} />
        <Route path="/daftar" element={ui} />
        <Route path="/" element={<p>BERANDA</p>} />
      </Routes>
    </AuthProvider>
  </MemoryRouter>,
);

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe('validateRegister', () => {
  test('aturan dasar', () => {
    expect(validateRegister({ name: 'Dimas', email: 'd@x.id', password: 'abcdefgh', confirm: 'abcdefgh' })).toEqual({});
    const e = validateRegister({ name: 'Di', email: 'x', password: '123', confirm: '456' });
    expect(Object.keys(e)).toEqual(['name', 'email', 'password', 'confirm']);
  });
});

describe('Login', () => {
  test('berhasil: menyimpan token dan pindah ke beranda', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockReturnValue(json(200, { success: true, data: { user: { id: 1, name: 'Dimas', email: 'd@x.id' }, token: 'tok123' } }));
    const user = userEvent.setup();
    wrap(<Login />);
    await user.type(screen.getByLabelText('Email'), 'd@x.id');
    await user.type(screen.getByLabelText('Kata sandi'), 'rahasia123');
    await user.click(screen.getByRole('button', { name: 'Masuk' }));
    expect(await screen.findByText('BERANDA')).toBeInTheDocument();
    expect(getToken()).toBe('tok123');
    expect(JSON.parse(spy.mock.calls[0][1].body)).toEqual({ email: 'd@x.id', password: 'rahasia123' });
  });

  test('gagal: menampilkan pesan dari server, tidak menyimpan token', async () => {
    vi.spyOn(globalThis, 'fetch').mockReturnValue(json(401, { success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Email atau kata sandi salah' } }));
    const user = userEvent.setup();
    wrap(<Login />);
    await user.type(screen.getByLabelText('Email'), 'd@x.id');
    await user.type(screen.getByLabelText('Kata sandi'), 'salah');
    await user.click(screen.getByRole('button', { name: 'Masuk' }));
    expect(await screen.findByText('Email atau kata sandi salah')).toBeInTheDocument();
    expect(getToken()).toBeNull();
  });

  test('validasi: kolom kosong tidak mengirim request', async () => {
    const spy = vi.spyOn(globalThis, 'fetch');
    const user = userEvent.setup();
    wrap(<Login />);
    await user.click(screen.getByRole('button', { name: 'Masuk' }));
    expect(await screen.findByText('Email wajib diisi')).toBeInTheDocument();
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('Register', () => {
  test('konfirmasi sandi berbeda ditolak di frontend', async () => {
    const spy = vi.spyOn(globalThis, 'fetch');
    const user = userEvent.setup();
    wrap(<Register />, '/daftar');
    await user.type(screen.getByLabelText('Nama lengkap'), 'Dimas Sidabutar');
    await user.type(screen.getByLabelText('Email'), 'd@x.id');
    await user.type(screen.getByLabelText('Kata sandi'), 'rahasia123');
    await user.type(screen.getByLabelText('Ulangi kata sandi'), 'beda12345');
    await user.click(screen.getByRole('button', { name: 'Daftar' }));
    expect(await screen.findByText('Konfirmasi kata sandi tidak sama')).toBeInTheDocument();
    expect(spy).not.toHaveBeenCalled();
  });

  test('email duplikat dari server tampil pada kolom email', async () => {
    vi.spyOn(globalThis, 'fetch').mockReturnValue(json(409, { success: false, error: { code: 'DUPLICATE', message: 'Email sudah terdaftar', details: { email: 'Email sudah terdaftar' } } }));
    const user = userEvent.setup();
    wrap(<Register />, '/daftar');
    await user.type(screen.getByLabelText('Nama lengkap'), 'Dimas Sidabutar');
    await user.type(screen.getByLabelText('Email'), 'd@x.id');
    await user.type(screen.getByLabelText('Kata sandi'), 'rahasia123');
    await user.type(screen.getByLabelText('Ulangi kata sandi'), 'rahasia123');
    await user.click(screen.getByRole('button', { name: 'Daftar' }));
    expect(await screen.findByText('Email sudah terdaftar')).toBeInTheDocument();
  });
});

describe('api client + token', () => {
  test('menyertakan header Authorization bila token ada', async () => {
    setToken('abc');
    const spy = vi.spyOn(globalThis, 'fetch').mockReturnValue(json(200, { success: true, data: [] }));
    await api.get('/motorcycles');
    expect(spy.mock.calls[0][1].headers.Authorization).toBe('Bearer abc');
  });

  test('respons 401 menghapus token dan memicu event auth:expired', async () => {
    setToken('abc');
    const handler = vi.fn();
    window.addEventListener('auth:expired', handler);
    vi.spyOn(globalThis, 'fetch').mockReturnValue(json(401, { success: false, error: { code: 'UNAUTHORIZED', message: 'x' } }));
    await expect(api.get('/motorcycles')).rejects.toMatchObject({ status: 401 });
    expect(getToken()).toBeNull();
    expect(handler).toHaveBeenCalled();
    window.removeEventListener('auth:expired', handler);
  });
});
