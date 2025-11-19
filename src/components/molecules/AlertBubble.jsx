import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';

export default function AlertBubble({ title, text, type = 'success', onClose }) {
  const success = type === 'success';
  return (
    <View style={[styles.wrap, success ? styles.success : styles.error]}>
      <View style={styles.bar} />
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.text}>{text}</Text>
      </View>
      <Pressable style={styles.close} onPress={onClose}>
        <Text style={styles.closeText}>×</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', right: 12, bottom: 12, width: 300, flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#fff', borderRadius: 10, padding: 10, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  bar: { width: 4, height: '100%', borderRadius: 2, marginRight: 8, backgroundColor: '#16A34A' },
  success: { },
  error: { },
  title: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  text: { fontSize: 12, color: '#334155', marginTop: 4 },
  close: { marginLeft: 8 },
  closeText: { fontSize: 16, color: '#334155' },
});