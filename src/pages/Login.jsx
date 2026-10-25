import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AuthShell from '../components/AuthShell';
import { Field } from '../components/critical-ui';

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [v, setV] = useState({ username: '', password: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setV((s) => ({ ...s, [k]: e.target.value }));

  if (user) return <Navigate to="/" replace />;

  async function submit(e) {
    e.preventDefault();
    const errs = {};
    if (!v.username.trim()) errs.username = 'Username wajib diisi';
    if (!v.password) errs.password = 'Kata sandi wajib diisi';
    setErrors(errs);
    setFormError('');
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      await login(v.username.trim(), v.password);
      navigate(location.state?.from || '/', { replace: true });
    } catch (err) {
      setFormError(err.message);
    } finally { setBusy(false); }
  }

  return (
    <AuthShell title="Masuk" subtitle="Silakan masuk untuk mengelola usaha rental Anda."
      footer={<>Belum punya akun? <Link className="link" to="/auth/register">Daftar sekarang</Link></>}>
      <form onSubmit={submit} noValidate className="auth-form" id="form-login">
        <Field label="Username" error={errors.username} htmlFor="username">
          <input id="username" name="username" autoComplete="username" autoCapitalize="none" value={v.username} onChange={set('username')} />
        </Field>
        <Field label="Kata sandi" error={errors.password} htmlFor="password">
          <input id="password" name="password" type="password" autoComplete="current-password" value={v.password} onChange={set('password')} />
        </Field>
        {formError && <p className="form-error" role="alert">{formError}</p>}
        <button id="btn-submit" type="submit" className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Memproses...' : 'Masuk'}</button>
      </form>
    </AuthShell>
  );
}
