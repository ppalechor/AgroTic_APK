import React, { useEffect, useState } from 'react';
import { Modal, View, Text, StyleSheet } from 'react-native';
import Input from '../atoms/Input';
import Button from '../atoms/Button';

export default function AlmacenFormModal({ visible, onClose, onSubmit, almacen }) {
  const [values, setValues] = useState({ nombre_almacen: '', descripcion: '' });
  const [error, setError] = useState('');

  useEffect(() => {
    if (almacen) setValues({ nombre_almacen: almacen.nombre_almacen || almacen.nombre || '', descripcion: almacen.descripcion || '' });
    else setValues({ nombre_almacen: '', descripcion: '' });
    setError('');
  }, [almacen, visible]);

  const handleSave = async () => {
    const len = (s) => (s || '').trim().length;
    const errs = [];
    if (!len(values.nombre_almacen)) errs.push('nombre');
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
          <Text style={styles.title}>{almacen ? 'Editar Almacén' : 'Nuevo Almacén'}</Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Input label="Nombre" value={values.nombre_almacen} onChangeText={(v) => setValues((p) => ({ ...p, nombre_almacen: v }))} placeholder="Nombre del almacén" />
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