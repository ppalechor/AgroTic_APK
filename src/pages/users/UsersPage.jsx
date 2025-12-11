import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, FlatList, Pressable, StyleSheet, Modal } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { listUsuarios, deleteUsuario, updateUsuario, registerUser } from '../../services/api';
import UserEditModal from '../../components/molecules/UserEditModal';
import UserCreateModal from '../../components/molecules/UserCreateModal';
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
  const { token, user, permissionKeys, refreshPermissions } = useAuth();
  const [query, setQuery] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [openConfirm, setOpenConfirm] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [openCreate, setOpenCreate] = useState(false);
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

  useEffect(() => { if (token) fetchData(); }, [token]);
  useEffect(() => { if (token) { try { refreshPermissions(); } catch {} } }, [token]);
  useEffect(() => {
    if (!token) return;
    const id = setTimeout(fetchData, 400);
    return () => clearTimeout(id);
  }, [token, query]);

  const permSet = useMemo(() => new Set((permissionKeys || []).map(k => String(k).toLowerCase())), [permissionKeys]);
  const roleName = useMemo(() => String(user?.id_rol?.nombre_rol || user?.nombre_rol || user?.rol || '').trim().toLowerCase(), [user]);
  const isPrivileged = useMemo(() => roleName.includes('admin') || roleName.includes('instructor'), [roleName]);
  const canEdit = isPrivileged || permSet.has('usuarios:*') || permSet.has('usuarios:editar');
  const canDelete = isPrivileged || permSet.has('usuarios:*') || permSet.has('usuarios:eliminar');
  const canViewPerms = isPrivileged || permSet.has('permisos:*') || permSet.has('permisos:ver') || permSet.has('permisos:asignar');
  const canCreate = isPrivileged || permSet.has('usuarios:*') || permSet.has('usuarios:crear');

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{item.nombres || '—'}</Text>
        <View style={[styles.roleChip, (item.nombre_rol || item.rol)?.toLowerCase() === 'administrador' ? styles.roleAdmin : styles.roleDefault]}>
          <Text style={styles.roleText}>{item.nombre_rol || item.rol || '—'}</Text>
        </View>
      </View>
      <View style={styles.cardRow}>
        <View style={styles.cardCol}>
          <Text style={styles.cardLabel}>Email</Text>
          <Text numberOfLines={1} style={styles.cardValue}>{item.email || '—'}</Text>
        </View>
        <View style={styles.cardCol}>
          <Text style={styles.cardLabel}>Tipo Documento</Text>
          <Text numberOfLines={1} style={styles.cardValue}>{item.tipo_documento || '—'}</Text>
        </View>
      </View>
      <View style={styles.cardRow}>
        <View style={styles.cardCol}>
          <Text style={styles.cardLabel}>Número Documento</Text>
          <Text numberOfLines={1} style={styles.cardValue}>{item.numero_documento || '—'}</Text>
        </View>
      </View>
      <View style={styles.cardActions}>
        {canEdit && (
          <Pressable style={styles.iconBtn} onPress={() => { setToEdit(item); setOpenEdit(true); }}>
            <Feather name="edit-2" size={16} color="#16A34A" />
          </Pressable>
        )}
        {canViewPerms && (
          <Pressable style={styles.iconBtn} onPress={() => { setPermUser(item); setOpenPermissions(true); }}>
            <Feather name="key" size={16} color="#64748b" />
          </Pressable>
        )}
        {canDelete && (
          <Pressable style={styles.iconBtn} onPress={() => { setToDelete(item); setOpenConfirm(true); }}>
            <Feather name="trash-2" size={16} color="#ef4444" />
          </Pressable>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.root}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Gestión de Usuarios</Text>
        {canCreate && (
          <Pressable style={styles.createBtn} onPress={() => setOpenCreate(true)}>
            <Text style={styles.createBtnText}>Nuevo Usuario</Text>
          </Pressable>
        )}
      </View>
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
      <FlatList
        data={items}
        renderItem={renderItem}
        contentContainerStyle={styles.cardList}
        keyExtractor={(it, idx) => String(it.id || it.id_usuarios || it.numero_documento || idx)}
      />
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
      <UserCreateModal
        visible={openCreate}
        loading={saving}
        onClose={() => setOpenCreate(false)}
        onSubmit={async (payload) => {
          setSaving(true);
          try {
            await registerUser(payload);
            setOpenCreate(false);
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
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  title: { fontSize: 18, fontWeight: '700', color: '#16A34A' },
  createBtn: { backgroundColor: '#16A34A', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  createBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  searchBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E4E7EC', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 8 },
  searchInput: { marginLeft: 8, fontSize: 14, flex: 1 },
  cardList: { paddingBottom: 12 },
  card: { borderWidth: 1, borderColor: '#E4E7EC', borderRadius: 12, padding: 12, marginBottom: 10 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a', flex: 1, marginRight: 8 },
  cardRow: { flexDirection: 'row', gap: 12, marginTop: 6 },
  cardCol: { flex: 1 },
  cardLabel: { fontSize: 12, color: '#64748b' },
  cardValue: { fontSize: 12, color: '#0f172a' },
  roleWrap: { flex: 1, alignItems: 'flex-start' },
  roleChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, backgroundColor: '#F8FAFC' },
  roleAdmin: { backgroundColor: '#FEE2E2' },
  roleDefault: { backgroundColor: '#FEF3C7' },
  roleText: { fontSize: 12, color: '#0f172a' },
  cardActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 },
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
