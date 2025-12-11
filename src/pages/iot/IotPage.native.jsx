import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TextInput, FlatList, Pressable, StyleSheet, Modal, ScrollView, Platform } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useAlert } from '../../contexts/AlertContext';
import sensoresService from '../../services/sensoresService';
import lotService from '../../services/lotService';
import useIotSocket from '../../hooks/useIotSocket';
import { startMqttConnection } from '../../services/iotService';

export default function IotPage() {
  const { token, user, permissionKeys } = useAuth();
  const alert = useAlert();
  const [query, setQuery] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [filterConnection, setFilterConnection] = useState('');
  const [sensors, setSensors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [liveDevices, setLiveDevices] = useState({});
  const [prevLiveValues, setPrevLiveValues] = useState({});
  const [lastSavedAt, setLastSavedAt] = useState({});
  const [sensorHistory, setSensorHistory] = useState({});
  const [lastPollAt, setLastPollAt] = useState(0);
  const [lots, setLots] = useState([]);
  const [assignOpen, setAssignOpen] = useState(false);
  const [sensorToAssign, setSensorToAssign] = useState(null);
  const [selectedLotId, setSelectedLotId] = useState(null);
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
  const { connected: socketConnected, latestReading, bulkReadings, sensorStatus, brokersStatus } = useIotSocket();
  const mqttRef = useRef(null);
  const convertSoilAdcToPercent = (adc, minAdc = 0, maxAdc = 4095) => {
    const a = Number(adc);
    const mn = Number(minAdc);
    const mx = Number(maxAdc);
    if (!Number.isFinite(a) || !Number.isFinite(mn) || !Number.isFinite(mx) || mx <= mn) return NaN;
    const clamped = Math.min(Math.max(a, mn), mx);
    const pct = ((mx - clamped) / (mx - mn)) * 100;
    return Number.isFinite(pct) ? Math.round(pct * 10) / 10 : NaN;
  };
  const valueFromReading = (reading, tipo) => {
    if (!reading || typeof reading !== 'object' || Array.isArray(reading)) return undefined;
    const t = String(tipo || '').toLowerCase();
    if (t.includes('temperatura')) {
      const v = reading.temperatura ?? reading.temp ?? reading.temperature;
      return Number(v);
    }
    if (t.includes('humedad') && t.includes('aire')) {
      const v = reading.humedad_aire ?? reading.humidity;
      return Number(v);
    }
    if (t.includes('humedad') && t.includes('suelo')) {
      const pct = reading.humedad_suelo ?? reading.soil_moisture;
      const adc = reading.humedad_suelo_adc ?? reading.soil_moisture_adc;
      if (pct !== undefined) return Number(pct);
      if (adc !== undefined) return convertSoilAdcToPercent(adc);
      return undefined;
    }
    const key = t.replace(/\s+/g, '_');
    const v = reading[key];
    return v !== undefined ? Number(v) : undefined;
  };

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
    let stopped = false;
    const onMessage = (msg) => {
      if (stopped) return;
      const data = msg?.data;
      if (!data || typeof data !== 'object' || Array.isArray(data)) return;
      if (!Array.isArray(sensors) || sensors.length === 0) return;
      const now = new Date();
      const next = {};
      sensors.forEach((s) => {
        const num = valueFromReading(data, s.tipo_sensor);
        if (Number.isFinite(num)) {
          next[String(s.id)] = { valor_actual: num, unidad: s.unidad_medida || '', ts: now };
        }
      });
      if (Object.keys(next).length) {
        setLiveDevices((prev) => ({ ...prev, ...next }));
        setSensorHistory((prev) => {
          const hist = { ...prev };
          Object.entries(next).forEach(([sid, info]) => {
            const arr = Array.isArray(hist[sid]) ? hist[sid].slice() : [];
            const v = Number(info.valor_actual);
            if (Number.isFinite(v)) {
              arr.push(v);
              while (arr.length > 50) arr.shift();
              hist[sid] = arr;
            }
          });
          return hist;
        });
      }
    };
    const start = async () => {
      if (!token) return;
      const conn = await startMqttConnection(onMessage, token);
      mqttRef.current = conn;
    };
    start();
    return () => {
      stopped = true;
      try { mqttRef.current?.disconnect?.(); } catch {}
      mqttRef.current = null;
    };
  }, [token, sensors]);

  useEffect(() => {
    let active = true;
    let id = null;
    const poll = async () => {
      try {
        const data = await sensoresService.getTiempoReal(token);
        if (!active) return;
        const nowTs = Date.now();
        setLastPollAt(nowTs);
        const map = {};
        (Array.isArray(data) ? data : []).forEach((s) => {
          const idKey = String(s?.id_sensor ?? s?.id);
          map[idKey] = {
            valor_actual: s?.valor_actual != null ? Number(s?.valor_actual) : null,
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
              while (arr.length > 50) arr.shift();
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
          } catch (e) {}
        });
      } catch (e) {
      }
    };
    poll();
    id = setInterval(poll, 5000);
    return () => { active = false; if (id) clearInterval(id); };
  }, [token]);

  useEffect(() => {
    if (!latestReading || typeof latestReading !== 'object' || Array.isArray(latestReading)) return;
    if (!Array.isArray(sensors) || sensors.length === 0) return;
    const now = new Date();
    const next = {};
    sensors.forEach((s) => {
      const num = valueFromReading(latestReading, s.tipo_sensor);
      if (Number.isFinite(num)) {
        next[String(s.id)] = { valor_actual: num, unidad: s.unidad_medida || '', ts: now };
      }
    });
    if (Object.keys(next).length) {
      setLiveDevices((prev) => ({ ...prev, ...next }));
      setSensorHistory((prev) => {
        const hist = { ...prev };
        Object.entries(next).forEach(([sid, info]) => {
          const arr = Array.isArray(hist[sid]) ? hist[sid].slice() : [];
          const v = Number(info.valor_actual);
          if (Number.isFinite(v)) {
            arr.push(v);
            while (arr.length > 50) arr.shift();
            hist[sid] = arr;
          }
        });
        return hist;
      });
    }
  }, [latestReading, sensors]);

  useEffect(() => {
    try {
      if (!Array.isArray(bulkReadings) || bulkReadings.length === 0) return;
      if (!Array.isArray(sensors) || sensors.length === 0) return;
      const readings = bulkReadings.slice(-200).filter((r) => r && typeof r === 'object' && !Array.isArray(r));
      const now = new Date();
      const next = {};
      sensors.forEach((s) => {
        const vals = readings
          .map((r) => valueFromReading(r, s.tipo_sensor))
          .filter((v) => Number.isFinite(v));
        if (vals.length) {
          next[String(s.id)] = { valor_actual: vals[vals.length - 1], unidad: s.unidad_medida || '', ts: now };
        }
      });
      if (Object.keys(next).length) {
        setLiveDevices((prev) => ({ ...prev, ...next }));
        setSensorHistory((prev) => {
          const hist = { ...prev };
          sensors.forEach((s) => {
            const sid = String(s.id);
            const vals = readings
              .map((r) => valueFromReading(r, s.tipo_sensor))
              .filter((v) => Number.isFinite(v));
            if (vals.length) {
              const arr = Array.isArray(hist[sid]) ? hist[sid].slice() : [];
              vals.forEach((v) => { arr.push(v); while (arr.length > 50) arr.shift(); });
              hist[sid] = arr;
            }
          });
          return hist;
        });
      }
    } catch (e) {}
  }, [bulkReadings, sensors]);

  const permSet = useMemo(() => new Set((permissionKeys || []).map(k => String(k).toLowerCase())), [permissionKeys]);
  const isAdmin = useMemo(() => String(user?.id_rol?.nombre_rol || user?.nombre_rol || user?.rol || '').toLowerCase() === 'administrador', [user]);
  const canEdit = isAdmin || permSet.has('sensores:*') || permSet.has('sensores:editar');
  const canDelete = isAdmin || permSet.has('sensores:*') || permSet.has('sensores:eliminar');

  const availableTypes = useMemo(() => {
    const set = new Set((Array.isArray(sensors) ? sensors : []).map(s => String(s.tipo_sensor || '').trim()).filter(Boolean));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [sensors]);

  const availableEstados = useMemo(() => {
    const set = new Set((Array.isArray(sensors) ? sensors : []).map(s => String(s.estado || '').trim()).filter(Boolean));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [sensors]);

  const filtered = useMemo(() => {
    let arr = Array.isArray(sensors) ? sensors : [];
    if (filterType) arr = arr.filter(s => String(s.tipo_sensor || '').toLowerCase() === String(filterType).toLowerCase());
    if (filterEstado) arr = arr.filter(s => String(s.estado || '').toLowerCase() === String(filterEstado).toLowerCase());
    if (filterConnection) {
      arr = arr.filter((s) => {
        const sid = String(s.id);
        const live = liveDevices[sid];
        const t = live?.ts;
        const ts = t && typeof t.getTime === 'function' ? t.getTime() : (t ? new Date(t).getTime() : 0);
        const isConnected = ts && (Date.now() - ts) < 15000;
        return filterConnection === 'connected' ? isConnected : !isConnected;
      });
    }
    if (query) {
      const q = query.toLowerCase();
      arr = arr.filter(s => String(s.tipo_sensor || '').toLowerCase().includes(q) || String(s.estado || '').toLowerCase().includes(q));
    }
    return arr;
  }, [query, sensors, filterType, filterEstado, filterConnection, liveDevices]);

  const WebChart = ({ hist, color, min, max, unit }) => {
    return null;
  };

  const connected = useMemo(() => {
    return socketConnected || (Date.now() - lastPollAt < 12000);
  }, [socketConnected, lastPollAt]);

  const renderItem = ({ item }) => {
    const live = liveDevices[String(item.id)];
    const rawValue = live?.valor_actual ?? item.valor_actual ?? null;
    const unit = live?.unidad ?? item.unidad_medida ?? '';
    const nVal = Number(rawValue);
    const nMin = Number(item.valor_minimo);
    const nMax = Number(item.valor_maximo);
    const hasVal = Number.isFinite(nVal) && Number.isFinite(nMin) && Number.isFinite(nMax);
    const status = hasVal && nVal >= nMin && nVal <= nMax ? 'normal' : 'critical';
    const icon = item.tipo_sensor?.toLowerCase().includes('temperatura') ? 'thermometer' : item.tipo_sensor?.toLowerCase().includes('humedad') ? 'droplet' : 'cpu';
    return (
      <View style={styles.card}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
          <Feather name={icon} size={18} color="#16A34A" />
          <Text style={{ marginLeft: 6, fontSize: 13, fontWeight: '700', color: '#0f172a' }}>{item.tipo_sensor}</Text>
        </View>
        <View style={styles.cardRow}><Text style={styles.cardLabel}>Estado</Text><Text style={styles.cardValue}>{item.estado}</Text></View>
        <View style={styles.cardRow}><Text style={styles.cardLabel}>Rango</Text><Text style={styles.cardValue}>{item.valor_minimo} - {item.valor_maximo}</Text></View>
        <View style={styles.cardRow}>
          <Text style={styles.cardLabel}>Valor</Text>
          <Text style={[styles.cardValue, status === 'critical' ? styles.valueCritical : styles.valueNormal]}>{Number.isFinite(nVal) ? nVal.toFixed(1) : '—'} <Text style={styles.valueUnit}>{unit || ''}</Text></Text>
        </View>
        <View style={styles.cardRow}><Text style={styles.cardLabel}>Lote</Text><Text style={styles.cardValue}>{item.nombre_lote || '—'}</Text></View>
        <View style={[styles.cardRow, { justifyContent: 'flex-end' }] }>
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
        <Text style={styles.title}>Dashboard IoT</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={[styles.statusBadge, { backgroundColor: connected ? '#16A34A' : '#DC2626' }]}>
            <Text style={styles.statusText}>{connected ? 'Conectado' : 'Desconectado'}</Text>
          </View>
          <View style={[styles.statusBadge, { marginLeft: 8, backgroundColor: Object.values(brokersStatus || {}).some(Boolean) ? '#16A34A' : '#DC2626' }]}>
            <Text style={styles.statusText}>Broker {Object.values(brokersStatus || {}).some(Boolean) ? 'OK' : 'Off'}</Text>
          </View>
          <Pressable style={[styles.btn, { marginLeft: 8 }]} onPress={async () => {
            try {
              const current = await sensoresService.getBrokerSettings();
              setBrokerUrl(current.brokerUrl || '');
              setBrokerTopics((current.topics || []).join(', '));
              setOpenBroker(true);
            } catch {}
          }}><Text style={styles.btnSecondaryText}>Broker</Text></Pressable>
          <Pressable style={[styles.btn, styles.btnPrimary, { marginLeft: 8 }]} onPress={() => setOpenForm(true)}><Text style={styles.btnPrimaryText}>Nuevo Sensor</Text></Pressable>
        </View>
      </View>

      {sensors.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Resumen</Text>
          <View style={styles.sectionContent}>
            {filtered.map((sensor) => {
              const sid = String(sensor.id);
              const live = liveDevices[sid];
              const value = live?.valor_actual ?? sensor.valor_actual ?? null;
              const unit = live?.unidad ?? sensor.unidad_medida ?? '';
              const statusOk = value != null && value >= sensor.valor_minimo && value <= sensor.valor_maximo;
              const icon = sensor.tipo_sensor?.toLowerCase().includes('temperatura') ? 'thermometer' : sensor.tipo_sensor?.toLowerCase().includes('humedad') ? 'droplet' : 'cpu';
              const reportedOnline = sensorStatus ? !!sensorStatus[sid] : null;
              const inferredOnline = !!live && (() => { const t = live.ts; const ts = t && typeof t.getTime === 'function' ? t.getTime() : (t ? new Date(t).getTime() : 0); return (Date.now() - ts) < 15000; })();
              const isSensorConnected = reportedOnline != null ? reportedOnline : inferredOnline;
              return (
                <View key={sensor.id} style={[styles.card, { width: '100%' }] }>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                    <Feather name={icon} size={16} color="#16A34A" />
                    <Text style={{ marginLeft: 6, fontSize: 12, color: '#0f172a', fontWeight: '600' }}>{sensor.tipo_sensor} {sensor.ubicacion ? sensor.ubicacion : ''}</Text>
                  </View>
                  <View style={styles.cardRow}>
                    <Text style={styles.cardLabel}>Valor actual</Text>
                    <Text style={[styles.cardValue, statusOk ? styles.valueNormal : styles.valueCritical]}>{value != null ? Number(value).toFixed(1) : '—'} <Text style={styles.valueUnit}>{unit}</Text></Text>
                  </View>
                  <View style={styles.cardRow}><Text style={styles.cardLabel}>Conexión</Text><Text style={[styles.cardValue, isSensorConnected ? styles.valueNormal : styles.valueCritical]}>{isSensorConnected ? 'Conectado' : 'Sin datos recientes'}</Text></View>
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
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Historial</Text>
          <View style={styles.sectionContent}>
            {filtered.map((sensor, idx) => {
              const color = ['#16A34A', '#0ea5e9', '#ef4444', '#9c27b0'][idx] || '#16A34A';
              const hist = sensorHistory[String(sensor.id)] || [];
              const min = Math.min(Number(sensor.valor_minimo), ...hist.map((v) => Number(v)));
              const max = Math.max(Number(sensor.valor_maximo), ...hist.map((v) => Number(v)));
              const range = Math.max(1, (max - min) || 1);
              const icon = sensor.tipo_sensor?.toLowerCase().includes('temperatura') ? 'thermometer' : sensor.tipo_sensor?.toLowerCase().includes('humedad') ? 'droplet' : 'cpu';
              const unit = sensor.unidad_medida || '';
              const trend = (() => {
                if (hist.length < 2) return null;
                const a = Number(hist[hist.length - 2]);
                const b = Number(hist[hist.length - 1]);
                if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
                if (b > a) return 'Subiendo';
                if (b < a) return 'Bajando';
                return 'Estable';
              })();
              return (
                <View key={sensor.id} style={[styles.card, { width: '100%' }] }>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                    <Feather name={icon} size={16} color={color} />
                    <Text style={{ marginLeft: 6, fontSize: 12, color: '#0f172a', fontWeight: '600' }}>{sensor.tipo_sensor} {sensor.ubicacion ? sensor.ubicacion : ''}</Text>
                  </View>
                  {Platform.OS === 'web' && hist.length > 0 ? (
                    <WebChart hist={hist} color={color} min={sensor.valor_minimo} max={sensor.valor_maximo} unit={unit} />
                  ) : (
                    <View style={{ height: 140 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 120 }}>
                        {hist.length === 0 ? (
                          <Text style={{ color: '#64748b' }}>Sin datos</Text>
                        ) : (
                          hist.map((v, i) => {
                            const h = Math.max(6, Math.round(((Number(v) - min) / range) * 100));
                            return <View key={i} style={{ width: 8, height: h, backgroundColor: color, marginRight: 4, borderRadius: 2 }} />
                          })
                        )}
                      </View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
                        <Text style={{ fontSize: 11, color: '#64748b' }}>Rango {sensor.valor_minimo}–{sensor.valor_maximo} {unit}</Text>
                        <Text style={{ fontSize: 11, color: '#64748b' }}>{trend ? `Tendencia: ${trend}` : ''}</Text>
                      </View>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </View>
      ) : null}

      <View style={styles.filtersContainer}>
        <View style={styles.searchBox}>
          <Feather name="search" size={16} color="#64748b" />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por tipo o estado..."
            value={query}
            onChangeText={setQuery}
          />
        </View>
        <View style={styles.searchBox}>
          <Feather name="filter" size={16} color="#64748b" />
          <Picker selectedValue={filterType} onValueChange={setFilterType} style={styles.picker}>
            <Picker.Item label="Todos" value="" />
            {availableTypes.map((t) => (
              <Picker.Item key={t} label={t} value={t} />
            ))}
          </Picker>
        </View>
        <View style={styles.searchBox}>
          <Feather name="toggle-left" size={16} color="#64748b" />
          <Picker selectedValue={filterEstado} onValueChange={setFilterEstado} style={styles.picker}>
            <Picker.Item label="Estado: Todos" value="" />
            {availableEstados.map((t) => (
              <Picker.Item key={t} label={t} value={t} />
            ))}
          </Picker>
        </View>
        <View style={styles.searchBox}>
          <Feather name="wifi" size={16} color="#64748b" />
          <Picker selectedValue={filterConnection} onValueChange={setFilterConnection} style={styles.picker}>
            <Picker.Item label="Conexión: Todos" value="" />
            <Picker.Item label="Conectado" value="connected" />
            <Picker.Item label="Sin datos recientes" value="disconnected" />
          </Picker>
        </View>
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

      <Text style={[styles.subtitle, { marginTop: 16 }]}>Tiempo real</Text>
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
  title: { fontSize: 18, fontWeight: '700', color: '#1976d2', marginBottom: 8 },
  subtitle: { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  statusText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  searchBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E4E7EC', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 8 },
  searchInput: { marginLeft: 8, fontSize: 14, flex: 1 },
  picker: { flex: 1, height: 40, marginLeft: 8 },
  valueNormal: { color: '#16A34A' },
  valueCritical: { color: '#DC2626' },
  valueUnit: { fontSize: 11, color: '#64748b' },
  error: { marginBottom: 8, color: '#DC2626' },
  loading: { paddingVertical: 12, color: '#334155' },
  liveBox: { borderWidth: 1, borderColor: '#E4E7EC', borderRadius: 8, padding: 12, backgroundColor: '#F9FAFB' },
  liveRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  liveText: { fontSize: 12, color: '#0f172a' },
  liveId: { color: '#64748b' },
  liveTs: { color: '#64748b' },
  card: { borderWidth: 1, borderColor: '#E4E7EC', borderRadius: 12, padding: 12, marginBottom: 10, backgroundColor: '#fff' },
  cardRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 },
  cardLabel: { fontSize: 12, color: '#64748b' },
  cardValue: { fontSize: 12, color: '#0f172a' },
  section: { marginBottom: 12, borderWidth: 1, borderColor: '#E4E7EC', borderRadius: 10, backgroundColor: '#fff', overflow: 'hidden' },
  sectionHeader: { fontSize: 14, fontWeight: '700', color: '#0f172a', paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#F9FAFB' },
  sectionContent: { padding: 12 },
  filtersContainer: { marginBottom: 8 },
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
})

