import React, { createContext, useContext, useMemo, useState, useCallback, useEffect } from 'react';
import { login as apiLogin, getMe, refresh } from '../services/api';
import { setToken as setAuthToken, initAuthToken, getToken as getStoredToken, setUser as setStoredUser, initAuthUser, getUser as getStoredUser } from '../services/authToken';
import permissionService from '../services/permissionService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState('');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [permissionKeys, setPermissionKeys] = useState([]);
  const [didStartupRefresh, setDidStartupRefresh] = useState(false);

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
      const mine = await permissionService.getMyKeys(token);
      let keys = Array.isArray(mine) ? mine : [];
      // Fallback: si /usuario/me falla (401/403/400) o devuelve vacío, intenta por ID del usuario conocido
      if ((!keys || keys.length === 0) && (user?.id || user?.id_usuarios || user?.id_usuario)) {
        const uid = user?.id || user?.id_usuarios || user?.id_usuario;
        const byId = await permissionService.getUserKeys(uid, token);
        keys = Array.isArray(byId) ? byId : [];
      }
      setPermissionKeys(keys);
    } catch (e) {
      setPermissionKeys([]);
    }
  }, [token, user]);

  const login = useCallback(async ({ numero_documento, password }) => {
    setLoading(true);
    setError('');
    try {
      const { token: t, user: u } = await apiLogin({ numero_documento, password });
      setToken(t);
      setAuthToken(t);
      setUser(u || null);
      setStoredUser(u || null);
      try {
        console.log('[AuthContext] loading permissions for user', u?.id || u?.id_usuarios || u?.id_usuario);
        const keys = await permissionService.getUserKeys(u?.id || u?.id_usuarios || u?.id_usuario, t);
        const base = Array.isArray(keys) ? keys : [];
        const wild = isAdminOrInstructor(u) ? KNOWN_RESOURCES.map(r => `${r}:*`) : [];
        setPermissionKeys([...new Set([...base, ...wild])]);
        console.log('[AuthContext] Admin wildcard permissions applied:', wild);
        console.log('[AuthContext] my keys loaded:', [...new Set([...base, ...wild])]);
      } catch {
        const wild = isAdminOrInstructor(u) ? KNOWN_RESOURCES.map(r => `${r}:*`) : [];
        setPermissionKeys(wild);
        console.log('[AuthContext] Admin wildcard permissions applied:', wild);
        console.log('[AuthContext] my keys loaded:', wild);
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
    setStoredUser(null);
    setError('');
    setPermissionKeys([]);
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await initAuthToken();
        await initAuthUser();
        const t = getStoredToken();
        const u = getStoredUser();
        if (mounted && t) setToken(t);
        if (mounted && u) setUser(u);
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
        if (!token) return;
        // Intentar cargar el usuario; si falla, mantener sesión sin forzar logout
        if (!user) {
          try {
            const u = await getMe(token);
            if (mounted) {
              setUser(u || null);
              setStoredUser(u || null);
            }
          } catch (e) {
            // No invalidar sesión al iniciar; registrar error y continuar
            console.warn('[AuthContext] getMe falló en arranque, se mantiene sesión:', e?.message);
          }
        }
        // Intentar refrescar token una única vez; si falla, mantener el actual
        if (!didStartupRefresh) {
          try {
            const r = await refresh(token);
            if (mounted) {
              setToken(r.token);
              setAuthToken(r.token);
              setUser(r.user || user);
              setStoredUser(r.user || user);
            }
          } catch (e) {
            console.warn('[AuthContext] refresh falló en arranque, se conserva token actual:', e?.message);
          } finally {
            if (mounted) setDidStartupRefresh(true);
          }
        }
      } catch (e) {
        // No forzar logout por errores en arranque
        console.warn('[AuthContext] error en arranque, sesión conservada:', e?.message);
      }
    })();
    return () => { mounted = false; };
  }, [token, user, didStartupRefresh]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (!token) { setPermissionKeys([]); return; }
        if (!user) { setPermissionKeys([]); return; }
        console.log('[AuthContext] refreshing permissions for user', user?.id || user?.id_usuarios || user?.id_usuario);
        const keys = await permissionService.getUserKeys(user?.id || user?.id_usuarios || user?.id_usuario, token);
        const base = Array.isArray(keys) ? keys : [];
        const wild = isAdminOrInstructor(user) ? KNOWN_RESOURCES.map(r => `${r}:*`) : [];
        if (mounted) setPermissionKeys([...new Set([...base, ...wild])]);
        console.log('[AuthContext] Admin wildcard permissions applied:', wild);
        console.log('[AuthContext] my keys loaded:', [...new Set([...base, ...wild])]);
      } catch (e) {
        const wild = isAdminOrInstructor(user) ? KNOWN_RESOURCES.map(r => `${r}:*`) : [];
        if (mounted) setPermissionKeys(wild);
        console.log('[AuthContext] Admin wildcard permissions applied:', wild);
        console.log('[AuthContext] my keys loaded:', wild);
      }
    })();
    return () => { mounted = false; };
  }, [token, user]);

  const value = useMemo(() => ({ token, user, login, logout, loading, error, permissionKeys, refreshPermissions }), [token, user, login, logout, loading, error, permissionKeys, refreshPermissions]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
