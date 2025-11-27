import { baseUrl } from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const getAuthHeader = (token) => ({
  Authorization: `Bearer ${token}`,
});

const mapSensor = (s) => ({
  id: s?.id_sensor ?? s?.id,
  tipo_sensor: s?.tipo_sensor ?? s?.tipo ?? '',
  estado: s?.estado ?? 'activo',
  valor_minimo: Number(s?.valor_minimo ?? 0),
  valor_maximo: Number(s?.valor_maximo ?? 0),
  valor_actual: s?.valor_actual != null ? Number(s?.valor_actual) : null,
  ultima_lectura: s?.ultima_lectura ?? null,
  ubicacion: s?.ubicacion ?? '',
  unidad_medida: s?.unidad_medida ?? '',
  id_lote: (s?.id_lote && typeof s.id_lote === 'object') ? (s.id_lote.id_lote ?? s.id_lote.id) : (s?.id_lote ?? null),
  nombre_lote: (s?.id_lote && typeof s.id_lote === 'object') ? (s.id_lote.nombre_lote ?? s.id_lote.nombre) : (s?.nombre_lote ?? ''),
  raw: s,
});

const sensoresService = {
  getSensores: async (token, page = 1, limit = 50) => {
    const url = new URL(`${baseUrl}/sensores`);
    url.searchParams.set('page', String(page));
    url.searchParams.set('limit', String(limit));
    const res = await fetch(url.toString(), {
      headers: getAuthHeader(token),
    });
    const contentType = res.headers.get('content-type') || '';
    const data = contentType.includes('application/json') ? await res.json() : await res.text();
    if (!res.ok) {
      const msg = (data?.message) || 'Error al obtener sensores';
      throw new Error(msg);
    }
    const arr = data?.items ?? data?.data ?? data;
    const list = Array.isArray(arr) ? arr : [];
    return { items: list.map(mapSensor) };
  },

  createSensor: async (token, payload) => {
    const body = {
      tipo_sensor: String(payload?.tipo_sensor || '').trim(),
      estado: String(payload?.estado || 'activo').trim(),
      valor_minimo: Number(payload?.valor_minimo ?? 0),
      valor_maximo: Number(payload?.valor_maximo ?? 0),
      unidad_medida: payload?.unidad_medida ? String(payload.unidad_medida).trim() : undefined,
      ubicacion: payload?.ubicacion ? String(payload.ubicacion).trim() : undefined,
    };
    const res = await fetch(`${baseUrl}/sensores`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader(token) },
      body: JSON.stringify(body),
    });
    const contentType = res.headers.get('content-type') || '';
    const data = contentType.includes('application/json') ? await res.json() : await res.text();
    if (!res.ok) {
      const msg = (data?.message) || 'Error al crear el sensor';
      throw new Error(msg);
    }
    const created = data?.data ?? data;
    return mapSensor(created);
  },

  updateSensor: async (token, id, payload) => {
    const body = {
      ...(payload?.tipo_sensor ? { tipo_sensor: String(payload.tipo_sensor).trim() } : {}),
      ...(payload?.estado ? { estado: String(payload.estado).trim() } : {}),
      ...(payload?.valor_minimo != null ? { valor_minimo: Number(payload.valor_minimo) } : {}),
      ...(payload?.valor_maximo != null ? { valor_maximo: Number(payload.valor_maximo) } : {}),
      ...(payload?.unidad_medida ? { unidad_medida: String(payload.unidad_medida).trim() } : {}),
      ...(payload?.ubicacion ? { ubicacion: String(payload.ubicacion).trim() } : {}),
      ...(payload?.id_lote != null ? { id_lote: Number(payload.id_lote) } : {}),
    };
    const res = await fetch(`${baseUrl}/sensores/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader(token) },
      body: JSON.stringify(body),
    });
    const contentType = res.headers.get('content-type') || '';
    const data = contentType.includes('application/json') ? await res.json() : await res.text();
    if (!res.ok) {
      const msg = (data?.message) || 'Error al actualizar el sensor';
      throw new Error(msg);
    }
    const updated = data?.data ?? data;
    return mapSensor(updated);
  },

  deleteSensor: async (token, id) => {
    const res = await fetch(`${baseUrl}/sensores/${id}`, {
      method: 'DELETE',
      headers: getAuthHeader(token),
    });
    if (!res.ok) {
      const contentType = res.headers.get('content-type') || '';
      const data = contentType.includes('application/json') ? await res.json() : await res.text();
      const msg = (data?.message) || 'Error al eliminar el sensor';
      throw new Error(msg);
    }
    return true;
  },

  getTiempoReal: async (token) => {
    const settingsRaw = await AsyncStorage.getItem('iot_broker_settings');
    let qs = '';
    try {
      const s = settingsRaw ? JSON.parse(settingsRaw) : null;
      if (s && s.brokerUrl) {
        const params = new URLSearchParams();
        params.set('broker', s.brokerUrl);
        if (Array.isArray(s.topics)) params.set('topics', s.topics.join(','));
        qs = `?${params.toString()}`;
      }
    } catch {}
    const res = await fetch(`${baseUrl}/sensores/tiempo-real${qs}`, {
      headers: getAuthHeader(token),
    });
    const contentType = res.headers.get('content-type') || '';
    const data = contentType.includes('application/json') ? await res.json() : await res.text();
    if (!res.ok) {
      const msg = (data?.message) || 'Error al obtener datos en tiempo real';
      throw new Error(msg);
    }
    return data?.data ?? data ?? [];
  },

  registrarLectura: async (token, id, valor, unidad_medida, observaciones) => {
    const body = { valor: Number(valor), unidad_medida, observaciones };
    const res = await fetch(`${baseUrl}/sensores/${id}/lectura`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader(token) },
      body: JSON.stringify(body),
    });
    const contentType = res.headers.get('content-type') || '';
    const data = contentType.includes('application/json') ? await res.json() : await res.text();
    if (!res.ok) {
      const msg = (data?.message) || 'Error al registrar lectura';
      throw new Error(msg);
    }
    return data?.data ?? data;
  },

  getBrokerSettings: async () => {
    try {
      const raw = await AsyncStorage.getItem('iot_broker_settings');
      return raw ? JSON.parse(raw) : { brokerUrl: '', topics: [] };
    } catch { return { brokerUrl: '', topics: [] }; }
  },

  setBrokerSettings: async (settings) => {
    const safe = {
      brokerUrl: String(settings?.brokerUrl || '').trim(),
      topics: Array.isArray(settings?.topics) ? settings.topics.map(t => String(t).trim()).filter(Boolean) : [],
    };
    await AsyncStorage.setItem('iot_broker_settings', JSON.stringify(safe));
    return safe;
  },
};

export default sensoresService;
