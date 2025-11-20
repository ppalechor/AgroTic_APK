import { Platform } from 'react-native';
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

export async function requestPasswordReset(email) {
  const url = getForgotPasswordUrl();
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
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
  if (Array.isArray(data)) return { items: data, meta: { totalItems: data.length } };
  if (Array.isArray(data?.data)) return { items: data.data, meta: data.meta || {} };
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