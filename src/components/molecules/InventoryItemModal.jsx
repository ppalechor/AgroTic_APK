import React from 'react';
import { Modal, View, Text, StyleSheet } from 'react-native';
import Button from '../atoms/Button';

export default function InventoryItemModal({ visible, onClose, item }) {
  if (!visible || !item) return null;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}><Text style={styles.headerText}>Detalle de Insumo</Text></View>
          <View style={styles.content}>
            <View style={styles.row}><Text style={styles.label}>Nombre:</Text><Text style={styles.value}>{item.nombre_insumo || '—'}</Text></View>
            <View style={styles.row}><Text style={styles.label}>Código:</Text><Text style={styles.value}>{item.codigo || '—'}</Text></View>
            <View style={styles.row}><Text style={styles.label}>Stock:</Text><Text style={styles.value}>{item.cantidad_stock} {item.unidad_medida}</Text></View>
            <View style={styles.row}><Text style={styles.label}>Fecha:</Text><Text style={styles.value}>{item.fecha || '—'}</Text></View>
          </View>
          <View style={styles.footer}><Button title="Cerrar" onPress={onClose} /></View>
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