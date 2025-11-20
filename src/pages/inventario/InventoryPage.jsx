import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, FlatList, Modal } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { listInventario, listInsumos, createInsumo, updateInsumo, deleteInsumo, createMovimiento, listMovimientos, updateMovimiento, deleteMovimiento, listCategorias, listAlmacenes } from '../../services/api';
import InventoryFormModal from '../../components/molecules/InventoryFormModal';
import InventoryMovementModal from '../../components/molecules/InventoryMovementModal';
import InventoryItemModal from '../../components/molecules/InventoryItemModal';

function InventoryRow({ item, onInfo, onEdit, onDelete, onEntrada, onSalida }) {
  return (
    <View style={[styles.row, styles.tableRow]}>
      <Text style={[styles.cell, styles.wId]} numberOfLines={1}>{item.id_inventario}</Text>
      <Text style={[styles.cell, styles.wName]} numberOfLines={1}>{item.nombre_insumo || '—'}</Text>
      <Text style={[styles.cell, styles.wCat]} numberOfLines={1}>{item.categoria || '—'}</Text>
      <Text style={[styles.cell, styles.wAlm]} numberOfLines={1}>{item.almacen || '—'}</Text>
      <View style={[styles.cell, styles.wCant]}>
        <View style={styles.pill}>
          <Text style={styles.pillText}>{item.cantidad_stock}</Text>
        </View>
      </View>
      <Text style={[styles.cell, styles.wUni]} numberOfLines={1}>{item.unidad_medida || '—'}</Text>
      <Text style={[styles.cell, styles.wFecha]} numberOfLines={1}>{item.fecha || '—'}</Text>
      <View style={[styles.cell, styles.actions, styles.wAct]}>
        <Pressable style={styles.iconBtn} onPress={onEdit}>
          <Feather name="edit-2" size={16} color="#16A34A" />
        </Pressable>
        <Pressable style={styles.iconBtn} onPress={onEntrada}>
          <Feather name="arrow-up" size={16} color="#16A34A" />
        </Pressable>
        <Pressable style={styles.iconBtn} onPress={onSalida}>
          <Feather name="arrow-down" size={16} color="#EF4444" />
        </Pressable>
        <Pressable style={styles.iconBtn} onPress={onDelete}>
          <Feather name="trash-2" size={16} color="#EF4444" />
        </Pressable>
      </View>
    </View>
  );
}

