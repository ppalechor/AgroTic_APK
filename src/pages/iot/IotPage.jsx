import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, FlatList, Pressable, StyleSheet, Modal, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useAlert } from '../../contexts/AlertContext';
import sensoresService from '../../services/sensoresService';
import lotService from '../../services/lotService';

 export default function IotPage() {
  const { token, user, permissionKeys } = useAuth();
  const alert = useAlert();
  const [query, setQuery] = useState('');
  const [sensors, setSensors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [liveDevices, setLiveDevices] = useState({}); // { id: { valor_actual, unidad, ts } }
  const [prevLiveValues, setPrevLiveValues] = useState({});
  const [lastSavedAt, setLastSavedAt] = useState({});
  const [lots, setLots] = useState([]);
  const [assignOpen, setAssignOpen] = useState(false);
  const [sensorToAssign, setSensorToAssign] = useState(null);
  const [selectedLotId, setSelectedLotId] = useState(null);
  const [sensorHistory, setSensorHistory] = useState({});
  const [showManagement, setShowManagement] = useState(true);
  const [openForm, setOpenForm] = useState(false);
  const [formTipo, setFormTipo] = useState('');
  const [formEstado, setFormEstado] = useState('activo');
  const [formMin, setFormMin] = useState('0');
  const [formMax, setFormMax] = useState('50');
  const [formUnidad, setFormUnidad] = useState('');
  const [formUbicacion, setFormUbicacion] = useState('');
  const [openBroker, setOpenBroker] = useState(false);
  const [brokerUrl, setBrokerUrl] = useState('');
  const [brokerTopics, setBrokerTopics] = useState('');

  const fetchSensors = async () => {
    setLoading(true);
    setError('');
    try {
      const { items } = await sensoresService.getSensores(token, 1, 50);
      setSensors(items);
    } catch (e) {
      setError(e?.message || 'Error obteniendo sensores');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSensors(); }, [token]);
  useEffect(() => {
    const loadLots = async () => {
      try {
        if (!token) { setLots([]); return; }
        const list = await lotService.getLots(token);
        setLots(Array.isArray(list) ? list : []);
      } catch (e) {
        setLots([]);
      }
    };
    loadLots();
  }, [token]);

  useEffect(() => {
    let active = true;
    let id = null;
    const poll = async () => {
      try {
        const data = await sensoresService.getTiempoReal(token);
        if (!active) return;
        const map = {};
        (Array.isArray(data) ? data : []).forEach((s) => {
          const idKey = s?.id_sensor ?? s?.id;
          map[idKey] = {
            valor_actual: s?.valor_actual,
            unidad: s?.unidad_medida || s?.unidad || '',
            ts: new Date(),
          };
        });
        setLiveDevices((prev) => ({ ...prev, ...map }));
        setSensorHistory((prev) => {
          const next = { ...prev };
          Object.entries(map).forEach(([sid, info]) => {
            const arr = Array.isArray(prev[sid]) ? prev[sid].slice() : [];
            const v = Number(info.valor_actual);
            if (Number.isFinite(v)) {
              arr.push(v);
              while (arr.length > 12) arr.shift();
              next[sid] = arr;
            }
          });
          return next;
        });
        Object.entries(map).forEach(async ([sid, info]) => {
          try {
            const now = Date.now();
            const last = lastSavedAt[sid] || 0;
            const prevVal = prevLiveValues[sid];
            const changed = prevVal == null || info.valor_actual !== prevVal;
            if (changed && (now - last) > 10000 && Number.isFinite(info.valor_actual)) {
              await sensoresService.registrarLectura(token, sid, info.valor_actual, info.unidad, 'lectura móvil en tiempo real');
              setLastSavedAt((m) => ({ ...m, [sid]: now }));
              setPrevLiveValues((m) => ({ ...m, [sid]: info.valor_actual }));
            }
          } catch (e) {
          }
        });
      } catch (e) {
      }
    };
    poll();
    id = setInterval(poll, 5000);
    return () => { active = false; if (id) clearInterval(id); };
  }, [token]);

  const permSet = useMemo(() => new Set((permissionKeys || []).map(k => String(k).toLowerCase())), [permissionKeys]);
  const isAdmin = useMemo(() => String(user?.id_rol?.nombre_rol || user?.nombre_rol || user?.rol || '').toLowerCase() === 'administrador', [user]);
  const canEdit = isAdmin || permSet.has('sensores:*') || permSet.has('sensores:editar');
  const canDelete = isAdmin || permSet.has('sensores:*') || permSet.has('sensores:eliminar');

  const filtered = useMemo(() => {
    if (!query) return sensors;
    const q = query.toLowerCase();
    return sensors.filter(s => String(s.tipo_sensor || '').toLowerCase().includes(q) || String(s.estado || '').toLowerCase().includes(q));
  }, [query, sensors]);

  const renderItem = ({ item }) => {
    const live = liveDevices[item.id];
    const value = live?.valor_actual ?? item.valor_actual ?? null;
    const unit = live?.unidad ?? item.unidad_medida ?? '';
    const status = value != null && value >= item.valor_minimo && value <= item.valor_maximo ? 'normal' : 'critical';
    return (
      <View style={styles.card}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
          <Feather name={item.tipo_sensor?.toLowerCase().includes('temperatura') ? 'thermometer' : item.tipo_sensor?.toLowerCase().includes('humedad') ? 'droplet' : 'cpu'} size={18} color="#16A34A" />
          <Text style={{ marginLeft: 6, fontSize: 13, fontWeight: '700', color: '#0f172a' }}>{item.tipo_sensor}</Text>
        </View>
        <View style={styles.cardRow}><Text style={styles.cardLabel}>Estado</Text><Text style={styles.cardValue}>{item.estado}</Text></View>
        <View style={styles.cardRow}><Text style={styles.cardLabel}>Rango</Text><Text style={styles.cardValue}>{item.valor_minimo} - {item.valor_maximo}</Text></View>
        <View style={styles.cardRow}>
          <Text style={styles.cardLabel}>Valor</Text>
          <Text style={[styles.cardValue, status === 'critical' ? styles.valueCritical : styles.valueNormal]}>{value != null ? value : '—'} <Text style={styles.valueUnit}>{unit || ''}</Text></Text>
        </View>
        <View style={styles.cardRow}><Text style={styles.cardLabel}>Lote</Text><Text style={styles.cardValue}>{item.nombre_lote || '—'}</Text></View>
        <View style={[styles.cardRow, { justifyContent: 'flex-end' }]}>
          {canEdit && (
            <Pressable style={styles.iconBtn} onPress={() => alert.info('Editar', 'Edición de sensores en desarrollo móvil')}>
              <Feather name="edit-2" size={16} color="#16A34A" />
            </Pressable>
          )}
          <Pressable style={styles.iconBtn} onPress={() => { setSensorToAssign(item); setSelectedLotId(item.id_lote ?? null); setAssignOpen(true); }}>
            <Feather name="link" size={16} color="#0ea5e9" />
          </Pressable>
          {canDelete && (
            <Pressable style={styles.iconBtn} onPress={async () => {
              try {
                await sensoresService.deleteSensor(token, item.id);
                alert.success('¡Éxito!', 'Sensor eliminado correctamente');
                fetchSensors();
              } catch (e) {
                alert.error('Error', e?.message || 'No se pudo eliminar el sensor');
              }
            }}>
              <Feather name="trash-2" size={16} color="#ef4444" />
            </Pressable>
          )}
        </View>
      </View>
    );
  };

  return (
    <ScrollView style={styles.root} showsVerticalScrollIndicator={false}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={styles.title}>Dashboard de Sensores IoT</Text>
        <View style={{ flexDirection: 'row' }}>
          <Pressable style={[styles.btn, { marginRight: 8 }]} onPress={() => setShowManagement((v) => !v)}><Text style={styles.btnSecondaryText}>{showManagement ? 'Ocultar Gestión' : 'Mostrar Gestión'}</Text></Pressable>
          <Pressable style={[styles.btn, styles.btnPrimary]} onPress={() => setOpenForm(true)}><Text style={styles.btnPrimaryText}>Nuevo Sensor</Text></Pressable>
          <Pressable style={[styles.btn, { marginLeft: 8 }]} onPress={async () => {
            try {
              const current = await sensoresService.getBrokerSettings();
              setBrokerUrl(current.brokerUrl || '');
              setBrokerTopics((current.topics || []).join(', '));
              setOpenBroker(true);
            } catch {}
          }}><Text style={styles.btnSecondaryText}>Broker</Text></Pressable>
        </View>
      </View>
      {sensors.length > 0 ? (
        <View style={{ marginBottom: 12 }}>
          <Text style={styles.subtitle}>Resumen</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
            {sensors.map((sensor) => {
              const live = liveDevices[sensor.id];
              const value = live?.valor_actual ?? sensor.valor_actual ?? null;
              const unit = live?.unidad ?? sensor.unidad_medida ?? '';
              const statusOk = value != null && value >= sensor.valor_minimo && value <= sensor.valor_maximo;
              return (
                <View key={sensor.id} style={[styles.card, { width: '100%' }] }>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                    <Feather name={sensor.tipo_sensor?.toLowerCase().includes('temperatura') ? 'thermometer' : sensor.tipo_sensor?.toLowerCase().includes('humedad') ? 'droplet' : 'cpu'} size={16} color="#16A34A" />
                    <Text style={{ marginLeft: 6, fontSize: 12, color: '#0f172a', fontWeight: '600' }}>{sensor.tipo_sensor} {sensor.ubicacion ? sensor.ubicacion : ''}</Text>
                  </View>
                  <View style={styles.cardRow}>
                    <Text style={styles.cardLabel}>Valor actual</Text>
                    <Text style={[styles.cardValue, statusOk ? styles.valueNormal : styles.valueCritical]}>{value != null ? Number(value).toFixed(1) : '—'} <Text style={styles.valueUnit}>{unit}</Text></Text>
                  </View>
                  <View style={styles.cardRow}><Text style={styles.cardLabel}>Estado</Text><Text style={[styles.cardValue, statusOk ? styles.valueNormal : styles.valueCritical]}>{statusOk ? 'Estable' : 'Crítico'}</Text></View>
                </View>
              );
            })}
          </View>
        </View>
      ) : null}
      <Modal visible={openForm} transparent animationType="fade" onRequestClose={() => setOpenForm(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Nuevo Sensor</Text>
            <View style={styles.searchBox}><TextInput style={styles.searchInput} placeholder="Tipo de sensor" value={formTipo} onChangeText={setFormTipo} /></View>
            <View style={styles.searchBox}><TextInput style={styles.searchInput} placeholder="Estado" value={formEstado} onChangeText={setFormEstado} /></View>
            <View style={styles.searchBox}><TextInput style={styles.searchInput} placeholder="Valor mínimo" keyboardType="numeric" value={formMin} onChangeText={setFormMin} /></View>
            <View style={styles.searchBox}><TextInput style={styles.searchInput} placeholder="Valor máximo" keyboardType="numeric" value={formMax} onChangeText={setFormMax} /></View>
            <View style={styles.searchBox}><TextInput style={styles.searchInput} placeholder="Unidad de medida" value={formUnidad} onChangeText={setFormUnidad} /></View>
            <View style={styles.searchBox}><TextInput style={styles.searchInput} placeholder="Ubicación" value={formUbicacion} onChangeText={setFormUbicacion} /></View>
            <View style={styles.modalActions}>
              <Pressable style={[styles.btn, styles.btnSecondary]} onPress={() => setOpenForm(false)}><Text style={styles.btnSecondaryText}>Cancelar</Text></Pressable>
              <Pressable style={[styles.btn, styles.btnPrimary]} onPress={async () => {
                try {
                  await sensoresService.createSensor(token, {
                    tipo_sensor: formTipo,
                    estado: formEstado,
                    valor_minimo: Number(formMin || 0),
                    valor_maximo: Number(formMax || 0),
                    unidad_medida: formUnidad,
                    ubicacion: formUbicacion,
                  });
                  setOpenForm(false);
                  setFormTipo(''); setFormEstado('activo'); setFormMin('0'); setFormMax('50'); setFormUnidad(''); setFormUbicacion('');
                  fetchSensors();
                } catch (e) {
                  alert.error('Error', e?.message || 'No se pudo crear el sensor');
                }
              }}><Text style={styles.btnPrimaryText}>Crear</Text></Pressable>
            </View>
          </View>
        </View>
      </Modal>
      {sensors.length > 0 ? (
        <View style={{ marginTop: 12 }}>
          <Text style={styles.subtitle}>Visualización de Datos por Sensor</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
            {sensors.map((sensor, idx) => {
              const color = ['#16A34A', '#0ea5e9', '#ef4444', '#9c27b0'][idx] || '#16A34A';
              const hist = sensorHistory[sensor.id] || [];
              const min = Math.min(sensor.valor_minimo, ...hist.map((v) => Number(v)));
              const max = Math.max(sensor.valor_maximo, ...hist.map((v) => Number(v)));
              const range = Math.max(1, (max - min) || 1);
              return (
                <View key={sensor.id} style={[styles.card, { width: '100%' }] }>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                    <Feather name={sensor.tipo_sensor?.toLowerCase().includes('temperatura') ? 'thermometer' : sensor.tipo_sensor?.toLowerCase().includes('humedad') ? 'droplet' : 'cpu'} size={16} color={color} />
                    <Text style={{ marginLeft: 6, fontSize: 12, color: '#0f172a', fontWeight: '600' }}>{sensor.tipo_sensor} {sensor.ubicacion ? sensor.ubicacion : ''}</Text>
                  </View>
                  <View style={{ height: 120, flexDirection: 'row', alignItems: 'flex-end' }}>
                    {hist.length === 0 ? (
                      <Text style={{ color: '#64748b' }}>Sin datos</Text>
                    ) : (
                      hist.map((v, i) => {
                        const h = Math.max(6, Math.round(((Number(v) - min) / range) * 100));
                        return <View key={i} style={{ width: 8, height: h, backgroundColor: color, marginRight: 4, borderRadius: 2 }} />
                      })
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      ) : null}
      <View style={styles.searchBox}>
        <Feather name="search" size={16} color="#64748b" />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por tipo o estado..."
          value={query}
          onChangeText={setQuery}
        />
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View>
        {loading ? (
          <Text style={styles.loading}>Cargando…</Text>
        ) : (
          showManagement ? (
            <FlatList
              data={filtered}
              renderItem={renderItem}
              keyExtractor={(it, idx) => String(it.id || idx)}
              scrollEnabled={false}
            />
          ) : null
        )}
      </View>

      <Text style={[styles.subtitle, { marginTop: 16 }]}>Tiempo real (MQTT)</Text>
      <View style={styles.liveBox}>
        {Object.keys(liveDevices).length === 0 ? (
          <Text style={styles.liveText}>Sin lecturas recientes</Text>
        ) : (
          Object.entries(liveDevices).map(([id, d]) => (
            <View key={id} style={styles.liveRow}>
              <Text style={[styles.liveText, styles.liveId]}>#{id}</Text>
              <Text style={styles.liveText}>{d.valor_actual ?? '—'} {d.unidad || ''}</Text>
              <Text style={[styles.liveText, styles.liveTs]}>{d.ts?.toLocaleTimeString?.() || ''}</Text>
            </View>
          ))
        )}
      </View>
      {assignOpen ? (
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Asignar a lote</Text>
            <FlatList
              data={lots}
              keyExtractor={(l, idx) => String(l.id || idx)}
              renderItem={({ item: l }) => (
                <Pressable style={styles.listItem} onPress={() => setSelectedLotId(l.id)}>
                  <Text style={styles.listTitle}>{l.nombre}</Text>
                  <Text style={styles.listDesc}>{l.descripcion}</Text>
                </Pressable>
              )}
            />
            <View style={styles.modalActions}>
              <Pressable style={[styles.btn, styles.btnSecondary]} onPress={() => { setAssignOpen(false); setSensorToAssign(null); }}><Text style={styles.btnSecondaryText}>Cancelar</Text></Pressable>
              <Pressable style={[styles.btn, styles.btnPrimary]} onPress={async () => {
                if (!sensorToAssign?.id || !selectedLotId) return;
                try {
                  const lot = lots.find((l) => l.id === selectedLotId);
                  const ubic = lot?.nombre ? `Lote: ${lot.nombre}` : undefined;
                  await sensoresService.updateSensor(token, sensorToAssign.id, { id_lote: selectedLotId, ubicacion: ubic });
                  alert.success('¡Éxito!', 'Sensor vinculado al lote');
                  setAssignOpen(false); setSensorToAssign(null);
                  fetchSensors();
                } catch (e) {
                  alert.error('Error', e?.message || 'No se pudo vincular el sensor');
                }
              }}><Text style={styles.btnPrimaryText}>Asignar</Text></Pressable>
            </View>
          </View>
        </View>
      ) : null}
      <Modal visible={openBroker} transparent animationType="fade" onRequestClose={() => setOpenBroker(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Configuración de Broker</Text>
            <View style={styles.searchBox}><TextInput style={styles.searchInput} placeholder="Broker URL (ws://host:port)" value={brokerUrl} onChangeText={setBrokerUrl} /></View>
            <View style={styles.searchBox}><TextInput style={styles.searchInput} placeholder="Topics (separados por coma)" value={brokerTopics} onChangeText={setBrokerTopics} /></View>
            <View style={styles.modalActions}>
              <Pressable style={[styles.btn, styles.btnSecondary]} onPress={() => setOpenBroker(false)}><Text style={styles.btnSecondaryText}>Cancelar</Text></Pressable>
              <Pressable style={[styles.btn, styles.btnPrimary]} onPress={async () => {
                try {
                  const topics = brokerTopics.split(',').map(s => s.trim()).filter(Boolean);
                  await sensoresService.setBrokerSettings({ brokerUrl, topics });
                  setOpenBroker(false);
                } catch (e) { alert.error('Error', e?.message || 'No se pudo guardar broker'); }
              }}><Text style={styles.btnPrimaryText}>Guardar</Text></Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff', padding: 12 },
  title: { fontSize: 18, fontWeight: '700', color: '#16A34A', marginBottom: 8 },
  subtitle: { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  searchBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E4E7EC', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 8 },
  searchInput: { marginLeft: 8, fontSize: 14, flex: 1 },
  tableHeader: { flexDirection: 'row', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#E4E7EC' },
  th: { flex: 1, fontSize: 12, fontWeight: '700', color: '#16A34A' },
  iconCol: { flex: 0.6 },
  name: { flex: 1.2 },
  valueCol: { flex: 1.2 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  cell: { flex: 1, fontSize: 12, color: '#0f172a' },
  cellIcon: { flex: 0.6, alignItems: 'center' },
  valueWrap: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  valueText: { fontSize: 13, fontWeight: '700' },
  valueNormal: { color: '#16A34A' },
  valueCritical: { color: '#DC2626' },
  valueUnit: { fontSize: 11, color: '#64748b' },
  actions: { flex: 0.8, flexDirection: 'row', justifyContent: 'flex-end' },
  iconBtn: { marginLeft: 10 },
  error: { marginBottom: 8, color: '#DC2626' },
  loading: { paddingVertical: 12, color: '#334155' },
  liveBox: { borderWidth: 1, borderColor: '#E4E7EC', borderRadius: 8, padding: 10 },
  liveRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  liveText: { fontSize: 12, color: '#0f172a' },
  liveId: { color: '#64748b' },
  liveTs: { color: '#64748b' },
  card: { borderWidth: 1, borderColor: '#E4E7EC', borderRadius: 10, padding: 12, marginBottom: 8 },
  cardRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 },
  cardLabel: { fontSize: 12, color: '#64748b' },
  cardValue: { fontSize: 12, color: '#0f172a' },
  modalOverlay: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.2)', alignItems: 'center', justifyContent: 'center' },
  modalCard: { width: '92%', maxWidth: 420, backgroundColor: '#fff', borderRadius: 12, padding: 16 },
  modalTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12 },
  btn: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8 },
  btnSecondary: { borderWidth: 1, borderColor: '#E4E7EC', marginRight: 8 },
  btnSecondaryText: { color: '#334155', fontSize: 13 },
  btnPrimary: { backgroundColor: '#16A34A' },
  btnPrimaryText: { color: '#fff', fontSize: 13 },
  listItem: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  listTitle: { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  listDesc: { fontSize: 12, color: '#64748b' },
  headerBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginLeft: 8 },
});
