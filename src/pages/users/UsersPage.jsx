import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, FlatList, Pressable, StyleSheet, Modal } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { listUsuarios, deleteUsuario, updateUsuario } from '../../services/api';
import UserEditModal from '../../components/molecules/UserEditModal';
import PermissionsModal from '../../components/molecules/PermissionsModal';

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

export default function UsersPage() {
  const { token } = useAuth();
  const [query, setQuery] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [openConfirm, setOpenConfirm] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [openPermissions, setOpenPermissions] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [toEdit, setToEdit] = useState(null);
  const [permUser, setPermUser] = useState(null);
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const { items: list } = await listUsuarios(token, { q: query, page: 1, limit: 50 });
      setItems(list);
    } catch (e) {
      setError(e?.message || 'Error obteniendo usuarios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);
  useEffect(() => {
    const id = setTimeout(fetchData, 400);
    return () => clearTimeout(id);
  }, [query]);

  const renderItem = ({ item }) => (
    <View style={styles.row}>
      <Text style={[styles.cell, styles.name]}>{item.nombres || '—'}</Text>
      <Text style={[styles.cell]}>{item.email || '—'}</Text>
      <Text style={[styles.cell]}>{item.tipo_documento || '—'}</Text>
      <Text style={[styles.cell]}>{item.numero_documento || '—'}</Text>
      <View style={[styles.cell, styles.roleWrap]}>
        <View style={[styles.roleChip, (item.nombre_rol || item.rol)?.toLowerCase() === 'administrador' ? styles.roleAdmin : styles.roleDefault]}>
          <Text style={styles.roleText}>{item.nombre_rol || item.rol || '—'}</Text>
        </View>
      </View>
      <View style={[styles.cell, styles.actions]}>
        <Pressable style={styles.iconBtn} onPress={() => { setToEdit(item); setOpenEdit(true); }}><Feather name="edit-2" size={16} color="#16A34A" /></Pressable>
        <Pressable style={styles.iconBtn} onPress={() => { setPermUser(item); setOpenPermissions(true); }}><Feather name="key" size={16} color="#64748b" /></Pressable>
        <Pressable style={styles.iconBtn} onPress={() => { setToDelete(item); setOpenConfirm(true); }}><Feather name="trash-2" size={16} color="#ef4444" /></Pressable>
      </View>
    </View>
  );

  return (
    <View style={styles.root}>
      <Text style={styles.title}>Gestión de Usuarios</Text>
      <View style={styles.searchBox}>
        <Feather name="search" size={16} color="#64748b" />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por nombre, email o documento..."
          value={query}
          onChangeText={setQuery}
        />
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.tableHeader}>
        <Text style={[styles.th, styles.name]}>Nombres</Text>
        <Text style={styles.th}>Email</Text>
        <Text style={styles.th}>Tipo Documento</Text>
        <Text style={styles.th}>Número Documento</Text>
        <Text style={styles.th}>Rol</Text>
        <Text style={[styles.th, styles.actions]}>Acciones</Text>
      </View>
      <FlatList data={items} renderItem={renderItem} keyExtractor={(it, idx) => String(it.id || it.id_usuarios || it.numero_documento || idx)} />
      <ConfirmModal
        visible={openConfirm}
        text={`¿Eliminar al usuario ${toDelete?.nombres || toDelete?.email || ''}?`}
        onCancel={() => { setOpenConfirm(false); setToDelete(null); }}
        onConfirm={async () => {
          try {
            await deleteUsuario(toDelete?.id || toDelete?.id_usuarios || toDelete?.id_usuario, token);
            setOpenConfirm(false); setToDelete(null);
            fetchData();
          } catch (e) {
            setError(e?.message || 'Error eliminando usuario');
          }
        }}
      />
      <UserEditModal
        visible={openEdit}
        user={toEdit}
        loading={saving}
        onClose={() => { setOpenEdit(false); setToEdit(null); }}
        onSubmit={async (payload) => {
          setSaving(true);
          try {
            await updateUsuario(toEdit?.id || toEdit?.id_usuarios || toEdit?.id_usuario, payload, token);
            setOpenEdit(false); setToEdit(null);
            fetchData();
          } catch (e) {
            throw e;
          } finally {
            setSaving(false);
          }
        }}
      />
      <PermissionsModal visible={openPermissions} onClose={() => { setOpenPermissions(false); setPermUser(null); }} user={permUser} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff', padding: 12 },
  title: { fontSize: 18, fontWeight: '700', color: '#16A34A', marginBottom: 8 },
  searchBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E4E7EC', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 8 },
  searchInput: { marginLeft: 8, fontSize: 14, flex: 1 },
  tableHeader: { flexDirection: 'row', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#E4E7EC' },
  th: { flex: 1, fontSize: 12, fontWeight: '700', color: '#16A34A' },
  name: { flex: 1.2 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  cell: { flex: 1, fontSize: 12, color: '#0f172a' },
  roleWrap: { flex: 1, alignItems: 'flex-start' },
  roleChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, backgroundColor: '#F8FAFC' },
  roleAdmin: { backgroundColor: '#FEE2E2' },
  roleDefault: { backgroundColor: '#FEF3C7' },
  roleText: { fontSize: 12, color: '#0f172a' },
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
});
