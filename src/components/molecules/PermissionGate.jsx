import React from 'react';
import { View, Text, Modal, StyleSheet } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';

const normalizeKey = (k) => (k || '').toString().trim().toLowerCase();

const hasPermission = (keys, required) => {
  const req = normalizeKey(required);
  if (!req) return true;
  const [res, act] = req.split(':');
  const set = new Set((keys || []).map(normalizeKey));
  if (set.has(req)) return true;
  if (set.has(`${res}:*`)) return true;
  return false;
};

export default function PermissionGate({ requiredKey, pageName, children }) {
  const { permissionKeys, user } = useAuth();
  const roleName = String(user?.id_rol?.nombre_rol || user?.nombre_rol || user?.rol || '').toLowerCase();
  const isAdminOrInstructor = roleName.includes('admin') || roleName.includes('instructor');
  const allowed = isAdminOrInstructor || hasPermission(permissionKeys, requiredKey);
  if (allowed) return children;
  const display = pageName || (requiredKey ? requiredKey.split(':')[0] : 'este módulo');
  return (
    <Modal visible={true} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Acceso restringido</Text>
          <Text style={styles.text}>No tienes permisos para ver {display}.</Text>
          <Text style={styles.textSmall}>Solicita permisos al administrador para continuar.</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', alignItems: 'center', justifyContent: 'center' },
  card: { width: '90%', maxWidth: 420, backgroundColor: '#fff', borderRadius: 12, padding: 16 },
  title: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  text: { fontSize: 14, color: '#334155' },
  textSmall: { fontSize: 12, color: '#64748b', marginTop: 6 },
});
