import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Modal, ScrollView, ActivityIndicator, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '../../contexts/AuthContext';
import { listActividadFotos, deleteActividadFoto } from '../../services/api';

const activityTypes = [
  { value: 'siembra', label: 'Siembra' },
  { value: 'riego', label: 'Riego' },
  { value: 'fertilizacion', label: 'Fertilización' },
  { value: 'poda', label: 'Poda' },
  { value: 'cosecha', label: 'Cosecha' },
  { value: 'otro', label: 'Otro' }
];

const statusOptions = [
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'en_progreso', label: 'En Progreso' },
  { value: 'completada', label: 'Completada' },
  { value: 'cancelada', label: 'Cancelada' }
];

export default function ActivityFormModal({ visible, onClose, onSubmit, activity, crops = [], loading }) {
  const { token } = useAuth();
  const [formData, setFormData] = useState({
    tipo_actividad: '',
    fecha: null,
    responsable: '',
    detalles: '',
    estado: 'pendiente',
    id_cultivo: ''
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [photoError, setPhotoError] = useState('');

  useEffect(() => {
    if (activity) {
      setFormData({
        tipo_actividad: activity.tipo_actividad || '',
        fecha: activity.fecha ? new Date(activity.fecha) : new Date(),
        responsable: activity.responsable || '',
        detalles: activity.detalles || '',
        estado: activity.estado || 'pendiente',
        id_cultivo: activity.id_cultivo || ''
      });
      (async () => {
        try {
          setPhotoError('');
          const id = activity.id_actividad || activity.id;
          if (id) {
            const arr = await listActividadFotos(id, token);
            setPhotos(arr.map((f) => ({ id: f.id, uri: f.url_imagen })));
          } else {
            setPhotos([]);
          }
        } catch (e) {
          setPhotos([]);
        }
      })();
    } else {
      setFormData({
        tipo_actividad: '',
        fecha: new Date(),
        responsable: '',
        detalles: '',
        estado: 'pendiente',
        id_cultivo: ''
      });
      setPhotos([]);
    }
  }, [activity, visible]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      handleChange('fecha', selectedDate);
    }
  };

  const handleSubmit = async () => {
    const payload = {
      ...formData,
      fecha: formData.fecha ? formData.fecha.toISOString() : null,
      id_cultivo: formData.id_cultivo ? parseInt(formData.id_cultivo, 10) : null,
    };
    await onSubmit(payload);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>{activity ? 'Editar Actividad' : 'Nueva Actividad'}</Text>
          <ScrollView style={styles.scroll}>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formData.tipo_actividad}
                onValueChange={(value) => handleChange('tipo_actividad', value)}
                style={styles.picker}
              >
                <Picker.Item label="Seleccionar tipo..." value="" />
                {activityTypes.map(option => (
                  <Picker.Item key={option.value} label={option.label} value={option.value} />
                ))}
              </Picker>
            </View>

            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formData.id_cultivo}
                onValueChange={(value) => handleChange('id_cultivo', value)}
                style={styles.picker}
              >
                <Picker.Item label="Seleccionar cultivo..." value="" />
                {crops.map(crop => (
                  <Picker.Item key={crop.id_cultivo || crop.id} label={crop.nombre_cultivo || crop.displayName || crop.tipo_cultivo} value={crop.id_cultivo || crop.id} />
                ))}
              </Picker>
            </View>

            <Pressable style={styles.dateBtn} onPress={() => setShowDatePicker(true)}>
              <Text style={styles.dateText}>
                Fecha: {formData.fecha ? formData.fecha.toLocaleDateString() : 'Seleccionar'}
              </Text>
            </Pressable>

            <TextInput
              style={styles.input}
              placeholder="Responsable"
              value={formData.responsable}
              onChangeText={(value) => handleChange('responsable', value)}
            />

            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formData.estado}
                onValueChange={(value) => handleChange('estado', value)}
                style={styles.picker}
              >
                {statusOptions.map(option => (
                  <Picker.Item key={option.value} label={option.label} value={option.value} />
                ))}
              </Picker>
            </View>

            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Detalles"
              value={formData.detalles}
              onChangeText={(value) => handleChange('detalles', value)}
              multiline
              numberOfLines={3}
            />
            {activity ? (
              <>
                <Text style={styles.sectionTitle}>Imágenes</Text>
                {Array.isArray(photos) && photos.length > 0 ? (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                    {photos.map((p, idx) => (
                      <View key={idx} style={styles.photoWrap}>
                        <Image source={{ uri: p.uri }} style={styles.photoImg} />
                        {p.id ? (
                          <Pressable
                            style={styles.photoDel}
                            onPress={async () => {
                              try {
                                const id = activity?.id_actividad || activity?.id;
                                await deleteActividadFoto(p.id, token);
                                const arr = await listActividadFotos(id, token);
                                setPhotos(arr.map((f) => ({ id: f.id, uri: f.url_imagen })));
                              } catch (e) {
                                setPhotoError(e?.message || 'No se pudo eliminar la foto');
                              }
                            }}
                          >
                            <Feather name="trash-2" size={14} color="#fff" />
                          </Pressable>
                        ) : null}
                      </View>
                    ))}
                  </ScrollView>
                ) : (
                  <Text style={styles.detailsMuted}>No hay fotos para esta actividad.</Text>
                )}
                {photoError ? <Text style={[styles.detailsMuted, { color: '#d32f2f' }]}>{photoError}</Text> : null}
              </>
            ) : null}
          </ScrollView>
          <View style={styles.actions}>
            <Pressable style={[styles.btn, styles.btnSecondary]} onPress={onClose}>
              <Text style={styles.btnSecondaryText}>Cancelar</Text>
            </Pressable>
            <Pressable style={[styles.btn, styles.btnPrimary]} onPress={handleSubmit} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnPrimaryText}>{activity ? 'Actualizar' : 'Crear'}</Text>}
            </Pressable>
          </View>
        </View>
      </View>
      {showDatePicker && (
        <DateTimePicker
          value={formData.fecha || new Date()}
          mode="date"
          display="default"
          onChange={handleDateChange}
        />
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  card: { width: '90%', maxHeight: '80%', backgroundColor: '#fff', borderRadius: 12, padding: 16 },
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
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginTop: 8 },
  detailsMuted: { fontSize: 13, color: '#64748b' },
  photoWrap: { width: 96, height: 96, borderRadius: 8, marginRight: 8, borderWidth: 1, borderColor: '#E5E7EB', overflow: 'hidden' },
  photoImg: { width: '100%', height: '100%' },
  photoDel: { position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 10, padding: 4 },
});
