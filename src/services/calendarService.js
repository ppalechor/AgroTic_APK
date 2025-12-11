import { baseUrl, listActividades, listCultivos } from './api';
import { getToken } from './authToken';
import cropService from './cropService';

const toISO = (d) => {
  if (!d) return null;
  try {
    const dt = typeof d === 'string' ? new Date(d) : d;
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const day = String(dt.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  } catch { return null; }
};

const inRange = (dateStr, start, end) => {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const s = new Date(start);
  const e = new Date(end);
  return d >= s && d <= e;
};

function pickResponsableFromCrop(c) {
  if (!c) return null;
  if (c.responsable !== undefined) return c.responsable;
  if (c.usuario !== undefined) return c.usuario;
  if (c.responsable_nombre !== undefined) return c.responsable_nombre;
  if (c.encargado !== undefined) return c.encargado;
  if (c.user !== undefined) return c.user;
  if (c.id_usuario !== undefined) return c.id_usuario;
  if (c.id_responsable !== undefined) return c.id_responsable;
  return null;
}

function pickResponsableFromActivity(a) {
  if (!a) return null;
  if (a.responsable !== undefined) return a.responsable;
  if (a.usuario !== undefined) return a.usuario;
  if (a.responsableUsuario !== undefined) return a.responsableUsuario;
  if (a.responsable_nombre !== undefined) return a.responsable_nombre;
  if (a.encargado !== undefined) return a.encargado;
  if (a.user !== undefined) return a.user;
  if (a.id_usuario !== undefined) return a.id_usuario;
  if (a.id_responsable !== undefined) return a.id_responsable;
  return null;
}

function formatUserName(u) {
  try {
    if (!u) return '';
    if (typeof u === 'object') {
      const nombres = u.nombres || u.nombre || u.firstName || '';
      const apellidos = u.apellidos || u.apellido || u.lastName || '';
      const full = `${String(nombres || '').trim()} ${String(apellidos || '').trim()}`.trim();
      return full || (u.username || u.user_name || u.name || '');
    }
    const s = String(u).trim();
    if (/^\d+$/.test(s)) return `Usuario #${s}`;
    return s;
  } catch { return ''; }
}

function normalizeActividadType(v) {
  const s = String(v || '').toLowerCase().trim()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const map = {
    siembra: 'siembra',
    riego: 'actividad',
    fertilizacion: 'actividad',
    fertilizacion_: 'actividad',
    poda: 'actividad',
    cosecha: 'cosecha',
    otro: 'actividad',
  };
  if (s in map) return map[s];
  if (s.includes('siembra')) return 'siembra';
  if (s.includes('cosecha')) return 'cosecha';
  return 'actividad';
}

const calendarService = {
  getCalendarEvents: async (start, end) => {
    const token = getToken();
    const events = [];
    let cropMap = {};

    try {
      const urlCultivos = new URL(`${baseUrl}/cultivos/calendario`);
      urlCultivos.searchParams.set('fecha_desde', String(start));
      urlCultivos.searchParams.set('fecha_hasta', String(end));
      const resC = await fetch(urlCultivos.toString(), { headers: { Authorization: `Bearer ${token}` } });
      const ctC = resC.headers.get('content-type') || '';
      const dataC = ctC.includes('application/json') ? await resC.json() : await resC.text();
      const listC = Array.isArray(dataC) ? dataC : (Array.isArray(dataC?.items) ? dataC.items : []);
      listC.forEach((evento) => {
        const cid = evento.id_cultivo || evento.id || null;
        const nombre = evento?.tipo_cultivo || null;
        if (cid && nombre) cropMap[cid] = { nombre, estado: evento.estado || '' };
        events.push({
          id: `${cid}-${evento.estado === 'sembrado' ? 'siembra' : 'cosecha'}`,
          titulo: `${evento.estado} - ${evento.tipo_cultivo}`,
          fecha: evento.fecha,
          tipo: evento.estado === 'sembrado' ? 'siembra' : 'cosecha',
          id_cultivo: cid,
          descripcion: `Evento de ${evento.estado} para el cultivo ${evento.tipo_cultivo}`,
          estado: evento.estado,
          nombre_cultivo: nombre,
        });
      });
    } catch (e) {
    }

    try {
      const urlActs = new URL(`${baseUrl}/actividades/reporte`);
      urlActs.searchParams.set('fecha_inicio', String(start));
      urlActs.searchParams.set('fecha_fin', String(end));
      const resA = await fetch(urlActs.toString(), { headers: { Authorization: `Bearer ${token}` } });
      const ctA = resA.headers.get('content-type') || '';
      const dataA = ctA.includes('application/json') ? await resA.json() : await resA.text();
      const actItems = Array.isArray(dataA) ? dataA : (Array.isArray(dataA?.items) ? dataA.items : []);
      actItems.forEach((a) => {
        const fecha = a.fecha_actividad || a.fecha || a.createdAt || null;
        const cid = a.id_cultivo || a.cultivoId || null;
        const nombre = cid ? (cropMap[cid]?.nombre || a?.nombre_cultivo || null) : (a?.nombre_cultivo || null);
        const respRaw = pickResponsableFromActivity(a);
        const responsable = formatUserName(respRaw);
        const usuario = typeof a.usuario === 'object' ? formatUserName(a.usuario) : (a.usuario || null);
        const tipo = normalizeActividadType(a.tipo_actividad || a.nombre_actividad);
        events.push({
          id: a.id_actividad || a.id,
          titulo: a.tipo_actividad || a.nombre_actividad || a.descripcion || 'Actividad',
          descripcion: a.detalles || a.descripcion || '',
          tipo,
          fecha,
          id_cultivo: cid,
          nombre_cultivo: nombre,
          estado: a.estado || a.estado_actividad || '',
          responsable,
          usuario,
          tipo_actividad: a.tipo_actividad,
        });
      });
    } catch (e) {
    }

    events.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
    return events;
  },

  getEventDetails: async (id) => {
    const token = getToken();
    const sid = String(id || '');
    if (sid.includes('-siembra') || sid.includes('-cosecha')) {
      const cid = sid.split('-')[0];
      try {
        const crop = await cropService.getCropById(token, cid);
        const nombre = crop?.nombre_cultivo || crop?.displayName || crop?.tipo_cultivo || null;
        const estado = crop?.estado_cultivo || null;
        let respRaw = pickResponsableFromCrop(crop?.raw);
        let responsable = formatUserName(respRaw);
        if (!responsable) {
          try {
            const acts = await listActividades(token, { cultivoId: cid, id_cultivo: cid });
            const arr = Array.isArray(acts?.items) ? acts.items : Array.isArray(acts) ? acts : [];
            const found = arr.find((a) => (a.responsable !== undefined) || (a.usuario !== undefined) || (a.id_usuario !== undefined) || (a.id_responsable !== undefined));
            if (found) {
              const ar = found.responsable !== undefined ? found.responsable : (found.usuario !== undefined ? found.usuario : (found.id_usuario !== undefined ? found.id_usuario : found.id_responsable));
              responsable = formatUserName(ar);
            }
          } catch {}
        }
        const details = { nombre_cultivo: nombre, estado };
        if (responsable) Object.assign(details, { responsable });
        const usuario = typeof crop?.raw?.usuario === 'object' ? formatUserName(crop.raw.usuario) : (crop?.raw?.usuario || null);
        if (usuario && !details.responsable) Object.assign(details, { usuario });
        return details;
      } catch {
        return {};
      }
    }
    try {
      const res = await fetch(`${baseUrl}/actividades/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      const ct = res.headers.get('content-type') || '';
      const data = ct.includes('application/json') ? await res.json() : await res.text();
      if (!res.ok) throw new Error(data?.message || String(data));
      const cid = data?.id_cultivo || null;
      let nombre = data?.nombre_cultivo || null;
      if (!nombre && cid) {
        try {
          const crop = await cropService.getCropById(token, cid);
          nombre = crop?.nombre_cultivo || crop?.displayName || crop?.tipo_cultivo || null;
        } catch {}
      }
      const estado = data?.estado || data?.estado_actividad || null;
      const respRaw = pickResponsableFromActivity(data);
      const responsable = formatUserName(respRaw);
      const usuario = typeof data.usuario === 'object' ? formatUserName(data.usuario) : (data.usuario || null);
      const details = { ...data, nombre_cultivo: nombre, estado };
      if (responsable) Object.assign(details, { responsable });
      if (usuario) Object.assign(details, { usuario });
      return details;
    } catch {
      return {};
    }
  }
};

export default calendarService;
