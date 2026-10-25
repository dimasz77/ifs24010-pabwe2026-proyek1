import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { ReactNodePropType, validateComponentProps } from '../lib/validateComponentProps';

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }) {
  validateComponentProps(AuthProvider, { children });
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    api.get('/auth/me')
      .then((res) => { if (active) setUser(res.data); })
      .catch(() => { if (active) setUser(null); })
      .finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const onExpired = () => setUser(null);
    globalThis.addEventListener('auth:expired', onExpired);
    return () => globalThis.removeEventListener('auth:expired', onExpired);
  }, []);

  const finish = useCallback((res) => {
    setUser(res.data.user);
    return res.data.user;
  }, []);

  const value = useMemo(() => ({
    user,
    ready,
    login: async (username, password) => finish(await api.post('/auth/login', { username, password })),
    register: async (payload) => finish(await api.post('/auth/register', payload)),
    logout: async () => {
      await api.post('/auth/logout');
      setUser(null);
    },
  }), [user, ready, finish]);

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

AuthProvider.propTypes = {
  children: ReactNodePropType.isRequired,
};
