import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';

export default function TreatmentCard({ item, onInfo, onEdit, onDelete }) {
  const isBio = String(item.tipo).toLowerCase() === 'biologico';
  const borderColor = isBio ? '#22C55E' : '#EF4444';
  const chipBg = isBio ? '#F0FDF4' : '#FEE2E2';
  const chipColor = isBio ? '#16A34A' : '#EF4444';
  return (
    <View style={[styles.card, { borderLeftColor: borderColor }]}> 
      <View style={styles.cardTop}>
        <Text style={styles.title} numberOfLines={1}>{item.descripcion || '—'}</Text>
        <View style={[styles.chip, { backgroundColor: chipBg }]}>
          <Text style={[styles.chipText, { color: chipColor }]}>{isBio ? 'Biológico' : 'Químico'}</Text>
        </View>
      </View>
      <View style={styles.body}>
        <Text style={styles.label}>Dosis:</Text>
        <Text style={styles.value}>{item.dosis || '—'}</Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.label}>Frecuencia:</Text>
        <Text style={styles.value}>{item.frecuencia || '—'}</Text>
      </View>
      <View style={styles.actions}>
        <Pressable style={styles.iconBtn} onPress={onInfo}><Feather name="info" size={16} color="#64748b" /></Pressable>
        <Pressable style={styles.iconBtn} onPress={onEdit}><Feather name="edit-2" size={16} color="#16A34A" /></Pressable>
        <Pressable style={styles.iconBtn} onPress={onDelete}><Feather name="trash-2" size={16} color="#EF4444" /></Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 8, padding: 12, borderLeftWidth: 3, marginVertical: 8, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 14, fontWeight: '700', color: '#0f172a', maxWidth: '70%' },
  chip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  chipText: { fontSize: 12, fontWeight: '600' },
  body: { flexDirection: 'row', marginTop: 8 },
  label: { fontWeight: '700', marginRight: 6 },
  value: { color: '#0f172a' },
  actions: { flexDirection: 'row', paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F1F5F9', justifyContent: 'flex-start' },
  iconBtn: { marginRight: 14 },
});