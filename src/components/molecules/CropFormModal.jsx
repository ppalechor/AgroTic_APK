import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Modal, ScrollView, ActivityIndicator, Animated, PanResponder, KeyboardAvoidingView, Platform } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Calendar, LocaleConfig } from 'react-native-calendars';

LocaleConfig.locales['es'] = {
  monthNames: ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'],
  monthNamesShort: ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'],
  dayNames: ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'],
  dayNamesShort: ['DOM','LUN','MAR','MIÉ','JUE','VIE','SÁB'],
  today: 'Hoy',
};
LocaleConfig.defaultLocale = 'es';

const statusOptions = [
  { value: 'sembrado', label: 'Sembrado' },
  { value: 'en_crecimiento', label: 'En Crecimiento' },
  { value: 'cosechado', label: 'Cosechado' },
  { value: 'perdido', label: 'Perdido' }
];

const tipoCultivoOptions = [
  { value: 'transitorios', label: 'Transitorios' },
  { value: 'perennes', label: 'Perennes' },
  { value: 'semiperennes', label: 'Semiperennes' }
];

export default function CropFormModal({ visible, onClose, onSubmit, crop, loading, lots = [], insumos = [] }) {
  const [formData, setFormData] = useState({
    nombre_cultivo: '',
    tipo_cultivo: 'transitorios',
    id_lote: '',
    id_insumo: '',
    fecha_siembra: null,
    fecha_cosecha_estimada: null,
    estado_cultivo: 'sembrado',
    observaciones: ''
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateField, setDateField] = useState('');
  const [datePicker, setDatePicker] = useState({ visible: false, type: null, temp: '' });
  const pan = React.useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const panResponder = React.useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        pan.extractOffset();
      },
      onPanResponderMove: Animated.event([
        null,
        { dx: pan.x, dy: pan.y }
      ], { useNativeDriver: false }),
      onPanResponderRelease: () => {
        pan.flattenOffset();
      }
    })
  ).current;

  useEffect(() => {
    if (crop) {
      setFormData({
        nombre_cultivo: crop.nombre_cultivo || '',
        tipo_cultivo: crop.tipo_cultivo || 'transitorios',
        id_lote: crop.id_lote || '',
        id_insumo: crop.id_insumo || '',
        fecha_siembra: crop.fecha_siembra ? new Date(crop.fecha_siembra) : null,
        fecha_cosecha_estimada: crop.fecha_cosecha_estimada ? new Date(crop.fecha_cosecha_estimada) : null,
        estado_cultivo: crop.estado_cultivo || 'sembrado',
        observaciones: crop.observaciones || ''
      });
    } else {
      setFormData({
        nombre_cultivo: '',
        tipo_cultivo: 'transitorios',
        id_lote: '',
        id_insumo: '',
        fecha_siembra: null,
        fecha_cosecha_estimada: null,
        estado_cultivo: 'sembrado',
        observaciones: ''
      });
    }
  }, [crop, visible]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleDateConfirm = () => {
    const iso = datePicker.temp;
    if (!iso) { setDatePicker({ visible: false, type: null, temp: '' }); return; }
    const d = new Date(iso);
    if (datePicker.type === 'siembra') handleChange('fecha_siembra', d);
    if (datePicker.type === 'cosecha') handleChange('fecha_cosecha_estimada', d);
    setDatePicker({ visible: false, type: null, temp: '' });
  };

  useEffect(() => {
    if (datePicker.visible) {
      pan.setValue({ x: 0, y: 0 });
    }
  }, [datePicker.visible]);

  const handleSubmit = async () => {
    const payload = {
      ...formData,
      id_lote: formData.id_lote ? parseInt(formData.id_lote, 10) : null,
      id_insumo: formData.id_insumo ? parseInt(formData.id_insumo, 10) : null,
      fecha_siembra: formData.fecha_siembra ? formData.fecha_siembra.toISOString() : null,
      fecha_cosecha_estimada: formData.fecha_cosecha_estimada ? formData.fecha_cosecha_estimada.toISOString() : null,
    };
    await onSubmit(payload);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.card}>
          <Text style={styles.title}>{crop ? 'Editar Cultivo' : 'Nuevo Cultivo'}</Text>
          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator>
            <TextInput
              style={styles.input}
              placeholder="Nombre del Cultivo"
              value={formData.nombre_cultivo}
              onChangeText={(value) => handleChange('nombre_cultivo', value)}
            />
            {!formData.nombre_cultivo ? (
              <Text style={styles.detailsMuted}>Ingresa el nombre del cultivo.</Text>
            ) : null}
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formData.tipo_cultivo}
                onValueChange={(value) => handleChange('tipo_cultivo', value)}
                style={styles.picker}
              >
                {tipoCultivoOptions.map(option => (
                  <Picker.Item key={option.value} label={option.label} value={option.value} />
                ))}
              </Picker>
            </View>
            <Text style={styles.detailsMuted}>Selecciona el tipo de cultivo.</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={String(formData.id_lote || '')}
                onValueChange={(value) => handleChange('id_lote', String(value))}
                style={styles.picker}
              >
                <Picker.Item label="Seleccionar lote..." value="" />
                {(Array.isArray(lots?.items) ? lots.items : Array.isArray(lots) ? lots : []).map((l) => (
                  <Picker.Item
                    key={String(l.id_lote || l.id)}
                    label={l.nombre_lote || l.nombre || `Lote ${l.id_lote || l.id}`}
                    value={String(l.id_lote || l.id)}
                  />
                ))}
              </Picker>
            </View>
            {!formData.id_lote ? (
              <Text style={styles.detailsMuted}>Selecciona el lote donde se siembra.</Text>
            ) : null}
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={String(formData.id_insumo || '')}
                onValueChange={(value) => handleChange('id_insumo', String(value))}
                style={styles.picker}
              >
                <Picker.Item label="Seleccionar insumo..." value="" />
                {(Array.isArray(insumos?.items) ? insumos.items : Array.isArray(insumos) ? insumos : []).map((i) => (
                  <Picker.Item
                    key={String(i.id_insumo || i.id)}
                    label={i.nombre_insumo || i.nombre || `Insumo ${i.id_insumo || i.id}`}
                    value={String(i.id_insumo || i.id)}
                  />
                ))}
              </Picker>
            </View>
            <Text style={styles.detailsMuted}>Selecciona el insumo principal asociado (opcional).</Text>
            <Pressable style={styles.dateBtn} onPress={() => { setDateField('fecha_siembra'); setDatePicker({ visible: true, type: 'siembra', temp: formData.fecha_siembra ? formData.fecha_siembra.toISOString().slice(0,10) : '' }); }}>
              <Text style={styles.dateText}
              >
                Fecha de Siembra: {formData.fecha_siembra ? formData.fecha_siembra.toLocaleDateString() : 'Seleccionar'}
              </Text>
            </Pressable>
            <Text style={styles.detailsMuted}>Selecciona la fecha de siembra.</Text>
            <Pressable style={styles.dateBtn} onPress={() => { setDateField('fecha_cosecha_estimada'); setDatePicker({ visible: true, type: 'cosecha', temp: formData.fecha_cosecha_estimada ? formData.fecha_cosecha_estimada.toISOString().slice(0,10) : '' }); }}>
              <Text style={styles.dateText}
              >
                Fecha de Cosecha Estimada: {formData.fecha_cosecha_estimada ? formData.fecha_cosecha_estimada.toLocaleDateString() : 'Seleccionar'}
              </Text>
            </Pressable>
            <Text style={styles.detailsMuted}>Selecciona una fecha estimada; puedes actualizarla más adelante.</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formData.estado_cultivo}
                onValueChange={(value) => handleChange('estado_cultivo', value)}
                style={styles.picker}
              >
                {statusOptions.map(option => (
                  <Picker.Item key={option.value} label={option.label} value={option.value} />
                ))}
              </Picker>
            </View>
            <Text style={styles.detailsMuted}>Selecciona el estado actual del cultivo.</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Observaciones"
              value={formData.observaciones}
              onChangeText={(value) => handleChange('observaciones', value)}
              multiline
              numberOfLines={3}
            />
            <Text style={styles.detailsMuted}>Agrega notas y observaciones relevantes del cultivo.</Text>
          </ScrollView>
          <View style={styles.actions}>
            <Pressable style={[styles.btn, styles.btnSecondary]} onPress={onClose}>
              <Text style={styles.btnSecondaryText}>Cancelar</Text>
            </Pressable>
            <Pressable style={[styles.btn, styles.btnPrimary]} onPress={handleSubmit} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnPrimaryText}>{crop ? 'Actualizar' : 'Crear'}</Text>}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
      {datePicker.visible && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setDatePicker({ visible: false, type: null, temp: '' })} statusBarTranslucent presentationStyle="overFullScreen">
          <View style={styles.calendarOverlay}>
            <Animated.View style={[styles.calendarCard, { transform: [{ translateX: pan.x }, { translateY: pan.y }] }]} {...panResponder.panHandlers}>
              <View style={styles.modalHeaderBar}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>{datePicker.type === 'siembra' ? 'Fecha de Siembra' : 'Fecha de Cosecha Estimada'}</Text>
              </View>
              <View style={{ padding: 12 }}>
                <Calendar
                  onDayPress={(d) => setDatePicker((p) => ({ ...p, temp: d.dateString }))}
                  markedDates={datePicker.temp ? { [datePicker.temp]: { selected: true, selectedColor: '#16A34A' } } : undefined}
                  enableSwipeMonths
                  firstDay={1}
                  style={styles.calendar}
                  theme={{
                    textDayFontSize: 12,
                    textMonthFontSize: 14,
                    textDayHeaderFontSize: 10,
                    arrowColor: '#16A34A',
                    monthTextColor: '#0f172a',
                  }}
                />
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, padding: 12 }}>
                <Pressable style={styles.cancelBtn} onPress={() => setDatePicker({ visible: false, type: null, temp: '' })}>
                  <Text style={styles.cancelText}>Cancelar</Text>
                </Pressable>
                <Pressable style={styles.confirmBtn} onPress={handleDateConfirm}>
                  <Text style={styles.confirmText}>Confirmar</Text>
                </Pressable>
              </View>
            </Animated.View>
          </View>
        </Modal>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'stretch', paddingHorizontal: 12, paddingVertical: 20 },
  card: { width: '100%', height: '90%', backgroundColor: '#fff', borderRadius: 12, padding: 16 },
  calendarOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  calendarCard: { width: '92%', maxWidth: 320, maxHeight: 420, backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden', alignSelf: 'center' },
  calendar: { alignSelf: 'center', width: '100%' },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 16, textAlign: 'center' },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: 24 },
  input: { borderWidth: 1, borderColor: '#E4E7EC', borderRadius: 8, padding: 10, marginBottom: 12, fontSize: 14 },
  textArea: { height: 80, textAlignVertical: 'top' },
  pickerContainer: { borderWidth: 1, borderColor: '#E4E7EC', borderRadius: 8, marginBottom: 12 },
  picker: { height: 50 },
  dateBtn: { borderWidth: 1, borderColor: '#E4E7EC', borderRadius: 8, padding: 10, marginBottom: 12, backgroundColor: '#f9f9f9' },
  dateText: { fontSize: 14, color: '#0f172a' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16 },
  btn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, marginLeft: 8 },
  btnSecondary: { borderWidth: 1, borderColor: '#E4E7EC' },
  btnSecondaryText: { color: '#334155', fontSize: 14 },
  btnPrimary: { backgroundColor: '#16A34A' },
  btnPrimaryText: { color: '#fff', fontSize: 14 },
  modalHeaderBar: { backgroundColor: '#23A047', paddingHorizontal: 12, paddingVertical: 10 },
  cancelBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#E4E7EC' },
  cancelText: { color: '#334155', fontWeight: '600' },
  confirmBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: '#16A34A' },
  confirmText: { color: '#fff', fontWeight: '700' },
  detailsMuted: { fontSize: 13, color: '#64748b' },
});
