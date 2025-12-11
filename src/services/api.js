import { Platform } from 'react-native';
import { getToken } from './authToken';
const defaultBaseUrl = Platform.OS === 'android' ? 'http://10.0.2.2:3001' : Platform.OS === 'ios' ? 'http://localhost:3001' : 'http://localhost:3001';
export const baseUrl = (process.env.EXPO_PUBLIC_API_URL || defaultBaseUrl).replace(/\/+$/, '');

export const getHealthUrl = () => `${baseUrl}/health`;

export async function getHealth() {
  const url = getHealthUrl();
  const res = await fetch(url);
  const contentType = res.headers.get('content-type') || '';
  let preview = '';
  if (contentType.includes('application/json')) {
    const json = await res.json();
    preview = JSON.stringify(json).slice(0, 120);
  } else {
    const text = await res.text();
    preview = text.replace(/\s+/g, ' ').slice(0, 120);
  }
  return { status: res.status, preview, url };
}

export const getLoginUrl = () => `${baseUrl}/auth/login`;

export async function login({ numero_documento, password }) {
  const url = getLoginUrl();
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ numero_documento, password }),
  });

  const contentType = res.headers.get('content-type') || '';
  let data;
  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    const text = await res.text();
    throw new Error(`Respuesta no JSON (${res.status}): ${text.slice(0, 120)}`);
  }

  if (!res.ok) {
    const msg = data?.message || 'Credenciales inválidas';
    throw new Error(msg);
  }

  const token = data?.access_token;
  const user = data?.user;
  if (!token) {
    throw new Error('El servidor no retornó access_token');
  }
  return { token, user };
}

export const getMeUrl = () => `${baseUrl}/auth/me`;

export async function getMe(token) {
  const url = getMeUrl();
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const contentType = res.headers.get('content-type') || '';
  let data;
  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    const text = await res.text();
    throw new Error(`Respuesta no JSON (${res.status}): ${text.slice(0, 120)}`);
  }
  if (!res.ok) {
    const msg = data?.message || 'Token inválido';
    throw new Error(msg);
  }
  const user = data?.user || data;
  return user;
}

export const getRefreshUrl = () => `${baseUrl}/auth/refresh`;

export async function refresh(token) {
  const url = getRefreshUrl();
  const res = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
  const contentType = res.headers.get('content-type') || '';
  let data;
  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    const text = await res.text();
    throw new Error(`Respuesta no JSON (${res.status}): ${text.slice(0, 120)}`);
  }
  if (!res.ok) {
    const msg = data?.message || 'No se pudo refrescar token';
    throw new Error(msg);
  }
  const tokenNew = data?.access_token;
  const user = data?.user;
  if (!tokenNew) throw new Error('El servidor no retornó access_token');
  return { token: tokenNew, user };
}

export const getCultivosUrl = () => `${baseUrl}/cultivos`;

export async function getCultivos(token) {
  const url = getCultivosUrl();
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const json = await res.json();
    return { status: res.status, data: json };
  } else {
    const text = await res.text();
    return { status: res.status, data: text };
  }
}

export const getForgotPasswordUrl = () => `${baseUrl}/auth/forgot-password`;

// Roles (público)
export const getRolesDisponiblesUrl = () => `${baseUrl}/rol/disponibles`;

export async function listRolesDisponibles() {
  const url = getRolesDisponiblesUrl();
  const res = await fetch(url, { headers: { Authorization: `Bearer ${getToken() || ''}` } });
  const contentType = res.headers.get('content-type') || '';
  let data;
  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    const text = await res.text();
    throw new Error(`Respuesta no JSON (${res.status}): ${text.slice(0, 120)}`);
  }
  if (!res.ok) {
    throw new Error(data?.message || 'No se pudieron obtener roles');
  }
  const normalize = (arr) => (arr || []).map(r => ({
    id_rol: r?.id_rol ?? r?.id ?? null,
    nombre_rol: r?.nombre_rol ?? r?.name ?? '',
  })).filter(r => r.id_rol && r.nombre_rol);
  if (Array.isArray(data)) return normalize(data);
  if (Array.isArray(data?.data)) return normalize(data.data);
  return [];
}

