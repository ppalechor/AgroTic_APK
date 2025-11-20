import React, { createContext, useContext, useMemo, useState, useCallback, useEffect } from 'react';
import { login as apiLogin } from '../services/api';
import { setToken as setAuthToken, initAuthToken, getToken as getStoredToken } from '../services/authToken';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState('');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const login = useCallback(async ({ numero_documento, password }) => {
    setLoading(true);
    setError('');
    try {
      const { token: t, user: u } = await apiLogin({ numero_documento, password });
      setToken(t);
      setAuthToken(t);
      setUser(u || null);
      return { token: t, user: u };
    } catch (e) {
      setError(e?.message || 'Error de autenticación');
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setToken('');
    setAuthToken('');
    setUser(null);
    setError('');
  }, []);

  // Load token from persistent storage once on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await initAuthToken();
        const t = getStoredToken();
        if (mounted && t) setToken(t);
      } catch (e) {
        // ignore
      }
    })();
    return () => { mounted = false; };
  }, []);

  const value = useMemo(() => ({ token, user, login, logout, loading, error }), [token, user, login, logout, loading, error]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}