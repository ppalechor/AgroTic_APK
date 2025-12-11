import React, { useEffect, useState } from 'react';
import { Modal, View, Text, StyleSheet } from 'react-native';
import Button from '../atoms/Button';
import Input from '../atoms/Input';

export default function InventoryItemModal({ visible, onClose, item, editable = false, onSave }) {
  const [values, setValues] = useState({ cantidad_stock: '', unidad_medida: '' });
  useEffect(() => {
    if (item) setValues({ cantidad_stock: String(item.cantidad_stock || ''), unidad_medida: item.unidad_medida || '' });
    else setValues({ cantidad_stock: '', unidad_medida: '' });
  }, [item, visible]);
  if (!visible || !item) return null;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}><Text style={styles.headerText}>Detalle de Insumo</Text></View>
          <View style={styles.content}>
            <View style={styles.row}><Text style={styles.label}>Nombre:</Text><Text style={styles.value}>{item.nombre_insumo || '—'}</Text></View>
            <View style={styles.row}><Text style={styles.label}>Código:</Text><Text style={styles.value}>{item.codigo || '—'}</Text></View>
            {editable ? (
              <View style={{ marginBottom: 10 }}>
                <Input label="Cantidad" value={String(values.cantidad_stock)} onChangeText={(v) => setValues((p) => ({ ...p, cantidad_stock: v }))} placeholder="Ej: 10" />
                <Input label="Unidad" value={values.unidad_medida} onChangeText={(v) => setValues((p) => ({ ...p, unidad_medida: v }))} placeholder="Ej: kg, L, und" />
              </View>
            ) : (
              <View style={styles.row}><Text style={styles.label}>Stock:</Text><Text style={styles.value}>{item.cantidad_stock} {item.unidad_medida}</Text></View>
            )}
            <View style={styles.row}><Text style={styles.label}>Fecha:</Text><Text style={styles.value}>{item.fecha || '—'}</Text></View>
          </View>
          <View style={styles.footer}>
            {editable ? (<Button title="Guardar" onPress={async () => { const qty = Number(values.cantidad_stock || 0); const unit = String(values.unidad_medida || '').trim(); if (onSave) { await onSave({ cantidad_stock: qty, unidad_medida: unit }); } onClose(); }} />) : null}
            <View style={{ width: 8 }} />
            <Button title="Cerrar" onPress={onClose} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.25)', alignItems: 'center', justifyContent: 'center' },
  card: { width: '92%', maxWidth: 480, backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
  header: { backgroundColor: '#1E88E5', paddingVertical: 12, paddingHorizontal: 16 },
  headerText: { color: '#fff', fontSize: 16, fontWeight: '700', textAlign: 'center' },
  content: { padding: 16 },
  row: { marginBottom: 10, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  label: { fontWeight: '700', color: '#1F2937', marginBottom: 4 },
  value: { color: '#0f172a' },
  footer: { marginTop: 12, alignItems: 'flex-end' },
});
