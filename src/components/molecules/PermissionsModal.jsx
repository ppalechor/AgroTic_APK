import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Modal, TextInput, Pressable, StyleSheet, FlatList, Alert } from 'react-native';
import permissionService from '../../services/permissionService';
import { useAuth } from '../../contexts/AuthContext';

const KNOWN_RESOURCES = [
  'actividades','alertas','almacenes','categorias','cultivos','epa','finanzas','ingresos','insumos','inventario','lotes','movimientos','permisos','realiza','rol','salidas','sensores','sublotes','tiene','tiporol','tratamientos','usuarios','utiliza'
];

const normalizeAction = (a) => {
  const s = (a || '').toString().trim().toLowerCase();
  if (!s) return '';
  const map = { read: 'ver', list: 'ver', view: 'ver', create: 'crear', add: 'crear', new: 'crear', update: 'editar', edit: 'editar', delete: 'eliminar', remove: 'eliminar', export: 'exportar' };
  return map[s] || s;
};

export default function PermissionsModal({ visible, onClose, user }) {
  const { user: authUser, refreshPermissions } = useAuth();
  const [allPerms, setAllPerms] = useState([]);
  const [userKeys, setUserKeys] = useState([]);
  const [recurso, setRecurso] = useState('');
  const [accion, setAccion] = useState('');
  const [loadingId, setLoadingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('all'); // all | activo | inactivo
  const [assignedFilter, setAssignedFilter] = useState('all'); // all | assigned | not_assigned

  useEffect(() => {
    if (!visible) return;
    (async () => {
      try {
        const ap = await permissionService.list();
        setAllPerms(ap || []);
      } catch (e) {
        console.warn('Failed to load perms', e);
      }
      try {
        if (user?.id) {
          const uk = await permissionService.getUserKeys(user.id);
          setUserKeys(uk || []);
        } else {
          setUserKeys([]);
        }
      } catch (e) {
        console.warn('Failed to load user keys', e);
        setUserKeys([]);
      }
    })();
  }, [visible, user]);

  const normalizedPerms = useMemo(() => allPerms.map(p => ({ ...p, accion: normalizeAction(p.accion), clave: `${p.recurso}:${normalizeAction(p.accion)}` })), [allPerms]);

  const assignedSet = useMemo(() => new Set((userKeys || []).map(k => {
    const parts = (k || '').split(':');
    if (parts.length === 2) return `${parts[0]}:${normalizeAction(parts[1])}`;
    return k;
  })), [userKeys]);

  const resources = useMemo(() => {
    const fromBD = new Set(normalizedPerms.map(p => p.recurso));
    const combined = new Set([...fromBD, ...KNOWN_RESOURCES]);
    return Array.from(combined).sort();
  }, [normalizedPerms]);

  const actionsByResource = useMemo(() => {
    const m = new Map();
    normalizedPerms.forEach(p => {
      if (!m.has(p.recurso)) m.set(p.recurso, new Set());
      m.get(p.recurso).add(p.accion);
    });
    const out = {};
    m.forEach((s, k) => { out[k] = Array.from(s).sort(); });
    return out;
  }, [normalizedPerms]);

  const selectedKey = recurso && accion ? `${recurso}:${accion}` : '';
  const existingPerm = useMemo(() => normalizedPerms.find(p => p.clave === selectedKey), [normalizedPerms, selectedKey]);

  const filteredPerms = useMemo(() => {
    const q = (searchQuery || '').toString().trim().toLowerCase();
    return normalizedPerms.filter(p => {
      if (q) {
        const inName = (p.nombre_permiso || '').toString().toLowerCase().includes(q);
        const inResource = (p.recurso || '').toString().toLowerCase().includes(q);
        const inAction = (p.accion || '').toString().toLowerCase().includes(q);
        if (!(inName || inResource || inAction)) return false;
      }
      if (estadoFilter === 'activo' && !p.activo) return false;
      if (estadoFilter === 'inactivo' && p.activo) return false;
      const isAssigned = assignedSet.has(p.clave);
      if (assignedFilter === 'assigned' && !isAssigned) return false;
      if (assignedFilter === 'not_assigned' && isAssigned) return false;
      return true;
    });
  }, [normalizedPerms, searchQuery, estadoFilter, assignedFilter, assignedSet]);

  const handleCreate = async () => {
    if (!recurso || !accion) return Alert.alert('Atención', 'Seleccione recurso y acción');
    if (existingPerm) return Alert.alert('Info', 'Permiso ya existe');
    try {
      await permissionService.create({ recurso, accion, nombre_permiso: `${recurso}:${accion}`, descripcion: '' });
      Alert.alert('Éxito', 'Permiso creado');
      const ap = await permissionService.list();
      setAllPerms(ap || []);
      setRecurso(''); setAccion('');
    } catch (e) {
      Alert.alert('Error', e?.message || 'No se pudo crear permiso');
    }
  };

  const handleAssign = async () => {
    if (!existingPerm) return;
    setLoadingId(existingPerm.id_permiso);
    try {
      await permissionService.assign({ id_usuario: user.id, id_permiso: existingPerm.id_permiso });
      Alert.alert('Éxito', 'Permiso asignado');
      const uk = await permissionService.getUserKeys(user.id);
      setUserKeys(uk || []);
      if (authUser?.id === user?.id) refreshPermissions(authUser.id);
    } catch (e) {
      Alert.alert('Error', e?.message || 'No se pudo asignar');
    } finally { setLoadingId(null); }
  };

  const handleRevoke = async () => {
    if (!existingPerm) return;
    setLoadingId(existingPerm.id_permiso);
    try {
      await permissionService.revoke({ id_usuario: user.id, id_permiso: existingPerm.id_permiso });
      Alert.alert('Éxito', 'Permiso revocado');
      const uk = await permissionService.getUserKeys(user.id);
      setUserKeys(uk || []);
      if (authUser?.id === user?.id) refreshPermissions(authUser.id);
    } catch (e) {
      Alert.alert('Error', e?.message || 'No se pudo revocar');
    } finally { setLoadingId(null); }
  };

  const renderPerm = ({ item }) => {
    const displayName = (item.nombre_permiso && item.nombre_permiso.trim() !== '') ? item.nombre_permiso : (item.clave || `${item.recurso}:${item.accion}`);
    const assigned = assignedSet.has(item.clave);
    return (
      <View style={styles.permRow}>
        <Text style={styles.permCell}>{item.recurso}</Text>
        <Text style={styles.permCell}>{item.accion}</Text>
        <Text style={[styles.permCell, { flex: 2 }]}>{displayName}</Text>
        <Text style={styles.permCell}>{item.activo ? 'Activo' : 'Inactivo'}</Text>
        {assigned ? (
          <Pressable style={[styles.smallBtn, styles.outlineDanger]} onPress={handleRevoke} disabled={loadingId === item.id_permiso}>
            <Text style={styles.smallBtnText}>{loadingId === item.id_permiso ? 'Revocando...' : 'Revocar'}</Text>
          </Pressable>
        ) : (
          <Pressable style={[styles.smallBtn, styles.primary]} onPress={handleAssign} disabled={loadingId === item.id_permiso}>
            <Text style={styles.smallBtnText}>{loadingId === item.id_permiso ? 'Asignando...' : 'Asignar'}</Text>
          </Pressable>
        )}
      </View>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Permisos de Usuario</Text>
          </View>

          <View style={styles.chipsRow}>
            <View style={styles.chipGreen}><Text style={styles.chipGreenText}>{`Usuario: ${user?.nombres || user?.email || ''}`}</Text></View>
            <View style={styles.chip}><Text style={styles.chipText}>{`ID: ${user?.id || ''}`}</Text></View>
          </View>

          <View style={styles.controlsRow}>
            <TextInput placeholder="Buscar recurso / acción / nombre..." style={styles.searchInput} value={searchQuery} onChangeText={setSearchQuery} />
          </View>

          <View style={styles.rowInputs}>
            <TextInput placeholder="Recurso" style={styles.input} value={recurso} onChangeText={setRecurso} />
            <TextInput placeholder="Acción" style={[styles.input, { marginLeft: 8 }]} value={accion} onChangeText={setAccion} />
          </View>

          <View style={styles.rowActions}>
            {!existingPerm && <Pressable style={[styles.btn, styles.btnOutline]} onPress={handleCreate}><Text style={styles.btnTextOutline}>CREAR PERMISO</Text></Pressable>}
            {existingPerm && !assignedSet.has(selectedKey) && <Pressable style={[styles.btn, styles.primary]} onPress={handleAssign}><Text style={styles.btnText}>Asignar</Text></Pressable>}
            {existingPerm && assignedSet.has(selectedKey) && <Pressable style={[styles.btn, styles.outlineDanger]} onPress={handleRevoke}><Text style={styles.btnText}>Revocar</Text></Pressable>}
          </View>

          <View style={styles.filterRow}>
            <Pressable style={styles.filterBtn} onPress={() => setEstadoFilter(estadoFilter === 'all' ? 'activo' : estadoFilter === 'activo' ? 'inactivo' : 'all')}>
              <Text style={styles.filterBtnText}>{estadoFilter === 'all' ? 'Estado: Todos' : estadoFilter === 'activo' ? 'Estado: Activo' : 'Estado: Inactivo'}</Text>
            </Pressable>
            <Pressable style={styles.filterBtn} onPress={() => setAssignedFilter(assignedFilter === 'all' ? 'assigned' : assignedFilter === 'assigned' ? 'not_assigned' : 'all')}>
              <Text style={styles.filterBtnText}>{assignedFilter === 'all' ? 'Asignación: Todos' : assignedFilter === 'assigned' ? 'Asignación: Asignados' : 'Asignación: No asignados'}</Text>
            </Pressable>
          </View>

          <View style={{ height: 1, backgroundColor: '#E4E7EC', marginVertical: 8 }} />
          <View style={styles.tableHeader}>
            <Text style={[styles.headerCell]}>Recurso</Text>
            <Text style={[styles.headerCell]}>Acción</Text>
            <Text style={[styles.headerCell, { flex: 2 }]}>Nombre</Text>
            <Text style={[styles.headerCell]}>Estado</Text>
            <Text style={[styles.headerCell]}>Asignado</Text>
          </View>

          <FlatList data={filteredPerms} renderItem={renderPerm} keyExtractor={(it) => String(it.id_permiso || it.id || `${it.recurso}:${it.accion}`)} style={{ marginTop: 8 }} />

          <View style={styles.footerActions}>
            <Pressable style={[styles.btn, styles.primaryFull]} onPress={onClose}><Text style={styles.btnText}>CERRAR</Text></Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', alignItems: 'center', justifyContent: 'center' },
  card: { width: '92%', maxHeight: '90%', backgroundColor: '#fff', borderRadius: 12, padding: 12 },
  title: { fontSize: 16, fontWeight: '700', color: '#16A34A', marginBottom: 4 },
  subtitle: { fontSize: 13, color: '#334155', marginBottom: 8 },
  header: { backgroundColor: '#16A34A', paddingVertical: 12, borderTopLeftRadius: 12, borderTopRightRadius: 12, alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  chipsRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10 },
  chipGreen: { backgroundColor: '#E8F5E9', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, marginRight: 8 },
  chipGreenText: { color: '#16A34A' },
  chip: { backgroundColor: '#F3F4F6', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16 },
  chipText: { color: '#334155' },
  controlsRow: { marginBottom: 8 },
  searchInput: { borderWidth: 1, borderColor: '#E4E7EC', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6, fontSize: 13, marginBottom: 8 },
  rowInputs: { flexDirection: 'row', marginBottom: 8 },
  input: { flex: 1, borderWidth: 1, borderColor: '#E4E7EC', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6, fontSize: 13 },
  rowActions: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  btn: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, marginRight: 8 },
  primary: { backgroundColor: '#16A34A' },
  btnOutline: { borderWidth: 1, borderColor: '#16A34A', backgroundColor: '#fff' },
  outlineDanger: { borderWidth: 1, borderColor: '#ef4444' },
  close: { backgroundColor: '#64748b' },
  btnText: { color: '#fff' },
  btnTextOutline: { color: '#16A34A', fontWeight: '700' },
  filterRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  filterBtn: { paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#E4E7EC', backgroundColor: '#fff' },
  filterBtnText: { color: '#334155' },
  tableHeader: { flexDirection: 'row', paddingVertical: 6 },
  headerCell: { flex: 1, fontSize: 12, fontWeight: '700', color: '#16A34A' },
  permRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  permCell: { flex: 1, fontSize: 13, color: '#0f172a' },
  smallBtn: { paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8 },
  smallBtnText: { color: '#fff' }
  ,
  footerActions: { marginTop: 8, alignItems: 'flex-end' },
  primaryFull: { backgroundColor: '#16A34A', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 }
});