export default function InventoryPage() {
  const { token } = useAuth();
  const [query, setQuery] = useState('');
  const [items, setItems] = useState([]);
  const [insumos, setInsumos] = useState([]);
  const [error, setError] = useState('');
  const [openForm, setOpenForm] = useState(false);
  const [openMove, setOpenMove] = useState(false);
  const [movePreset, setMovePreset] = useState(null);
  const [current, setCurrent] = useState(null);
  const [moveType, setMoveType] = useState('Entrada');
  const [entradas, setEntradas] = useState([]);
  const [salidas, setSalidas] = useState([]);
  const [pageInv, setPageInv] = useState(1);
  const [pageEnt, setPageEnt] = useState(1);
  const [pageSal, setPageSal] = useState(1);
  const pageSize = 8;
  const [confirm, setConfirm] = useState({ open: false, text: '', action: null });

  const fetchAll = async () => {
    setError('');
    try {
      const inv = await listInventario(token);
      const ins = await listInsumos(token);
      const movs = await listMovimientos(token);
      const cats = await listCategorias(token);
      const alms = await listAlmacenes(token);
      const catMap = Object.fromEntries((cats || []).map((c) => [String(c.id), c.nombre]));
      const almMap = Object.fromEntries((alms || []).map((a) => [String(a.id), a.nombre]));
      const insumoMap = Object.fromEntries((ins || []).map((i) => [String(i.id_insumo || i.id), { cat: i.id_categoria?.nombre || '', alm: i.id_almacen?.nombre_almacen || i.id_almacen?.nombre || '' }]));

      setItems(inv.map((i) => ({
        ...i,
        categoria: i.categoria || insumoMap[String(i.id_insumo || '')]?.cat || catMap[String(i.id_categoria || '')] || '',
        almacen: i.almacen || insumoMap[String(i.id_insumo || '')]?.alm || almMap[String(i.id_almacen || '')] || '',
      })));
      setInsumos(ins);
      const movsEnriq = movs.map((m) => ({
        ...m,
        categoria: m.categoria || insumoMap[String(m.id_insumo || '')]?.cat || catMap[String(m.id_categoria || '')] || '',
        almacen: m.almacen || insumoMap[String(m.id_insumo || '')]?.alm || almMap[String(m.id_almacen || '')] || '',
      }));
      setEntradas(movsEnriq.filter(m => String(m.tipo_movimiento).toLowerCase() === 'entrada'));
      setSalidas(movsEnriq.filter(m => String(m.tipo_movimiento).toLowerCase() === 'salida'));
    } catch (e) {
      setError(e?.message || 'Error cargando inventario');
    }
  };

  useEffect(() => { fetchAll(); }, [token]);
  useEffect(() => { const id = setTimeout(() => fetchAll(), 400); return () => clearTimeout(id); }, [query]);

  const filtered = items.filter((it) => {
    const t = `${it.nombre_insumo || ''} ${it.codigo || ''}`.toLowerCase();
    return t.includes(query.toLowerCase());
  });
  const totalInvPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const invPageItems = filtered.slice((pageInv - 1) * pageSize, (pageInv - 1) * pageSize + pageSize);
  const totalEntPages = Math.max(1, Math.ceil(entradas.length / pageSize));
  const entPageItems = entradas.slice((pageEnt - 1) * pageSize, (pageEnt - 1) * pageSize + pageSize);
  const totalSalPages = Math.max(1, Math.ceil(salidas.length / pageSize));
  const salPageItems = salidas.slice((pageSal - 1) * pageSize, (pageSal - 1) * pageSize + pageSize);

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.pageContent}>
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Gestión de Inventario</Text>
        <Pressable style={styles.newBtn} onPress={() => { setCurrent(null); setOpenForm(true); }}><Feather name="plus" size={16} color="#fff" /><Text style={styles.newBtnText}> Nuevo Insumo</Text></Pressable>
      </View>
      <View style={styles.searchBox}>
        <Feather name="search" size={16} color="#64748b" />
        <TextInput style={styles.searchInput} placeholder="Buscar por nombre o unidad..." value={query} onChangeText={setQuery} />
      </View>
  {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.tableContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={styles.tableHContent}>
          <View style={styles.tableContent}>
            <View style={[styles.tableHeader, styles.tableRow]}>
              <Text style={[styles.th, styles.wId]}>ID</Text>
              <Text style={[styles.th, styles.wName]}>Nombre</Text>
              <Text style={[styles.th, styles.wCat]}>Categoría</Text>
              <Text style={[styles.th, styles.wAlm]}>Almacén</Text>
              <Text style={[styles.th, styles.wCant]}>Cantidad</Text>
              <Text style={[styles.th, styles.wUni]}>Unidad</Text>
              <Text style={[styles.th, styles.wFecha]}>Última fecha</Text>
              <Text style={[styles.th, styles.wAct]}>Acciones</Text>
            </View>
            <FlatList
              data={invPageItems}
              keyExtractor={(it) => String(it.id_inventario)}
              renderItem={({ item }) => (
                <InventoryRow
                  item={item}
                  onInfo={() => { setCurrent(item); }}
                  onEdit={() => { setCurrent(item); setOpenForm(true); }}
                  onDelete={() => setConfirm({ open: true, text: `¿Eliminar insumo ${item.nombre_insumo}?`, action: async () => { await deleteInsumo(item.id_insumo, token); fetchAll(); } })}
                  onEntrada={() => { setMoveType('Entrada'); setMovePreset({ id_insumo: item.id_insumo }); setOpenMove(true); }}
                  onSalida={() => { setMoveType('Salida'); setMovePreset({ id_insumo: item.id_insumo }); setOpenMove(true); }}
                />
              )}
              contentContainerStyle={styles.scrollContent}
              nestedScrollEnabled
            />
            <View style={styles.pagination}>
              <Pressable style={[styles.pageBtn, pageInv <= 1 && styles.pageBtnDisabled]} onPress={() => pageInv > 1 && setPageInv(pageInv - 1)}><Feather name="chevron-left" size={16} color={pageInv <= 1 ? '#94a3b8' : '#0f172a'} /></Pressable>
              <Text style={styles.pageText}>{pageInv} / {totalInvPages}</Text>
              <Pressable style={[styles.pageBtn, pageInv >= totalInvPages && styles.pageBtnDisabled]} onPress={() => pageInv < totalInvPages && setPageInv(pageInv + 1)}><Feather name="chevron-right" size={16} color={pageInv >= totalInvPages ? '#94a3b8' : '#0f172a'} /></Pressable>
            </View>
          </View>
        </ScrollView>
      </View>
      <InventoryItemModal visible={!!current && !openForm && !openMove} item={current} onClose={() => setCurrent(null)} />
      <InventoryFormModal visible={openForm} insumo={current} onClose={() => setOpenForm(false)} onSubmit={async (payload) => { if (current) await updateInsumo(current.id_insumo || current.id, payload, token); else await createInsumo(payload, token); fetchAll(); }} />
      <InventoryMovementModal visible={openMove} preset={movePreset} insumos={insumos} onClose={() => setOpenMove(false)} onSubmit={async (payload) => { await createMovimiento({ ...payload, tipo_movimiento: moveType }, token); fetchAll(); }} />

      <View style={{ height: 12 }} />
      <Text style={styles.sectionTitleGreen}>Entradas</Text>
      <View style={styles.tableContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={styles.tableHContent}>
          <View style={styles.tableContent}>
            <View style={[styles.tableHeader, styles.tableRow]}> 
              <Text style={[styles.th, styles.wFecha]}>Fecha</Text>
              <Text style={[styles.th, styles.wName]}>Insumo</Text>
              <Text style={[styles.th, styles.wCat]}>Categoría</Text>
              <Text style={[styles.th, styles.wAlm]}>Almacén</Text>
              <Text style={[styles.th, styles.wCant]}>Cantidad</Text>
              <Text style={[styles.th, styles.wUni]}>Unidad</Text>
              <Text style={[styles.th, styles.wAct]}>Acciones</Text>
            </View>
            <FlatList
              data={entPageItems}
              keyExtractor={(it) => String(it.id_movimiento)}
              renderItem={({ item }) => (
                <View style={[styles.row, styles.tableRow]}>
                  <Text style={[styles.cell, styles.wFecha]}>{item.fecha_movimiento}</Text>
                  <Text style={[styles.cell, styles.wName]}>{item.insumo_nombre || '—'}</Text>
                  <Text style={[styles.cell, styles.wCat]}>{item.categoria || '—'}</Text>
                  <Text style={[styles.cell, styles.wAlm]}>{item.almacen || '—'}</Text>
                  <View style={[styles.cell, styles.wCant]}><View style={styles.pill}><Text style={styles.pillText}>{item.cantidad}</Text></View></View>
                  <Text style={[styles.cell, styles.wUni]}>{item.unidad_medida || '—'}</Text>
                  <View style={[styles.cell, styles.actions, styles.wAct]}>
                    <Pressable style={styles.iconBtn} onPress={async () => { try { await updateMovimiento(item.id_movimiento, { cantidad: item.cantidad }, token); fetchAll(); } catch (e) { setError(e?.message || 'Error actualizando'); } }}><Feather name="edit-2" size={16} color="#16A34A" /></Pressable>
                    <Pressable style={styles.iconBtn} onPress={() => setConfirm({ open: true, text: `¿Eliminar entrada de ${item.insumo_nombre}?`, action: async () => { await deleteMovimiento(item.id_movimiento, token); fetchAll(); } })}><Feather name="trash-2" size={16} color="#EF4444" /></Pressable>
                  </View>
                </View>
              )}
              contentContainerStyle={styles.scrollContent}
              nestedScrollEnabled
            />
            <View style={styles.pagination}>
              <Pressable style={[styles.pageBtn, pageEnt <= 1 && styles.pageBtnDisabled]} onPress={() => pageEnt > 1 && setPageEnt(pageEnt - 1)}><Feather name="chevron-left" size={16} color={pageEnt <= 1 ? '#94a3b8' : '#0f172a'} /></Pressable>
              <Text style={styles.pageText}>{pageEnt} / {totalEntPages}</Text>
              <Pressable style={[styles.pageBtn, pageEnt >= totalEntPages && styles.pageBtnDisabled]} onPress={() => pageEnt < totalEntPages && setPageEnt(pageEnt + 1)}><Feather name="chevron-right" size={16} color={pageEnt >= totalEntPages ? '#94a3b8' : '#0f172a'} /></Pressable>
            </View>
          </View>
        </ScrollView>
      </View>

      <View style={{ height: 12 }} />
      <Text style={styles.sectionTitleRed}>Salidas</Text>
      <View style={styles.tableContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={styles.tableHContent}>
          <View style={styles.tableContent}>
            <View style={[styles.tableHeader, styles.tableRow]}> 
              <Text style={[styles.th, styles.wFecha]}>Fecha</Text>
              <Text style={[styles.th, styles.wName]}>Insumo</Text>
              <Text style={[styles.th, styles.wCat]}>Categoría</Text>
              <Text style={[styles.th, styles.wAlm]}>Almacén</Text>
              <Text style={[styles.th, styles.wCant]}>Cantidad</Text>
              <Text style={[styles.th, styles.wUni]}>Unidad</Text>
              <Text style={[styles.th, styles.wAct]}>Acciones</Text>
            </View>
            <FlatList
              data={salPageItems}
              keyExtractor={(it) => String(it.id_movimiento)}
              renderItem={({ item }) => (
                <View style={[styles.row, styles.tableRow]}>
                  <Text style={[styles.cell, styles.wFecha]}>{item.fecha_movimiento}</Text>
                  <Text style={[styles.cell, styles.wName]}>{item.insumo_nombre || '—'}</Text>
                  <Text style={[styles.cell, styles.wCat]}>{item.categoria || '—'}</Text>
                  <Text style={[styles.cell, styles.wAlm]}>{item.almacen || '—'}</Text>
                  <View style={[styles.cell, styles.wCant]}><View style={styles.pill}><Text style={styles.pillText}>{item.cantidad}</Text></View></View>
                  <Text style={[styles.cell, styles.wUni]}>{item.unidad_medida || '—'}</Text>
                  <View style={[styles.cell, styles.actions, styles.wAct]}>
                    <Pressable style={styles.iconBtn} onPress={async () => { try { await updateMovimiento(item.id_movimiento, { cantidad: item.cantidad }, token); fetchAll(); } catch (e) { setError(e?.message || 'Error actualizando'); } }}><Feather name="edit-2" size={16} color="#16A34A" /></Pressable>
                    <Pressable style={styles.iconBtn} onPress={() => setConfirm({ open: true, text: `¿Eliminar salida de ${item.insumo_nombre}?`, action: async () => { await deleteMovimiento(item.id_movimiento, token); fetchAll(); } })}><Feather name="trash-2" size={16} color="#EF4444" /></Pressable>
                  </View>
                </View>
              )}
              contentContainerStyle={styles.scrollContent}
              nestedScrollEnabled
            />
            <View style={styles.pagination}>
              <Pressable style={[styles.pageBtn, pageSal <= 1 && styles.pageBtnDisabled]} onPress={() => pageSal > 1 && setPageSal(pageSal - 1)}><Feather name="chevron-left" size={16} color={pageSal <= 1 ? '#94a3b8' : '#0f172a'} /></Pressable>
              <Text style={styles.pageText}>{pageSal} / {totalSalPages}</Text>
              <Pressable style={[styles.pageBtn, pageSal >= totalSalPages && styles.pageBtnDisabled]} onPress={() => pageSal < totalSalPages && setPageSal(pageSal + 1)}><Feather name="chevron-right" size={16} color={pageSal >= totalSalPages ? '#94a3b8' : '#0f172a'} /></Pressable>
            </View>
          </View>
        </ScrollView>
      </View>
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
  scrollContent: { paddingBottom: 24 },
  tableContainer: { backgroundColor: '#fff', borderRadius: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  tableHContent: { },
  tableContent: { width: 1040 },
  tableHeader: { flexDirection: 'row', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#E4E7EC', backgroundColor: '#FAFAFA', borderTopLeftRadius: 12, borderTopRightRadius: 12 },
  th: { fontSize: 12, fontWeight: '700', color: '#16A34A' },
  table: { backgroundColor: '#fff' },
  tableRow: { width: 1040 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#ECEFF1' },
  cell: { fontSize: 12, color: '#0f172a' },
  wId: { width: 80 },
  wName: { width: 160 },
  wCat: { width: 140 },
  wAlm: { width: 140 },
  wCant: { width: 100 },
  wUni: { width: 100 },
  wFecha: { width: 140 },
  wAct: { width: 160 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', width: 160 },
  iconBtn: { marginRight: 14 },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, alignSelf: 'flex-start', backgroundColor: '#D9E9F7' },
  pillText: { fontSize: 12, fontWeight: '600', color: '#1976D2' },
  error: { marginBottom: 8, color: '#DC2626' },
  sectionTitleGreen: { fontSize: 16, fontWeight: '700', color: '#16A34A', marginBottom: 6 },
  sectionTitleRed: { fontSize: 16, fontWeight: '700', color: '#DC2626', marginBottom: 6 },
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