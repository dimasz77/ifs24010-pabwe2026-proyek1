import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../lib/api';
import AuthShell from '../components/AuthShell';
import { Field } from '../components/ui';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_RE = /^[A-Za-z0-9_.-]+$/;

export function validateRegister(v) {
  const e = {};
  if (v.name.trim().length < 3) e.name = 'Nama minimal 3 karakter';
  const u = v.username.trim();
  if (u.length < 3) e.username = 'Username minimal 3 karakter';
  else if (u.length > 30) e.username = 'Username maksimal 30 karakter';
  else if (!USERNAME_RE.test(u)) e.username = 'Username hanya boleh huruf, angka, titik, garis bawah, dan strip';
  if (v.email.trim() && !EMAIL_RE.test(v.email.trim())) e.email = 'Email tidak valid';
  if (v.password.length < 6) e.password = 'Kata sandi minimal 6 karakter';
  if (v.confirm !== v.password) e.confirm = 'Konfirmasi kata sandi tidak sama';
  return e;
}

export default function Register() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [v, setV] = useState({ name: '', username: '', email: '', password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setV((s) => ({ ...s, [k]: e.target.value }));

  if (user) return <Navigate to="/" replace />;

  async function submit(e) {
    e.preventDefault();
    const errs = validateRegister(v);
    setErrors(errs);
    setFormError('');
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      await register({ name: v.name.trim(), username: v.username.trim(), email: v.email.trim(), password: v.password });
      navigate('/', { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.details) setErrors(err.details);
      setFormError(err.message);
    } finally { setBusy(false); }
  }

  return (
    <AuthShell title="Buat akun" subtitle="Daftar untuk mulai mengelola Jenika Rental."
      footer={<>Sudah punya akun? <Link className="link" to="/auth/login">Masuk</Link></>}>
      <form onSubmit={submit} noValidate className="auth-form" id="form-register">
        <Field label="Nama lengkap" error={errors.name} htmlFor="name">
          <input id="name" name="name" autoComplete="name" value={v.name} onChange={set('name')} />
        </Field>
        <Field label="Username" error={errors.username} htmlFor="username">
          <input id="username" name="username" autoComplete="username" autoCapitalize="none" value={v.username} onChange={set('username')} />
        </Field>
        <Field label="Email (opsional)" error={errors.email} htmlFor="email">
          <input id="email" name="email" type="email" autoComplete="email" value={v.email} onChange={set('email')} />
        </Field>
        <Field label="Kata sandi" error={errors.password} htmlFor="password" hint="Minimal 6 karakter">
          <input id="password" name="password" type="password" autoComplete="new-password" value={v.password} onChange={set('password')} />
        </Field>
        <Field label="Ulangi kata sandi" error={errors.confirm} htmlFor="confirm">
          <input id="confirm" name="confirm" type="password" autoComplete="new-password" value={v.confirm} onChange={set('confirm')} />
        </Field>
        {formError && !Object.keys(errors).length && <p className="form-error" role="alert">{formError}</p>}
        <button id="btn-submit" type="submit" className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Memproses...' : 'Daftar'}</button>
      </form>
    </AuthShell>
  );
}
