import React from 'react';
import { Modal, View, Text, StyleSheet, ScrollView, Image } from 'react-native';
import Button from '../atoms/Button';

export default function EpaDetailModal({ visible, onClose, epa }) {
  if (!visible || !epa) return null;
  const tipo = String(epa.tipo || '').toLowerCase();
  const estado = String(epa.estado || '').toLowerCase();
  const tipoStyle =
    tipo === 'enfermedad'
      ? { bg: '#FEEAEA', color: '#C62828', label: 'Enfermedad' }
      : tipo === 'plaga'
      ? { bg: '#FFF4E5', color: '#FB8C00', label: 'Plaga' }
      : { bg: '#E8F5E9', color: '#2E7D32', label: 'Arvense' };
  const estadoStyle = estado === 'inactivo'
    ? { bg: '#ECEFF1', color: '#37474F', label: 'Inactivo' }
    : { bg: '#E8F5E9', color: '#2E7D32', label: 'Activo' };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}><Text style={styles.headerText}>Detalles de EPA</Text></View>
          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.section}><Text style={styles.label}>Nombre:</Text><Text style={styles.value}>{epa.nombre_epa || epa.nombre || '—'}</Text></View>
            <View style={styles.section}><Text style={styles.label}>Descripción:</Text><Text style={styles.value}>{epa.descripcion || '—'}</Text></View>
            <View style={styles.section}><Text style={styles.label}>Tipo:</Text>
              <View style={[styles.pill, { backgroundColor: tipoStyle.bg }]}><Text style={[styles.pillText, { color: tipoStyle.color }]}>{tipoStyle.label}</Text></View>
            </View>
            <View style={styles.section}><Text style={styles.label}>Estado:</Text>
              <View style={[styles.pill, { backgroundColor: estadoStyle.bg }]}><Text style={[styles.pillText, { color: estadoStyle.color }]}>{estadoStyle.label}</Text></View>
            </View>
            <View style={styles.section}><Text style={styles.label}>Imagen de referencia:</Text>
              {epa.imagen_referencia ? (
                <Image source={{ uri: epa.imagen_referencia }} style={styles.image} />
              ) : (
                <View style={styles.noImage}><Text style={styles.noImageText}>No hay imagen disponible</Text></View>
              )}
            </View>
            <View style={styles.footer}><Button title="Cerrar" onPress={onClose} /></View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.25)', alignItems: 'center', justifyContent: 'center' },
  card: { width: '92%', maxWidth: 480, backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
  header: { backgroundColor: '#16A34A', paddingVertical: 12, paddingHorizontal: 16 },
  headerText: { color: '#fff', fontSize: 16, fontWeight: '700', textAlign: 'center' },
  content: { padding: 16 },
  section: { marginBottom: 10, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  label: { fontWeight: '700', color: '#1F2937', marginBottom: 4 },
  value: { color: '#0f172a' },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, alignSelf: 'flex-start' },
  pillText: { fontSize: 12, fontWeight: '600' },
  image: { width: '100%', height: 160, borderRadius: 8 },
  noImage: { width: '100%', height: 60, borderRadius: 8, backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center' },
  noImageText: { color: '#666' },
  footer: { marginTop: 12, alignItems: 'flex-end' },
});