export async function requestPasswordReset(email) {
  const url = getForgotPasswordUrl();
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  const contentType = res.headers.get('content-type') || '';
  let data;
  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    const text = await res.text();
    throw new Error(`Respuesta no JSON (${res.status}): ${text.slice(0, 120)}`);
  }
  if (!res.ok) {
    const msg = data?.message || 'No se pudo enviar el enlace';
    throw new Error(msg);
  }
  return data;
}

export const getResetPasswordUrl = () => `${baseUrl}/auth/reset-password`;

export async function resetPassword(token, password) {
  const url = getResetPasswordUrl();
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, newPassword: password }),
  });
  const contentType = res.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await res.json() : await res.text();
  if (!res.ok) {
    const msg = (data?.message) || 'No se pudo restablecer la contraseña';
    throw new Error(msg);
  }
  return data;
}

 

export const getRegisterUrl = () => `${baseUrl}/auth/register`;

export async function registerUser(payload) {
  const url = getRegisterUrl();
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const contentType = res.headers.get('content-type') || '';
  let data;
  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    const text = await res.text();
    throw new Error(`Respuesta no JSON (${res.status}): ${text.slice(0, 120)}`);
  }
  if (!res.ok) {
    const msg = data?.message || 'Error al registrar el usuario';
    throw new Error(msg);
  }
  return data;
}

export const getUsuariosUrl = () => `${baseUrl}/usuarios`;

export async function listUsuarios(token, params = {}) {
  const url = new URL(getUsuariosUrl());
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && String(v).length) url.searchParams.set(k, String(v));
  });
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });
  const contentType = res.headers.get('content-type') || '';
  let data;
  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    const text = await res.text();
    throw new Error(`Respuesta no JSON (${res.status}): ${text.slice(0, 120)}`);
  }
  if (!res.ok) {
    throw new Error(data?.message || 'No se pudieron obtener usuarios');
  }
  const normalizeRoleName = (s) => {
    const x = (s || '').toString().trim().toLowerCase();
    if (!x) return '';
    if (['admin','administrador','administrator'].includes(x)) return 'Administrador';
    if (['instructor'].includes(x)) return 'Instructor';
    if (['pasante','intern'].includes(x)) return 'Pasante';
    if (['aprendiz','learner','student'].includes(x)) return 'Aprendiz';
    if (['invitado','guest'].includes(x)) return 'Invitado';
    return s;
  };
  const deriveRoleName = (u) => {
    const candidates = [
      u?.nombre_rol,
      typeof u?.rol === 'string' ? u?.rol : (u?.rol?.nombre || u?.rol?.name),
      typeof u?.role === 'string' ? u?.role : (u?.role?.nombre || u?.role?.name),
      u?.rol_nombre,
      u?.tipo_rol,
      u?.tiporol?.nombre,
      u?.id_tiporol?.nombre,
      u?.id_rol?.nombre,
      u?.id_rol?.nombre_rol,
      Array.isArray(u?.roles) ? (u.roles[0]?.nombre || u.roles[0]?.name) : ''
    ];
    const raw = candidates.find(v => (v || '').toString().trim().length > 0) || '';
    return normalizeRoleName(raw);
  };
  const mapUsers = (arr) => (arr || []).map(u => {
    const nr = deriveRoleName(u);
    return nr ? { ...u, nombre_rol: nr } : u;
  });
  if (Array.isArray(data)) return { items: mapUsers(data), meta: { totalItems: data.length } };
  if (Array.isArray(data?.data)) return { items: mapUsers(data.data), meta: data.meta || {} };
  if (Array.isArray(data?.items)) return { items: mapUsers(data.items), meta: data.meta || {} };
  return { items: [], meta: {} };
}

export async function deleteUsuario(id, token) {
  const url = `${getUsuariosUrl()}/${id}`;
  const res = await fetch(url, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const json = await res.json();
      throw new Error(json?.message || 'No se pudo eliminar el usuario');
    }
    const text = await res.text();
    throw new Error(text.slice(0, 120));
  }
  return true;
}

