import { baseUrl } from './api';

const getAuthHeader = (token) => ({
  Authorization: `Bearer ${token}`,
});

const mapLot = (l) => ({
  id: l.id_lote || l.id,
  nombre: l.nombre_lote || l.nombre || '',
  descripcion: l.descripcion || '',
  activo: l.activo !== undefined ? l.activo : true,
  createdAt: l.createdAt,
  updatedAt: l.updatedAt,
  raw: l
});

const lotService = {
  getLots: async (token) => {
    try {
      const res = await fetch(`${baseUrl}/lotes`, {
        headers: getAuthHeader(token)
      });
      const ct = res.headers.get('content-type') || '';
      const data = ct.includes('application/json') ? await res.json() : await res.text();
      if (!res.ok) {
        const msg = typeof data === 'string' ? data.slice(0, 140) : (data?.message || 'Error al obtener lotes');
        throw new Error(msg);
      }
      const arr = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
      return arr.map(mapLot);
    } catch (error) {
      console.error('Error al obtener lotes:', error);
      if (error.response?.status === 403) {
        throw new Error('No tienes permisos para ver los lotes');
      }
      throw error;
    }
  },

  getLotById: async (token, id) => {
    try {
      const res = await fetch(`${baseUrl}/lotes/${id}`, {
        headers: getAuthHeader(token)
      });
      const ct = res.headers.get('content-type') || '';
      const data = ct.includes('application/json') ? await res.json() : await res.text();
      if (!res.ok) {
        const msg = typeof data === 'string' ? data.slice(0, 140) : (data?.message || 'Error al obtener el lote');
        throw new Error(msg);
      }
      return mapLot(data);
    } catch (error) {
      console.error('Error al obtener el lote:', error);
      if (error.response?.status === 403) {
        throw new Error('No tienes permisos para ver este lote');
      }
      throw error;
    }
  },

  createLot: async (token, lotData) => {
    try {
      console.log('[lotService] Datos recibidos para crear:', lotData);

      const { nombre_lote, descripcion, activo } = lotData;
      const filteredData = {
        nombre_lote: String(nombre_lote || '').trim(),
        descripcion: String(descripcion || '').trim(),
        activo: Boolean(activo !== undefined ? activo : true)
      };

      if (!filteredData.nombre_lote || !filteredData.descripcion) {
        throw new Error('Completa Nombre y Descripción');
      }

      console.log('[lotService] Datos filtrados para envío:', filteredData);

      const res = await fetch(`${baseUrl}/lotes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(token)
        },
        body: JSON.stringify(filteredData)
      });
      const ct = res.headers.get('content-type') || '';
      const data = ct.includes('application/json') ? await res.json() : await res.text();
      if (!res.ok) {
        const msg = typeof data === 'string' ? data.slice(0, 140) : (data?.message || 'Error al crear el lote');
        throw new Error(msg);
      }
      return mapLot(data);
    } catch (error) {
      console.error('Error al crear el lote:', error);
      if (error.response?.status === 403) {
        throw new Error('No tienes permisos para crear lotes');
      }
      throw error;
    }
  },

  updateLot: async (token, id, lotData) => {
    try {
      console.log('[lotService] Datos recibidos para actualizar:', lotData);

      const updateData = {};

      if (lotData.nombre_lote !== undefined) {
        updateData.nombre_lote = lotData.nombre_lote;
      }
      if (lotData.descripcion !== undefined) {
        updateData.descripcion = lotData.descripcion;
      }

      if ('activo' in lotData) {
        updateData.activo = Boolean(lotData.activo);
        console.log('[lotService] Incluyendo campo activo en actualización:', lotData.activo);
      } else {
        console.log('[lotService] Campo activo no presente en datos recibidos');
      }

      console.log('[lotService] Datos finales para PATCH:', updateData);

      const res = await fetch(`${baseUrl}/lotes/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(token)
        },
        body: JSON.stringify(updateData)
      });
      const ct = res.headers.get('content-type') || '';
      const data = ct.includes('application/json') ? await res.json() : await res.text();
      if (!res.ok) {
        const msg = typeof data === 'string' ? data.slice(0, 140) : (data?.message || 'Error al actualizar el lote');
        throw new Error(msg);
      }
      return mapLot(data);
    } catch (error) {
      console.error('Error al actualizar el lote:', error);
      if (error.response?.status === 403) {
        throw new Error('No tienes permisos para actualizar este lote');
      }
      throw error;
    }
  },

  updateCoordinates: async (token, id, geometry) => {
    try {
      const coords = geometry?.coordinates ? geometry.coordinates : null;
      const res = await fetch(`${baseUrl}/lotes/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(token)
        },
        body: JSON.stringify({ coordenadas: coords })
      });
      const ct = res.headers.get('content-type') || '';
      if (!res.ok) {
        const errData = ct.includes('application/json') ? await res.json().catch(() => ({})) : await res.text();
        const msg = typeof errData === 'string' ? errData.slice(0, 140) : (errData?.message || 'Error al actualizar coordenadas');
        throw new Error(msg);
      }
      const data = ct.includes('application/json') ? await res.json() : await res.text();
      return data;
    } catch (error) {
      console.error('Error al actualizar coordenadas del lote:', error);
      throw error;
    }
  },

  deleteLot: async (token, id) => {
    try {
      const res = await fetch(`${baseUrl}/lotes/${id}`, {
        method: 'DELETE',
        headers: getAuthHeader(token)
      });
      if (!res.ok) {
        const ct = res.headers.get('content-type') || '';
        const data = ct.includes('application/json') ? await res.json() : await res.text();
        const msg = typeof data === 'string' ? data.slice(0, 140) : (data?.message || 'Error al eliminar el lote');
        throw new Error(msg);
      }
      return true;
    } catch (error) {
      console.error('Error al eliminar el lote:', error);
      if (error.response?.status === 403) {
        throw new Error('No tienes permisos para eliminar lotes');
      }
      throw error;
    }
  },

  getMapData: async (token) => {
    try {
      const res = await fetch(`${baseUrl}/lotes/map-data`, {
        headers: getAuthHeader(token)
      });
      const ct = res.headers.get('content-type') || '';
      const data = ct.includes('application/json') ? await res.json() : await res.text();
      if (!res.ok) {
        const msg = typeof data === 'string' ? data.slice(0, 140) : (data?.message || 'Error al obtener los datos del mapa');
        throw new Error(msg);
      }
      return data;
    } catch (error) {
      console.error('Error al obtener los datos del mapa:', error);
      throw error;
    }
  }
};

export default lotService;
