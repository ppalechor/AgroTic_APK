import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, FlatList, Pressable, StyleSheet, Modal, ActivityIndicator, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { listActividades, createActividad, updateActividad, deleteActividad, listCultivos } from '../../services/api';
import ActivityFormModal from '../../components/molecules/ActivityFormModal';

function ConfirmModal({ visible, onCancel, onConfirm, text }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Confirmar</Text>
          <Text style={styles.modalText}>{text}</Text>
          <View style={styles.modalActions}>
            <Pressable style={[styles.btn, styles.btnSecondary]} onPress={onCancel}><Text style={styles.btnSecondaryText}>Cancelar</Text></Pressable>
            <Pressable style={[styles.btn, styles.btnDanger]} onPress={onConfirm}><Text style={styles.btnPrimaryText}>Eliminar</Text></Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function ActivitiesPage() {
  const { token } = useAuth();
  const [query, setQuery] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [openConfirm, setOpenConfirm] = useState(false);
  const [openForm, setOpenForm] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [toEdit, setToEdit] = useState(null);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [crops, setCrops] = useState([]);
  const [selectedCrop, setSelectedCrop] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const statusConfig = {
    pendiente: { color: '#f57c00', bgColor: '#fff3e0' },
    en_progreso: { color: '#1976d2', bgColor: '#e3f2fd' },
    completada: { color: '#2e7d32', bgColor: '#e8f5e9' },
    cancelada: { color: '#d32f2f', bgColor: '#ffebee' }
  };

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const params = { q: query, page, limit: 10 };
      if (selectedCrop) params.id_cultivo = selectedCrop;
      if (startDate) params.fecha_inicio = startDate;
      if (endDate) params.fecha_fin = endDate;
      const { items: list, meta } = await listActividades(token, params);
      setItems(list);
      setTotalPages(meta?.totalPages || 1);
    } catch (e) {
      setError(e?.message || 'Error obteniendo actividades');
    } finally {
      setLoading(false);
    }
  };

  const fetchCrops = async () => {
    try {
      const { items: cropsList } = await listCultivos(token, { page: 1, limit: 100 });
      setCrops(cropsList);
    } catch (e) {
      console.error('Error obteniendo cultivos:', e);
    }
  };

  useEffect(() => { fetchData(); }, [page]);
  useEffect(() => {
    const id = setTimeout(fetchData, 400);
    return () => clearTimeout(id);
  }, [query, selectedCrop, startDate, endDate]);
  useEffect(() => { fetchCrops(); }, []);

  const filteredItems = useMemo(() => {
    if (!query) return items;
    return items.filter(item =>
      (item.tipo_actividad || '').toLowerCase().includes(query.toLowerCase()) ||
      (item.responsable || '').toLowerCase().includes(query.toLowerCase()) ||
      (item.detalles || '').toLowerCase().includes(query.toLowerCase())
    );
  }, [query, items]);

  const renderItem = ({ item }) => (
    <View style={styles.row}>
      <Text style={[styles.cell, styles.name]}>{item.tipo_actividad || '—'}</Text>
      <Text style={styles.cell}>{getCropName(item.id_cultivo) || '—'}</Text>
      <Text style={styles.cell}>{item.fecha ? new Date(item.fecha).toLocaleDateString() : '—'}</Text>
      <Text style={styles.cell}>{item.responsable || '—'}</Text>
      <View style={[styles.cell]}>
        <View style={[styles.statusChip, { backgroundColor: statusConfig[item.estado]?.bgColor || '#f0f0f0' }]}>
          <Text style={[styles.statusText, { color: statusConfig[item.estado]?.color || '#000' }]}>{statusConfig[item.estado]?.label || item.estado || '—'}</Text>
        </View>
      </View>
      <View style={[styles.cell, styles.actions]}>
        <Pressable style={styles.iconBtn} onPress={() => { setToEdit(item); setOpenForm(true); }}><Feather name="edit-2" size={16} color="#16A34A" /></Pressable>
        <Pressable style={styles.iconBtn} onPress={() => { setToDelete(item); setOpenConfirm(true); }}><Feather name="trash-2" size={16} color="#ef4444" /></Pressable>
      </View>
    </View>
  );

  const getCropName = (cropId) => {
    const crop = crops.find(c => c.id_cultivo === cropId || c.id === cropId);
    return crop ? (crop.nombre_cultivo || crop.displayName || crop.tipo_cultivo) : 'N/A';
  };

  return (
    <View style={styles.root}>
      <Text style={styles.title}>Gestión de Actividades</Text>
      <Pressable style={styles.addBtn} onPress={() => { setToEdit(null); setOpenForm(true); }}>
        <Feather name="plus" size={16} color="#fff" />
        <Text style={styles.addBtnText}>Nueva Actividad</Text>
      </Pressable>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersContainer}>
        <View style={styles.filterGroup}>
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar..."
            value={query}
            onChangeText={setQuery}
          />
          <TextInput
            style={styles.dateInput}
            placeholder="Fecha inicio (YYYY-MM-DD)"
            value={startDate}
            onChangeText={setStartDate}
          />
          <TextInput
            style={styles.dateInput}
            placeholder="Fecha fin (YYYY-MM-DD)"
            value={endDate}
            onChangeText={setEndDate}
          />
        </View>
      </ScrollView>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.tableHeader}>
        <Text style={[styles.th, styles.name]}>Tipo</Text>
        <Text style={styles.th}>Cultivo</Text>
        <Text style={styles.th}>Fecha</Text>
        <Text style={styles.th}>Responsable</Text>
        <Text style={styles.th}>Estado</Text>
        <Text style={[styles.th, styles.actions]}>Acciones</Text>
      </View>

      {loading ? <ActivityIndicator size="large" color="#16A34A" /> : (
        <FlatList
          data={filteredItems}
          renderItem={renderItem}
          keyExtractor={(it) => String(it.id_actividad || it.id)}
        />
      )}

      {totalPages > 1 && (
        <View style={styles.pagination}>
          <Pressable
            style={[styles.pageBtn, page === 1 && styles.disabled]}
            onPress={() => page > 1 && setPage(page - 1)}
            disabled={page === 1}
          >
            <Text style={styles.pageText}>Anterior</Text>
          </Pressable>
          <Text style={styles.pageInfo}>Página {page} de {totalPages}</Text>
          <Pressable
            style={[styles.pageBtn, page === totalPages && styles.disabled]}
            onPress={() => page < totalPages && setPage(page + 1)}
            disabled={page === totalPages}
          >
            <Text style={styles.pageText}>Siguiente</Text>
          </Pressable>
        </View>
      )}

      <ConfirmModal
        visible={openConfirm}
        text={`¿Eliminar la actividad "${toDelete?.tipo_actividad || ''}"?`}
        onCancel={() => { setOpenConfirm(false); setToDelete(null); }}
        onConfirm={async () => {
          try {
            await deleteActividad(toDelete?.id_actividad || toDelete?.id, token);
            setOpenConfirm(false); setToDelete(null);
            fetchData();
          } catch (e) {
            setError(e?.message || 'Error eliminando actividad');
          }
        }}
      />

      <ActivityFormModal
        visible={openForm}
        activity={toEdit}
        crops={crops}
        loading={saving}
        onClose={() => { setOpenForm(false); setToEdit(null); }}
        onSubmit={async (payload) => {
          setSaving(true);
          try {
            if (toEdit) {
              await updateActividad(toEdit.id_actividad || toEdit.id, payload, token);
            } else {
              await createActividad(payload, token);
            }
            setOpenForm(false); setToEdit(null);
            fetchData();
          } catch (e) {
            throw e;
          } finally {
            setSaving(false);
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff', padding: 12 },
  title: { fontSize: 18, fontWeight: '700', color: '#16A34A', marginBottom: 8 },
  addBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#16A34A', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, alignSelf: 'flex-start', marginBottom: 8 },
  addBtnText: { color: '#fff', marginLeft: 8 },
  filtersContainer: { marginBottom: 8 },
  filterGroup: { flexDirection: 'row', gap: 8 },
  searchInput: { borderWidth: 1, borderColor: '#E4E7EC', borderRadius: 8, padding: 8, flex: 1, minWidth: 150 },
  dateInput: { borderWidth: 1, borderColor: '#E4E7EC', borderRadius: 8, padding: 8, minWidth: 120 },
  tableHeader: { flexDirection: 'row', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#E4E7EC' },
  th: { flex: 1, fontSize: 12, fontWeight: '700', color: '#16A34A' },
  name: { flex: 1.2 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  cell: { flex: 1, fontSize: 12, color: '#0f172a' },
  statusChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12 },
  actions: { flex: 0.8, flexDirection: 'row', justifyContent: 'flex-end' },
  iconBtn: { marginLeft: 10 },
  error: { marginBottom: 8, color: '#DC2626' },
  pagination: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, marginTop: 8 },
  pageBtn: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#16A34A', borderRadius: 8 },
  disabled: { backgroundColor: '#ccc' },
  pageText: { color: '#fff', fontSize: 14 },
  pageInfo: { fontSize: 14, color: '#0f172a' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', alignItems: 'center', justifyContent: 'center' },
  modalCard: { width: '90%', maxWidth: 360, backgroundColor: '#fff', borderRadius: 12, padding: 16 },
  modalTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  modalText: { fontSize: 13, color: '#334155' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12 },
  btn: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8 },
  btnSecondary: { borderWidth: 1, borderColor: '#E4E7EC', marginRight: 8 },
  btnSecondaryText: { color: '#334155', fontSize: 13 },
  btnDanger: { backgroundColor: '#ef4444' },
  btnPrimaryText: { color: '#fff', fontSize: 13 },
});