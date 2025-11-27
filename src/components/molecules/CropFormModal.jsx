import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Modal, ScrollView, ActivityIndicator } from 'react-native';
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

export default function CropFormModal({ visible, onClose, onSubmit, crop, loading }) {
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
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>{crop ? 'Editar Cultivo' : 'Nuevo Cultivo'}</Text>
          <ScrollView style={styles.scroll}>
            <TextInput
              style={styles.input}
              placeholder="Nombre del Cultivo"
              value={formData.nombre_cultivo}
              onChangeText={(value) => handleChange('nombre_cultivo', value)}
            />
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
            <TextInput
              style={styles.input}
              placeholder="ID del Lote"
              value={formData.id_lote}
              onChangeText={(value) => handleChange('id_lote', value)}
              keyboardType="numeric"
            />
            <TextInput
              style={styles.input}
              placeholder="ID del Insumo"
              value={formData.id_insumo}
              onChangeText={(value) => handleChange('id_insumo', value)}
              keyboardType="numeric"
            />
            <Pressable style={styles.dateBtn} onPress={() => { setDateField('fecha_siembra'); setDatePicker({ visible: true, type: 'siembra', temp: formData.fecha_siembra ? formData.fecha_siembra.toISOString().slice(0,10) : '' }); }}>
              <Text style={styles.dateText}>
                Fecha de Siembra: {formData.fecha_siembra ? formData.fecha_siembra.toLocaleDateString() : 'Seleccionar'}
              </Text>
            </Pressable>
            <Pressable style={styles.dateBtn} onPress={() => { setDateField('fecha_cosecha_estimada'); setDatePicker({ visible: true, type: 'cosecha', temp: formData.fecha_cosecha_estimada ? formData.fecha_cosecha_estimada.toISOString().slice(0,10) : '' }); }}>
              <Text style={styles.dateText}>
                Fecha de Cosecha Estimada: {formData.fecha_cosecha_estimada ? formData.fecha_cosecha_estimada.toLocaleDateString() : 'Seleccionar'}
              </Text>
            </Pressable>
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
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Observaciones"
              value={formData.observaciones}
              onChangeText={(value) => handleChange('observaciones', value)}
              multiline
              numberOfLines={3}
            />
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
      </View>
      {datePicker.visible && (
        <View style={styles.overlay}>
          <View style={styles.calendarCard}>
            <View style={styles.modalHeaderBar}>
              <Text style={{ color: '#fff', fontWeight: '700' }}>{datePicker.type === 'siembra' ? 'Fecha de Siembra' : 'Fecha de Cosecha Estimada'}</Text>
            </View>
            <View style={{ padding: 12 }}>
              <Calendar
                onDayPress={(d) => setDatePicker((p) => ({ ...p, temp: d.dateString }))}
                markedDates={datePicker.temp ? { [datePicker.temp]: { selected: true, selectedColor: '#16A34A' } } : undefined}
                enableSwipeMonths
                firstDay={1}
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
          </View>
        </View>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  card: { width: '90%', maxHeight: '80%', backgroundColor: '#fff', borderRadius: 12, padding: 16 },
  calendarCard: { width: '90%', backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden' },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 16, textAlign: 'center' },
  scroll: { flex: 1 },
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
});
