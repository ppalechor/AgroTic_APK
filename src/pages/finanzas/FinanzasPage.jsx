import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, FlatList, Alert, ScrollView, Platform, Switch } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { listCultivos, listActividades } from '../../services/api';
import { finanzasResumen, finanzasMargenPorCultivo, finanzasRentabilidad, finanzasActividades, finanzasIngresos, finanzasSalidas } from '../../services/api';
import { useQuery } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
const WebMUI = (() => {
  if (Platform.OS !== 'web') return {};
  try {
    return eval('require')("@mui/material");
  } catch {
    return {};
  }
})();
const Charts = (() => {
  if (Platform.OS !== 'web') return {};
  try {
    return eval('require')("recharts");
  } catch {
    return {};
  }
})();
const hasMUI = Platform.OS === 'web' && Boolean(WebMUI && WebMUI.Paper && WebMUI.Select && WebMUI.TextField && WebMUI.Slider && WebMUI.MenuItem && WebMUI.FormControl && WebMUI.InputLabel);
const hasCharts = Platform.OS === 'web' && Boolean(Charts && Charts.ResponsiveContainer && Charts.LineChart && Charts.BarChart && Charts.PieChart && Charts.Pie && Charts.CartesianGrid && Charts.XAxis && Charts.YAxis && Charts.Tooltip && Charts.Legend && Charts.Line && Charts.Bar && Charts.Cell);
 
// Formato de números en COP para una lectura consistente
const numberFmt = (v) => {
  try {
    const n = typeof v === 'string' ? parseFloat(v) : v;
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n || 0);
  } catch {
    return String(v);
  }
};

