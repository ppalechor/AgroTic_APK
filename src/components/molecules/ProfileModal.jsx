import React from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';

export default function ProfileModal({ visible, onClose, user, onLogout }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.name}>{user?.nombres || user?.numero_documento || 'Usuario'}</Text>
          {user?.email ? <Text style={styles.email}>{user.email}</Text> : null}
          {user?.rol ? <Text style={styles.role}>{String(user.rol).toUpperCase()}</Text> : null}
          <View style={styles.separator} />
          <Pressable style={[styles.item, styles.logout]} onPress={onLogout}>
            <Feather name="log-out" size={16} color="#fff" />
            <Text style={[styles.itemText, { color: '#fff' }]}>Cerrar sesión</Text>
          </Pressable>
          <Pressable style={styles.close} onPress={onClose}>
            <Text style={styles.closeText}>Cerrar</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.15)', alignItems: 'center', justifyContent: 'center' },
  card: { width: '90%', maxWidth: 320, backgroundColor: '#fff', borderRadius: 12, padding: 14, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
  name: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  email: { fontSize: 12, color: '#64748b', marginTop: 2 },
  role: { fontSize: 12, color: '#16A34A', marginTop: 2, marginBottom: 8 },
  separator: { height: 1, backgroundColor: '#e2e8f0', marginVertical: 8 },
  item: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderRadius: 8, justifyContent: 'center' },
  itemText: { marginLeft: 8, fontSize: 13, color: '#0f172a' },
  logout: { backgroundColor: '#ef4444' },
  close: { marginTop: 8, alignItems: 'center' },
  closeText: { fontSize: 12, color: '#334155' },
});