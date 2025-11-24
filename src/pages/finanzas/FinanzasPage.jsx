import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, FlatList, Linking, Alert, ScrollView, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { listCultivos } from '../../services/api';
import { finanzasResumen, finanzasMargenPorCultivo, finanzasRentabilidad, finanzasExportUrl } from '../../services/api';
import { useQuery } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
const WebMUI = Platform.OS === 'web' ? require('@mui/material') : {};
const Charts = Platform.OS === 'web' ? require('recharts') : {};
 

export default function FinanzasPage() {
  const { user, permissionKeys, token } = useAuth();
  const [cultivos, setCultivos] = useState([]);
  const [filters, setFilters] = useState({ cultivoId: '', from: '', to: '', groupBy: 'mes', tipo: 'todos', criterio: 'margen', umbral: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resumen, setResumen] = useState(null);
  const [margenList, setMargenList] = useState([]);
  const [rentabilidad, setRentabilidad] = useState(null);
  const [activeTab, setActiveTab] = useState('Resumen');
  const [costParams, setCostParams] = useState({ costoHora: '', depreciacionMensual: '', vidaUtilMeses: '', horasPorTipo: '' });
 

  useEffect(() => {
    (async () => {
      try {
        const { items } = await listCultivos(token);
        setCultivos(items || []);
      } catch (e) {}
    })();
  }, [token]);

  useEffect(() => {
    (async () => {
      const key = filters.cultivoId ? `financeParams:${filters.cultivoId}` : '';
      if (!key) return;
      try {
        const saved = await AsyncStorage.getItem(key);
        if (saved) {
          const obj = JSON.parse(saved);
          setCostParams({
            costoHora: obj.costoHora || '',
            depreciacionMensual: obj.depreciacionMensual || '',
            vidaUtilMeses: obj.vidaUtilMeses || '',
            horasPorTipo: obj.horasPorTipo || '',
          });
        }
      } catch {}
    })();
  }, [filters.cultivoId]);

  useEffect(() => {
    (async () => {
      const key = filters.cultivoId ? `financeParams:${filters.cultivoId}` : '';
      if (!key) return;
      try {
        const obj = { ...costParams };
        await AsyncStorage.setItem(key, JSON.stringify(obj));
      } catch {}
    })();
  }, [filters.cultivoId, costParams]);

  const permSet = useMemo(() => new Set((permissionKeys || []).map(k => String(k).toLowerCase())), [permissionKeys]);
  const isAdmin = useMemo(() => String(user?.id_rol?.nombre_rol || user?.nombre_rol || user?.rol || '').toLowerCase() === 'administrador', [user]);
  const canView = isAdmin || permSet.has('finanzas:*') || permSet.has('finanzas:ver');
  const canExport = isAdmin || permSet.has('finanzas:*') || permSet.has('finanzas:export');

  const parseUmbral = (s) => {
    if (s === '' || s === null || s === undefined) return undefined;
    const t = String(s).replace(',', '.');
    const n = Number(t);
    return Number.isFinite(n) ? n : undefined;
  };

  const normalizeResumen = (data) => {
    const d = data || {};
    const rawSeries = Array.isArray(d.series) ? d.series
      : Array.isArray(d.items) ? d.items
      : Array.isArray(d.resumen) ? d.resumen
      : Array.isArray(d.data) ? d.data
      : [];
    const series = rawSeries.map((it) => {
      const periodo = it.periodo || it.fecha || it.mes || it.period || it.label || '';
      const ingresos = Number(
        it.ingresos ?? it.totalIngresos ?? it.ingreso ?? it.in ?? 0
      );
      const egresos = Number(
        it.egresos ?? it.totalEgresos ?? it.egreso ?? it.out ?? 0
      );
      const margen = Number(
        it.margen ?? it.totalMargen ?? (ingresos - egresos)
      );
      return { periodo, ingresos, egresos, margen };
    });
    const sum = (arr, key) => arr.reduce((acc, x) => acc + Number(x[key] || 0), 0);
    const ingresosTotal = d.ingresosTotal ?? d.totalIngresos ?? sum(series, 'ingresos');
    const egresosTotal = d.egresosTotal ?? d.totalEgresos ?? sum(series, 'egresos');
    const margenTotal = d.margenTotal ?? d.totalMargen ?? sum(series, 'margen');
    const beneficioCosto = d.beneficioCosto ?? d.bc ?? d.beneficio_costo ?? null;
    const margenPorcentaje = d.margenPorcentaje ?? d.porcentajeMargen ?? null;
    const rentable = d.rentable ?? (typeof beneficioCosto === 'number' ? beneficioCosto >= 1 : null);
    const categoriasGasto = Array.isArray(d.categoriasGasto) ? d.categoriasGasto
      : Array.isArray(d.categorias) ? d.categorias
      : Array.isArray(d.gastoCategorias) ? d.gastoCategorias
      : [];
    return { series, ingresosTotal, egresosTotal, margenTotal, beneficioCosto, margenPorcentaje, rentable, categoriasGasto };
  };

  const resumenQuery = useQuery({
    queryKey: ['finanzas','resumen', filters],
    queryFn: () => finanzasResumen({ cultivoId: filters.cultivoId, from: filters.from, to: filters.to, groupBy: filters.groupBy, tipo: filters.tipo }),
    enabled: false,
  });
  const margenQuery = useQuery({
    queryKey: ['finanzas','margen', { from: filters.from, to: filters.to }],
    queryFn: () => finanzasMargenPorCultivo({ from: filters.from, to: filters.to }),
    enabled: false,
  });
  const rentQuery = useQuery({
    queryKey: ['finanzas','rentabilidad', filters],
    queryFn: () => finanzasRentabilidad({ cultivoId: filters.cultivoId, from: filters.from, to: filters.to, criterio: filters.criterio, umbral: parseUmbral(filters.umbral) }),
    enabled: false,
  });

  useEffect(() => { if (resumenQuery.data) setResumen(normalizeResumen(resumenQuery.data)); }, [resumenQuery.data]);
  useEffect(() => {
    if (margenQuery.data) {
      const m = margenQuery.data;
      const list = Array.isArray(m?.items) ? m.items : Array.isArray(m?.cultivos) ? m.cultivos : [];
      setMargenList(list);
    }
  }, [margenQuery.data]);
  useEffect(() => { if (rentQuery.data) setRentabilidad(rentQuery.data); }, [rentQuery.data]);

  const handleLoad = async () => {
    setError(''); setLoading(true);
    try {
      if (!filters.cultivoId || !filters.from || !filters.to) {
        setError('Selecciona cultivo y rango de fechas');
        return;
      }
      await Promise.all([resumenQuery.refetch(), margenQuery.refetch(), rentQuery.refetch()]);
    } catch (e) {
      setError(e?.message || 'Error cargando finanzas');
    } finally { setLoading(false); }
  };

 

  const openExport = async (tipo) => {
    try {
      if (!canExport) return Alert.alert('Permisos', 'No tienes permiso para exportar');
      if (!filters.cultivoId || !filters.from || !filters.to) return Alert.alert('Atención', 'Completa cultivo y fechas');
      const url = finanzasExportUrl({ tipo, cultivoId: filters.cultivoId, from: filters.from, to: filters.to, groupBy: filters.groupBy });
      await Linking.openURL(url);
    } catch (e) {
      Alert.alert('Error', e?.message || 'No se pudo abrir exportación');
    }
  };

  const renderSerie = ({ item }) => (
    <View style={styles.row}>
      <Text style={[styles.cell, styles.wPeriodo]}>{item.periodo}</Text>
      <Text style={[styles.cell, styles.wNum]}>{item.ingresos}</Text>
      <Text style={[styles.cell, styles.wNum]}>{item.egresos}</Text>
      <Text style={[styles.cell, styles.wNum]}>{item.margen}</Text>
    </View>
  );

  const renderMargen = ({ item }) => (
    <View style={styles.row}>
      <Text style={[styles.cell, styles.wCultivo]}>{item.nombre_cultivo || item.nombre || `#${item.id_cultivo}`}</Text>
      <Text style={[styles.cell, styles.wNum]}>{item.ingresos}</Text>
      <Text style={[styles.cell, styles.wNum]}>{item.egresos}</Text>
      <Text style={[styles.cell, styles.wNum]}>{item.margen}</Text>
    </View>
  );

  return (
    <ScrollView contentContainerStyle={styles.root}>
      <Text style={[styles.title, { color: '#16A34A' }]}>Control Financiero</Text>
      {!canView ? <Text style={styles.error}>No tienes permisos para ver finanzas</Text> : null}
      {Platform.OS === 'web' ? (
        <View style={{ marginBottom: 10 }}>
          <WebMUI.Paper elevation={2} sx={{ p: 2, border: '1px solid #E2E8F0', borderRadius: 2 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12 }}>
              <WebMUI.FormControl size="small">
                <WebMUI.InputLabel id="cultivo-label">Cultivo</WebMUI.InputLabel>
                <WebMUI.Select labelId="cultivo-label" label="Cultivo" value={filters.cultivoId} onChange={(e) => setFilters((p) => ({ ...p, cultivoId: e.target.value }))}>
                  {cultivos.map((c) => (
                    <WebMUI.MenuItem key={String(c.id_cultivo || c.id)} value={String(c.id_cultivo || c.id)}>{c.nombre_cultivo || c.nombre}</WebMUI.MenuItem>
                  ))}
                </WebMUI.Select>
              </WebMUI.FormControl>
              <WebMUI.TextField size="small" type="date" label="Desde" InputLabelProps={{ shrink: true }} value={filters.from} onChange={(e) => setFilters((p) => ({ ...p, from: e.target.value }))} />
              <WebMUI.TextField size="small" type="date" label="Hasta" InputLabelProps={{ shrink: true }} value={filters.to} onChange={(e) => setFilters((p) => ({ ...p, to: e.target.value }))} />
              <WebMUI.FormControl size="small">
                <WebMUI.InputLabel id="groupby-label">Grupo</WebMUI.InputLabel>
                <WebMUI.Select labelId="groupby-label" label="Grupo" value={filters.groupBy} onChange={(e) => setFilters((p) => ({ ...p, groupBy: e.target.value }))}>
                  <WebMUI.MenuItem value="dia">Día</WebMUI.MenuItem>
                  <WebMUI.MenuItem value="semana">Semana</WebMUI.MenuItem>
                  <WebMUI.MenuItem value="mes">Mes</WebMUI.MenuItem>
                </WebMUI.Select>
              </WebMUI.FormControl>
              <WebMUI.FormControl size="small">
                <WebMUI.InputLabel id="tipo-label">Tipo</WebMUI.InputLabel>
                <WebMUI.Select labelId="tipo-label" label="Tipo" value={filters.tipo} onChange={(e) => setFilters((p) => ({ ...p, tipo: e.target.value }))}>
                  <WebMUI.MenuItem value="todos">Todos</WebMUI.MenuItem>
                  <WebMUI.MenuItem value="ingresos">Ingresos</WebMUI.MenuItem>
                  <WebMUI.MenuItem value="egresos">Egresos</WebMUI.MenuItem>
                </WebMUI.Select>
              </WebMUI.FormControl>
              <WebMUI.FormControl size="small">
                <WebMUI.InputLabel id="criterio-label">Criterio</WebMUI.InputLabel>
                <WebMUI.Select labelId="criterio-label" label="Criterio" value={filters.criterio} onChange={(e) => setFilters((p) => ({ ...p, criterio: e.target.value }))}>
                  <WebMUI.MenuItem value="margen">Margen</WebMUI.MenuItem>
                  <WebMUI.MenuItem value="bc">B/C</WebMUI.MenuItem>
                  <WebMUI.MenuItem value="porcentaje">Margen %</WebMUI.MenuItem>
                </WebMUI.Select>
              </WebMUI.FormControl>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 4fr 1fr', gap: 12, alignItems: 'center', marginTop: 12 }}>
              <WebMUI.TextField size="small" label="Umbral" placeholder="Ej: 3,4" value={filters.umbral} onChange={(e) => setFilters((p) => ({ ...p, umbral: e.target.value }))} />
              <WebMUI.Slider value={typeof parseUmbral(filters.umbral) === 'number' ? parseUmbral(filters.umbral) : 0} min={0} max={10} step={0.1} onChange={(_, val) => {
                const num = Array.isArray(val) ? val[0] : val;
                const str = String(num).replace('.', ',');
                setFilters((p) => ({ ...p, umbral: str }));
              }} sx={{ color: '#16A34A' }} />
              <button onClick={handleLoad} disabled={loading} style={{ padding: '10px 24px', borderRadius: 10, background: '#2E7D32', color: '#fff', fontWeight: 700, border: 'none', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>{loading ? 'CARGANDO…' : 'APLICAR'}</button>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              {canExport ? (
                <>
                  <button onClick={() => openExport('excel')} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #16A34A', background: '#fff', color: '#16A34A', fontWeight: 700 }}>Exportar Excel</button>
                  <button onClick={() => openExport('pdf')} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #16A34A', background: '#fff', color: '#16A34A', fontWeight: 700 }}>Exportar PDF</button>
                </>
              ) : null}
            </div>
          </WebMUI.Paper>
        </View>
      ) : (
        <View style={styles.filters}>
          <View style={styles.rowInline}>
            <Text style={styles.label}>Cultivo</Text>
            <View style={[styles.select, { padding: 0 }]}> 
              <Picker selectedValue={filters.cultivoId} onValueChange={(v) => setFilters((p) => ({ ...p, cultivoId: v }))}>
                <Picker.Item label="Selecciona cultivo" value="" />
                {cultivos.map((c) => (
                  <Picker.Item key={String(c.id_cultivo || c.id)} label={c.nombre_cultivo || c.nombre} value={String(c.id_cultivo || c.id)} />
                ))}
              </Picker>
            </View>
          </View>
          <View style={styles.rowInline}>
            <Text style={styles.label}>Desde</Text>
            <TextInput style={styles.input} placeholder="YYYY-MM-DD" value={filters.from} onChangeText={(v) => setFilters((p) => ({ ...p, from: v }))} />
          </View>
          <View style={styles.rowInline}>
            <Text style={styles.label}>Hasta</Text>
            <TextInput style={styles.input} placeholder="YYYY-MM-DD" value={filters.to} onChangeText={(v) => setFilters((p) => ({ ...p, to: v }))} />
          </View>
          <View style={styles.rowInline}>
            <Text style={styles.label}>Agrupar</Text>
            <View style={styles.groupRow}>
              {['dia','semana','mes'].map(g => (
                <Pressable key={g} style={[styles.groupBtn, filters.groupBy === g ? styles.groupActive : styles.groupInactive]} onPress={() => setFilters((p) => ({ ...p, groupBy: g }))}>
                  <Text style={filters.groupBy === g ? styles.groupTextActive : styles.groupTextInactive}>{g}</Text>
                </Pressable>
              ))}
            </View>
          </View>
          <View style={styles.rowInline}>
            <Text style={styles.label}>Criterio</Text>
            <View style={styles.groupRow}>
              {['margen','bc','porcentaje'].map(c => (
                <Pressable key={c} style={[styles.groupBtn, filters.criterio === c ? styles.groupActive : styles.groupInactive]} onPress={() => setFilters((p) => ({ ...p, criterio: c }))}>
                  <Text style={filters.criterio === c ? styles.groupTextActive : styles.groupTextInactive}>{c}</Text>
                </Pressable>
              ))}
            </View>
          </View>
          <View style={styles.rowInline}>
            <Text style={styles.label}>Umbral</Text>
            <TextInput style={styles.input} placeholder="Opcional" value={filters.umbral} onChangeText={(v) => setFilters((p) => ({ ...p, umbral: v }))} keyboardType="numeric" />
          </View>
          <View style={styles.actions}>
            <Pressable style={[styles.btn, styles.primary]} onPress={handleLoad} disabled={loading}><Text style={styles.btnText}>{loading ? 'Cargando...' : 'Cargar'}</Text></Pressable>
            {canExport ? (
              <>
                <Pressable style={[styles.btn, styles.outline]} onPress={() => openExport('excel')}><Text style={styles.btnOutlineText}>Exportar Excel</Text></Pressable>
                <Pressable style={[styles.btn, styles.outline]} onPress={() => openExport('pdf')}><Text style={styles.btnOutlineText}>Exportar PDF</Text></Pressable>
              </>
            ) : null}
          </View>
        </View>
      )}
      <View style={styles.tabs}>
        {['Resumen','Ranking','Costo','Historial','Exportaciones'].map(t => (
          <Pressable key={t} style={[styles.tabBtn, activeTab === t ? styles.tabActive : styles.tabInactive]} onPress={() => setActiveTab(t)}>
            <Text style={activeTab === t ? styles.tabTextActive : styles.tabTextInactive}>{t}</Text>
          </Pressable>
        ))}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {activeTab === 'Resumen' ? (
        Platform.OS === 'web' ? (
          <View>
            {(() => { /* safe defaults when no data yet */ })()}
            {(() => { return null; })()}
            {(() => { })()}
            {(() => { })()}
            {(() => { })()}
            {(() => { })()}
            {(() => { })()}
            {(() => { })()}
            {(() => { })()}
            {(() => { })()}
            {(() => { })()}
            {(() => { })()}
            {(() => { })()}
            {(() => { })()}
            {(() => { })()}
            {(() => { })()}
            {(() => { })()}
            {(() => { })()}
            {(() => { })()}
            {(() => { })()}
            {(() => { })()}
            {(() => { })()}
            {(() => { })()}
            {(() => { })()}
            {(() => { })()}
            {(() => { })()}
            {(() => { })()}
            {(() => { })()}
            {(() => { })()}
            {(() => { })()}
            {(() => { })()}
            {(() => { })()}
            {(() => { })()}
            {(() => { })()}
            {(() => { })()}
            {(() => { })()}
            {(() => { })()}
            {(() => { })()}
            {(() => { })()}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
              <WebMUI.Paper elevation={1} sx={{ p: 1.5, border: '1px solid #E2E8F0', borderRadius: 2 }}>
                <div style={{ fontWeight: 700, color: '#64748b', marginBottom: 6 }}>Ingresos vs Egresos</div>
                <div style={{ height: 280 }}>
                  <Charts.ResponsiveContainer width="100%" height="100%">
                    <Charts.LineChart data={(resumen?.series || []).length ? resumen.series : [{ periodo: '', ingresos: 0, egresos: 0 }]} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                      <Charts.CartesianGrid strokeDasharray="3 3" />
                      <Charts.XAxis dataKey="periodo" />
                      <Charts.YAxis />
                      <Charts.Tooltip />
                      <Charts.Legend />
                      <Charts.Line type="monotone" dataKey="egresos" stroke="#ef4444" strokeWidth={2} dot={false} name="Egresos" />
                      <Charts.Line type="monotone" dataKey="ingresos" stroke="#16A34A" strokeWidth={2} dot={false} name="Ingresos" />
                    </Charts.LineChart>
                  </Charts.ResponsiveContainer>
                </div>
              </WebMUI.Paper>
              <div style={{ display: 'grid', gridTemplateRows: 'auto auto', gap: 12 }}>
                <WebMUI.Paper elevation={1} sx={{ p: 1.5, border: '1px solid #E2E8F0', borderRadius: 2 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 8 }}>
                      <div style={{ color: '#64748b' }}>Ingresos</div>
                      <div style={{ fontWeight: 700 }}>$ {resumen?.ingresosTotal ?? 0}</div>
                    </div>
                    <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 8 }}>
                      <div style={{ color: '#64748b' }}>Egresos</div>
                      <div style={{ fontWeight: 700 }}>$ {resumen?.egresosTotal ?? 0}</div>
                    </div>
                    <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 8 }}>
                      <div style={{ color: '#64748b' }}>Margen</div>
                      <div style={{ fontWeight: 700 }}>$ {resumen?.margenTotal ?? 0}</div>
                    </div>
                    <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 8 }}>
                      <div style={{ color: '#64748b' }}>B/C</div>
                      <div style={{ fontWeight: 700 }}>{resumen?.beneficioCosto ?? 'N/A'}</div>
                    </div>
                    <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 8 }}>
                      <div style={{ color: '#64748b' }}>% Margen</div>
                      <div style={{ fontWeight: 700 }}>{typeof resumen?.margenPorcentaje === 'number' ? `${resumen.margenPorcentaje}%` : 'N/A'}</div>
                    </div>
                    <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 8 }}>
                      <div style={{ color: '#64748b' }}>Rentable</div>
                      <div style={{ fontWeight: 700 }}>{resumen?.rentable ? 'Sí' : 'No'}</div>
                    </div>
                  </div>
                </WebMUI.Paper>
                <WebMUI.Paper elevation={1} sx={{ p: 1.5, border: '1px solid #E2E8F0', borderRadius: 2 }}>
                  <div style={{ fontWeight: 700, color: '#64748b', marginBottom: 6 }}>Gasto por categoría (pie)</div>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <WebMUI.Chip label="Insumos/Salidas" variant="outlined" />
                    <WebMUI.Chip label="Actividades" variant="outlined" />
                  </div>
                  <div style={{ height: 200 }}>
                    <Charts.ResponsiveContainer width="100%" height="100%">
                      <Charts.PieChart>
                        <Charts.Pie dataKey="value" data={(function(){
                          const arr = Array.isArray(resumen?.categoriasGasto) ? resumen.categoriasGasto : [];
                          const sum = (pred) => arr.filter(pred).reduce((acc, c) => acc + (Number(c.total)||0), 0);
                          const isAct = (c) => String(c.nombre||'').toLowerCase().includes('activ');
                          const insumosSalidas = sum(c => !isAct(c));
                          const actividades = sum(c => isAct(c));
                          return [
                            { name: 'Insumos/Salidas', value: insumosSalidas },
                            { name: 'Actividades', value: actividades },
                          ];
                        })()} fill="#8884d8">
                          <Charts.Cell key="is" fill="#16A34A" />
                          <Charts.Cell key="act" fill="#64748b" />
                        </Charts.Pie>
                        <Charts.Tooltip />
                        <Charts.Legend />
                      </Charts.PieChart>
                    </Charts.ResponsiveContainer>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 6, marginTop: 6 }}>
                    <div style={{ color: '#64748b' }}>Insumos/Salidas</div>
                    <div style={{ fontWeight: 700 }}>$ {(function(){
                      const arr = Array.isArray(resumen?.categoriasGasto) ? resumen.categoriasGasto : [];
                      const isAct = (c) => String(c.nombre||'').toLowerCase().includes('activ');
                      return arr.filter(c => !isAct(c)).reduce((acc, c) => acc + (Number(c.total)||0), 0);
                    })()}</div>
                    <div style={{ color: '#64748b' }}>Actividades</div>
                    <div style={{ fontWeight: 700 }}>$ {(function(){
                      const arr = Array.isArray(resumen?.categoriasGasto) ? resumen.categoriasGasto : [];
                      const isAct = (c) => String(c.nombre||'').toLowerCase().includes('activ');
                      return arr.filter(c => isAct(c)).reduce((acc, c) => acc + (Number(c.total)||0), 0);
                    })()}</div>
                  </div>
                </WebMUI.Paper>
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              <WebMUI.Paper elevation={1} sx={{ p: 1.5, border: '1px solid #E2E8F0', borderRadius: 2 }}>
                <div style={{ fontWeight: 700, color: '#64748b', marginBottom: 6 }}>Margen por período</div>
                <div style={{ height: 280 }}>
                  <Charts.ResponsiveContainer width="100%" height="100%">
                    <Charts.BarChart data={(resumen?.series || []).length ? resumen.series : [{ periodo: '', margen: 0 }]} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                      <Charts.CartesianGrid strokeDasharray="3 3" />
                      <Charts.XAxis dataKey="periodo" />
                      <Charts.YAxis />
                      <Charts.Tooltip />
                      <Charts.Legend />
                      <Charts.Bar dataKey="margen" name="Margen" fill="#16A34A" />
                    </Charts.BarChart>
                  </Charts.ResponsiveContainer>
                </div>
              </WebMUI.Paper>
            </div>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Resumen</Text>
            <View style={styles.totalsRow}>
              <View style={[styles.totalChip, styles.ok]}><Feather name="arrow-down-circle" size={16} color="#16A34A" /><Text style={styles.totalText}>Ingresos: {resumen?.ingresosTotal ?? 0}</Text></View>
              <View style={[styles.totalChip, styles.warn]}><Feather name="arrow-up-circle" size={16} color="#ef4444" /><Text style={styles.totalText}>Egresos: {resumen?.egresosTotal ?? 0}</Text></View>
              <View style={[styles.totalChip, Number(resumen?.margenTotal ?? 0) >= 0 ? styles.ok : styles.warn]}><Feather name="activity" size={16} color="#64748b" /><Text style={styles.totalText}>Margen: {resumen?.margenTotal ?? 0}</Text></View>
            </View>
            <View style={styles.tableHeader}>
              <Text style={[styles.th, styles.wPeriodo]}>Periodo</Text>
              <Text style={[styles.th, styles.wNum]}>Ingresos</Text>
              <Text style={[styles.th, styles.wNum]}>Egresos</Text>
              <Text style={[styles.th, styles.wNum]}>Margen</Text>
            </View>
            <FlatList data={(resumen?.series || [])} renderItem={renderSerie} keyExtractor={(it, idx) => String(it.periodo || idx)} />
          </View>
        )
      ) : null}
      {activeTab === 'Ranking' && margenList.length ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Margen por Cultivo</Text>
          <View style={styles.tableHeader}>
            <Text style={[styles.th, styles.wCultivo]}>Cultivo</Text>
            <Text style={[styles.th, styles.wNum]}>Ingresos</Text>
            <Text style={[styles.th, styles.wNum]}>Egresos</Text>
            <Text style={[styles.th, styles.wNum]}>Margen</Text>
          </View>
          <FlatList data={margenList} renderItem={renderMargen} keyExtractor={(it, idx) => String(it.id_cultivo || idx)} />
        </View>
      ) : null}
      {activeTab === 'Historial' && rentabilidad ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Rentabilidad</Text>
          <View style={styles.rentRow}><Text style={styles.rentLabel}>Ingresos</Text><Text style={styles.rentVal}>{rentabilidad.ingresos}</Text></View>
          <View style={styles.rentRow}><Text style={styles.rentLabel}>Egresos</Text><Text style={styles.rentVal}>{rentabilidad.egresos}</Text></View>
          <View style={styles.rentRow}><Text style={styles.rentLabel}>Margen</Text><Text style={styles.rentVal}>{rentabilidad.margen}</Text></View>
          <View style={styles.rentRow}><Text style={styles.rentLabel}>Beneficio/Costo</Text><Text style={styles.rentVal}>{rentabilidad.beneficioCosto ?? '—'}</Text></View>
          <View style={styles.rentRow}><Text style={styles.rentLabel}>Margen %</Text><Text style={styles.rentVal}>{rentabilidad.margenPorcentaje ? `${rentabilidad.margenPorcentaje}%` : '—'}</Text></View>
          <View style={styles.rentRow}><Text style={styles.rentLabel}>Rentable</Text><Text style={[styles.rentVal, rentabilidad.rentable ? styles.okText : styles.warnText]}>{rentabilidad.rentable ? 'Sí' : 'No'}</Text></View>
        </View>
      ) : null}
      {activeTab === 'Costo' ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Parámetros de Costo</Text>
          <View style={styles.rowInline}><Text style={styles.label}>Costo/Hora</Text><TextInput style={styles.input} placeholder="$" value={costParams.costoHora} onChangeText={(v)=>setCostParams(p=>({ ...p, costoHora: v }))} keyboardType="numeric" /></View>
          <View style={styles.rowInline}><Text style={styles.label}>Deprec. Mensual</Text><TextInput style={styles.input} placeholder="$" value={costParams.depreciacionMensual} onChangeText={(v)=>setCostParams(p=>({ ...p, depreciacionMensual: v }))} keyboardType="numeric" /></View>
          <View style={styles.rowInline}><Text style={styles.label}>Vida útil (meses)</Text><TextInput style={styles.input} placeholder="" value={costParams.vidaUtilMeses} onChangeText={(v)=>setCostParams(p=>({ ...p, vidaUtilMeses: v }))} keyboardType="numeric" /></View>
          <View style={styles.rowInline}><Text style={styles.label}>Horas por tipo</Text><TextInput style={styles.input} placeholder='JSON ej: {"riego":10}' value={costParams.horasPorTipo} onChangeText={(v)=>setCostParams(p=>({ ...p, horasPorTipo: v }))} /></View>
          <Text style={styles.subtitle}>Se guardan por cultivo en el dispositivo.</Text>
        </View>
      ) : null}
      {activeTab === 'Exportaciones' ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Exportaciones</Text>
          <View style={styles.actions}>
            <Pressable style={[styles.btn, styles.outline]} onPress={() => openExport('excel')}><Text style={styles.btnOutlineText}>Exportar Excel</Text></Pressable>
            <Pressable style={[styles.btn, styles.outline]} onPress={() => openExport('pdf')}><Text style={styles.btnOutlineText}>Exportar PDF</Text></Pressable>
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff', padding: 12 },
  title: { fontSize: 18, fontWeight: '700', color: '#0f172a', marginBottom: 8 },
  filters: { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0', borderWidth: 1, borderRadius: 8, padding: 8, marginBottom: 10 },
  rowInline: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  label: { width: 80, color: '#334155', fontSize: 12 },
  input: { flex: 1, borderWidth: 1, borderColor: '#E4E7EC', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6, fontSize: 13 },
  select: { flex: 1, borderWidth: 1, borderColor: '#E4E7EC', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 8, backgroundColor: '#fff' },
  selectText: { color: '#0f172a' },
  groupRow: { flexDirection: 'row', gap: 6 },
  groupBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16 },
  groupActive: { backgroundColor: '#DCFCE7', borderWidth: 1, borderColor: '#16A34A' },
  groupInactive: { backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#CBD5E1' },
  groupTextActive: { color: '#16A34A', fontWeight: '700' },
  groupTextInactive: { color: '#334155' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 6 },
  btn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  primary: { backgroundColor: '#16A34A' },
  btnText: { color: '#fff', fontWeight: '700' },
  outline: { borderWidth: 1, borderColor: '#16A34A', backgroundColor: '#fff' },
  btnOutlineText: { color: '#16A34A', fontWeight: '700' },
  error: { color: '#ef4444', marginVertical: 6 },
  card: { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, padding: 8, marginBottom: 10 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a', marginBottom: 6 },
  totalsRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  totalChip: { flexDirection: 'row', gap: 6, alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, borderWidth: 1 },
  ok: { borderColor: '#16A34A', backgroundColor: '#E8F5E9' },
  warn: { borderColor: '#ef4444', backgroundColor: '#FEE2E2' },
  totalText: { color: '#0f172a' },
  tableHeader: { flexDirection: 'row', paddingVertical: 6 },
  th: { flex: 1, fontSize: 12, fontWeight: '700', color: '#16A34A' },
  wPeriodo: { flex: 1.2 },
  wNum: { flex: 0.8 },
  wCultivo: { flex: 1.4 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  cell: { flex: 1, fontSize: 13, color: '#0f172a' },
  sectionTitle: { marginTop: 10, marginBottom: 6, fontWeight: '700', color: '#0f172a' },
  rentRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  rentLabel: { color: '#334155' },
  rentVal: { color: '#0f172a', fontWeight: '700' },
  okText: { color: '#16A34A', fontWeight: '700' },
  warnText: { color: '#ef4444', fontWeight: '700' },
  tabs: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  tabBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16 },
  tabActive: { backgroundColor: '#DCFCE7', borderWidth: 1, borderColor: '#16A34A' },
  tabInactive: { backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#CBD5E1' },
  tabTextActive: { color: '#16A34A', fontWeight: '700' },
  tabTextInactive: { color: '#334155' },
});
