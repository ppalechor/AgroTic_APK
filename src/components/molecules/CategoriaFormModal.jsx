import React, { useEffect, useState } from 'react';
import { Modal, View, Text, StyleSheet } from 'react-native';
import Input from '../atoms/Input';
import Button from '../atoms/Button';

export default function CategoriaFormModal({ visible, onClose, onSubmit, categoria }) {
  const [values, setValues] = useState({ nombre: '', descripcion: '' });
  const [error, setError] = useState('');

  useEffect(() => {
    if (categoria) setValues({ nombre: categoria.nombre || '', descripcion: categoria.descripcion || '' });
    else setValues({ nombre: '', descripcion: '' });
    setError('');
  }, [categoria, visible]);

  const handleSave = async () => {
    const len = (s) => (s || '').trim().length;
    const errs = [];
    if (!len(values.nombre)) errs.push('nombre');
    if (!len(values.descripcion)) errs.push('descripcion');
    if (errs.length) { setError('Completa todos los campos'); return; }
    try {
      await onSubmit(values);
      onClose();
    } catch (e) {
      setError(e?.message || 'Error guardando');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>{categoria ? 'Editar Categoría' : 'Nueva Categoría'}</Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Input label="Nombre" value={values.nombre} onChangeText={(v) => setValues((p) => ({ ...p, nombre: v }))} placeholder="Nombre de la categoría" />
          <Input label="Descripción" value={values.descripcion} onChangeText={(v) => setValues((p) => ({ ...p, descripcion: v }))} placeholder="Descripción" />
          <View style={styles.actions}>
            <Button title="Cancelar" variant="secondary" onPress={onClose} />
            <View style={{ width: 12 }} />
            <Button title="Guardar" onPress={handleSave} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', alignItems: 'center', justifyContent: 'center' },
  card: { width: '90%', maxWidth: 420, backgroundColor: '#fff', borderRadius: 12, padding: 16 },
  title: { fontSize: 16, fontWeight: '700', textAlign: 'center', marginBottom: 8, color: '#16A34A' },
  actions: { flexDirection: 'row', marginTop: 12, justifyContent: 'flex-end' },
  error: { marginTop: 8, fontSize: 12, color: '#DC2626', textAlign: 'center' },
});