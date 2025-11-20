import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, FlatList, Modal } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { listCategorias, createCategoria, updateCategoria, deleteCategoria } from '../../services/api';
import CategoriaFormModal from '../../components/molecules/CategoriaFormModal';

function Row({ item, onEdit, onDelete }) {
  return (
    <View style={[styles.row, styles.tableRow]}>
      <Text style={[styles.cell, styles.wId]}>{item.id}</Text>
      <Text style={[styles.cell, styles.wName]}>{item.nombre}</Text>
      <Text style={[styles.cell, styles.wDesc]}>{item.descripcion || '—'}</Text>
      <View style={[styles.cell, styles.wAct, styles.actions]}>
        <Pressable style={styles.iconBtn} onPress={onEdit}><Feather name="edit-2" size={16} color="#16A34A" /></Pressable>
        <Pressable style={styles.iconBtn} onPress={onDelete}><Feather name="trash-2" size={16} color="#EF4444" /></Pressable>
      </View>
    </View>
  );
}

export default function CategoriasPage() {
  const { token } = useAuth();
  const [query, setQuery] = useState('');
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [openForm, setOpenForm] = useState(false);
  const [current, setCurrent] = useState(null);
  const [page, setPage] = useState(1);
  const pageSize = 8;
  const [confirm, setConfirm] = useState({ open: false, text: '', action: null });

  const fetchData = async () => {
    setError('');
    try {
      const arr = await listCategorias(token);
      setItems(arr);
    } catch (e) {
      setError(e?.message || 'Error cargando categorías');
    }
  };

  useEffect(() => { fetchData(); }, [token]);
  useEffect(() => { const id = setTimeout(() => fetchData(), 400); return () => clearTimeout(id); }, [query]);

  const filtered = items.filter((it) => {
    const t = `${it.nombre || ''} ${it.descripcion || ''}`.toLowerCase();
    return t.includes(query.toLowerCase());
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageItems = filtered.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize);

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.pageContent}>
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Gestión de Categorías</Text>
        <Pressable style={styles.newBtn} onPress={() => { setCurrent(null); setOpenForm(true); }}><Feather name="plus" size={16} color="#fff" /><Text style={styles.newBtnText}> Nueva Categoría</Text></Pressable>
      </View>
      <View style={styles.searchBox}>
        <Feather name="search" size={16} color="#64748b" />
        <TextInput style={styles.searchInput} placeholder="Buscar por nombre o descripción..." value={query} onChangeText={setQuery} />
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.tableContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={styles.tableHContent}>
          <View style={styles.tableContent}>
            <View style={[styles.tableHeader, styles.tableRow]}>
              <Text style={[styles.th, styles.wId]}>ID</Text>
              <Text style={[styles.th, styles.wName]}>Nombre</Text>
              <Text style={[styles.th, styles.wDesc]}>Descripción</Text>
              <Text style={[styles.th, styles.wAct]}>Acciones</Text>
            </View>
            <FlatList
              data={pageItems}
              keyExtractor={(it) => String(it.id)}
              renderItem={({ item }) => (
                <Row
                  item={item}
                  onEdit={() => { setCurrent(item); setOpenForm(true); }}
                  onDelete={() => setConfirm({ open: true, text: `¿Eliminar categoría ${item.nombre}?`, action: async () => { await deleteCategoria(item.id, token); fetchData(); } })}
                />
              )}
              contentContainerStyle={styles.scrollContent}
              nestedScrollEnabled
            />
            <View style={styles.pagination}>
              <Pressable style={[styles.pageBtn, page <= 1 && styles.pageBtnDisabled]} onPress={() => page > 1 && setPage(page - 1)}><Feather name="chevron-left" size={16} color={page <= 1 ? '#94a3b8' : '#0f172a'} /></Pressable>
              <Text style={styles.pageText}>{page} / {totalPages}</Text>
              <Pressable style={[styles.pageBtn, page >= totalPages && styles.pageBtnDisabled]} onPress={() => page < totalPages && setPage(page + 1)}><Feather name="chevron-right" size={16} color={page >= totalPages ? '#94a3b8' : '#0f172a'} /></Pressable>
            </View>
          </View>
        </ScrollView>
      </View>

      <CategoriaFormModal visible={openForm} categoria={current} onClose={() => setOpenForm(false)} onSubmit={async (payload) => { if (current) await updateCategoria(current.id, payload, token); else await createCategoria(payload, token); fetchData(); }} />
      <Modal visible={confirm.open} transparent animationType="fade" onRequestClose={() => setConfirm({ open: false, text: '', action: null })}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Confirmar</Text>
            <Text style={styles.modalText}>{confirm.text}</Text>
            <View style={styles.modalActions}>
              <Pressable style={[styles.btn, styles.btnSecondary]} onPress={() => setConfirm({ open: false, text: '', action: null })}><Text style={styles.btnSecondaryText}>Cancelar</Text></Pressable>
              <Pressable style={[styles.btn, styles.btnDanger]} onPress={async () => { try { await confirm.action?.(); } finally { setConfirm({ open: false, text: '', action: null }); } }}><Text style={styles.btnPrimaryText}>Eliminar</Text></Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff', padding: 12 },
  pageContent: { paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pageTitle: { fontSize: 18, fontWeight: '700', color: '#16A34A' },
  newBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#22C55E', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  newBtnText: { color: '#fff', fontSize: 13 },
  searchBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E4E7EC', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, marginVertical: 8 },
  searchInput: { marginLeft: 8, fontSize: 14, flex: 1 },
  tableContainer: { backgroundColor: '#fff', borderRadius: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  tableHContent: { },
  tableContent: { width: 820 },
  tableHeader: { flexDirection: 'row', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#E4E7EC', backgroundColor: '#FAFAFA', borderTopLeftRadius: 12, borderTopRightRadius: 12 },
  th: { fontSize: 12, fontWeight: '700', color: '#16A34A' },
  tableRow: { width: 820 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#ECEFF1' },
  cell: { fontSize: 12, color: '#0f172a' },
  wId: { width: 80 },
  wName: { width: 220 },
  wDesc: { width: 360 },
  wAct: { width: 160 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', width: 160 },
  iconBtn: { marginRight: 14 },
  error: { marginBottom: 8, color: '#DC2626' },
  pagination: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', paddingVertical: 8 },
  pageBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#E4E7EC', marginHorizontal: 4 },
  pageBtnDisabled: { opacity: 0.6 },
  pageText: { fontSize: 12, color: '#334155' },
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