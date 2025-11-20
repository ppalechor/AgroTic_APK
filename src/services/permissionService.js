import { baseUrl } from './api';
import { getAuthHeader } from './authToken';

const PERMISOS_URL = `${baseUrl}/permisos`;

let _cachedAllPerms = null;

const normalizeKey = (k) => {
  const s = (k || '').toString().trim().toLowerCase();
  if (!s) return '';
  let n = s.replace(/[._]/g, ':');
  n = n.replace(/:+/g, ':');
  n = n.replace(/:\*+/g, ':*');
  n = n.endsWith(':') ? n.slice(0, -1) : n;
  return n;
};

const toArrayItems = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

const permissionService = {
  list: async () => {
    const res = await fetch(PERMISOS_URL, { headers: getAuthHeader() });
    const contentType = res.headers.get('content-type') || '';
    let data = [];
    if (contentType.includes('application/json')) data = await res.json();
    else {
      const text = await res.text();
      throw new Error(`Respuesta no JSON (${res.status}): ${text.slice(0, 120)}`);
    }
    const arr = toArrayItems(data);
    _cachedAllPerms = arr;
    return arr;
  },

  create: async ({ recurso, accion, nombre_permiso, descripcion, activo = true }) => {
    const payload = { recurso, accion, nombre_permiso, descripcion, activo };
    const res = await fetch(PERMISOS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(payload),
    });
    const contentType = res.headers.get('content-type') || '';
    const data = contentType.includes('application/json') ? await res.json() : await res.text();
    if (!res.ok) throw new Error(data?.message || String(data));
    return data;
  },

  getUserKeys: async (idUsuario) => {
    const url = `${PERMISOS_URL}/usuario/${idUsuario}`;
    const res = await fetch(url, { headers: getAuthHeader() });
    const contentType = res.headers.get('content-type') || '';
    const data = contentType.includes('application/json') ? await res.json() : [];

    if (!_cachedAllPerms) {
      try {
        _cachedAllPerms = await permissionService.list();
      } catch (e) {
        console.warn('[permissionService.getUserKeys] Failed to cache permissions:', e);
      }
    }

    const toKey = (p) => {
      if (!p) return null;
      if (typeof p === 'string') {
        const s = p.toString().trim();
        const m = s.match(/permiso:?\s*([0-9]+)/i);
        if (m && _cachedAllPerms) {
          const id = Number(m[1]);
          const found = _cachedAllPerms.find(x => Number(x.id_permiso) === id || Number(x.id) === id);
          if (found && (found.recurso || found.accion)) return normalizeKey(`${found.recurso || ''}:${found.accion || ''}`);
        }
        return normalizeKey(s);
      }
      if (p.clave && typeof p.clave === 'string') return normalizeKey(p.clave);
      if (p.recurso && p.accion) return normalizeKey(`${p.recurso}:${p.accion}`);
      if (p.id_permiso && _cachedAllPerms) {
        const found = _cachedAllPerms.find(x => Number(x.id_permiso) === Number(p.id_permiso) || Number(x.id) === Number(p.id_permiso));
        if (found) return normalizeKey(`${found.recurso || ''}:${found.accion || ''}`);
      }
      return null;
    };

    const arr = toArrayItems(data);
    const keys = arr.map(toKey).filter(Boolean);
    console.log('[permissionService] user keys loaded:', keys);
    return keys;
  },

  getMyKeys: async () => {
    const url = `${PERMISOS_URL}/usuario/me`;
    const res = await fetch(url, { headers: getAuthHeader() });
    const contentType = res.headers.get('content-type') || '';
    const data = contentType.includes('application/json') ? await res.json() : [];

    if (!_cachedAllPerms) {
      try {
        _cachedAllPerms = await permissionService.list();
      } catch (e) {
        console.warn('[permissionService.getMyKeys] Failed to cache permissions:', e);
      }
    }

    const toKey = (p) => {
      if (!p) return null;
      if (typeof p === 'string') {
        const s = p.toString().trim();
        const m = s.match(/permiso:?\s*([0-9]+)/i);
        if (m && _cachedAllPerms) {
          const id = Number(m[1]);
          const found = _cachedAllPerms.find(x => Number(x.id_permiso) === id || Number(x.id) === id);
          if (found && (found.recurso || found.accion)) return normalizeKey(`${found.recurso || ''}:${found.accion || ''}`);
        }
        return normalizeKey(s);
      }
      if (p.clave && typeof p.clave === 'string') return normalizeKey(p.clave);
      if (p.recurso && p.accion) return normalizeKey(`${p.recurso}:${p.accion}`);
      if (p.id_permiso && _cachedAllPerms) {
        const found = _cachedAllPerms.find(x => Number(x.id_permiso) === Number(p.id_permiso) || Number(x.id) === Number(p.id_permiso));
        if (found) return normalizeKey(`${found.recurso || ''}:${found.accion || ''}`);
      }
      return null;
    };

    const arr = toArrayItems(data);
    const keys = arr.map(toKey).filter(Boolean);
    console.log('[permissionService] my keys loaded:', keys);
    return keys;
  },

  assign: async ({ id_usuario, id_permiso }) => {
    const url = `${PERMISOS_URL}/asignar`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ id_usuario, id_permiso }),
    });
    const contentType = res.headers.get('content-type') || '';
    const data = contentType.includes('application/json') ? await res.json() : await res.text();
    if (!res.ok) throw new Error(data?.message || String(data));
    return data;
  },

  revoke: async ({ id_usuario, id_permiso }) => {
    const url = `${PERMISOS_URL}/asignar`;
    const res = await fetch(url, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ id_usuario, id_permiso }),
    });
    const contentType = res.headers.get('content-type') || '';
    const data = contentType.includes('application/json') ? await res.json() : await res.text();
    if (!res.ok) throw new Error(data?.message || String(data));
    return data;
  },
};

export default permissionService;
