import React, { createContext, useContext, useMemo, useState, useCallback, useEffect } from 'react';
import { login as apiLogin } from '../services/api';
import { setToken as setAuthToken, initAuthToken, getToken as getStoredToken } from '../services/authToken';
import permissionService from '../services/permissionService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState('');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [permissionKeys, setPermissionKeys] = useState([]);

  const KNOWN_RESOURCES = useMemo(() => (
    ['actividades','alertas','almacenes','categorias','cultivos','epa','finanzas','ingresos','insumos','inventario','lotes','movimientos','permisos','realiza','rol','salidas','sensores','sublotes','tiene','tiporol','tratamientos','usuarios','utiliza']
  ), []);

  const isAdminOrInstructor = useCallback((u) => {
    const r = String(u?.nombre_rol || u?.rol || u?.id_rol?.nombre_rol || '').toLowerCase();
    return r.includes('admin') || r.includes('instructor');
  }, []);

  const refreshPermissions = useCallback(async () => {
    try {
      if (!token) { setPermissionKeys([]); return; }
      const keys = await permissionService.getMyKeys(token);
      setPermissionKeys(Array.isArray(keys) ? keys : []);
    } catch (e) {
      setPermissionKeys([]);
    }
  }, [token]);

  const login = useCallback(async ({ numero_documento, password }) => {
    setLoading(true);
    setError('');
    try {
      const { token: t, user: u } = await apiLogin({ numero_documento, password });
      setToken(t);
      setAuthToken(t);
      setUser(u || null);
      try {
        const keys = await permissionService.getMyKeys(t);
        const base = Array.isArray(keys) ? keys : [];
        const wild = isAdminOrInstructor(u) ? KNOWN_RESOURCES.map(r => `${r}:*`) : [];
        setPermissionKeys([...new Set([...base, ...wild])]);
      } catch {
        const wild = isAdminOrInstructor(u) ? KNOWN_RESOURCES.map(r => `${r}:*`) : [];
        setPermissionKeys(wild);
      }
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
    setPermissionKeys([]);
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

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (!token) { setPermissionKeys([]); return; }
        const keys = await permissionService.getMyKeys(token);
        const base = Array.isArray(keys) ? keys : [];
        const wild = isAdminOrInstructor(user) ? KNOWN_RESOURCES.map(r => `${r}:*`) : [];
        if (mounted) setPermissionKeys([...new Set([...base, ...wild])]);
      } catch (e) {
        const wild = isAdminOrInstructor(user) ? KNOWN_RESOURCES.map(r => `${r}:*`) : [];
        if (mounted) setPermissionKeys(wild);
      }
    })();
    return () => { mounted = false; };
  }, [token]);

  const value = useMemo(() => ({ token, user, login, logout, loading, error, permissionKeys, refreshPermissions }), [token, user, login, logout, loading, error, permissionKeys, refreshPermissions]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