export async function updateUsuario(id, payload, token) {
  const url = `${getUsuariosUrl()}/${id}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  const contentType = res.headers.get('content-type') || '';
  let data;
  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    const text = await res.text();
    throw new Error(`Respuesta no JSON (${res.status}): ${text.slice(0, 120)}`);
  }
  if (!res.ok) {
    throw new Error(data?.message || 'No se pudo actualizar el usuario');
  }
  return data;
}

// Finanzas API
export async function finanzasResumen({ cultivoId, from, to, groupBy = 'mes', tipo }) {
  const params = new URLSearchParams({ cultivoId: String(cultivoId), from, to, groupBy });
  if (tipo && String(tipo) !== 'todos') params.set('tipo', String(tipo));
  const res = await fetch(`${baseUrl}/finanzas/resumen?${params.toString()}`, { headers: { Authorization: `Bearer ${getToken() || ''}` } });
  const ct = res.headers.get('content-type') || '';
  const data = ct.includes('application/json') ? await res.json() : await res.text();
  if (!res.ok) throw new Error(data?.message || String(data));
  return data;
}

export async function finanzasMargenPorCultivo({ from, to }) {
  const params = new URLSearchParams({ from, to });
  const res = await fetch(`${baseUrl}/finanzas/margen?${params.toString()}`, { headers: { Authorization: `Bearer ${getToken() || ''}` } });
  const ct = res.headers.get('content-type') || '';
  const data = ct.includes('application/json') ? await res.json() : await res.text();
  if (!res.ok) throw new Error(data?.message || String(data));
  return data;
}

export async function finanzasRentabilidad({ cultivoId, from, to, criterio = 'margen', umbral }) {
  const params = new URLSearchParams({ cultivoId: String(cultivoId), from, to, criterio });
  if (umbral !== undefined && umbral !== null) params.set('umbral', String(umbral));
  const res = await fetch(`${baseUrl}/finanzas/rentabilidad?${params.toString()}`, { headers: { Authorization: `Bearer ${getToken() || ''}` } });
  const ct = res.headers.get('content-type') || '';
  const data = ct.includes('application/json') ? await res.json() : await res.text();
  if (!res.ok) throw new Error(data?.message || String(data));
  return data;
}

// Exportación de finanzas removida según solicitud

export async function finanzasIngresos({ cultivoId, from, to, groupBy = 'mes' }) {
  const params = new URLSearchParams({ cultivoId: String(cultivoId), from, to, groupBy });
  const res = await fetch(`${baseUrl}/finanzas/ingresos?${params.toString()}`, { headers: { Authorization: `Bearer ${getToken() || ''}` } });
  const ct = res.headers.get('content-type') || '';
  const data = ct.includes('application/json') ? await res.json() : await res.text();
  if (!res.ok) throw new Error(data?.message || String(data));
  return data;
}

export async function finanzasSalidas({ cultivoId, from, to, groupBy = 'mes' }) {
  const params = new URLSearchParams({ cultivoId: String(cultivoId), from, to, groupBy });
  const res = await fetch(`${baseUrl}/finanzas/salidas?${params.toString()}`, { headers: { Authorization: `Bearer ${getToken() || ''}` } });
  const ct = res.headers.get('content-type') || '';
  const data = ct.includes('application/json') ? await res.json() : await res.text();
  if (!res.ok) throw new Error(data?.message || String(data));
  return data;
}

export async function finanzasActividades({ cultivoId, from, to, groupBy = 'mes' }) {
  const params = new URLSearchParams({ cultivoId: String(cultivoId), from, to, groupBy });
  const res = await fetch(`${baseUrl}/finanzas/actividades?${params.toString()}`, { headers: { Authorization: `Bearer ${getToken() || ''}` } });
  const ct = res.headers.get('content-type') || '';
  const data = ct.includes('application/json') ? await res.json() : await res.text();
  if (!res.ok) throw new Error(data?.message || String(data));
  return data;
}

export const getEpasUrl = () => `${baseUrl}/epa`;

export async function listEpas(token, params = {}) {
  const url = new URL(getEpasUrl());
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && String(v).length) url.searchParams.set(k, String(v));
  });
  const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } });
  const ct = res.headers.get('content-type') || '';
  const data = ct.includes('application/json') ? await res.json() : await res.text();
  if (!res.ok) throw new Error((data?.message) || 'Error obteniendo EPAs');
  const arr = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : Array.isArray(data?.items) ? data.items : [];
  return arr;
}

export async function createEpa(payload, token) {
  const res = await fetch(getEpasUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  const ct = res.headers.get('content-type') || '';
  const data = ct.includes('application/json') ? await res.json() : await res.text();
  if (!res.ok) throw new Error((data?.message) || 'Error creando EPA');
  return data;
}

export async function createEpaWithImage(payload, file, token) {
  const form = new FormData();
  Object.entries(payload || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null) form.append(k, String(v));
  });
  if (file) {
    form.append('imagen', file);
  }
  const res = await fetch(getEpasUrl(), {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const ct = res.headers.get('content-type') || '';
  const data = ct.includes('application/json') ? await res.json() : await res.text();
  if (!res.ok) throw new Error((data?.message) || 'Error creando EPA');
  return data;
}

export async function updateEpa(id, payload, token) {
  const res = await fetch(`${getEpasUrl()}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  const ct = res.headers.get('content-type') || '';
  const data = ct.includes('application/json') ? await res.json() : await res.text();
  if (!res.ok) throw new Error((data?.message) || 'Error actualizando EPA');
  return data;
}

