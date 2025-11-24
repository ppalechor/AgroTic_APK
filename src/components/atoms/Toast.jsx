import React, { useEffect } from 'react';
import { Modal, View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';

export default function Toast({ visible, message, type = 'success', onDismiss, duration = 2500 }) {
  useEffect(() => {
    if (!visible) return;
    const id = setTimeout(() => onDismiss?.(), duration);
    return () => clearTimeout(id);
  }, [visible, duration, onDismiss]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <View style={[styles.toast, type === 'success' ? styles.success : styles.error]}> 
          <Feather name={type === 'success' ? 'check-circle' : 'alert-circle'} size={18} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.text}>{message}</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', alignItems: 'center' },
  toast: { flexDirection: 'row', alignItems: 'center', marginBottom: 24, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 10, maxWidth: '94%' },
  success: { backgroundColor: '#16A34A', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  error: { backgroundColor: '#EF4444', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  text: { color: '#fff', fontSize: 13, fontWeight: '600' },
});