// Parseo tolerante para entradas monetarias (permite $, puntos y comas)
const parseMoney = (s) => {
  try {
    const cleaned = String(s ?? '')
      .replace(/[^0-9,.-]/g, '')
      .replace(/,/g, '.');
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
};

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
  // Parámetros de costo sin valores forzados; el usuario puede definirlos
  const [costParams, setCostParams] = useState({ costoHora: '', depreciacionMensual: '', vidaUtilMeses: '', horasPorTipo: '' });
  // Expansión/colapso de secciones en pestaña Costos
  const [expandCostoParams, setExpandCostoParams] = useState(true);
  const [expandLabor, setExpandLabor] = useState(true);
  const [expandTools, setExpandTools] = useState(true);
  const [horasPorTipoMap, setHorasPorTipoMap] = useState({});
  const [rankOnlySelected, setRankOnlySelected] = useState(true);
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);
  const [actividadesItems, setActividadesItems] = useState([]);
  const [ingresosItems, setIngresosItems] = useState([]);
  const [salidasItems, setSalidasItems] = useState([]);


  useEffect(() => {
    (async () => {
      try {
        const { items } = await listCultivos(token);
        setCultivos(items || []);
      } catch (e) {}
    })();
  }, [token]);

  // Inicializa fechas por defecto (inicio de mes y hoy) si están vacías
  useEffect(() => {
    try {
      if (!filters.from || !filters.to) {
        const now = new Date();
        const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const toStr = new Date(now).toISOString().slice(0, 10);
        const fromStr = new Date(startMonth).toISOString().slice(0, 10);
        setFilters((p) => ({ ...p, from: p.from || fromStr, to: p.to || toStr }));
      }
    } catch {}
  }, []);

  // Auto-selecciona el primer cultivo disponible si no hay uno elegido
  useEffect(() => {
    try {
      if (!filters.cultivoId && Array.isArray(cultivos) && cultivos.length > 0) {
        const first = cultivos[0];
        const id = first?.id ?? first?.id_cultivo;
        if (id) setFilters((p) => ({ ...p, cultivoId: String(id) }));
      }
    } catch {}
  }, [cultivos]);

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
          // Inicializa mapa de horas desde JSON si existe
          try {
            const parsed = obj.horasPorTipo ? JSON.parse(obj.horasPorTipo) : {};
            if (parsed && typeof parsed === 'object') setHorasPorTipoMap(parsed);
          } catch {}
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

  // Parseo robusto de fecha YYYY-MM-DD → Date seguro
  const parseYmdDate = (s) => {
    try {
      if (!s) return new Date();
      const m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (m) {
        const y = Number(m[1]);
        const mo = Number(m[2]) - 1;
        const d = Number(m[3]);
        const dt = new Date(y, mo, d);
        return Number.isFinite(dt.getTime()) ? dt : new Date();
      }
      const dt = new Date(s);
      return Number.isFinite(dt.getTime()) ? dt : new Date();
    } catch {
      return new Date();
    }
  };

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
    enabled: Boolean(token && filters.cultivoId && filters.from && filters.to),
  });
  const margenQuery = useQuery({
    queryKey: ['finanzas','margen', { from: filters.from, to: filters.to }],
    queryFn: () => finanzasMargenPorCultivo({ from: filters.from, to: filters.to }),
    enabled: Boolean(token && filters.from && filters.to),
  });
  const rentQuery = useQuery({
    queryKey: ['finanzas','rentabilidad', filters],
    queryFn: () => finanzasRentabilidad({ cultivoId: filters.cultivoId, from: filters.from, to: filters.to, criterio: filters.criterio, umbral: parseUmbral(filters.umbral) }),
    enabled: Boolean(token && filters.cultivoId && filters.from && filters.to),
  });
  const actividadesQuery = useQuery({
    queryKey: ['finanzas','actividades', filters],
    queryFn: () => finanzasActividades({ cultivoId: filters.cultivoId, from: filters.from, to: filters.to, groupBy: filters.groupBy }),
    enabled: Boolean(token && filters.cultivoId && filters.from && filters.to),
  });
  const ingresosQuery = useQuery({
    queryKey: ['finanzas','ingresos', filters],
    queryFn: () => finanzasIngresos({ cultivoId: filters.cultivoId, from: filters.from, to: filters.to, groupBy: filters.groupBy }),
    enabled: Boolean(token && filters.cultivoId && filters.from && filters.to),
  });
  const salidasQuery = useQuery({
    queryKey: ['finanzas','salidas', filters],
    queryFn: () => finanzasSalidas({ cultivoId: filters.cultivoId, from: filters.from, to: filters.to, groupBy: filters.groupBy }),
    enabled: Boolean(token && filters.cultivoId && filters.from && filters.to),
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
  useEffect(() => {
    if (actividadesQuery.data) {
      const arr = Array.isArray(actividadesQuery.data?.items) ? actividadesQuery.data.items : Array.isArray(actividadesQuery.data?.data) ? actividadesQuery.data.data : Array.isArray(actividadesQuery.data) ? actividadesQuery.data : [];
      setActividadesItems(arr);
      // Derivar tipos de actividad y seed de horas
      const tipos = Array.from(new Set(arr.map(a => (
        (a.tipo_actividad ?? a.tipo ?? a.tp_act_activ ?? a.tpAct_activ ?? a.tp_actividad ?? '')
      ).toString().trim().toLowerCase()).filter(Boolean)));
      setHorasPorTipoMap(prev => {
        const next = { ...prev };
        // Valor inicial por tipo ajustado a 2 horas/actividad
        tipos.forEach(t => { if (next[t] == null) next[t] = 2; });
        return next;
      });
    }
  }, [actividadesQuery.data]);

  // Fallback: si el endpoint de finanzas no devuelve actividades, intenta /actividades por cultivo
  useEffect(() => {
    (async () => {
      try {
        if ((Array.isArray(actividadesItems) ? actividadesItems.length : 0) === 0 && filters.cultivoId && token) {
          const res = await listActividades(token, { id_cultivo: filters.cultivoId });
          const arr = Array.isArray(res?.items) ? res.items : [];
          if (arr.length) {
            setActividadesItems(arr);
            const tipos = Array.from(new Set(arr.map(a => (
              (a.tipo_actividad ?? a.tipo ?? a.tp_act_activ ?? a.tpAct_activ ?? a.tp_actividad ?? '')
            ).toString().trim().toLowerCase()).filter(Boolean)));
            setHorasPorTipoMap(prev => {
              const next = { ...prev };
              tipos.forEach(t => { if (next[t] == null) next[t] = 2; });
              return next;
            });
          }
        }
      } catch {}
    })();
  }, [actividadesItems, filters.cultivoId, token]);
  useEffect(() => {
    if (ingresosQuery.data) {
      const arr = Array.isArray(ingresosQuery.data?.items) ? ingresosQuery.data.items : Array.isArray(ingresosQuery.data?.data) ? ingresosQuery.data.data : Array.isArray(ingresosQuery.data) ? ingresosQuery.data : [];
      setIngresosItems(arr);
    }
  }, [ingresosQuery.data]);
  useEffect(() => {
    if (salidasQuery.data) {
      const arr = Array.isArray(salidasQuery.data?.items) ? salidasQuery.data.items : Array.isArray(salidasQuery.data?.data) ? salidasQuery.data.data : Array.isArray(salidasQuery.data) ? salidasQuery.data : [];
      setSalidasItems(arr);
    }
  }, [salidasQuery.data]);

  const handleLoad = async () => {
    setError(''); setLoading(true);
    try {
      if (!filters.cultivoId || !filters.from || !filters.to) {
        setError('Selecciona cultivo y rango de fechas');
        return;
      }
      await Promise.all([resumenQuery.refetch(), margenQuery.refetch(), rentQuery.refetch(), actividadesQuery.refetch(), ingresosQuery.refetch(), salidasQuery.refetch()]);
    } catch (e) {
      setError(e?.message || 'Error cargando finanzas');
    } finally { setLoading(false); }
  };

 

  const dateToYmd = (d) => {
    try { return new Date(d).toISOString().slice(0, 10); } catch { return ''; }
  };
  const today = useMemo(() => dateToYmd(new Date()), []);
  const fromDate = useMemo(() => parseYmdDate(filters.from), [filters.from]);
  const toDate = useMemo(() => parseYmdDate(filters.to), [filters.to]);

  const onChangeFrom = (_, selectedDate) => {
    setShowFromPicker(Platform.OS === 'ios');
    if (selectedDate) setFilters((p) => ({ ...p, from: dateToYmd(selectedDate) }));
  };
  const onChangeTo = (_, selectedDate) => {
    setShowToPicker(Platform.OS === 'ios');
    if (selectedDate) setFilters((p) => ({ ...p, to: dateToYmd(selectedDate) }));
  };

  const rankingRows = useMemo(() => {
    const base = Array.isArray(margenList) ? margenList : [];
    const rows = base.map((r) => {
      const ingresos = Number(r.ingresos || 0);
      const egresos = Number(r.egresos || 0);
      const margen = Number(r.margen || ingresos - egresos);
      const bc = egresos > 0 ? ingresos / egresos : null;
      const porcentaje = ingresos > 0 ? (margen / ingresos) * 100 : null;
      const um = parseUmbral(filters.umbral);
      const rentable = bc !== null ? (um ? bc > um : bc >= 1) : margen > 0;
      return {
        id_cultivo: r.id_cultivo,
        nombre: r.nombre_cultivo || r.nombre || `#${r.id_cultivo}`,
        ingresos,
        egresos,
        margen,
        bc,
        porcentaje,
        rentable,
      };
    });
    const filtered = rankOnlySelected && filters.cultivoId
      ? rows.filter((x) => String(x.id_cultivo) === String(filters.cultivoId))
      : rows;
    return filtered;
  }, [margenList, rankOnlySelected, filters.cultivoId, filters.umbral]);

  const maxAbsMargen = useMemo(() => {
    return rankingRows.reduce((acc, r) => Math.max(acc, Math.abs(Number(r.margen || 0))), 0) || 1;
  }, [rankingRows]);
  const maxEgresos = useMemo(() => {
    return rankingRows.reduce((acc, r) => Math.max(acc, Number(r.egresos || 0)), 0) || 1;
  }, [rankingRows]);

  // Derivados para gráficos móviles (Resumen)
  const seriesSafe = useMemo(() => Array.isArray(resumen?.series) ? resumen.series : [], [resumen?.series]);
  const maxInOut = useMemo(() => seriesSafe.reduce((m, s) => Math.max(m, Number(s.ingresos || 0), Number(s.egresos || 0)), 0), [seriesSafe]);
  const maxMargen = useMemo(() => seriesSafe.reduce((m, s) => {
    const margen = s.margen != null ? Number(s.margen) : (Number(s.ingresos || 0) - Number(s.egresos || 0));
    return Math.max(m, Math.abs(margen));
  }, 0), [seriesSafe]);
  const categorias = useMemo(() => Array.isArray(resumen?.categoriasGasto) ? resumen.categoriasGasto : [], [resumen?.categoriasGasto]);
  const actividadesTotal = useMemo(() => categorias.filter(c => String(c.nombre || '').toLowerCase().includes('activ')).reduce((acc, c) => acc + Number(c.total || 0), 0), [categorias]);
  const insumosTotal = useMemo(() => categorias.filter(c => !String(c.nombre || '').toLowerCase().includes('activ')).reduce((acc, c) => acc + Number(c.total || 0), 0), [categorias]);
  const totalGastoCat = useMemo(() => Number(actividadesTotal) + Number(insumosTotal), [actividadesTotal, insumosTotal]);
  const insumosPct = totalGastoCat > 0 ? insumosTotal / totalGastoCat : 1;
  const actividadesPct = totalGastoCat > 0 ? actividadesTotal / totalGastoCat : 0;
  const scaleY = (v, max = 1, h = 140) => {
    const num = Number(v || 0);
    return max > 0 ? Math.max(2, Math.round((num / max) * h)) : 2;
  };

  // Derivados para Costo
  const egresosTotal = useMemo(() => Number(resumen?.egresosTotal || 0), [resumen]);
  const manoObraTotal = useMemo(() => {
    const arr = Array.isArray(actividadesItems) ? actividadesItems : [];
    return arr.reduce((acc, a) => acc + Number(a.costo_mano_obra || a.mano_obra || 0), 0);
  }, [actividadesItems]);
  const depreciacionTotal = useMemo(() => {
    const arr = Array.isArray(actividadesItems) ? actividadesItems : [];
    return arr.reduce((acc, a) => acc + Number(a.costo_maquinaria || a.maquinaria || 0), 0);
  }, [actividadesItems]);
  const costoProduccionTotal = useMemo(() => Number(egresosTotal || 0), [egresosTotal]);

  const tiposActividad = useMemo(() => {
    const arr = Array.isArray(actividadesItems) ? actividadesItems : [];
    return Array.from(new Set(arr.map(a => (
      (a.tipo_actividad ?? a.tipo ?? a.tp_act_activ ?? a.tpAct_activ ?? a.tp_actividad ?? '')
    ).toString().trim().toLowerCase()).filter(Boolean)));
  }, [actividadesItems]);
  const actividadesPorTipo = useMemo(() => {
    const map = {};
    const arr = Array.isArray(actividadesItems) ? actividadesItems : [];
    arr.forEach(a => {
      const t = (a.tipo_actividad ?? a.tipo ?? a.tp_act_activ ?? a.tpAct_activ ?? a.tp_actividad ?? '')
        .toString().trim().toLowerCase();
      if (!t) return;
      map[t] = (map[t] || 0) + 1;
    });
    return map;
  }, [actividadesItems]);

  // Total estimado de mano de obra según parámetros y horas por tipo
  const manoObraEstimadoTotal = useMemo(() => {
    const costoHoraNum = parseMoney(costParams.costoHora);
    const tipos = Object.keys(actividadesPorTipo);
    return tipos.reduce((acc, t) => {
      const actividades = Number(actividadesPorTipo[t] || 0);
      const horas = Number(horasPorTipoMap[t] ?? 2);
      return acc + actividades * horas * costoHoraNum;
    }, 0);
  }, [actividadesPorTipo, horasPorTipoMap, costParams.costoHora]);

  const setHorasTipo = (tipo, horasStr) => {
    const num = Number(String(horasStr).replace(',', '.'));
    setHorasPorTipoMap(prev => ({ ...prev, [tipo]: Number.isFinite(num) && num >= 0 ? num : prev[tipo] || 0 }));
    // También persistimos en costParams.horasPorTipo
    try {
      const nextObj = { ...horasPorTipoMap, [tipo]: Number.isFinite(num) && num >= 0 ? num : (horasPorTipoMap[tipo] || 0) };
      setCostParams(p => ({ ...p, horasPorTipo: JSON.stringify(nextObj) }));
    } catch {}
  };

  const BarRow = ({ label, value, max, color }) => {
    const pct = Math.min(1, Math.max(0, Number(max) ? Number(value) / Number(max) : 0));
    return (
      <View style={{ marginVertical: 6 }}>
        <Text style={{ marginBottom: 4, color: '#0f172a' }}>{label}</Text>
        <View style={{ height: 16, backgroundColor: '#E2E8F0', borderRadius: 8 }}>
          <View style={{ width: `${pct * 100}%`, height: 16, backgroundColor: color, borderRadius: 8 }} />
        </View>
        <Text style={{ marginTop: 4, color: '#64748b' }}>{value}</Text>
      </View>
    );
  };

  // Funcionalidad de exportación removida según solicitud

  const renderSerie = ({ item }) => (
    <View style={styles.row}>
      <Text style={[styles.cell, styles.wPeriodo]}>{item.periodo}</Text>
      <Text style={[styles.cell, styles.wNum]}>{numberFmt(item.ingresos)}</Text>
      <Text style={[styles.cell, styles.wNum]}>{numberFmt(item.egresos)}</Text>
      <Text style={[styles.cell, styles.wNum]}>{numberFmt(item.margen)}</Text>
    </View>
  );

  const renderMargen = ({ item }) => (
    <View style={styles.row}>
      <Text style={[styles.cell, styles.wCultivo]}>{item.nombre_cultivo || item.nombre || `#${item.id_cultivo}`}</Text>
      <Text style={[styles.cell, styles.wNum]}>{numberFmt(item.ingresos)}</Text>
      <Text style={[styles.cell, styles.wNum]}>{numberFmt(item.egresos)}</Text>
      <Text style={[styles.cell, styles.wNum]}>{numberFmt(item.margen)}</Text>
    </View>
  );

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={true} nestedScrollEnabled={true}>
      <Text style={[styles.title, { color: '#16A34A' }]}>Control Financiero</Text>
      {!canView ? <Text style={styles.error}>No tienes permisos para ver finanzas</Text> : null}
      {Platform.OS === 'web' ? (
        <View style={{ marginBottom: 10 }}>
          {hasMUI ? (
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
            {/* Exportación removida */}
          </WebMUI.Paper>
          ) : (
            <View style={{ padding: 12, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8 }}>
              <Text style={{ color: '#334155' }}>UI web avanzada no disponible. Puedes usar los filtros móviles o instalar '@mui/material'.</Text>
            </View>
          )}
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
            <Pressable style={styles.input} onPress={() => setShowFromPicker(true)}>
              <Text style={styles.selectText}>{filters.from || today}</Text>
            </Pressable>
          </View>
          {showFromPicker && (
            <DateTimePicker value={fromDate} mode="date" display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={onChangeFrom} />
          )}
          <View style={styles.rowInline}>
            <Text style={styles.label}>Hasta</Text>
            <Pressable style={styles.input} onPress={() => setShowToPicker(true)}>
              <Text style={styles.selectText}>{filters.to || today}</Text>
            </Pressable>
          </View>
          {showToPicker && (
            <DateTimePicker value={toDate} mode="date" display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={onChangeTo} />
          )}
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
            {/* Exportación removida */}
          </View>
        </View>
      )}
      <View style={styles.tabs}>
        {['Resumen','Ranking','Costo','Historial'].map(t => (
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
                  {hasCharts ? (
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
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                      <span style={{ color: '#64748b' }}>Gráficos no disponibles. Instala 'recharts' o usa la vista móvil.</span>
                    </div>
                  )}
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
                    {hasCharts ? (
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
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                        <span style={{ color: '#64748b' }}>Gráfico de pastel no disponible.</span>
                      </div>
                    )}
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
                  {hasCharts ? (
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
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                      <span style={{ color: '#64748b' }}>Gráfico de barras no disponible.</span>
                    </div>
                  )}
                </div>
              </WebMUI.Paper>
            </div>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Resumen</Text>
            <View style={styles.totalsRow}>
              <View style={[styles.totalChip, styles.ok]}><Feather name="arrow-down-circle" size={16} color="#16A34A" /><Text style={styles.totalText}>Ingresos: {numberFmt(resumen?.ingresosTotal ?? 0)}</Text></View>
              <View style={[styles.totalChip, styles.warn]}><Feather name="arrow-up-circle" size={16} color="#ef4444" /><Text style={styles.totalText}>Egresos: {numberFmt(resumen?.egresosTotal ?? 0)}</Text></View>
              <View style={[styles.totalChip, Number(resumen?.margenTotal ?? 0) >= 0 ? styles.ok : styles.warn]}><Feather name="activity" size={16} color="#64748b" /><Text style={styles.totalText}>Margen: {numberFmt(resumen?.margenTotal ?? 0)}</Text></View>
            </View>
            <Text style={styles.sectionTitle}>Ingresos vs Egresos</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 180, paddingVertical: 8 }}>
                {seriesSafe.length ? seriesSafe.map((s, idx) => (
                  <View key={`inout-${idx}`} style={{ width: 44, marginRight: 8 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                      <View style={{ width: 18, height: scaleY(s.egresos, maxInOut, 140), backgroundColor: '#ef4444', borderRadius: 4 }} />
                      <View style={{ width: 18, height: scaleY(s.ingresos, maxInOut, 140), backgroundColor: '#16A34A', borderRadius: 4 }} />
                    </View>
                    <Text style={{ fontSize: 10, color: '#64748b', textAlign: 'center' }}>{String(s.periodo || '')}</Text>
                  </View>
                )) : <Text style={{ color: '#64748b' }}>Sin datos</Text>}
              </View>
            </ScrollView>

            <Text style={styles.sectionTitle}>Gasto por categoría</Text>
            <View style={{ borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, padding: 8 }}>
              <View style={{ flexDirection: 'row', height: 18, borderRadius: 9, overflow: 'hidden', backgroundColor: '#F1F5F9' }}>
                <View style={{ flex: insumosPct, backgroundColor: '#16A34A' }} />
                <View style={{ flex: actividadesPct, backgroundColor: '#64748b' }} />
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
                <Text style={{ color: '#334155' }}>Insumos: {numberFmt(insumosTotal)}</Text>
                <Text style={{ color: '#334155' }}>Actividades: {numberFmt(actividadesTotal)}</Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>Margen por período</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 180, paddingVertical: 8 }}>
                {seriesSafe.length ? seriesSafe.map((s, idx) => {
                  const mg = s.margen != null ? Number(s.margen) : (Number(s.ingresos || 0) - Number(s.egresos || 0));
                  const color = mg >= 0 ? '#16A34A' : '#ef4444';
                  return (
                    <View key={`m-${idx}`} style={{ width: 36, marginRight: 8, alignItems: 'center' }}>
                      <View style={{ width: 24, height: scaleY(mg, maxMargen, 140), backgroundColor: color, borderRadius: 4 }} />
                      <Text style={{ fontSize: 10, color: '#64748b', textAlign: 'center' }}>{String(s.periodo || '')}</Text>
                    </View>
                  );
                }) : <Text style={{ color: '#64748b' }}>Sin datos</Text>}
              </View>
            </ScrollView>
          </View>
        )
      ) : null}
      {activeTab === 'Ranking' && rankingRows.length ? (
        <>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Ranking por cultivo</Text>
            {rankingRows.map((r) => (
              <BarRow key={`rk-${r.id_cultivo}`} label={r.nombre} value={Math.max(0, r.margen)} max={maxAbsMargen} color={Number(r.margen) >= 0 ? '#16A34A' : '#ef4444'} />
            ))}
          </View>

          <View style={styles.card}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.cardTitle}>Tabla resumen cultivos</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ color: '#334155' }}>Sólo cultivo seleccionado</Text>
                <Switch value={rankOnlySelected} onValueChange={setRankOnlySelected} trackColor={{ true: '#86EFAC', false: '#CBD5E1' }} thumbColor={rankOnlySelected ? '#16A34A' : '#fff'} />
              </View>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.tableContainer}>
                <View style={styles.tableHeader}>
                  <Text style={[styles.th, styles.wCultivo]}>Cultivo</Text>
                  <Text style={[styles.th, styles.wNum, styles.numTh]}>Ingresos</Text>
                  <Text style={[styles.th, styles.wNum, styles.numTh]}>Egresos</Text>
                  <Text style={[styles.th, styles.wNum, styles.numTh]}>Margen</Text>
                  <Text style={[styles.th, styles.wNum, styles.numTh]}>B/C</Text>
                  <Text style={[styles.th, styles.wNum, styles.numTh]}>% Margen</Text>
                  <Text style={[styles.th, styles.wNum, styles.centerTh]}>Rentable</Text>
                </View>
                {rankingRows.map((r) => (
                  <View key={`tb-${r.id_cultivo}`} style={styles.row}>
                    <Text style={[styles.cell, styles.wCultivo, styles.cultivoCell]}>{r.nombre}</Text>
                    <Text style={[styles.cell, styles.wNum, styles.numCell]}>{numberFmt(r.ingresos)}</Text>
                    <Text style={[styles.cell, styles.wNum, styles.numCell]}>{numberFmt(r.egresos)}</Text>
                    <Text style={[styles.cell, styles.wNum, styles.numCell]}>{numberFmt(r.margen)}</Text>
                    <Text style={[styles.cell, styles.wNum, styles.numCell]}>{(r.bc !== null && Number.isFinite(Number(r.bc))) ? Number(r.bc).toFixed(2) : 'N/A'}</Text>
                    <Text style={[styles.cell, styles.wNum, styles.numCell]}>{typeof r.porcentaje === 'number' ? `${r.porcentaje.toFixed(2)}%` : 'N/A'}</Text>
                    <Text style={[styles.cell, styles.wNum, styles.centerCell, r.rentable ? styles.okText : styles.warnText]}>{r.rentable ? 'Sí' : 'No'}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Gastos por cultivo</Text>
            {rankingRows.map((r) => (
              <BarRow key={`eg-${r.id_cultivo}`} label={r.nombre} value={Math.max(0, r.egresos)} max={maxEgresos} color={'#ef4444'} />
            ))}
          </View>
        </>
      ) : null}
      {activeTab === 'Historial' && rentabilidad ? (
        <>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Historial de actividades</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.tableContainer}>
                <View style={styles.tableHeader}>
                  <Text style={[styles.th, styles.wPeriodo]}>Fecha</Text>
                  <Text style={[styles.th, styles.wCultivo]}>Tipo</Text>
                  <Text style={[styles.th, styles.wNum]}>Mano de obra $</Text>
                  <Text style={[styles.th, styles.wNum]}>Maquinaria $</Text>
                </View>
                {(Array.isArray(actividadesItems) ? actividadesItems : []).map((act, idx) => (
                  <View key={`act-${act.id || idx}`} style={styles.row}>
                    <Text style={[styles.cell, styles.wPeriodo]}>{act.fecha || act.createdAt || ''}</Text>
                    <Text style={[styles.cell, styles.wCultivo]}>{act.tipo_actividad || act.tipo || 'Actividad'}</Text>
                    <Text style={[styles.cell, styles.wNum]}>{numberFmt(Number(act.costo_mano_obra || act.mano_obra || 0))}</Text>
                    <Text style={[styles.cell, styles.wNum]}>{numberFmt(Number(act.costo_maquinaria || act.maquinaria || 0))}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Resumen de rentabilidad</Text>
            <View style={styles.rentRow}><Text style={styles.rentLabel}>Ingresos</Text><Text style={styles.rentVal}>{numberFmt(rentabilidad.ingresos)}</Text></View>
            <View style={styles.rentRow}><Text style={styles.rentLabel}>Egresos</Text><Text style={styles.rentVal}>{numberFmt(rentabilidad.egresos)}</Text></View>
            <View style={styles.rentRow}><Text style={styles.rentLabel}>Margen</Text><Text style={styles.rentVal}>{numberFmt(rentabilidad.margen)}</Text></View>
            <View style={styles.rentRow}><Text style={styles.rentLabel}>Beneficio/Costo</Text><Text style={styles.rentVal}>{rentabilidad.beneficioCosto ?? '—'}</Text></View>
            <View style={styles.rentRow}><Text style={styles.rentLabel}>Margen %</Text><Text style={styles.rentVal}>{typeof rentabilidad.margenPorcentaje === 'number' ? `${Number(rentabilidad.margenPorcentaje).toFixed(2)}%` : '—'}</Text></View>
            <View style={styles.rentRow}><Text style={styles.rentLabel}>Rentable</Text><Text style={[styles.rentVal, rentabilidad.rentable ? styles.okText : styles.warnText]}>{rentabilidad.rentable ? 'Sí' : 'No'}</Text></View>
          </View>
        </>
      ) : null}
      {activeTab === 'Costo' ? (
        <>
          <View style={styles.card}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.cardTitle}>KPIs de costo</Text>
            </View>
            <View style={styles.totalsRow}>
              <View style={[styles.totalChip, styles.warn]}><Feather name="arrow-up-circle" size={16} color="#ef4444" /><Text style={styles.totalText}>Egresos: {numberFmt(egresosTotal)}</Text></View>
              <View style={[styles.totalChip, styles.ok]}><Feather name="users" size={16} color="#16A34A" /><Text style={styles.totalText}>Mano de obra: {numberFmt(manoObraTotal)}</Text></View>
              <View style={[styles.totalChip, styles.ok]}><Feather name="tool" size={16} color="#16A34A" /><Text style={styles.totalText}>Maquinaria: {numberFmt(depreciacionTotal)}</Text></View>
              <View style={[styles.totalChip, styles.ok]}><Feather name="package" size={16} color="#16A34A" /><Text style={styles.totalText}>Costo producción: {numberFmt(costoProduccionTotal)}</Text></View>
            </View>
          </View>

          <View style={styles.card}>
            <Pressable onPress={() => setExpandCostoParams((v) => !v)} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.cardTitle}>Parámetros de Costo</Text>
              <Feather name={expandCostoParams ? 'chevron-up' : 'chevron-down'} size={18} color="#334155" />
            </Pressable>
            {expandCostoParams ? (
              <>
                <View style={styles.rowInline}><Text style={styles.label}>Costo/Hora</Text><TextInput style={styles.input} placeholder="$" value={costParams.costoHora} onChangeText={(v)=>setCostParams(p=>({ ...p, costoHora: v }))} keyboardType="numeric" /></View>
                <View style={styles.rowInline}><Text style={styles.label}>Deprec. Mensual</Text><TextInput style={styles.input} placeholder="$" value={costParams.depreciacionMensual} onChangeText={(v)=>setCostParams(p=>({ ...p, depreciacionMensual: v }))} keyboardType="numeric" /></View>
                <View style={styles.rowInline}><Text style={styles.label}>Vida útil (meses)</Text><TextInput style={styles.input} placeholder="" value={costParams.vidaUtilMeses} onChangeText={(v)=>setCostParams(p=>({ ...p, vidaUtilMeses: v }))} keyboardType="numeric" /></View>
                <Text style={{ color: '#64748b' }}>Se guardan por cultivo en el dispositivo.</Text>
              </>
            ) : null}
          </View>

          <View style={styles.card}>
            <Pressable onPress={() => setExpandLabor((v) => !v)} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.cardTitle}>Mano de obra por tipo</Text>
              <Feather name={expandLabor ? 'chevron-up' : 'chevron-down'} size={18} color="#334155" />
            </Pressable>
            {expandLabor ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.tableContainer}>
                <View style={styles.tableHeader}>
                  <Text style={[styles.th, styles.wCultivo]}>Tipo</Text>
                  <Text style={[styles.th, styles.wNum]}>Actividades</Text>
                  <Text style={[styles.th, styles.wNum]}>Horas/actividad</Text>
                  <Text style={[styles.th, styles.wNum]}>Subtotal</Text>
                </View>
                {tiposActividad.map((t) => {
                  const actividades = actividadesPorTipo[t] || 0;
                  const horas = horasPorTipoMap[t] ?? 2;
                  const costoHora = parseMoney(costParams.costoHora);
                  const subtotal = actividades * horas * costoHora;
                  return (
                    <View key={`tipo-${t}`} style={styles.row}>
                      <Text style={[styles.cell, styles.wCultivo]}>{t || '—'}</Text>
                      <Text style={[styles.cell, styles.wNum]}>{actividades}</Text>
                      <View style={[styles.cell, styles.wNum]}>
                        <TextInput style={[styles.input, { paddingVertical: 2 }]} value={String(horas)} onChangeText={(v)=>setHorasTipo(t, v)} keyboardType="numeric" />
                      </View>
                      <Text style={[styles.cell, styles.wNum]}>{numberFmt(subtotal)}</Text>
                    </View>
                  );
                })}
                <View style={[styles.row, { borderTopWidth: 1, borderTopColor: '#F1F5F9' }] }>
                  <Text style={[styles.cell, styles.wCultivo]}>Total</Text>
                  <Text style={[styles.cell, styles.wNum]}></Text>
                  <Text style={[styles.cell, styles.wNum]}></Text>
                  <Text style={[styles.cell, styles.wNum]}>{numberFmt(manoObraEstimadoTotal)}</Text>
                </View>
              </View>
            </ScrollView>
            ) : null}
          </View>

          <View style={styles.card}>
            <Pressable onPress={() => setExpandTools((v) => !v)} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.cardTitle}>Vida útil herramientas</Text>
              <Feather name={expandTools ? 'chevron-up' : 'chevron-down'} size={18} color="#334155" />
            </Pressable>
            {expandTools ? (
              <Text style={{ color: '#64748b' }}>Sin herramientas registradas</Text>
            ) : null}
          </View>
        </>
      ) : null}
      {/* Pestaña de Exportaciones removida */}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  scrollContent: { padding: 12, paddingBottom: 24, flexGrow: 1 },
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
  card: { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, padding: 12, marginBottom: 12 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a', marginBottom: 6 },
  totalsRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 8 },
  totalChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 16, borderWidth: 1, flexBasis: '48%', flexGrow: 1, marginBottom: 8 },
  ok: { borderColor: '#16A34A', backgroundColor: '#E8F5E9' },
  warn: { borderColor: '#ef4444', backgroundColor: '#FEE2E2' },
  totalText: { color: '#0f172a', flex: 1 },
  tableContainer: { minWidth: 820, paddingRight: 8 },
  tableHeader: { flexDirection: 'row', paddingVertical: 8, gap: 8 },
  th: { flex: 1, fontSize: 12, fontWeight: '700', color: '#16A34A' },
  numTh: { textAlign: 'right' },
  centerTh: { textAlign: 'center' },
  wPeriodo: { flex: 1.2 },
  wNum: { flex: 0.8, minWidth: 90 },
  wCultivo: { flex: 1.4, minWidth: 160 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', gap: 8 },
  cell: { flex: 1, fontSize: 13, color: '#0f172a', paddingHorizontal: 8 },
  numCell: { textAlign: 'right' },
  centerCell: { textAlign: 'center' },
  cultivoCell: { textAlign: 'left' },
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