export async function uploadEpaImage(id, file, token) {
  const form = new FormData();
  form.append('imagen', file);
  const res = await fetch(`${getEpasUrl()}/${id}/upload-imagen`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const ct = res.headers.get('content-type') || '';
  const data = ct.includes('application/json') ? await res.json() : await res.text();
  if (!res.ok) throw new Error((data?.message) || 'Error subiendo imagen EPA');
  return data;
}

export async function deleteEpa(id, token) {
  const res = await fetch(`${getEpasUrl()}/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error('Error eliminando EPA');
  return true;
}

export const getTratamientosUrl = () => `${baseUrl}/tratamientos`;

export async function listTratamientos(token, params = {}) {
  const url = new URL(getTratamientosUrl());
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && String(v).length) url.searchParams.set(k, String(v));
  });
  const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } });
  const ct = res.headers.get('content-type') || '';
  const data = ct.includes('application/json') ? await res.json() : await res.text();
  if (!res.ok) throw new Error((data?.message) || 'Error obteniendo tratamientos');
  const arr = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : Array.isArray(data?.items) ? data.items : [];
  const norm = arr.map((t) => {
    const epaField = t.id_epa;
    const epaObj = epaField && typeof epaField === 'object' ? epaField : null;
    const epaId = epaObj ? (epaObj.id_epa ?? epaObj.id ?? null) : epaField;
    const epaName = epaObj ? (epaObj.nombre_epa ?? epaObj.nombre ?? epaObj.name ?? '') : (t.epa_nombre ?? '');
    return { ...t, id_epa: epaId, epa_nombre: epaName };
  });
  return norm;
}

export async function createTratamiento(payload, token) {
  const res = await fetch(getTratamientosUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  const ct = res.headers.get('content-type') || '';
  const data = ct.includes('application/json') ? await res.json() : await res.text();
  if (!res.ok) throw new Error((data?.message) || 'Error creando tratamiento');
  return data;
}

export async function updateTratamiento(id, payload, token) {
  const res = await fetch(`${getTratamientosUrl()}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  const ct = res.headers.get('content-type') || '';
  const data = ct.includes('application/json') ? await res.json() : await res.text();
  if (!res.ok) throw new Error((data?.message) || 'Error actualizando tratamiento');
  return data;
}

export async function deleteTratamiento(id, token) {
  const res = await fetch(`${getTratamientosUrl()}/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error('Error eliminando tratamiento');
  return true;
}

export const getInsumosUrl = () => `${baseUrl}/insumos`;

export async function listInsumos(token) {
  const res = await fetch(getInsumosUrl(), { headers: { Authorization: `Bearer ${token}` } });
  const ct = res.headers.get('content-type') || '';
  const data = ct.includes('application/json') ? await res.json() : await res.text();
  if (!res.ok) throw new Error((data?.message) || 'Error obteniendo insumos');
  const arr = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
  return arr;
}

export async function createInsumo(payload, token) {
  const res = await fetch(getInsumosUrl(), { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) });
  const ct = res.headers.get('content-type') || '';
  const data = ct.includes('application/json') ? await res.json() : await res.text();
  if (!res.ok) throw new Error((data?.message) || 'Error creando insumo');
  return data;
}

export async function updateInsumo(id, payload, token) {
  const res = await fetch(`${getInsumosUrl()}/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) });
  const ct = res.headers.get('content-type') || '';
  const data = ct.includes('application/json') ? await res.json() : await res.text();
  if (!res.ok) throw new Error((data?.message) || 'Error actualizando insumo');
  return data;
}

