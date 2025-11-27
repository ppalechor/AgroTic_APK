import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, FlatList, Pressable, StyleSheet, Modal, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { listCultivos, createCultivo, updateCultivo, deleteCultivo } from '../../services/api';
import CropFormModal from '../../components/molecules/CropFormModal';

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

export default function CropsPage() {
  const { token, user } = useAuth();
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
  const isGuest = useMemo(() => String(user?.id_rol?.nombre_rol || user?.nombre_rol || user?.rol || '').toLowerCase() === 'invitado', [user]);

  const statusConfig = {
    sembrado: { color: '#1976d2', bgColor: '#e3f2fd' },
    en_crecimiento: { color: '#ed6c02', bgColor: '#fff3e0' },
    cosechado: { color: '#2e7d32', bgColor: '#e8f5e9' },
    perdido: { color: '#d32f2f', bgColor: '#ffebee' }
  };

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const { items: list, meta } = await listCultivos(token, { q: query, page, limit: 10 });
      setItems(list);
      setTotalPages(meta?.totalPages || 1);
    } catch (e) {
      setError(e?.message || 'Error obteniendo cultivos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [page]);
  useEffect(() => {
    setPage(1);
    const id = setTimeout(fetchData, 400);
    return () => clearTimeout(id);
  }, [query]);

  const filteredItems = useMemo(() => {
    if (!query) return items;
    return items.filter(item =>
      (item.nombre_cultivo || '').toLowerCase().includes(query.toLowerCase()) ||
      (item.estado_cultivo || '').toLowerCase().includes(query.toLowerCase())
    );
  }, [query, items]);

  const renderItem = ({ item }) => (
    <View style={styles.row}>
      <Text style={[styles.cell, styles.name]}>{item.nombre_cultivo || '—'}</Text>
      <Text style={styles.cell}>{item.tipo_cultivo || '—'}</Text>
      <View style={[styles.cell]}>
        <View style={[styles.statusChip, { backgroundColor: statusConfig[item.estado_cultivo]?.bgColor || '#f0f0f0' }]}>
          <Text style={[styles.statusText, { color: statusConfig[item.estado_cultivo]?.color || '#000' }]}>{item.estado_cultivo || '—'}</Text>
        </View>
      </View>
      <Text style={styles.cell}>{item.fecha_siembra ? new Date(item.fecha_siembra).toLocaleDateString() : '—'}</Text>
      <Text style={styles.cell}>
        {item.estado_cultivo === 'cosechado' && item.fecha_cosecha_real
          ? new Date(item.fecha_cosecha_real).toLocaleDateString()
          : item.fecha_cosecha
          ? new Date(item.fecha_cosecha).toLocaleDateString()
          : '—'}
      </Text>
      {!isGuest && (
        <View style={[styles.cell, styles.actions]}>
          <Pressable style={styles.iconBtn} onPress={() => { setToEdit(item); setOpenForm(true); }}><Feather name="edit-2" size={16} color="#16A34A" /></Pressable>
          <Pressable style={styles.iconBtn} onPress={() => { setToDelete(item); setOpenConfirm(true); }}><Feather name="trash-2" size={16} color="#ef4444" /></Pressable>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.root}>
      <Text style={styles.title}>Gestión de Cultivos</Text>
      {!isGuest && (
        <Pressable style={styles.addBtn} onPress={() => { setToEdit(null); setOpenForm(true); }}>
          <Feather name="plus" size={16} color="#fff" />
          <Text style={styles.addBtnText}>Nuevo Cultivo</Text>
        </Pressable>
      )}
      <View style={styles.searchBox}>
        <Feather name="search" size={16} color="#64748b" />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por nombre o estado..."
          value={query}
          onChangeText={setQuery}
        />
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.tableHeader}>
        <Text style={[styles.th, styles.name]}>Nombre</Text>
        <Text style={styles.th}>Tipo</Text>
        <Text style={styles.th}>Estado</Text>
        <Text style={styles.th}>Fecha Siembra</Text>
        <Text style={styles.th}>Fecha Cosecha</Text>
        {!isGuest && <Text style={[styles.th, styles.actions]}>Acciones</Text>}
      </View>
      {loading ? <ActivityIndicator size="large" color="#16A34A" /> : (
        <FlatList
          data={filteredItems}
          renderItem={renderItem}
          keyExtractor={(it) => String(it.id_cultivo || it.id)}
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
        text={`¿Eliminar el cultivo "${toDelete?.nombre_cultivo || ''}"?`}
        onCancel={() => { setOpenConfirm(false); setToDelete(null); }}
        onConfirm={async () => {
          try {
            await deleteCultivo(toDelete?.id_cultivo || toDelete?.id, token);
            setOpenConfirm(false); setToDelete(null);
            fetchData();
          } catch (e) {
            setError(e?.message || 'Error eliminando cultivo');
          }
        }}
      />
      <CropFormModal
        visible={openForm}
        crop={toEdit}
        loading={saving}
        onClose={() => { setOpenForm(false); setToEdit(null); }}
        onSubmit={async (payload) => {
          setSaving(true);
          try {
            if (toEdit) {
              await updateCultivo(toEdit.id_cultivo || toEdit.id, payload, token);
            } else {
              await createCultivo(payload, token);
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
  searchBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E4E7EC', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 8 },
  searchInput: { marginLeft: 8, fontSize: 14, flex: 1 },
  tableHeader: { flexDirection: 'row', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#E4E7EC' },
  th: { flex: 1, fontSize: 12, fontWeight: '700', color: '#16A34A' },
  name: { flex: 1.5 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  cell: { flex: 1, fontSize: 12, color: '#0f172a' },
  statusChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12 },
  actions: { flex: 0.8, flexDirection: 'row', justifyContent: 'flex-end' },
  iconBtn: { marginLeft: 10 },
  error: { marginBottom: 8, color: '#DC2626' },
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
  pagination: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, marginTop: 8 },
  pageBtn: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#16A34A', borderRadius: 8 },
  disabled: { backgroundColor: '#ccc' },
  pageText: { color: '#fff', fontSize: 14 },
  pageInfo: { fontSize: 14, color: '#0f172a' },
});
