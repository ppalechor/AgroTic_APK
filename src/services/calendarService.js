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

const calendarService = {
  getCalendarEvents: async (start, end) => {
    const token = getToken();
    const events = [];
    let cropMap = {};

    try {
      const { items } = await listCultivos(token, { page: 1, limit: 100 });
      const crops = items || [];
      crops.forEach((c) => {
        const cid = c.id_cultivo || c.id;
        const nombre = c.nombre_cultivo || c.displayName || c.tipo_cultivo || `Cultivo ${cid}`;
        cropMap[cid] = { nombre, estado: c.estado_cultivo || '' };
        const siembra = c.fecha_siembra || null;
        const cosecha = c.fecha_cosecha || c.fecha_cosecha_real || c.fecha_cosecha_estimada || null;
        if (siembra && inRange(siembra, start, end)) {
          events.push({ id: `${cid}-siembra`, titulo: `Siembra ${nombre}`, descripcion: '', tipo: 'siembra', fecha: siembra, id_cultivo: cid, nombre_cultivo: nombre, estado: cropMap[cid].estado });
        }
        if (cosecha && inRange(cosecha, start, end)) {
          events.push({ id: `${cid}-cosecha`, titulo: `Cosecha ${nombre}`, descripcion: '', tipo: 'cosecha', fecha: cosecha, id_cultivo: cid, nombre_cultivo: nombre, estado: cropMap[cid].estado });
        }
      });
    } catch (e) {
    }

    try {
      const act = await listActividades(token, { from: start, to: end });
      const actItems = Array.isArray(act?.items) ? act.items : Array.isArray(act) ? act : [];
      actItems.forEach((a) => {
        const fecha = a.fecha_actividad || a.fecha || a.createdAt || null;
        const cid = a.id_cultivo || null;
        const nombre = cid ? (cropMap[cid]?.nombre || null) : null;
        events.push({
          id: a.id_actividad || a.id,
          titulo: a.nombre_actividad || a.descripcion || 'Actividad',
          descripcion: a.detalles || a.descripcion || '',
          tipo: 'actividad',
          fecha,
          id_cultivo: cid,
          nombre_cultivo: nombre,
          estado: a.estado || a.estado_actividad || '',
          responsable: a.responsable || a.usuario || '',
        });
      });
    } catch (e) {
    }


    // Ordenar por fecha
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
        return { nombre_cultivo: nombre, estado };
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
      const responsable = data?.responsable || data?.usuario || null;
      return { ...data, nombre_cultivo: nombre, estado, responsable };
    } catch {
      return {};
    }
  }
};

export default calendarService;
