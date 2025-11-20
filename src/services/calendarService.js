import { baseUrl } from './api';
import { getToken } from './authToken';

class CalendarService {
  async getCalendarEvents(fechaDesde, fechaHasta) {
    const token = getToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    const cultivosUrl = `${baseUrl}/cultivos/calendario`;
    const actividadesUrl = `${baseUrl}/actividades/reporte`;

    const toQuery = (url, params) => {
      const u = new URL(url);
      Object.entries(params || {}).forEach(([k, v]) => {
        if (v !== undefined && v !== null && String(v).length) u.searchParams.set(k, String(v));
      });
      return u.toString();
    };

    try {
      const cultivosRes = await fetch(toQuery(cultivosUrl, { fecha_desde: fechaDesde, fecha_hasta: fechaHasta }), { headers });
      const actividadesRes = await fetch(toQuery(actividadesUrl, { fecha_inicio: fechaDesde, fecha_fin: fechaHasta }), { headers });

      const cultivosCt = cultivosRes.headers.get('content-type') || '';
      const actividadesCt = actividadesRes.headers.get('content-type') || '';

      const cultivosData = cultivosCt.includes('application/json') ? await cultivosRes.json() : [];
      const actividadesData = actividadesCt.includes('application/json') ? await actividadesRes.json() : [];

      if (!cultivosRes.ok) throw new Error(cultivosData?.message || 'Error obteniendo eventos de cultivos');
      if (!actividadesRes.ok) throw new Error(actividadesData?.message || 'Error obteniendo eventos de actividades');

      const eventosCultivos = (cultivosData || []).map((evento) => ({
        id: `cultivo-${evento.id}`,
        titulo: `${evento.estado} - ${evento.tipo_cultivo}`,
        fecha: evento.fecha,
        tipo: evento.estado === 'sembrado' ? 'siembra' : 'cosecha',
        id_cultivo: evento.id_cultivo,
        descripcion: `Evento de ${evento.estado} para el cultivo ${evento.tipo_cultivo}`,
        estado: evento.estado,
        tipo_cultivo: evento.tipo_cultivo,
      }));

      const eventosActividades = (actividadesData || []).map((evento) => ({
        id: `actividad-${evento.id}`,
        titulo: evento.tipo_actividad,
        fecha: evento.fecha,
        tipo: 'actividad',
        id_cultivo: evento.id_cultivo,
        descripcion: evento.detalles,
        estado: evento.estado,
        responsable: evento.responsable,
        tipo_actividad: evento.tipo_actividad,
      }));

      return [...eventosCultivos, ...eventosActividades];
    } catch (e) {
      console.error('[CalendarService] Error:', e);
      throw e;
    }
  }

  async getEventDetails(eventId) {
    const token = getToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    if (String(eventId).startsWith('cultivo-')) {
      const cultivoId = String(eventId).replace('cultivo-', '');
      const res = await fetch(`${baseUrl}/cultivos/${cultivoId}`, { headers });
      const ct = res.headers.get('content-type') || '';
      const data = ct.includes('application/json') ? await res.json() : await res.text();
      if (!res.ok) throw new Error((data?.message) || 'Error obteniendo cultivo');
      return data;
    }
    if (String(eventId).startsWith('actividad-')) {
      const actividadId = String(eventId).replace('actividad-', '');
      const res = await fetch(`${baseUrl}/actividades/${actividadId}`, { headers });
      const ct = res.headers.get('content-type') || '';
      const data = ct.includes('application/json') ? await res.json() : await res.text();
      if (!res.ok) throw new Error((data?.message) || 'Error obteniendo actividad');
      return data;
    }
    throw new Error('Tipo de evento no reconocido');
  }
}

const calendarService = new CalendarService();
export default calendarService;
