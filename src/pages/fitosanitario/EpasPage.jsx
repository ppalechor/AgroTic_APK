import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, FlatList, Pressable, StyleSheet, Switch, ScrollView, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { listEpas, createEpa, updateEpa, deleteEpa, createEpaWithImage, uploadEpaImage } from '../../services/api';
import EpaFormModal from '../../components/molecules/EpaFormModal';
import EpaDetailModal from '../../components/molecules/EpaDetailModal';
import AlertBubble from '../../components/molecules/AlertBubble';

export default function EpasPage() {
  const { token } = useAuth();
  const [query, setQuery] = useState('');
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [openForm, setOpenForm] = useState(false);
  const [openDetail, setOpenDetail] = useState(false);
  const [current, setCurrent] = useState(null);
  const [savingId, setSavingId] = useState(null);
  const [success, setSuccess] = useState('');
  const [page, setPage] = useState(1);
  const limit = 5;

  const fetchData = async () => {
    setError('');
    try {
      const arr = await listEpas(token);
      setItems(Array.isArray(arr) ? arr : []);
    } catch (e) {
      setError(e?.message || 'Error obteniendo EPAs');
    }
  };

  useEffect(() => { fetchData(); }, []);
  useEffect(() => { const id = setTimeout(fetchData, 400); return () => clearTimeout(id); }, [query]);
  useEffect(() => { setPage(1); }, [query]);

  const filteredItems = useMemo(() => {
    const q = (query || '').trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => {
      const nombre = String(it.nombre_epa || it.nombre || '').toLowerCase();
      const desc = String(it.descripcion || '').toLowerCase();
      const tipo = String(it.tipo || '').toLowerCase();
      const estado = String(it.estado || '').toLowerCase();
      return nombre.includes(q) || desc.includes(q) || tipo.includes(q) || estado.includes(q);
    });
  }, [query, items]);
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / limit));
  const pagedItems = useMemo(() => {
    const start = (page - 1) * limit;
    return filteredItems.slice(start, start + limit);
  }, [filteredItems, page]);

  const renderItem = ({ item }) => {
    const tipo = String(item.tipo || '').toLowerCase();
    const estado = String(item.estado || '').toLowerCase();
    const tipoStyle =
      tipo === 'enfermedad'
        ? { backgroundColor: '#FEEAEA', color: '#C62828' }
        : tipo === 'plaga'
        ? { backgroundColor: '#FFF4E5', color: '#FB8C00' }
        : { backgroundColor: '#E8F5E9', color: '#2E7D32' };
      const isActive = estado === 'activo';
      return (
        <View style={styles.row}>
        <Text style={[styles.cell, styles.colNombre]} numberOfLines={1}>{item.nombre_epa || item.nombre || '—'}</Text>
        <View style={[styles.cell, styles.colTipo]}>
          <View style={[styles.pill, { backgroundColor: tipoStyle.backgroundColor }]}> 
            <Text style={[styles.pillText, { color: tipoStyle.color }]}>{tipo === 'enfermedad' ? 'Enfermedad' : tipo === 'plaga' ? 'Plaga' : 'Arvense'}</Text>
          </View>
        </View>
        <View style={[styles.cell, styles.colEstado, styles.estadoCell]}>
          <Switch
            value={isActive}
            onValueChange={async (val) => {
              if (savingId) return;
              setSavingId(item.id || item.id_epa);
              try {
                await updateEpa(item.id || item.id_epa, { estado: val ? 'activo' : 'inactivo' }, token);
                setSuccess(val ? 'EPA activada correctamente.' : 'EPA desactivada correctamente.');
                fetchData();
              } catch (e) {
                setError(e?.message || 'Error actualizando estado');
              } finally {
                setSavingId(null);
                setTimeout(() => setSuccess(''), 2000);
              }
            }}
            trackColor={{ false: '#B0BEC5', true: '#A7F3D0' }}
            thumbColor={isActive ? '#16A34A' : '#FFFFFF'}
          />
          <Text style={[styles.estadoText, { color: isActive ? '#2E7D32' : '#37474F' }]}>{isActive ? 'Activado' : 'Desactivada'}</Text>
        </View>
        <View style={[styles.cell, styles.colActions, styles.actions]}>
          <Pressable style={styles.iconBtn} onPress={() => { setCurrent(item); setOpenDetail(true); }}><Feather name="info" size={16} color="#64748b" /></Pressable>
          <Pressable style={styles.iconBtn} onPress={() => { setCurrent(item); setOpenForm(true); }}><Feather name="edit-2" size={16} color="#16A34A" /></Pressable>
          <Pressable
            style={styles.iconBtn}
            onPress={() => {
              const id = item.id || item.id_epa || item.id_usuarios;
              const name = item.nombre_epa || item.nombre || 'EPA';
              Alert.alert(
                `Eliminar "${name}"`,
                `¿Seguro que quieres eliminar "${name}"? Esta acción no se puede deshacer.`,
                [
                  { text: 'Cancelar', style: 'cancel' },
                  {
                    text: 'Eliminar',
                    style: 'destructive',
                    onPress: async () => {
                      try {
                        await deleteEpa(id, token);
                        setSuccess('EPA eliminada correctamente.');
                        fetchData();
                      } catch (e) {
                        setError(e?.message || 'Error eliminando');
                      }
                    },
                  },
                ]
              );
            }}
          >
            <Feather name="trash-2" size={16} color="#ef4444" />
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>Gestión de EPA</Text>
        <Pressable style={styles.newBtn} onPress={() => { setCurrent(null); setOpenForm(true); }}><Feather name="plus" size={16} color="#fff" /><Text style={styles.newBtnText}> Nuevo</Text></Pressable>
      </View>
      <View style={styles.searchBox}>
        <Feather name="search" size={16} color="#64748b" />
        <TextInput style={styles.searchInput} placeholder="Buscar por nombre o descripción..." value={query} onChangeText={setQuery} />
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.tableContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View>
            <View style={styles.tableHeader}>
              <Text style={[styles.th, styles.colNombre]}>Nombre</Text>
              <Text style={[styles.th, styles.colTipo]}>Tipo</Text>
              <Text style={[styles.th, styles.colEstado]}>Estado</Text>
              <Text style={[styles.th, styles.colActions]}>Acciones</Text>
            </View>
            <FlatList
              data={pagedItems}
              renderItem={renderItem}
              keyExtractor={(it, idx) => String(it.id || it.id_epa || idx)}
              nestedScrollEnabled
            />
          </View>
        </ScrollView>
      </View>
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
      <EpaFormModal
        visible={openForm}
        epa={current}
        onClose={() => setOpenForm(false)}
        onSubmit={async (payload, file) => {
          if (current) {
            const id = current.id || current.id_epa || current.id_usuario;
            if (file) {
              try { await uploadEpaImage(id, file, token); } catch (e) {}
            }
            await updateEpa(id, { nombre_epa: payload.nombre_epa, descripcion: payload.descripcion, tipo: payload.tipo, estado: payload.estado }, token);
          } else {
            if (file) await createEpaWithImage({ nombre_epa: payload.nombre_epa, descripcion: payload.descripcion, tipo: payload.tipo, estado: payload.estado }, file, token);
            else await createEpa(payload, token);
          }
          fetchData();
        }}
      />
      <EpaDetailModal visible={openDetail} epa={current} onClose={() => { setOpenDetail(false); setCurrent(null); }} />
      {success ? (<AlertBubble title='¡Éxito!' text={success} type='success' onClose={() => setSuccess('')} />) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff', padding: 12 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '700', color: '#16A34A' },
  newBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#22C55E', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  newBtnText: { color: '#fff', fontSize: 13 },
  searchBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E4E7EC', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, marginVertical: 8 },
  searchInput: { marginLeft: 8, fontSize: 14, flex: 1 },
  tableContainer: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, overflow: 'hidden', backgroundColor: '#fff', minHeight: 120 },
  tableHeader: { flexDirection: 'row', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#E4E7EC', backgroundColor: '#F9FAFB' },
  th: { flex: 1, fontSize: 12, fontWeight: '700', color: '#16A34A' },
  name: { flex: 1.2 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', backgroundColor: '#fff' },
  cell: { flex: 1, fontSize: 12, color: '#0f172a', paddingRight: 8 },
  colNombre: { width: 160 },
  colTipo: { width: 140 },
  colEstado: { width: 120 },
  colActions: { width: 160 },
  actions: { flex: 0.8, flexDirection: 'row', justifyContent: 'flex-end' },
  iconBtn: { marginLeft: 10 },
  error: { marginBottom: 8, color: '#DC2626' },
  table: { backgroundColor: '#fff', borderRadius: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, alignSelf: 'flex-start' },
  pillText: { fontSize: 12, fontWeight: '600' },
  estadoCell: { flexDirection: 'row', alignItems: 'center' },
  estadoText: { marginLeft: 8, fontSize: 12 },
  pagination: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, marginTop: 8 },
  pageBtn: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#16A34A', borderRadius: 8 },
  disabled: { backgroundColor: '#ccc' },
  pageText: { color: '#fff', fontSize: 14 },
  pageInfo: { fontSize: 14, color: '#0f172a' },
});
