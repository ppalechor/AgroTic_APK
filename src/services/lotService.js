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
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || 'Error al obtener lotes');
      }
      return Array.isArray(data) ? data.map(mapLot) : [];
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
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || 'Error al obtener el lote');
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
        nombre_lote: String(nombre_lote),
        descripcion: String(descripcion),
        activo: Boolean(activo !== undefined ? activo : true)
      };

      console.log('[lotService] Datos filtrados para envío:', filteredData);

      const res = await fetch(`${baseUrl}/lotes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(token)
        },
        body: JSON.stringify(filteredData)
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || 'Error al crear el lote');
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
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || 'Error al actualizar el lote');
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
      const body1 = { coordenadas: geometry };
      try {
        const r1 = await fetch(`${baseUrl}/lotes/${id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeader(token)
          },
          body: JSON.stringify(body1)
        });
        if (r1.ok) {
          const data = await r1.json();
          return data;
        }
      } catch (e1) {
        // ignore
      }
      try {
        const r2 = await fetch(`${baseUrl}/lotes/${id}/coordenadas`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeader(token)
          },
          body: JSON.stringify(geometry)
        });
        if (r2.ok) {
          const data = await r2.json();
          return data;
        }
      } catch (e2) {
        // ignore
      }
      const r3 = await fetch(`${baseUrl}/lotes/${id}/coordenadas`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(token)
        },
        body: JSON.stringify(geometry)
      });
      if (!r3.ok) {
        throw new Error('Error al actualizar coordenadas');
      }
      const data = await r3.json();
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
        const data = await res.json();
        throw new Error(data?.message || 'Error al eliminar el lote');
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
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || 'Error al obtener los datos del mapa');
      }
      return data;
    } catch (error) {
      console.error('Error al obtener los datos del mapa:', error);
      throw error;
    }
  }
};

export default lotService;
