import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../lib/api';
import AuthShell from '../components/AuthShell';
import { Field } from '../components/ui';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateRegister(v) {
  const e = {};
  if (v.name.trim().length < 3) e.name = 'Nama minimal 3 karakter';
  if (!v.email.trim()) e.email = 'Email wajib diisi';
  else if (!EMAIL_RE.test(v.email.trim())) e.email = 'Email tidak valid';
  if (v.password.length < 8) e.password = 'Kata sandi minimal 8 karakter';
  if (v.confirm !== v.password) e.confirm = 'Konfirmasi kata sandi tidak sama';
  return e;
}

export default function Register() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [v, setV] = useState({ name: '', email: '', password: '', confirm: '' });
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
      await register({ name: v.name.trim(), email: v.email.trim(), password: v.password });
      navigate('/', { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.details) setErrors(err.details);
      setFormError(err.message);
    } finally { setBusy(false); }
  }

  return (
    <AuthShell title="Buat akun" subtitle="Daftar untuk mulai mengelola Jenika Rental."
      footer={<>Sudah punya akun? <Link className="link" to="/masuk">Masuk</Link></>}>
      <form onSubmit={submit} noValidate className="auth-form">
        <Field label="Nama lengkap" error={errors.name} htmlFor="name">
          <input id="name" autoComplete="name" value={v.name} onChange={set('name')} />
        </Field>
        <Field label="Email" error={errors.email} htmlFor="email">
          <input id="email" type="email" autoComplete="email" value={v.email} onChange={set('email')} />
        </Field>
        <Field label="Kata sandi" error={errors.password} htmlFor="password" hint="Minimal 8 karakter">
          <input id="password" type="password" autoComplete="new-password" value={v.password} onChange={set('password')} />
        </Field>
        <Field label="Ulangi kata sandi" error={errors.confirm} htmlFor="confirm">
          <input id="confirm" type="password" autoComplete="new-password" value={v.confirm} onChange={set('confirm')} />
        </Field>
        {formError && !Object.keys(errors).length && <p className="form-error" role="alert">{formError}</p>}
        <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Memproses...' : 'Daftar'}</button>
      </form>
    </AuthShell>
  );
}