export async function deleteInsumo(id, token) {
  const res = await fetch(`${getInsumosUrl()}/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error('Error eliminando insumo');
  return true;
}

export const getInventarioUrl = () => `${baseUrl}/inventario`;

export async function listInventario(token) {
  const res = await fetch(getInventarioUrl(), { headers: { Authorization: `Bearer ${token}` } });
  const ct = res.headers.get('content-type') || '';
  const data = ct.includes('application/json') ? await res.json() : await res.text();
  if (!res.ok) throw new Error((data?.message) || 'Error obteniendo inventario');
  const arr = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
  return arr.map((it) => ({
    id_inventario: it.id_inventario || it.id,
    cantidad_stock: it.cantidad_stock,
    unidad_medida: it.unidad_medida,
    fecha: it.fecha,
    id_insumo: it.id_insumo || it.insumo?.id_insumo,
    nombre_insumo: it.insumo?.nombre_insumo || it.nombre_insumo,
    codigo: it.insumo?.codigo || it.codigo,
    categoria: it.insumo?.id_categoria?.nombre || it.categoria || '',
    almacen: it.insumo?.id_almacen?.nombre_almacen || it.almacen || '',
    id_categoria: (it.insumo?.id_categoria?.id_categoria ?? it.insumo?.id_categoria ?? it.id_categoria) || null,
    id_almacen: (it.insumo?.id_almacen?.id_almacen ?? it.insumo?.id_almacen ?? it.id_almacen) || null,
  }));
}

// Crear un ítem de inventario
export async function createInventario(payload, token) {
  const res = await fetch(getInventarioUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  const ct = res.headers.get('content-type') || '';
  const data = ct.includes('application/json') ? await res.json() : await res.text();
  if (!res.ok) throw new Error((data?.message) || 'Error creando inventario');
  return data;
}

// Actualizar un ítem de inventario
export async function updateInventario(id, payload, token) {
  const res = await fetch(`${getInventarioUrl()}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  const ct = res.headers.get('content-type') || '';
  const data = ct.includes('application/json') ? await res.json() : await res.text();
  if (!res.ok) throw new Error((data?.message) || 'Error actualizando inventario');
  return data;
}

export async function deleteInventario(id, token) {
  const res = await fetch(`${getInventarioUrl()}/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error('Error eliminando inventario');
  return true;
}

export const getInventarioStockBajoUrl = (limite = 10) => `${getInventarioUrl()}/stock-bajo?limite=${encodeURIComponent(limite)}`;

export async function listInventarioStockBajo(token, limite = 10) {
  const res = await fetch(getInventarioStockBajoUrl(limite), { headers: { Authorization: `Bearer ${token}` } });
  const ct = res.headers.get('content-type') || '';
  const data = ct.includes('application/json') ? await res.json() : await res.text();
  if (!res.ok) throw new Error((data?.message) || 'Error obteniendo stock bajo');
  const arr = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
  return arr.map((it) => ({
    id_inventario: it.id_inventario || it.id,
    cantidad_stock: it.cantidad_stock,
    unidad_medida: it.unidad_medida,
    fecha: it.fecha,
    id_insumo: it.id_insumo || it.insumo?.id_insumo,
    nombre_insumo: it.insumo?.nombre_insumo || it.nombre_insumo,
    codigo: it.insumo?.codigo || it.codigo,
    categoria: it.insumo?.id_categoria?.nombre || it.categoria || '',
    almacen: it.insumo?.id_almacen?.nombre_almacen || it.almacen || '',
    id_categoria: (it.insumo?.id_categoria?.id_categoria ?? it.insumo?.id_categoria ?? it.id_categoria) || null,
    id_almacen: (it.insumo?.id_almacen?.id_almacen ?? it.insumo?.id_almacen ?? it.id_almacen) || null,
  }));
}

export const getMovimientosUrl = () => `${baseUrl}/movimientos`;

export async function createMovimiento(payload, token) {
  const res = await fetch(getMovimientosUrl(), { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) });
  const ct = res.headers.get('content-type') || '';
  const data = ct.includes('application/json') ? await res.json() : await res.text();
  if (!res.ok) throw new Error((data?.message) || 'Error registrando movimiento');
  return data;
}

export async function listMovimientos(token) {
  const res = await fetch(getMovimientosUrl(), { headers: { Authorization: `Bearer ${token}` } });
  const ct = res.headers.get('content-type') || '';
  const data = ct.includes('application/json') ? await res.json() : await res.text();
  if (!res.ok) throw new Error((data?.message) || 'Error obteniendo movimientos');
  const arr = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
  return arr.map((m) => ({
    id_movimiento: m.id_movimiento || m.id,
    tipo_movimiento: m.tipo_movimiento,
    cantidad: m.cantidad,
    unidad_medida: m.unidad_medida,
    fecha_movimiento: m.fecha_movimiento,
    insumo_nombre: m.id_insumo?.nombre_insumo || m.insumo?.nombre_insumo || '',
    categoria: m.id_insumo?.id_categoria?.nombre || '',
    almacen: m.id_insumo?.id_almacen?.nombre_almacen || '',
    id_insumo: m.id_insumo?.id_insumo || m.id_insumo || null,
    id_categoria: (m.id_insumo?.id_categoria?.id_categoria ?? m.id_insumo?.id_categoria ?? m.id_categoria) || null,
    id_almacen: (m.id_insumo?.id_almacen?.id_almacen ?? m.id_insumo?.id_almacen ?? m.id_almacen) || null,
  }));
}

export async function updateMovimiento(id, payload, token) {
  const res = await fetch(`${getMovimientosUrl()}/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) });
  const ct = res.headers.get('content-type') || '';
  const data = ct.includes('application/json') ? await res.json() : await res.text();
  if (!res.ok) throw new Error((data?.message) || 'Error actualizando movimiento');
  return data;
}

