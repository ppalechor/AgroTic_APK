import { baseUrl } from './api';

const getAuthHeader = (token) => ({
  Authorization: `Bearer ${token}`,
});

const mapSublot = (s) => ({
  id: s.id_sublote,
  descripcion: s.descripcion || '',
  ubicacion: s.ubicacion || '',
  id_lote: s.id_lote?.id_lote || null,
  nombre_lote: s.id_lote?.nombre_lote || '',
  descripcion_lote: s.id_lote?.descripcion || '',
  activo_lote: s.id_lote?.activo || true,
  raw: s
});

const sublotService = {
  getSublots: async (token) => {
    try {
      const res = await fetch(`${baseUrl}/sublotes`, {
        headers: getAuthHeader(token)
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || 'Error al obtener sublotes');
      }
      return Array.isArray(data) ? data.map(mapSublot) : [];
    } catch (error) {
      console.error('Error al obtener sublotes:', error);
      if (error.response?.status === 403) {
        throw new Error('No tienes permisos para ver los sublotes');
      }
      throw error;
    }
  },

  getSublotById: async (token, id) => {
    try {
      const res = await fetch(`${baseUrl}/sublotes/${id}`, {
        headers: getAuthHeader(token)
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || 'Error al obtener el sublote');
      }
      return mapSublot(data);
    } catch (error) {
      console.error('Error al obtener el sublote:', error);
      if (error.response?.status === 403) {
        throw new Error('No tienes permisos para ver este sublote');
      }
      throw error;
    }
  },

  createSublot: async (token, sublotData) => {
    try {
      const formattedData = {
        descripcion: sublotData.descripcion.trim(),
        ubicacion: sublotData.ubicacion.trim(),
        id_lote: sublotData.id_lote ? parseInt(sublotData.id_lote, 10) : null
      };

      const res = await fetch(`${baseUrl}/sublotes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(token)
        },
        body: JSON.stringify(formattedData)
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || 'Error al crear sublote');
      }
      return mapSublot(data);
    } catch (error) {
      console.error('Error al crear sublote:', error);
      if (error.response?.status === 403) {
        throw new Error('No tienes permisos para crear sublotes');
      }
      if (error.response?.status === 400) {
        const errorData = error.response.data;
        if (errorData.message) {
          throw new Error(errorData.message);
        }
        if (errorData.errors) {
          const errorMessages = Object.values(errorData.errors).flat();
          throw new Error(errorMessages.join(', '));
        }
        throw new Error('Los datos del sublote no son válidos');
      }
      throw error;
    }
  },

  updateSublot: async (token, id, sublotData) => {
    try {
      const formattedData = {
        descripcion: sublotData.descripcion.trim(),
        ubicacion: sublotData.ubicacion.trim(),
        id_lote: sublotData.id_lote ? parseInt(sublotData.id_lote, 10) : null
      };

      const res = await fetch(`${baseUrl}/sublotes/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(token)
        },
        body: JSON.stringify(formattedData)
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || 'Error al actualizar sublote');
      }
      return mapSublot(data);
    } catch (error) {
      console.error('Error al actualizar sublote:', error);
      if (error.response?.status === 403) {
        throw new Error('No tienes permisos para actualizar sublotes');
      }
      if (error.response?.status === 400) {
        const errorData = error.response.data;
        if (errorData.message) {
          throw new Error(errorData.message);
        }
        if (errorData.errors) {
          const errorMessages = Object.values(errorData.errors).flat();
          throw new Error(errorMessages.join(', '));
        }
        throw new Error('Los datos del sublote no son válidos');
      }
      throw error;
    }
  },

  deleteSublot: async (token, id) => {
    try {
      const res = await fetch(`${baseUrl}/sublotes/${id}`, {
        method: 'DELETE',
        headers: getAuthHeader(token)
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.message || 'Error al eliminar sublote');
      }
    } catch (error) {
      console.error('Error al eliminar sublote:', error);
      if (error.response?.status === 403) {
        throw new Error('No tienes permisos para eliminar sublotes');
      }
      throw error;
    }
  },

  getSublotSensors: async (token, id) => {
    try {
      const res = await fetch(`${baseUrl}/sublotes/${id}/sensores`, {
        headers: getAuthHeader(token)
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || 'Error al obtener sensores del sublote');
      }
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Error al obtener sensores del sublote:', error);
      if (error.response?.status === 403) {
        throw new Error('No tienes permisos para ver los sensores de este sublote');
      }
      throw error;
    }
  },

  getSublotStatistics: async (token, id) => {
    try {
      const res = await fetch(`${baseUrl}/sublotes/${id}/estadisticas`, {
        headers: getAuthHeader(token)
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || 'Error al obtener estadísticas del sublote');
      }
      return data || {};
    } catch (error) {
      console.error('Error al obtener estadísticas del sublote:', error);
      if (error.response?.status === 403) {
        throw new Error('No tienes permisos para ver las estadísticas de este sublote');
      }
      return {
        total_sensores: 0,
        sensores_activos: 0,
        sensores_inactivos: 0,
        tipos_sensores: 0,
        ultima_actividad: null
      };
    }
  }
};

export default sublotService;
