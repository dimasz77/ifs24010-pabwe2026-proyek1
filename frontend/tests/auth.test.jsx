import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { api, getToken, setToken } from '../src/lib/api';
import Login from '../src/pages/Login';
import Register, { validateRegister } from '../src/pages/Register';

const json = (status, body) => Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(body) });
function AuthState() {
  const { user, ready } = useAuth();
  return <p>{ready ? (user ? `SESSION:${user.name}` : 'SESSION:EMPTY') : 'SESSION:LOADING'}</p>;
}

const wrap = (ui, path = '/auth/login') => render(
  <MemoryRouter initialEntries={[path]}>
    <AuthProvider>
      <Routes>
        <Route path="/auth/login" element={ui} />
        <Route path="/auth/register" element={ui} />
        <Route path="/" element={<p>BERANDA</p>} />
      </Routes>
    </AuthProvider>
  </MemoryRouter>,
);

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe('validateRegister', () => {
  test('aturan dasar', () => {
    expect(validateRegister({ name: 'Dimas', username: 'dimas_s', email: '', password: 'abcdef', confirm: 'abcdef' })).toEqual({});
    const e = validateRegister({ name: 'Di', username: 'a b', email: 'x', password: '123', confirm: '456' });
    expect(Object.keys(e)).toEqual(['name', 'username', 'email', 'password', 'confirm']);
  });

  test('email panjang dengan pola titik berulang ditolak', () => {
    const errors = validateRegister({
      name: 'Dimas User',
      username: 'dimas_user',
      email: `${'a.'.repeat(25000)}!`,
      password: 'abcdef',
      confirm: 'abcdef',
    });

    expect(errors.email).toBe('Email tidak valid');
  });

  test('rejects usernames longer than the maximum length', () => {
    const errors = validateRegister({
      name: 'Dimas Sidabutar',
      username: 'd'.repeat(31),
      email: '',
      password: 'rahasia123',
      confirm: 'rahasia123',
    });

    expect(errors.username).toBe('Username maksimal 30 karakter');
  });

  test('rejects usernames shorter than the minimum length', () => {
    const errors = validateRegister({
      name: 'Dimas Sidabutar',
      username: 'di',
      email: '',
      password: 'rahasia123',
      confirm: 'rahasia123',
    });

    expect(errors.username).toBe('Username minimal 3 karakter');
  });
});

