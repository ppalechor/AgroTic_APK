import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Pressable, Platform } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Feather } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '../../contexts/AuthContext';
import { listInventario, listMovimientos, listCategorias, listAlmacenes, listInsumos } from '../../services/api';

export default function ReportesPage() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [resumen, setResumen] = useState({ totalItems: 0, stockTotal: 0, bajoStock: 0 });
  const [items, setItems] = useState([]);
  const [movs, setMovs] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [almacenes, setAlmacenes] = useState([]);
  const [insumos, setInsumos] = useState([]);
  const [categoriaSel, setCategoriaSel] = useState('');
  const [almacenSel, setAlmacenSel] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [lowThreshold, setLowThreshold] = useState(5);
  const [presetSel, setPresetSel] = useState('');
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);
  const toIso = (d) => new Date(d).toISOString().slice(0, 10);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [invResp, movResp, catResp, almResp, insResp] = await Promise.all([
        listInventario(token),
        listMovimientos(token),
        listCategorias(token),
        listAlmacenes(token),
        listInsumos(token),
      ]);

      const catMap = Object.fromEntries((catResp || []).map(c => [String(c.id), c.nombre]));
      const almMap = Object.fromEntries((almResp || []).map(a => [String(a.id), a.nombre]));
      const insumoMap = Object.fromEntries((insResp || []).map(i => [String(i.id_insumo || i.id), { cat: i.id_categoria?.nombre || '', alm: i.id_almacen?.nombre_almacen || i.id_almacen?.nombre || '' }]));

      const enrichedItems = invResp.map(i => ({
        ...i,
        categoria: i.categoria || insumoMap[String(i.id_insumo || '')]?.cat || catMap[String(i.id_categoria || '')] || '',
        almacen: i.almacen || insumoMap[String(i.id_insumo || '')]?.alm || almMap[String(i.id_almacen || '')] || '',
      }));

      const enrichedMovs = movResp.map(m => ({
        ...m,
        categoria: m.categoria || insumoMap[String(m.id_insumo || '')]?.cat || catMap[String(m.id_categoria || '')] || '',
        almacen: m.almacen || insumoMap[String(m.id_insumo || '')]?.alm || almMap[String(m.id_almacen || '')] || '',
      }));

      const totalItems = enrichedItems.length;
      const stockTotal = enrichedItems.reduce((sum, it) => sum + Number(it.cantidad_stock || 0), 0);
      const bajoStock = enrichedItems.filter(it => Number(it.cantidad_stock || 0) <= Number(lowThreshold)).length;

      setResumen({ totalItems, stockTotal, bajoStock });
      setItems(enrichedItems);
      setMovs(enrichedMovs);
      setCategorias(catResp || []);
      setAlmacenes(almResp || []);
      setInsumos(insResp || []);
    } catch (e) {
      setError(e?.message || 'Error cargando reportes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const normalizeStr = (s) => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const includesSearch = (name) => {
    const q = normalizeStr(searchTerm);
    if (!q) return true;
    return normalizeStr(name).includes(q);
  };
  const parseDateSafe = (s) => {
    if (!s) return null;
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? null : d;
  };
  const inRange = (dateStr) => {
    const d = parseDateSafe(dateStr);
    if (!d) return true;
    const from = dateFrom ? new Date(dateFrom) : null;
    const to = dateTo ? new Date(dateTo) : null;
    if (from && d < from) return false;
    if (to) {
      const toEnd = new Date(dateTo);
      toEnd.setHours(23, 59, 59, 999);
      if (d > toEnd) return false;
    }
    return true;
  };
  const matchesFilters = (catName, almName) => {
    const catOk = !categoriaSel || (catName || '') === categoriaSel;
    const almOk = !almacenSel || (almName || '') === almacenSel;
    return catOk && almOk;
  };

  const filteredItems = items.filter(it => matchesFilters(it.categoria, it.almacen)).filter(it => includesSearch(it.nombre_insumo || ''));
  const lowStockItems = filteredItems.filter(it => Number(it.cantidad_stock || 0) <= Number(lowThreshold));
  const recentMovs = movs
    .filter(m => matchesFilters(m.categoria, m.almacen))
    .filter(m => inRange(m.fecha_movimiento))
    .filter(m => includesSearch(m.insumo_nombre || ''))
    .slice(0, 10); // Últimos 10 movimientos filtrados

  const resumenFiltrado = {
    totalItems: filteredItems.length,
    stockTotal: filteredItems.reduce((sum, it) => sum + Number(it.cantidad_stock || 0), 0),
    bajoStock: lowStockItems.length,
  };

  const todayStr = new Date().toISOString().slice(0, 10);
  const sevenDaysAgoStr = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const PRESETS = [
    { id: 'todo', name: 'Todo inventario y movimientos', apply: () => { setCategoriaSel(''); setAlmacenSel(''); setDateFrom(''); setDateTo(''); setSearchTerm(''); setLowThreshold(5); } },
    { id: 'stock-bajo-global', name: 'Stock bajo (global)', apply: () => { setCategoriaSel(''); setAlmacenSel(''); setDateFrom(''); setDateTo(''); setSearchTerm(''); setLowThreshold(5); } },
    { id: 'hoy', name: 'Hoy', apply: () => { setDateFrom(todayStr); setDateTo(todayStr); } },
    { id: 'ultima-semana', name: 'Últimos 7 días', apply: () => { setDateFrom(sevenDaysAgoStr); setDateTo(todayStr); } },
  ];

  const applyPreset = (id) => {
    const p = PRESETS.find((pr) => pr.id === id);
    if (p && typeof p.apply === 'function') {
      p.apply();
      setPresetSel(id);
    }
  };

  const resetFilters = () => {
    setCategoriaSel('');
    setAlmacenSel('');
    setSearchTerm('');
    setDateFrom('');
    setDateTo('');
    setLowThreshold(5);
    setPresetSel('');
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.pageContent}>
      <Text style={styles.pageTitle}>Reportes de Inventario</Text>

      <View style={styles.kpiContainer}>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiValue}>{resumenFiltrado.totalItems}</Text>
          <Text style={styles.kpiLabel}>Total Insumos</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiValue}>{resumenFiltrado.stockTotal}</Text>
          <Text style={styles.kpiLabel}>Stock Total</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiValue}>{resumenFiltrado.bajoStock}</Text>
          <Text style={styles.kpiLabel}>Stock Bajo</Text>
        </View>
      </View>

      <View style={styles.filtersContainer}>
        <Text style={styles.filterTitle}>Filtros</Text>

        <View style={styles.presetContainer}>
          <Text style={styles.filterLabel}>Tipo de reporte:</Text>
          <View style={styles.presetButtons}>
            {PRESETS.map(p => (
              <TouchableOpacity
                key={p.id}
                style={[styles.presetButton, presetSel === p.id && styles.presetButtonSelected]}
                onPress={() => applyPreset(p.id)}
              >
                <Text style={[styles.presetButtonText, presetSel === p.id && styles.presetButtonTextSelected]}>{p.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.filterCard}>
          <View style={styles.filterGrid}>
            <View style={styles.filterItem}>
              <View style={styles.filterLabelRow}>
                <Feather name="tag" size={16} color="#16A34A" />
                <Text style={styles.filterLabel}>Categoría</Text>
              </View>
              <View style={styles.pickerWrap}>
                <Picker selectedValue={categoriaSel} onValueChange={(v) => setCategoriaSel(v)} style={styles.picker}>
                  <Picker.Item label="Todos" value="" />
                  {categorias.map(c => (
                    <Picker.Item key={String(c.id)} label={c.nombre} value={c.nombre} />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={styles.filterItem}>
              <View style={styles.filterLabelRow}>
                <Feather name="home" size={16} color="#16A34A" />
                <Text style={styles.filterLabel}>Almacén</Text>
              </View>
              <View style={styles.pickerWrap}>
                <Picker selectedValue={almacenSel} onValueChange={(v) => setAlmacenSel(v)} style={styles.picker}>
                  <Picker.Item label="Todos" value="" />
                  {almacenes.map(a => (
                    <Picker.Item key={String(a.id)} label={a.nombre} value={a.nombre} />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={styles.filterItem}>
              <View style={styles.filterLabelRow}>
                <Feather name="search" size={16} color="#16A34A" />
                <Text style={styles.filterLabel}>Nombre insumo</Text>
              </View>
              <TextInput
                style={styles.filterInput}
                placeholder="Buscar por nombre"
                value={searchTerm}
                onChangeText={setSearchTerm}
              />
            </View>

            <View style={styles.filterItem}>
              <View style={styles.filterLabelRow}>
                <Feather name="calendar" size={16} color="#16A34A" />
                <Text style={styles.filterLabel}>Desde</Text>
              </View>
              <Pressable style={styles.filterInput} onPress={() => setShowFromPicker(true)}>
                <Text style={{ fontSize: 14, color: '#0f172a' }}>{dateFrom || 'YYYY-MM-DD'}</Text>
              </Pressable>
              {showFromPicker ? (
                <DateTimePicker
                  value={dateFrom ? new Date(dateFrom) : new Date()}
                  mode="date"
                  display="default"
                  onChange={(e, sel) => { if (sel) setDateFrom(toIso(sel)); if (Platform.OS !== 'ios') setShowFromPicker(false); }}
                />
              ) : null}
            </View>

            <View style={styles.filterItem}>
              <View style={styles.filterLabelRow}>
                <Feather name="calendar" size={16} color="#16A34A" />
                <Text style={styles.filterLabel}>Hasta</Text>
              </View>
              <Pressable style={styles.filterInput} onPress={() => setShowToPicker(true)}>
                <Text style={{ fontSize: 14, color: '#0f172a' }}>{dateTo || 'YYYY-MM-DD'}</Text>
              </Pressable>
              {showToPicker ? (
                <DateTimePicker
                  value={dateTo ? new Date(dateTo) : new Date()}
                  mode="date"
                  display="default"
                  onChange={(e, sel) => { if (sel) setDateTo(toIso(sel)); if (Platform.OS !== 'ios') setShowToPicker(false); }}
                />
              ) : null}
            </View>

            <View style={styles.filterItem}>
              <View style={styles.filterLabelRow}>
                <Feather name="alert-triangle" size={16} color="#16A34A" />
                <Text style={styles.filterLabel}>Umbral stock bajo</Text>
              </View>
              <TextInput
                style={styles.filterInput}
                value={String(lowThreshold)}
                onChangeText={text => setLowThreshold(Number(text) || 0)}
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 }}>
            <Pressable style={[styles.btn, styles.btnSecondary]} onPress={resetFilters}>
              <Text style={styles.btnSecondaryText}>Limpiar filtros</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Text style={styles.sectionTitle}>Stock Bajo</Text>
      {loading ? (
        <Text style={styles.loading}>Cargando...</Text>
      ) : (
        <View style={styles.tableContainer}>
          <View style={styles.tableHeader}>
            <Text style={[styles.th, styles.wName]}>Insumo</Text>
            <Text style={[styles.th, styles.wCant]}>Cantidad</Text>
            <Text style={[styles.th, styles.wUni]}>Unidad</Text>
            <Text style={[styles.th, styles.wCat]}>Categoría</Text>
            <Text style={[styles.th, styles.wAlm]}>Almacén</Text>
          </View>
          {lowStockItems.map(item => (
            <View key={String(item.id_inventario)} style={styles.tableRow}>
              <Text style={[styles.cell, styles.wName]}>{item.nombre_insumo || '—'}</Text>
              <Text style={[styles.cell, styles.wCant]}>{item.cantidad_stock}</Text>
              <Text style={[styles.cell, styles.wUni]}>{item.unidad_medida || '—'}</Text>
              <Text style={[styles.cell, styles.wCat]}>{item.categoria || '—'}</Text>
              <Text style={[styles.cell, styles.wAlm]}>{item.almacen || '—'}</Text>
            </View>
          ))}
        </View>
      )}

      <Text style={styles.sectionTitle}>Movimientos Recientes</Text>
      {loading ? (
        <Text style={styles.loading}>Cargando...</Text>
      ) : (
        <View style={styles.tableContainer}>
          <View style={styles.tableHeader}>
            <Text style={[styles.th, styles.wFecha]}>Fecha</Text>
            <Text style={[styles.th, styles.wTipo]}>Tipo</Text>
            <Text style={[styles.th, styles.wName]}>Insumo</Text>
            <Text style={[styles.th, styles.wCant]}>Cantidad</Text>
            <Text style={[styles.th, styles.wUni]}>Unidad</Text>
          </View>
          {recentMovs.map(item => (
            <View key={String(item.id_movimiento)} style={styles.tableRow}>
              <Text style={[styles.cell, styles.wFecha]}>{item.fecha_movimiento || '—'}</Text>
              <Text style={[styles.cell, styles.wTipo, item.tipo_movimiento?.toLowerCase() === 'entrada' ? styles.entrada : styles.salida]}>{item.tipo_movimiento}</Text>
              <Text style={[styles.cell, styles.wName]}>{item.insumo_nombre || '—'}</Text>
              <Text style={[styles.cell, styles.wCant]}>{item.cantidad}</Text>
              <Text style={[styles.cell, styles.wUni]}>{item.unidad_medida || '—'}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff', padding: 12 },
  pageContent: { paddingBottom: 40 },
  pageTitle: { fontSize: 18, fontWeight: '700', color: '#16A34A', marginBottom: 12 },
  kpiContainer: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 12 },
  kpiCard: { alignItems: 'center', padding: 12, backgroundColor: '#f0f9ff', borderRadius: 8, flex: 1, marginHorizontal: 4 },
  kpiValue: { fontSize: 24, fontWeight: '700', color: '#16A34A' },
  kpiLabel: { fontSize: 12, color: '#64748b', marginTop: 4 },
  filtersContainer: { marginBottom: 12 },
  filterTitle: { fontSize: 16, fontWeight: '700', color: '#16A34A', marginBottom: 8 },
  presetContainer: { marginBottom: 12 },
  presetButtons: { flexDirection: 'row', flexWrap: 'wrap' },
  presetButton: { backgroundColor: '#e8f6ee', borderWidth: 1, borderColor: '#c9dfcf', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginRight: 8, marginBottom: 6 },
  presetButtonSelected: { backgroundColor: '#16A34A', borderColor: '#16A34A' },
  presetButtonText: { fontSize: 12, color: '#0f172a' },
  presetButtonTextSelected: { color: '#fff' },
  filterCard: { backgroundColor: '#fff', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#E4E7EC', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  filterGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  filterItem: { width: '48%', marginBottom: 10 },
  filterLabelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  filterLabel: { fontSize: 12, color: '#64748b', marginLeft: 6 },
  filterInput: { borderWidth: 1, borderColor: '#E4E7EC', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 14 },
  pickerWrap: { borderWidth: 1, borderColor: '#E4E7EC', borderRadius: 8 },
  picker: { height: 40 },
  btn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  btnSecondary: { borderWidth: 1, borderColor: '#E4E7EC' },
  btnSecondaryText: { color: '#334155', fontSize: 13 },
  error: { color: '#dc2626', marginBottom: 8 },
  loading: { textAlign: 'center', color: '#64748b' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#16A34A', marginBottom: 8, marginTop: 12 },
  tableContainer: { backgroundColor: '#fff', borderRadius: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  tableHeader: { flexDirection: 'row', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#e4e7ec', backgroundColor: '#fafafa', borderTopLeftRadius: 12, borderTopRightRadius: 12 },
  th: { fontSize: 12, fontWeight: '700', color: '#16A34A' },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eceff1' },
  cell: { fontSize: 12, color: '#0f172a' },
  wFecha: { width: 100 },
  wTipo: { width: 80 },
  wName: { width: 120 },
  wCant: { width: 80 },
  wUni: { width: 80 },
  wCat: { width: 100 },
  wAlm: { width: 100 },
  entrada: { color: '#16A34A' },
  salida: { color: '#dc2626' },
  scrollContent: { paddingBottom: 24 },
});
