import { baseUrl } from './api';

const getAuthHeader = (token) => ({
  Authorization: `Bearer ${token}`,
});

const mapCrop = (c) => ({
  id: c.id_cultivo || c.id,
  nombre_cultivo: c.nombre_cultivo,
  tipo_cultivo: c.tipo_cultivo,
  displayName: c.nombre_cultivo || c.nombre || c.tipo_cultivo || `Cultivo ${c.id_cultivo || c.id}`,
  fecha_siembra: c.fecha_siembra,
  fecha_cosecha_estimada: c.fecha_cosecha_estimada,
  fecha_cosecha_real: c.fecha_cosecha_real,
  fecha_cosecha: c.fecha_cosecha || c.fecha_cosecha_real || null,
  estado_cultivo: c.estado_cultivo,
  observaciones: c.observaciones,
  id_lote: c.id_lote,
  id_insumo: c.id_insumo,
  createdAt: c.createdAt,
  updatedAt: c.updatedAt,
  raw: c
});

const cropService = {
  getCrops: async (token, page = 1, limit = 10) => {
    try {
      const url = new URL(`${baseUrl}/cultivos`);
      url.searchParams.set('page', page);
      url.searchParams.set('limit', limit);
      const res = await fetch(url.toString(), {
        headers: getAuthHeader(token)
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || 'Error al obtener cultivos');
      }

      if (data && data.items) {
        return {
          items: data.items.map(mapCrop),
          meta: data.meta
        };
      }

      const items = Array.isArray(data) ? data.map(mapCrop) : data;
      return {
        items,
        meta: { totalPages: 1, currentPage: 1 }
      };

    } catch (error) {
      console.error('Error al obtener cultivos:', error);
      if (error.response?.status === 403) {
        throw new Error('No tienes permisos para ver los cultivos');
      }
      throw error;
    }
  },

  getCropById: async (token, id) => {
    try {
      const res = await fetch(`${baseUrl}/cultivos/${id}`, {
        headers: getAuthHeader(token)
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || 'Error al obtener el cultivo');
      }
      return mapCrop(data);
    } catch (error) {
      console.error('Error al obtener el cultivo:', error);
      if (error.response?.status === 403) {
        throw new Error('No tienes permisos para ver este cultivo');
      }
      throw error;
    }
  },

  createCrop: async (token, cropData) => {
    try {
      console.log('[cropService] POST /cultivos payload:', cropData);
      const res = await fetch(`${baseUrl}/cultivos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(token)
        },
        body: JSON.stringify(cropData)
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || 'Error al crear el cultivo');
      }
      return mapCrop(data);
    } catch (error) {
      console.error('Error al crear el cultivo:', error);
      if (error.response?.status === 403) {
        throw new Error('No tienes permisos para crear cultivos');
      }
      throw error;
    }
  },

  updateCrop: async (token, id, cropData) => {
    try {
      console.log('[cropService] PATCH /cultivos/' + id + ' payload:', cropData);
      const res = await fetch(`${baseUrl}/cultivos/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(token)
        },
        body: JSON.stringify(cropData)
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || 'Error al actualizar el cultivo');
      }
      return mapCrop(data);
    } catch (error) {
      console.error('Error al actualizar el cultivo:', error);
      if (error.response?.status === 403) {
        throw new Error('No tienes permisos para actualizar este cultivo');
      }
      throw error;
    }
  },

  deleteCrop: async (token, id) => {
    try {
      const res = await fetch(`${baseUrl}/cultivos/${id}`, {
        method: 'DELETE',
        headers: getAuthHeader(token)
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.message || 'Error al eliminar el cultivo');
      }
      return true;
    } catch (error) {
      console.error('Error al eliminar el cultivo:', error);
      if (error.response?.status === 403) {
        throw new Error('No tienes permisos para eliminar cultivos');
      }
      if (error.response?.status === 404) {
        throw new Error(`El cultivo con ID ${id} no fue encontrado`);
      }
      if (error.response?.status >= 500) {
        throw new Error('Error del servidor al eliminar el cultivo');
      }
      throw error;
    }
  },

  getCropStatistics: async (token) => {
    try {
      const res = await fetch(`${baseUrl}/cultivos/estadisticas`, {
        headers: getAuthHeader(token)
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || 'Error al obtener estadísticas');
      }
      return data;
    } catch (error) {
      console.error('Error al obtener estadísticas:', error);
      if (error.response?.status === 403) {
        throw new Error('No tienes permisos para ver las estadísticas');
      }
      throw error;
    }
  },

  getCropMargin: async (token, { id, from, to } = {}) => {
    const params = new URLSearchParams();
    if (id) params.append('cultivoId', id);
    if (from) params.append('from', from);
    if (to) params.append('to', to);
    const url = `${baseUrl}/finanzas/resumen${params.toString() ? `?${params.toString()}` : ''}`;
    const res = await fetch(url, { headers: getAuthHeader(token) });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.message || 'Error al obtener margen');
    }
    const d = data || {};
    const ingresos = parseFloat(d.ingresosTotal ?? d.ingresos ?? 0) || 0;
    const egresos = parseFloat(d.egresosTotal ?? d.egresos ?? 0) || 0;
    const margen = parseFloat(d.margenTotal ?? d.margen ?? ingresos - egresos) || 0;
    const beneficioCosto = egresos > 0 ? ingresos / egresos : null;
    const margenPorcentaje = ingresos > 0 ? (margen / ingresos) * 100 : null;
    return { ingresos, egresos, margen, beneficioCosto, margenPorcentaje };
  }
};

export default cropService;