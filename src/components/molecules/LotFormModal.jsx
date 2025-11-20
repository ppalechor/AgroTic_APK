import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Modal, ScrollView, ActivityIndicator, Switch } from 'react-native';

export default function LotFormModal({ visible, onClose, onSubmit, lot, loading }) {
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    activo: true
  });
  const [errors, setErrors] = useState({ nombre: '', descripcion: '' });

  useEffect(() => {
    if (lot) {
      setFormData({
        nombre: lot.nombre || '',
        descripcion: lot.descripcion || '',
        activo: lot.activo !== undefined ? lot.activo : true
      });
    } else {
      setFormData({
        nombre: '',
        descripcion: '',
        activo: true
      });
    }
  }, [lot, visible]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const handleSubmit = async () => {
    const nombre = String(formData.nombre || '').trim();
    const descripcion = String(formData.descripcion || '').trim();
    const newErrors = { nombre: '', descripcion: '' };
    if (nombre.length < 1) newErrors.nombre = 'El nombre es requerido';
    if (descripcion.length < 1) newErrors.descripcion = 'La descripción es requerida';
    setErrors(newErrors);
    if (newErrors.nombre || newErrors.descripcion) return;

    const payload = {
      nombre_lote: nombre,
      descripcion: descripcion,
      activo: !!formData.activo
    };
    await onSubmit(payload);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>{lot ? 'Editar Lote' : 'Nuevo Lote'}</Text>
          <ScrollView style={styles.scroll}>
            <TextInput
              style={styles.input}
              placeholder="Nombre del Lote"
              value={formData.nombre}
              onChangeText={(value) => handleChange('nombre', value)}
            />
            {Boolean(errors.nombre) && (<Text style={styles.errorText}>{errors.nombre}</Text>)}
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Descripción"
              value={formData.descripcion}
              onChangeText={(value) => handleChange('descripcion', value)}
              multiline
              numberOfLines={3}
            />
            {Boolean(errors.descripcion) && (<Text style={styles.errorText}>{errors.descripcion}</Text>)}
            <View style={styles.switchContainer}>
              <Text style={styles.switchLabel}>Activo</Text>
              <Switch
                value={formData.activo}
                onValueChange={(value) => handleChange('activo', value)}
              />
            </View>
          </ScrollView>
          <View style={styles.actions}>
            <Pressable style={[styles.btn, styles.btnSecondary]} onPress={onClose}>
              <Text style={styles.btnSecondaryText}>Cancelar</Text>
            </Pressable>
            <Pressable style={[styles.btn, styles.btnPrimary, (!String(formData.nombre||'').trim() || !String(formData.descripcion||'').trim()) && styles.btnDisabled]} onPress={handleSubmit} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnPrimaryText}>{lot ? 'Actualizar' : 'Crear'}</Text>}
            </Pressable>
          </View>
        </View>
      </View>
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
  switchContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  switchLabel: { fontSize: 14, color: '#0f172a' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16 },
  btn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, marginLeft: 8 },
  btnSecondary: { borderWidth: 1, borderColor: '#E4E7EC' },
  btnSecondaryText: { color: '#334155', fontSize: 14 },
  btnPrimary: { backgroundColor: '#16A34A' },
  btnPrimaryText: { color: '#fff', fontSize: 14 },
  btnDisabled: { opacity: 0.6 },
  errorText: { color: '#DC2626', fontSize: 12, marginTop: -8, marginBottom: 8 },
});