export async function deleteMovimiento(id, token) {
  const res = await fetch(`${getMovimientosUrl()}/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error('Error eliminando movimiento');
  return true;
}

export const getCategoriasUrl = () => `${baseUrl}/categorias`;

export async function listCategorias(token) {
  const res = await fetch(getCategoriasUrl(), { headers: { Authorization: `Bearer ${token}` } });
  const ct = res.headers.get('content-type') || '';
  const data = ct.includes('application/json') ? await res.json() : await res.text();
  if (!res.ok) throw new Error((data?.message) || 'Error obteniendo categorías');
  const arr = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
  return arr.map((c) => ({ id: c.id_categoria || c.id, nombre: c.nombre, descripcion: c.descripcion || '' }));
}

export const getAlmacenesUrl = () => `${baseUrl}/almacenes`;

export async function listAlmacenes(token) {
  const res = await fetch(getAlmacenesUrl(), { headers: { Authorization: `Bearer ${token}` } });
  const ct = res.headers.get('content-type') || '';
  const data = ct.includes('application/json') ? await res.json() : await res.text();
  if (!res.ok) throw new Error((data?.message) || 'Error obteniendo almacenes');
  const arr = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
  return arr.map((a) => ({ id: a.id_almacen || a.id, nombre: a.nombre_almacen || a.nombre, descripcion: a.descripcion || '' }));
}

export async function createCategoria(payload, token) {
  const res = await fetch(getCategoriasUrl(), { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) });
  const ct = res.headers.get('content-type') || '';
  const data = ct.includes('application/json') ? await res.json() : await res.text();
  if (!res.ok) throw new Error((data?.message) || 'Error creando categoría');
  return data;
}

export async function updateCategoria(id, payload, token) {
  const res = await fetch(`${getCategoriasUrl()}/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) });
  const ct = res.headers.get('content-type') || '';
  const data = ct.includes('application/json') ? await res.json() : await res.text();
  if (!res.ok) throw new Error((data?.message) || 'Error actualizando categoría');
  return data;
}

export async function deleteCategoria(id, token) {
  const res = await fetch(`${getCategoriasUrl()}/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error('Error eliminando categoría');
  return true;
}

export async function createAlmacen(payload, token) {
  const res = await fetch(getAlmacenesUrl(), { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) });
  const ct = res.headers.get('content-type') || '';
  const data = ct.includes('application/json') ? await res.json() : await res.text();
  if (!res.ok) throw new Error((data?.message) || 'Error creando almacén');
  return data;
}

export async function updateAlmacen(id, payload, token) {
  const res = await fetch(`${getAlmacenesUrl()}/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) });
  const ct = res.headers.get('content-type') || '';
  const data = ct.includes('application/json') ? await res.json() : await res.text();
  if (!res.ok) throw new Error((data?.message) || 'Error actualizando almacén');
  return data;
}

