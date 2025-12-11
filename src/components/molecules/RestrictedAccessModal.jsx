import React from 'react';
import { Modal, View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';

export default function RestrictedAccessModal({ visible }) {
  const { user, logout } = useAuth();
  const nombre = String(user?.nombres || user?.nombre || user?.name || '').trim();
  const navigation = useNavigation();

  return (
    <Modal visible={!!visible} transparent animationType="fade" onRequestClose={() => { /* bloqueado */ }}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <Feather name="lock" size={22} color="#16A34A" />
            <Text style={styles.title}>Acceso restringido</Text>
          </View>
          <Text style={styles.text}>Hola {nombre || 'usuario'}, tu cuenta se encuentra registrada como <Text style={styles.bold}>Invitado</Text>.</Text>
          <Text style={[styles.text, { marginTop: 6 }]}>Un administrador debe actualizar tu rol para que puedas acceder a la plataforma. Mientras tanto, puedes volver al inicio o cerrar sesión.</Text>
          <View style={styles.actions}>
            <Pressable
              style={[styles.btn, styles.btnSecondary]}
              onPress={() => {
                try { logout(); } catch {}
                const parent = navigation.getParent?.();
                if (parent && typeof parent.navigate === 'function') parent.navigate('Login');
                else navigation.navigate?.('Login');
              }}
            >
              <Text style={styles.btnSecondaryText}>Cerrar sesión</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.25)', alignItems: 'center', justifyContent: 'center', padding: 12 },
  card: { width: '92%', maxWidth: 520, backgroundColor: '#fff', borderRadius: 16, padding: 18, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 4, borderWidth: Platform.OS === 'web' ? 1 : 0, borderColor: '#E4E7EC' },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  title: { fontSize: 20, fontWeight: '800', color: '#16A34A', marginLeft: 8 },
  text: { fontSize: 14, color: '#334155' },
  bold: { fontWeight: '700' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 14 },
  btn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8 },
  btnSecondary: { borderWidth: 1, borderColor: '#E4E7EC', backgroundColor: '#fff' },
  btnSecondaryText: { color: '#334155', fontSize: 13, fontWeight: '700' },
});
