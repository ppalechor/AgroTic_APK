import { baseUrl, listActividades, listCultivos } from './api';
import { getToken } from './authToken';

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

    try {
      // Actividades en rango
      const act = await listActividades(token, { from: start, to: end });
      const actItems = Array.isArray(act?.items) ? act.items : Array.isArray(act) ? act : [];
      actItems.forEach((a) => {
        const fecha = a.fecha_actividad || a.fecha || a.createdAt || null;
        events.push({
          id: a.id_actividad || a.id,
          titulo: a.nombre_actividad || a.descripcion || 'Actividad',
          descripcion: a.descripcion || '',
          tipo: 'actividad',
          fecha,
          id_cultivo: a.id_cultivo || null,
        });
      });
    } catch (e) {
      // ignore to avoid blocking calendar
    }

    try {
      // Siembras y cosechas de cultivos
      const { items } = await listCultivos(token, { page: 1, limit: 500 });
      const crops = items || [];
      crops.forEach((c) => {
        const cid = c.id_cultivo || c.id;
        const nombre = c.nombre_cultivo || c.displayName || c.tipo_cultivo || `Cultivo ${cid}`;
        const siembra = c.fecha_siembra || null;
        const cosecha = c.fecha_cosecha || c.fecha_cosecha_real || c.fecha_cosecha_estimada || null;
        if (siembra && inRange(siembra, start, end)) {
          events.push({ id: `${cid}-siembra`, titulo: `Siembra ${nombre}`, descripcion: '', tipo: 'siembra', fecha: siembra, id_cultivo: cid });
        }
        if (cosecha && inRange(cosecha, start, end)) {
          events.push({ id: `${cid}-cosecha`, titulo: `Cosecha ${nombre}`, descripcion: '', tipo: 'cosecha', fecha: cosecha, id_cultivo: cid });
        }
      });
    } catch (e) {
      // ignore
    }

    // Ordenar por fecha
    events.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
    return events;
  },

  getEventDetails: async (id) => {
    try {
      const token = getToken();
      // Intentar obtener detalle de actividad
      const res = await fetch(`${baseUrl}/actividades/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      const ct = res.headers.get('content-type') || '';
      const data = ct.includes('application/json') ? await res.json() : await res.text();
      if (!res.ok) throw new Error(data?.message || String(data));
      return data;
    } catch {
      return {};
    }
  }
};

export default calendarService;
