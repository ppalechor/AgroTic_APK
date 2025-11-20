import React, { useEffect, useState } from 'react';
import { Modal, View, Text, StyleSheet } from 'react-native';
import Input from '../atoms/Input';
import Button from '../atoms/Button';

export default function InventoryFormModal({ visible, onClose, onSubmit, insumo }) {
  const [values, setValues] = useState({ nombre_insumo: '', codigo: '', fecha_entrada: '', observacion: '' });
  const [error, setError] = useState('');

  useEffect(() => {
    if (insumo) setValues({ nombre_insumo: insumo.nombre_insumo || '', codigo: insumo.codigo || '', fecha_entrada: insumo.fecha_entrada || '', observacion: insumo.observacion || '' });
    else setValues({ nombre_insumo: '', codigo: '', fecha_entrada: '', observacion: '' });
    setError('');
  }, [insumo, visible]);

  const handleSave = async () => {
    const len = (s) => (s || '').trim().length;
    const errs = [];
    if (!len(values.nombre_insumo)) errs.push('nombre_insumo');
    if (!len(values.codigo)) errs.push('codigo');
    if (!len(values.fecha_entrada)) errs.push('fecha_entrada');
    if (!len(values.observacion)) errs.push('observacion');
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
          <Text style={styles.title}>{insumo ? 'Editar Insumo' : 'Nuevo Insumo'}</Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Input label="Nombre" value={values.nombre_insumo} onChangeText={(v) => setValues((p) => ({ ...p, nombre_insumo: v }))} placeholder="Nombre del insumo" />
          <Input label="Código" value={values.codigo} onChangeText={(v) => setValues((p) => ({ ...p, codigo: v }))} placeholder="Código" />
          <Input label="Fecha de entrada (YYYY-MM-DD)" value={values.fecha_entrada} onChangeText={(v) => setValues((p) => ({ ...p, fecha_entrada: v }))} placeholder="YYYY-MM-DD" />
          <Input label="Observación" value={values.observacion} onChangeText={(v) => setValues((p) => ({ ...p, observacion: v }))} placeholder="Observación" />
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
  title: { fontSize: 16, fontWeight: '700', textAlign: 'center', marginBottom: 8, color: '#1E88E5' },
  actions: { flexDirection: 'row', marginTop: 12, justifyContent: 'flex-end' },
  error: { marginTop: 8, fontSize: 12, color: '#DC2626', textAlign: 'center' },
});