describe('Login', () => {
  test('elemen yang dicari penguji otomatis ada: #username, #password, #btn-submit', async () => {
    wrap(<Login />);
    expect(document.querySelector('#username')).toBeTruthy();
    expect(document.querySelector('#password')).toBeTruthy();
    expect(document.querySelector('#btn-submit')).toBeTruthy();
  });

  test('berhasil: menyimpan token dan pindah ke beranda', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockReturnValue(json(200, { success: true, data: { user: { id: 1, name: 'Dimas', email: 'd@x.id' }, token: 'tok123' } }));
    const user = userEvent.setup();
    wrap(<Login />);
    await user.type(screen.getByLabelText('Username'), 'dimas');
    await user.type(screen.getByLabelText('Kata sandi'), 'rahasia123');
    await user.click(screen.getByRole('button', { name: 'Masuk' }));
    expect(await screen.findByText('BERANDA')).toBeInTheDocument();
    expect(getToken()).toBe('tok123');
    expect(JSON.parse(spy.mock.calls[0][1].body)).toEqual({ username: 'dimas', password: 'rahasia123' });
  });

  test('gagal: menampilkan pesan dari server, tidak menyimpan token', async () => {
    vi.spyOn(globalThis, 'fetch').mockReturnValue(json(401, { success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Username atau kata sandi salah' } }));
    const user = userEvent.setup();
    wrap(<Login />);
    await user.type(screen.getByLabelText('Username'), 'dimas');
    await user.type(screen.getByLabelText('Kata sandi'), 'salah');
    await user.click(screen.getByRole('button', { name: 'Masuk' }));
    expect(await screen.findByText('Username atau kata sandi salah')).toBeInTheDocument();
    expect(getToken()).toBeNull();
  });

  test('validasi: kolom kosong tidak mengirim request', async () => {
    const spy = vi.spyOn(globalThis, 'fetch');
    const user = userEvent.setup();
    wrap(<Login />);
    await user.click(screen.getByRole('button', { name: 'Masuk' }));
    expect(await screen.findByText('Username wajib diisi')).toBeInTheDocument();
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('Register', () => {
  test('successfully registers a user and redirects to the home page', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockReturnValue(json(201, {
      success: true,
      data: { user: { id: 2, name: 'Dimas Sidabutar' }, token: 'new-token' },
    }));
    const user = userEvent.setup();

    wrap(<Register />, '/auth/register');
    await user.type(screen.getByLabelText('Nama lengkap'), ' Dimas Sidabutar ');
    await user.type(screen.getByLabelText('Username'), ' dimas ');
    await user.type(screen.getByLabelText('Email (opsional)'), ' dimas@example.com ');
    await user.type(screen.getByLabelText('Kata sandi'), 'rahasia123');
    await user.type(screen.getByLabelText('Ulangi kata sandi'), 'rahasia123');
    await user.click(screen.getByRole('button', { name: 'Daftar' }));

    expect(await screen.findByText('BERANDA')).toBeInTheDocument();
    expect(getToken()).toBe('new-token');
    expect(JSON.parse(fetchSpy.mock.calls[0][1].body)).toEqual({
      name: 'Dimas Sidabutar',
      username: 'dimas',
      email: 'dimas@example.com',
      password: 'rahasia123',
    });
  });

  test('konfirmasi sandi berbeda ditolak di frontend', async () => {
    const spy = vi.spyOn(globalThis, 'fetch');
    const user = userEvent.setup();
    wrap(<Register />, '/auth/register');
    await user.type(screen.getByLabelText('Nama lengkap'), 'Dimas Sidabutar');
    await user.type(screen.getByLabelText('Username'), 'dimas');
    await user.type(screen.getByLabelText('Kata sandi'), 'rahasia123');
    await user.type(screen.getByLabelText('Ulangi kata sandi'), 'beda12345');
    await user.click(screen.getByRole('button', { name: 'Daftar' }));
    expect(await screen.findByText('Konfirmasi kata sandi tidak sama')).toBeInTheDocument();
    expect(spy).not.toHaveBeenCalled();
  });

  test('username duplikat dari server tampil pada kolom username', async () => {
    vi.spyOn(globalThis, 'fetch').mockReturnValue(json(409, { success: false, error: { code: 'DUPLICATE', message: 'Username sudah dipakai', details: { username: 'Username sudah dipakai' } } }));
    const user = userEvent.setup();
    wrap(<Register />, '/auth/register');
    await user.type(screen.getByLabelText('Nama lengkap'), 'Dimas Sidabutar');
    await user.type(screen.getByLabelText('Username'), 'dimas');
    await user.type(screen.getByLabelText('Kata sandi'), 'rahasia123');
    await user.type(screen.getByLabelText('Ulangi kata sandi'), 'rahasia123');
    await user.click(screen.getByRole('button', { name: 'Daftar' }));
    expect(await screen.findByText('Username sudah dipakai')).toBeInTheDocument();
  });

  test('shows a general registration error when the request cannot reach the server', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('offline'));
    const user = userEvent.setup();
    wrap(<Register />, '/auth/register');
    await user.type(screen.getByLabelText('Nama lengkap'), 'Dimas Sidabutar');
    await user.type(screen.getByLabelText('Username'), 'dimas');
    await user.type(screen.getByLabelText('Kata sandi'), 'rahasia123');
    await user.type(screen.getByLabelText('Ulangi kata sandi'), 'rahasia123');
    await user.click(screen.getByRole('button', { name: 'Daftar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Server tidak dapat dihubungi');
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

describe('AuthProvider session recovery', () => {
  test('restores the current user from a saved token', async () => {
    setToken('saved-token');
    const spy = vi.spyOn(globalThis, 'fetch').mockReturnValue(json(200, {
      success: true,
      data: { id: 8, name: 'Dimas', token: 'saved-token' },
    }));

    render(
      <MemoryRouter>
        <AuthProvider><AuthState /></AuthProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByText('SESSION:Dimas')).toBeInTheDocument();
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('/auth/me'), expect.any(Object));
  });

  test('retains the saved token if session recovery fails without a 401', async () => {
    setToken('saved-token');
    vi.spyOn(globalThis, 'fetch').mockReturnValue(json(500, {
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Server error' },
    }));

    render(
      <MemoryRouter>
        <AuthProvider><AuthState /></AuthProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByText('SESSION:EMPTY')).toBeInTheDocument();
    expect(getToken()).toBe('saved-token');
  });

  test('clears an expired token when session recovery returns 401', async () => {
    setToken('expired-token');
    vi.spyOn(globalThis, 'fetch').mockReturnValue(json(401, {
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Sesi berakhir' },
    }));

    render(
      <MemoryRouter>
        <AuthProvider><AuthState /></AuthProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByText('SESSION:EMPTY')).toBeInTheDocument();
    expect(getToken()).toBeNull();
  });
});
