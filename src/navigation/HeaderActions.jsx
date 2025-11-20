import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';
import ProfileModal from '../components/molecules/ProfileModal';

export default function HeaderActions() {
  const { user, logout } = useAuth();
  const nav = useNavigation();
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  return (
    <View style={styles.container}>
      <Pressable style={styles.iconWrap} onPress={() => {}}>
        <Feather name="bell" size={20} color="#0f172a" />
        <View style={styles.badge}><Text style={styles.badgeText}>3</Text></View>
      </Pressable>
      <Pressable style={styles.iconWrap} onPress={() => setOpen(!open)}>
        <Feather name="user" size={20} color="#0f172a" />
        <Feather name="chevron-down" size={16} color="#64748b" />
      </Pressable>
      {open ? (
        <View style={styles.dropdown}>
          <Text style={styles.name}>{user?.nombres || user?.numero_documento || 'Usuario'}</Text>
          {user?.email ? <Text style={styles.email}>{user.email}</Text> : null}
          {user?.rol ? <Text style={styles.role}>{String(user.rol).toUpperCase()}</Text> : null}
          <Pressable style={styles.item} onPress={() => { setOpen(false); setProfileOpen(true); }}>
            <Feather name="external-link" size={16} color="#0f172a" />
            <Text style={styles.itemText}>Ver Perfil</Text>
          </Pressable>
          <View style={styles.separator} />
          <Pressable style={[styles.item, styles.logout]} onPress={() => { setOpen(false); logout(); nav.replace('Login'); }}>
            <Feather name="log-out" size={16} color="#fff" />
            <Text style={[styles.itemText, { color: '#fff' }]}>Cerrar sesión</Text>
          </Pressable>
        </View>
      ) : null}
      <ProfileModal
        visible={profileOpen}
        onClose={() => setProfileOpen(false)}
        user={user}
        onLogout={() => { setProfileOpen(false); logout(); nav.replace('Login'); }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', paddingRight: 8 },
  iconWrap: { flexDirection: 'row', alignItems: 'center', marginLeft: 10 },
  badge: { position: 'absolute', top: -4, right: -6, backgroundColor: '#ef4444', borderRadius: 10, paddingHorizontal: 4, height: 16, alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  dropdown: { position: 'absolute', top: 30, right: 0, width: 240, backgroundColor: '#fff', borderRadius: 12, padding: 12, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
  name: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  email: { fontSize: 12, color: '#64748b', marginTop: 2 },
  role: { fontSize: 12, color: '#16A34A', marginTop: 2, marginBottom: 8 },
  item: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  itemText: { marginLeft: 8, fontSize: 13, color: '#0f172a' },
  separator: { height: 1, backgroundColor: '#e2e8f0', marginVertical: 8 },
  logout: { backgroundColor: '#ef4444', borderRadius: 8, paddingHorizontal: 10, justifyContent: 'center' },
});