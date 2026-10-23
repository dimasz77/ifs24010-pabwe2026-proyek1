import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, getToken, setToken } from '../lib/api';

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(() => !getToken());

  // Pulihkan sesi dari token yang tersimpan
  useEffect(() => {
    if (!getToken()) return;
    api.get('/auth/me')
      .then((res) => setUser(res.data))
      .catch((err) => { if (err.status === 401) setToken(null); })
      .finally(() => setReady(true));
  }, []);

  // Token ditolak server (kedaluwarsa/tidak valid) -> keluar otomatis
  useEffect(() => {
    const onExpired = () => setUser(null);
    window.addEventListener('auth:expired', onExpired);
    return () => window.removeEventListener('auth:expired', onExpired);
  }, []);

  const finish = useCallback((res) => {
    setToken(res.data.token);
    setUser(res.data.user);
    return res.data.user;
  }, []);

  const value = useMemo(() => ({
    user,
    ready,
    login: async (email, password) => finish(await api.post('/auth/login', { email, password })),
    register: async (payload) => finish(await api.post('/auth/register', payload)),
    logout: () => { setToken(null); setUser(null); },
  }), [user, ready, finish]);

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}
