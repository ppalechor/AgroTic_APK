import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, FlatList, Pressable, ScrollView, TextInput } from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { Feather } from '@expo/vector-icons';
import calendarService from '../../services/calendarService';
import { useAuth } from '../../contexts/AuthContext';
// import { Picker } from '@react-native-picker/picker';
import { listCultivos } from '../../services/api';

// Localización del calendario en español y semana iniciando en lunes
LocaleConfig.locales['es'] = {
  monthNames: ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'],
  monthNamesShort: ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'],
  dayNames: ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'],
  dayNamesShort: ['DOM','LUN','MAR','MIÉ','JUE','VIE','SÁB'],
  today: 'Hoy',
};
LocaleConfig.defaultLocale = 'es';

function formatDateISO(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function monthRange(date) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return { start: formatDateISO(start), end: formatDateISO(end) };
}

export default function CalendarPage() {
  const { token } = useAuth();
  const [selectedDay, setSelectedDay] = useState(formatDateISO(new Date()));
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [crops, setCrops] = useState([]);
  const [filters, setFilters] = useState({ id_cultivo: '', fecha_desde: '', fecha_hasta: '' });
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [dayModalVisible, setDayModalVisible] = useState(false);
  const [dayModalEvents, setDayModalEvents] = useState([]);
  const [datePicker, setDatePicker] = useState({ visible: false, type: null, temp: formatDateISO(new Date()) });
  const [cropSelectVisible, setCropSelectVisible] = useState(false);
  const [cropSearch, setCropSearch] = useState('');

  const fetchMonthEvents = async (dateObj) => {
    setLoading(true);
    setError('');
    try {
      const startEnd = (() => {
        if (filters.fecha_desde && filters.fecha_hasta) {
          return { start: filters.fecha_desde, end: filters.fecha_hasta };
        }
        return monthRange(dateObj);
      })();
      const list = await calendarService.getCalendarEvents(startEnd.start, startEnd.end);
      setEvents(list);
    } catch (e) {
      setError(e?.message || 'Error cargando eventos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMonthEvents(currentMonth); }, [currentMonth, filters.fecha_desde, filters.fecha_hasta]);

  useEffect(() => {
    const fetchCrops = async () => {
      try {
        const { items } = await listCultivos(token, { page: 1, limit: 100 });
        setCrops(items || []);
      } catch (e) {
        console.warn('[Calendar] Error obteniendo cultivos', e);
      }
    };
    fetchCrops();
  }, []);

  const filteredEvents = useMemo(() => {
    let list = events || [];
    const cid = String(filters.id_cultivo || '').trim();
    if (cid.length) list = list.filter((ev) => String(ev.id_cultivo || '') === cid);
    return list;
  }, [events, filters.id_cultivo]);

  const filteredCrops = useMemo(() => {
    const q = cropSearch.trim().toLowerCase();
    const list = Array.isArray(crops) ? crops : [];
    if (!q) return list;
    return list.filter(c => {
      const name = String(c.nombre_cultivo || c.displayName || c.tipo_cultivo || '').toLowerCase();
      return name.includes(q);
    });
  }, [crops, cropSearch]);

  const getCropName = (cropId) => {
    const crop = crops.find(c => c.id_cultivo === cropId || c.id === cropId);
    return crop ? (crop.nombre_cultivo || crop.displayName || crop.tipo_cultivo) : null;
  };

  const markedDates = useMemo(() => {
    const marks = {};
    const colors = { actividad: '#2080FE', siembra: '#16A34A', cosecha: '#FFB020' };
    filteredEvents.forEach((ev) => {
      const day = ev.fecha?.slice(0, 10);
      if (!day) return;
      marks[day] = marks[day] || { dots: [] };
      const color = colors[ev.tipo] || '#475569';
      if (!marks[day].dots.find((d) => d.color === color)) {
        marks[day].dots.push({ color });
      }
    });
    if (selectedDay) {
      marks[selectedDay] = { ...(marks[selectedDay] || {}), selected: true, selectedColor: '#16A34A' };
    }
    return marks;
  }, [filteredEvents, selectedDay]);

  const dayEvents = useMemo(() => filteredEvents.filter((ev) => ev.fecha?.slice(0, 10) === selectedDay), [filteredEvents, selectedDay]);

  const onDayPress = (dayObj) => {
    const dayStr = dayObj.dateString;
    setSelectedDay(dayStr);
    const evtsForDay = filteredEvents.filter((ev) => (ev?.fecha || '').slice(0, 10) === dayStr);
    if (evtsForDay.length > 0) {
      setDayModalEvents(evtsForDay);
      setDayModalVisible(true);
    } else {
      setDayModalEvents([]);
      setDayModalVisible(false);
    }
  };

  const onMonthChange = (monthObj) => {
    const d = new Date(monthObj.year, monthObj.month - 1, 1);
    setCurrentMonth(d);
  };

  const renderItem = ({ item }) => (
    <Pressable style={[
      styles.eventRow,
      { borderLeftWidth: 4, borderLeftColor: (item.tipo === 'actividad' ? '#2080FE' : item.tipo === 'siembra' ? '#16A34A' : '#FFB020') }
    ]} onPress={async () => {
      try {
        const details = await calendarService.getEventDetails(item.id);
        setSelectedEvent({ ...item, ...details });
        setDetailVisible(true);
      } catch (e) {
        setSelectedEvent(item);
        setDetailVisible(true);
      }
    }}>
      <View style={styles.eventIcon}>
        {item.tipo === 'actividad' && <Feather name="activity" size={16} color="#2080FE" />}
        {item.tipo === 'siembra' && <Feather name="droplet" size={16} color="#16A34A" />}
        {item.tipo === 'cosecha' && <Feather name="check-circle" size={16} color="#FFB020" />}
      </View>
      <View style={styles.eventBody}>
        <Text style={styles.eventTitle}>{item.titulo}</Text>
        <Text style={styles.eventSubtitle}>{new Date(item.fecha).toLocaleString()}</Text>
        {item.descripcion ? (<Text style={styles.eventDesc}>{item.descripcion}</Text>) : null}
        <View style={[styles.typeBadge, { backgroundColor: (item.tipo === 'actividad' ? '#2080FE' : item.tipo === 'siembra' ? '#16A34A' : '#FFB020') }]}>
          <Text style={styles.typeBadgeText}>{item.tipo}</Text>
        </View>
      </View>
      <View style={styles.eventAction}>
        <Feather name="chevron-right" size={18} color="#334155" />
      </View>
    </Pressable>
  );

  const openDatePicker = (type) => {
    const base = type === 'desde' ? filters.fecha_desde : filters.fecha_hasta;
    setDatePicker({ visible: true, type, temp: base || selectedDay });
  };

  const confirmDatePicker = () => {
    setFilters((prev) => ({
      ...prev,
      fecha_desde: datePicker.type === 'desde' ? datePicker.temp : prev.fecha_desde,
      fecha_hasta: datePicker.type === 'hasta' ? datePicker.temp : prev.fecha_hasta,
    }));
    setDatePicker({ visible: false, type: null, temp: '' });
  };

  return (
    <View style={styles.root}>
      <Text style={styles.title}>Calendario</Text>
      <View style={styles.filtersContainer}>
        <View style={styles.filterGroup}>
          {/* Campo Cultivo con icono (sin flecha) */}
          <View style={styles.fieldWrapper}>
            <Pressable style={styles.selectInput} onPress={() => setCropSelectVisible(true)}>
              <Text style={[styles.inputText, !filters.id_cultivo && styles.placeholder]}>
                {filters.id_cultivo ? (getCropName(filters.id_cultivo) || 'Cultivo') : 'Cultivo'}
              </Text>
            </Pressable>
            <Feather name="tag" size={18} color="#9CA3AF" style={styles.inputIcon} />
          </View>

          {/* Fecha desde con icono */}
          <View style={styles.fieldWrapper}>
            <Pressable style={styles.dateInput} onPress={() => openDatePicker('desde')}>
              <Text style={[styles.inputText, !filters.fecha_desde && styles.placeholder]}> {filters.fecha_desde || 'Fecha desde'} </Text>
            </Pressable>
            <Feather name="calendar" size={18} color="#9CA3AF" style={styles.inputIcon} />
          </View>

          {/* Fecha hasta con icono */}
          <View style={styles.fieldWrapper}>
            <Pressable style={styles.dateInput} onPress={() => openDatePicker('hasta')}>
              <Text style={[styles.inputText, !filters.fecha_hasta && styles.placeholder]}> {filters.fecha_hasta || 'Fecha hasta'} </Text>
            </Pressable>
            <Feather name="calendar" size={18} color="#9CA3AF" style={styles.inputIcon} />
          </View>

          <Pressable style={[styles.pageBtn]} onPress={() => setFilters({ id_cultivo: '', fecha_desde: '', fecha_hasta: '' })}>
            <Text style={styles.pageText}>Limpiar Filtros</Text>
          </Pressable>
        </View>
      </View>

      <Text style={styles.countText}>Mostrando {dayEvents.length} eventos para {selectedDay}</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Calendar
        onDayPress={onDayPress}
        onMonthChange={onMonthChange}
        markedDates={markedDates}
        markingType="multi-dot"
        enableSwipeMonths
        firstDay={1}
      />

      {/* Leyenda de colores */}
      <View style={styles.legendContainer}>
        <View style={styles.legendItem}><View style={[styles.legendDot,{backgroundColor:'#16A34A'}]} /><Text style={styles.legendText}>Siembra</Text></View>
        <View style={styles.legendItem}><View style={[styles.legendDot,{backgroundColor:'#FFB020'}]} /><Text style={styles.legendText}>Cosecha</Text></View>
        <View style={styles.legendItem}><View style={[styles.legendDot,{backgroundColor:'#2080FE'}]} /><Text style={styles.legendText}>Actividades</Text></View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#16A34A" />
      ) : (
        <FlatList
          data={dayEvents}
          keyExtractor={(it) => String(it.id)}
          renderItem={renderItem}
          ListEmptyComponent={<Text style={styles.empty}>Sin eventos para {selectedDay}</Text>}
        />
      )}

      {/* Modal de detalle del evento */}
      {detailVisible && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Feather name="calendar" size={18} color="#fff" />
              <View style={[styles.typePill, selectedEvent?.tipo === 'actividad' ? styles.pillActividad : selectedEvent?.tipo === 'siembra' ? styles.pillSiembra : styles.pillCosecha]}>
                <Text style={styles.pillText}>{selectedEvent?.tipo || 'evento'}</Text>
              </View>
            </View>
            <View style={styles.modalBody}>
              <View style={styles.detailRow}><Text style={styles.detailLabel}>Fecha</Text><Text style={styles.detailValue}>{selectedEvent?.fecha ? new Date(selectedEvent.fecha).toLocaleDateString() : 'N/A'}</Text></View>
              <View style={styles.detailRow}><Text style={styles.detailLabel}>Cultivo</Text><Text style={styles.detailValue}>{getCropName(selectedEvent?.id_cultivo) || selectedEvent?.nombre_cultivo || selectedEvent?.cultivo || 'N/A'}</Text></View>
              <View style={styles.detailRow}><Text style={styles.detailLabel}>Descripción</Text><Text style={styles.detailValue}>{selectedEvent?.descripcion || selectedEvent?.titulo || 'N/A'}</Text></View>
              <View style={styles.detailRow}><Text style={styles.detailLabel}>Estado</Text><Text style={styles.detailValue}>{selectedEvent?.estado || 'N/A'}</Text></View>
              <View style={styles.detailRow}><Text style={styles.detailLabel}>Responsable</Text><Text style={styles.detailValue}>{selectedEvent?.responsable || selectedEvent?.usuario || 'N/A'}</Text></View>
            </View>
            <Pressable style={styles.closeBtn} onPress={() => { setDetailVisible(false); setSelectedEvent(null); }}>
              <Text style={styles.closeText}>Cerrar</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Modal con todas las actividades del día */}
      {dayModalVisible && (
        <View style={styles.modalOverlay}>
          <View style={styles.dayModalContainer}>
            <View style={styles.dayModalHeaderBar}>
              <Feather name="calendar" size={18} color="#fff" />
              <Text style={styles.dayModalHeaderText}>Actividades de {selectedDay}</Text>
            </View>
            <ScrollView style={styles.dayModalScroll} contentContainerStyle={styles.dayModalScrollContent}>
              {dayModalEvents.map((ev) => (
                <View key={String(ev.id)} style={styles.modalCard}>
                  <View style={[styles.modalHeader, { backgroundColor: ev.tipo === 'actividad' ? '#2080FE' : ev.tipo === 'siembra' ? '#16A34A' : '#FFB020' }]}>
                    <Feather name="calendar" size={18} color="#fff" />
                    <View style={[styles.typePill, { backgroundColor: '#fff' }]}> 
                      <Text style={[styles.pillText, { color: ev.tipo === 'actividad' ? '#2080FE' : ev.tipo === 'siembra' ? '#16A34A' : '#FFB020' }]}>{ev.tipo || 'actividad'}</Text>
                    </View>
                  </View>
                  <View style={styles.modalBody}>
                    <View style={styles.detailRow}><Text style={styles.detailLabel}>Fecha</Text><Text style={styles.detailValue}>{new Date(ev.fecha).toLocaleDateString('es-ES')}</Text></View>
                    <View style={styles.detailRow}><Text style={styles.detailLabel}>Cultivo</Text><Text style={styles.detailValue}>{getCropName(ev?.id_cultivo) || ev?.nombre_cultivo || ev?.cultivo || 'N/A'}</Text></View>
                    <View style={styles.detailRow}><Text style={styles.detailLabel}>Descripción</Text><Text style={styles.detailValue}>{ev?.descripcion || ev?.titulo || 'N/A'}</Text></View>
                    <View style={styles.detailRow}><Text style={styles.detailLabel}>Estado</Text><Text style={styles.detailValue}>{ev?.estado || 'N/A'}</Text></View>
                    <View style={styles.detailRow}><Text style={styles.detailLabel}>Responsable</Text><Text style={styles.detailValue}>{ev?.responsable || ev?.usuario || 'N/A'}</Text></View>
                  </View>
                </View>
              ))}
              {dayModalEvents.length === 0 && (
                <Text style={styles.empty}>Sin eventos para {selectedDay}</Text>
              )}
            </ScrollView>
            <Pressable style={styles.closeBtn} onPress={() => { setDayModalVisible(false); setDayModalEvents([]); }}>
              <Text style={styles.closeText}>Cerrar</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Selector de fecha con calendario */}
      {datePicker.visible && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Feather name="calendar" size={18} color="#fff" />
              <Text style={{ color: '#fff', marginLeft: 8, fontWeight: '700' }}>{datePicker.type === 'desde' ? 'Fecha desde' : 'Fecha hasta'}</Text>
            </View>
            <View style={{ padding: 12 }}>
              <Calendar
                onDayPress={(d) => setDatePicker((p) => ({ ...p, temp: d.dateString }))}
                markedDates={{ [datePicker.temp]: { selected: true, selectedColor: '#16A34A' } }}
                enableSwipeMonths
                firstDay={1}
              />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, padding: 12 }}>
              <Pressable style={styles.cancelBtn} onPress={() => setDatePicker({ visible: false, type: null, temp: '' })}>
                <Text style={styles.cancelText}>Cancelar</Text>
              </Pressable>
              <Pressable style={styles.confirmBtn} onPress={confirmDatePicker}>
                <Text style={styles.confirmText}>Confirmar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {/* Selector de cultivo personalizado */}
      {cropSelectVisible && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Feather name="tag" size={18} color="#fff" />
              <Text style={{ color: '#fff', marginLeft: 8, fontWeight: '700' }}>Seleccionar cultivo</Text>
            </View>
            <View style={{ padding: 12 }}>
              <TextInput
                style={styles.dateInput}
                placeholder="Buscar cultivo..."
                placeholderTextColor="#9CA3AF"
                value={cropSearch}
                onChangeText={setCropSearch}
              />
              <ScrollView style={{ maxHeight: 280 }}>
                {filteredCrops.map((crop) => {
                  const id = crop.id_cultivo || crop.id;
                  const name = crop.nombre_cultivo || crop.displayName || crop.tipo_cultivo;
                  const selected = String(filters.id_cultivo || '') === String(id);
                  return (
                    <Pressable key={String(id)} style={styles.optionRow} onPress={() => { setFilters(p => ({ ...p, id_cultivo: id })); setCropSelectVisible(false); }}>
                      <Text style={[styles.optionText, selected && styles.optionSelected]}>{name}</Text>
                      {selected && <Feather name="check" size={18} color="#16A34A" />}
                    </Pressable>
                  );
                })}
                {filteredCrops.length === 0 && (
                  <Text style={styles.empty}>Sin resultados</Text>
                )}
              </ScrollView>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, padding: 12 }}>
              <Pressable style={styles.cancelBtn} onPress={() => setCropSelectVisible(false)}>
                <Text style={styles.cancelText}>Cerrar</Text>
              </Pressable>
              <Pressable style={styles.confirmBtn} onPress={() => setCropSelectVisible(false)}>
                <Text style={styles.confirmText}>Seleccionar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff', padding: 12 },
  title: { fontSize: 18, fontWeight: '700', color: '#16A34A', marginBottom: 8 },
  error: { marginBottom: 8, color: '#DC2626' },
  filtersContainer: { marginBottom: 8 },
  filterGroup: { flexDirection: 'column', alignItems: 'flex-start', gap: 12 },
  fieldWrapper: { position: 'relative', alignSelf: 'stretch' },
  pickerContainer: { borderWidth: 1, borderColor: '#E4E7EC', borderRadius: 8, height: 44, justifyContent: 'center' },
  picker: { width: '100%', height: 44, color: '#0f172a', backgroundColor: '#fff', borderWidth: 0, paddingHorizontal: 12 },
  selectInput: { borderWidth: 1, borderColor: '#E4E7EC', borderRadius: 8, paddingHorizontal: 12, height: 44, alignSelf: 'stretch', justifyContent: 'center', backgroundColor: '#fff' },
  dateInput: { borderWidth: 1, borderColor: '#E4E7EC', borderRadius: 8, paddingHorizontal: 12, height: 44, alignSelf: 'stretch', justifyContent: 'center' },
  inputIcon: { position: 'absolute', right: 12, top: 13 },
  inputText: { color: '#0f172a' },
  placeholder: { color: '#9CA3AF' },
  optionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  optionText: { color: '#0f172a' },
  optionSelected: { fontWeight: '700' },
  countText: { fontSize: 13, color: '#334155', marginBottom: 8 },
  eventRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  eventIcon: { width: 28, alignItems: 'center' },
  eventBody: { flex: 1 },
  eventTitle: { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  eventSubtitle: { fontSize: 12, color: '#334155' },
  eventDesc: { fontSize: 12, color: '#475569', marginTop: 4 },
  eventAction: { paddingHorizontal: 8 },
  typeBadge: { alignSelf: 'flex-start', marginTop: 6, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  typeBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700', textTransform: 'lowercase' },
  pageBtn: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#16A34A', borderRadius: 8, marginLeft: 8 },
  pageText: { color: '#fff', fontSize: 14 },
  empty: { paddingVertical: 16, color: '#334155' },
  legendContainer: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { color: '#334155' },
  modalOverlay: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center' },
  modalCard: { width: '90%', backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden', elevation: 4 },
  modalHeader: { backgroundColor: '#23A047', paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
  typePill: { marginLeft: 8, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  pillActividad: { backgroundColor: '#2080FE' },
  pillSiembra: { backgroundColor: '#16A34A' },
  pillCosecha: { backgroundColor: '#FFB020' },
  pillText: { color: '#fff', fontWeight: '700', textTransform: 'lowercase' },
  modalBody: { paddingHorizontal: 12, paddingVertical: 12, gap: 8 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between' },
  detailLabel: { color: '#334155', fontWeight: '600' },
  detailValue: { color: '#0f172a' },
  closeBtn: { alignSelf: 'flex-end', margin: 12, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#16A34A' },
  closeText: { color: '#16A34A', fontWeight: '600' },
  cancelBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#E4E7EC' },
  cancelText: { color: '#334155', fontWeight: '600' },
  confirmBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: '#16A34A' },
  confirmText: { color: '#fff', fontWeight: '700' },
  dayModalContainer: { width: '100%', height: '100%', backgroundColor: '#fff', borderRadius: 0, overflow: 'hidden' },
  dayModalHeaderBar: { backgroundColor: '#23A047', paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
  dayModalHeaderText: { color: '#fff', fontWeight: '700' },
  dayModalScroll: { flex: 1 },
  dayModalScrollContent: { paddingHorizontal: 12, paddingVertical: 12, gap: 12 },
});