export async function deleteAlmacen(id, token) {
  const res = await fetch(`${getAlmacenesUrl()}/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error('Error eliminando almacén');
  return true;
}

export const getLotesUrl = () => `${baseUrl}/lotes`;

export async function listLotes(token, params = {}) {
  const url = new URL(getLotesUrl());
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && String(v).length) url.searchParams.set(k, String(v));
  });
  const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } });
  const ct = res.headers.get('content-type') || '';
  const data = ct.includes('application/json') ? await res.json() : await res.text();
  if (!res.ok) throw new Error((data?.message) || 'Error obteniendo lotes');
  const arr = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : Array.isArray(data?.items) ? data.items : [];
  return arr;
}

export async function createLote(payload, token) {
  const res = await fetch(getLotesUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  const ct = res.headers.get('content-type') || '';
  const data = ct.includes('application/json') ? await res.json() : await res.text();
  if (!res.ok) throw new Error((data?.message) || 'Error creando lote');
  return data;
}

export async function updateLote(id, payload, token) {
  const res = await fetch(`${getLotesUrl()}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  const ct = res.headers.get('content-type') || '';
  const data = ct.includes('application/json') ? await res.json() : await res.text();
  if (!res.ok) throw new Error((data?.message) || 'Error actualizando lote');
  return data;
}

export async function deleteLote(id, token) {
  const res = await fetch(`${getLotesUrl()}/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error('Error eliminando lote');
  return true;
}

export async function getMapData(token) {
  const res = await fetch(`${getLotesUrl()}/map-data`, { headers: { Authorization: `Bearer ${token}` } });
  const ct = res.headers.get('content-type') || '';
  const data = ct.includes('application/json') ? await res.json() : await res.text();
  if (!res.ok) throw new Error((data?.message) || 'Error obteniendo datos del mapa');
  const arr = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
  return arr;
}

export async function listCultivos(token, params = {}) {
  const url = new URL(getCultivosUrl());
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && String(v).length) url.searchParams.set(k, String(v));
  });
  const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } });
  const ct = res.headers.get('content-type') || '';
  const data = ct.includes('application/json') ? await res.json() : await res.text();
  if (!res.ok) throw new Error((data?.message) || 'Error obteniendo cultivos');
  if (Array.isArray(data)) return { items: data, meta: { totalItems: data.length, totalPages: 1, currentPage: 1 } };
  if (Array.isArray(data?.data)) return { items: data.data, meta: data.meta || { totalItems: data.data.length, totalPages: 1, currentPage: 1 } };
  if (Array.isArray(data?.items)) return { items: data.items, meta: data.meta || { totalItems: data.items.length, totalPages: 1, currentPage: 1 } };
  return { items: [], meta: { totalItems: 0, totalPages: 1, currentPage: 1 } };
}

export async function createCultivo(payload, token) {
  const res = await fetch(getCultivosUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  const ct = res.headers.get('content-type') || '';
  const data = ct.includes('application/json') ? await res.json() : await res.text();
  if (!res.ok) throw new Error((data?.message) || 'Error creando cultivo');
  return data;
}

export async function updateCultivo(id, payload, token) {
  const res = await fetch(`${getCultivosUrl()}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  const ct = res.headers.get('content-type') || '';
  const data = ct.includes('application/json') ? await res.json() : await res.text();
  if (!res.ok) throw new Error((data?.message) || 'Error actualizando cultivo');
  return data;
}

export async function deleteCultivo(id, token) {
  const res = await fetch(`${getCultivosUrl()}/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error('Error eliminando cultivo');
  return true;
}

export const getActividadesUrl = () => `${baseUrl}/actividades`;

export async function listActividades(token, params = {}) {
  const url = new URL(getActividadesUrl());
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && String(v).length) url.searchParams.set(k, String(v));
  });
  console.log('[api] GET actividades', url.toString());
  const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } });
  const ct = res.headers.get('content-type') || '';
  const data = ct.includes('application/json') ? await res.json() : await res.text();
  if (!res.ok) throw new Error((data?.message) || 'Error obteniendo actividades');
  if (Array.isArray(data)) return { items: data, meta: { totalItems: data.length, totalPages: 1, currentPage: 1 } };
  if (Array.isArray(data?.data)) return { items: data.data, meta: data.meta || { totalItems: data.data.length, totalPages: 1, currentPage: 1 } };
  if (Array.isArray(data?.items)) return { items: data.items, meta: data.meta || { totalItems: data.items.length, totalPages: 1, currentPage: 1 } };
  return { items: [], meta: { totalItems: 0, totalPages: 1, currentPage: 1 } };
}

export async function createActividad(payload, token) {
  const res = await fetch(getActividadesUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  const ct = res.headers.get('content-type') || '';
  const data = ct.includes('application/json') ? await res.json() : await res.text();
  if (!res.ok) throw new Error((data?.message) || 'Error creando actividad');
  return data;
}

export async function updateActividad(id, payload, token) {
  const res = await fetch(`${getActividadesUrl()}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  const ct = res.headers.get('content-type') || '';
  const data = ct.includes('application/json') ? await res.json() : await res.text();
  if (!res.ok) throw new Error((data?.message) || 'Error actualizando actividad');
  return data;
}

export async function deleteActividad(id, token) {
  const res = await fetch(`${getActividadesUrl()}/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error('Error eliminando actividad');
  return true;
}

export const getRealizaUrl = () => `${baseUrl}/realiza`;

export async function createRealiza(payload, token) {
  const res = await fetch(getRealizaUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  const ct = res.headers.get('content-type') || '';
  const data = ct.includes('application/json') ? await res.json() : await res.text();
  if (!res.ok) throw new Error((data?.message) || 'Error creando relación usuario-actividad');
  return data;
}

export async function getActividadById(id, token) {
  const res = await fetch(`${getActividadesUrl()}/${id}`, { headers: { Authorization: `Bearer ${token}` } });
  const ct = res.headers.get('content-type') || '';
  const data = ct.includes('application/json') ? await res.json() : await res.text();
  if (!res.ok) throw new Error((data?.message) || 'Error obteniendo actividad');
  return data;
}

export async function uploadActividadFoto(id, file, token, descripcion) {
  const form = new FormData();
  if (file && typeof file === 'object') {
    const name = file.name || `foto_${Date.now()}.jpg`;
    const type = file.type || 'image/jpeg';
    if (file.uri) {
      if (Platform.OS === 'web') {
        const resp = await fetch(file.uri);
        const blob = await resp.blob();
        form.append('photo', blob, name);
      } else {
        form.append('photo', { uri: file.uri, name, type });
      }
    } else {
      form.append('photo', file);
    }
  }
  if (descripcion !== undefined && descripcion !== null) {
    form.append('descripcion', String(descripcion));
  }
  const url = `${getActividadesUrl()}/upload-photo/${id}`;
  console.log('[api] POST actividad foto', url, 'file=', !!file);
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const ct = res.headers.get('content-type') || '';
  const data = ct.includes('application/json') ? await res.json() : await res.text();
  if (!res.ok) throw new Error((data?.message) || 'Error subiendo foto de actividad');
  return data;
}

export async function listActividadFotos(id, token) {
  const actividad = await getActividadById(id, token);
  const fotos = Array.isArray(actividad?.fotos) ? actividad.fotos : [];
  const base = (baseUrl || '').replace(/\/$/, '');
  return fotos.map((f) => {
    const raw = (f?.ruta_foto || f?.url_imagen) ? String(f.ruta_foto || f.url_imagen) : '';
    let abs = '';
    try {
      abs = raw ? (raw.startsWith('http') ? raw : new URL(raw.startsWith('/') ? raw.slice(1) : raw, `${base}/`).toString()) : '';
    } catch {}
    return {
      id: (f.id ?? f.id_foto ?? null),
      url_imagen: abs || raw || '',
      descripcion: f.descripcion || '',
      fecha_carga: f.fecha_carga,
    };
  });
}

export async function deleteActividadFoto(id, token) {
  const fotoId = Number(id);
  if (!Number.isFinite(fotoId) || fotoId <= 0) throw new Error('ID de foto inválido');
  const url = `${getActividadesUrl()}/fotos/${fotoId}`;
  console.log('[api] DELETE actividad foto', url);
  const res = await fetch(url, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok && res.status !== 204) {
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
      const data = await res.json();
      throw new Error(data?.message || 'Error eliminando foto');
    }
    const text = await res.text();
    throw new Error(text.slice(0, 160) || 'Error eliminando foto');
  }
  return true;
}
