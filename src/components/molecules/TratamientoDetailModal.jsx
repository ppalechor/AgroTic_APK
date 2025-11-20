import React from 'react';
import { Modal, View, Text, StyleSheet, ScrollView } from 'react-native';
import Button from '../atoms/Button';

export default function TratamientoDetailModal({ visible, onClose, tratamiento }) {
  if (!visible || !tratamiento) return null;
  const tipoLabel = String(tratamiento?.tipo).toLowerCase() === 'biologico' ? 'Biológico' : 'Químico';
  const epaText = (() => {
    const e = tratamiento.epa_nombre ?? tratamiento.id_epa;
    if (e && typeof e === 'object') return String(e.nombre_epa ?? e.nombre ?? e.name ?? `EPA ${e.id_epa ?? e.id ?? ''}`).toLowerCase();
    return String(e ?? '').toLowerCase();
  })();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}><Text style={styles.headerText}>Detalle de Tratamiento</Text></View>
          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.section}><Text style={styles.label}>ID:</Text><Text style={styles.value}>{tratamiento.id_tratamiento || tratamiento.id}</Text></View>
            <View style={styles.section}><Text style={styles.label}>Tipo:</Text><View style={[styles.pill, tipoLabel === 'Biológico' ? styles.pillBio : styles.pillQui]}><Text style={styles.pillText}>{tipoLabel}</Text></View></View>
            <View style={styles.section}><Text style={styles.label}>Descripción:</Text><Text style={styles.value}>{tratamiento.descripcion}</Text></View>
            <View style={styles.section}><Text style={styles.label}>Dosis:</Text><Text style={styles.value}>{tratamiento.dosis}</Text></View>
            <View style={styles.section}><Text style={styles.label}>Frecuencia:</Text><Text style={styles.value}>{tratamiento.frecuencia}</Text></View>
            <View style={styles.section}><Text style={styles.label}>EPA:</Text><View style={[styles.pill, styles.pillEpa]}><Text style={[styles.pillText, styles.pillEpaText]}>{epaText}</Text></View></View>
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
  pillBio: { backgroundColor: '#F0FDF4' },
  pillQui: { backgroundColor: '#FEE2E2' },
  pillEpa: { backgroundColor: '#E3F2FD' },
  pillEpaText: { color: '#1976D2' },
  footer: { marginTop: 12, alignItems: 'flex-end' },
});