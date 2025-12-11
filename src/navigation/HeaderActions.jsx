import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';
import ProfileModal from '../components/molecules/ProfileModal';
import { listActividades } from '../services/api';
let NotificationsModule = null;
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function HeaderActions() {
  const { user, token, logout } = useAuth();
  const nav = useNavigation();
  const [open, setOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [profileOpen, setProfileOpen] = useState(false);

  const userId = useMemo(() => String(user?.id || user?.id_usuario || user?.id_usuarios || ''), [user]);
  const userName = useMemo(() => String(user?.nombres || '').trim().toLowerCase(), [user]);
  const userEmail = useMemo(() => String(user?.email || '').trim().toLowerCase(), [user]);

  useEffect(() => {
    let mounted = true;
    let timer;
    const registerFcm = async () => {
      try {
        if (!token) return;
        const ConstantsModule = await import('expo-constants');
        const isExpoGo = (ConstantsModule?.default?.appOwnership === 'expo');
        if (isExpoGo) return;
        const key = 'fcm_registered_token';
        const already = await AsyncStorage.getItem(key);
        if (!NotificationsModule) {
          NotificationsModule = await import('expo-notifications');
        }
        const devToken = await NotificationsModule.getDevicePushTokenAsync();
        const value = String(devToken?.data || '');
        if (!value) return;
        if (already === value) return;
        const base = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';
        await fetch(`${base}/usuarios/me/fcm-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ token: value })
        });
        await AsyncStorage.setItem(key, value);
      } catch {}
    };
    const fetchNotifs = async () => {
      try {
        if (!token) { setNotifications([]); return; }
        const { items } = await listActividades(token, { estado: 'pendiente', limit: 20 });
        const arr = Array.isArray(items) ? items : Array.isArray(items?.data) ? items.data : Array.isArray(items?.items) ? items.items : [];
        const norm = arr.map((a) => ({
          id: a.id_actividad || a.id,
          tipo: a.tipo_actividad || a.nombre_actividad || 'Actividad',
          detalles: a.detalles || a.descripcion || '',
          fecha: a.fecha_actividad || a.fecha || a.createdAt || null,
          responsable: a.responsable || a.usuario || '',
        }));
        const mine = norm.filter((n) => {
          const r = String(n.responsable || '').trim().toLowerCase();
          return !r || r === userName || r === userEmail; // si no hay responsable, mostrar igualmente
        });
        if (mounted) setNotifications(mine);
        try {
          const key = 'scheduled_activities';
          const raw = await AsyncStorage.getItem(key);
          const scheduled = new Set(JSON.parse(raw || '[]'));
          const now = new Date();
          for (const n of mine) {
            const when = n.fecha ? new Date(n.fecha) : null;
            const inFuture = when && when.getTime() > now.getTime();
            if (!scheduled.has(String(n.id)) && inFuture) {
              if (!NotificationsModule) {
                NotificationsModule = await import('expo-notifications');
              }
              await NotificationsModule.scheduleNotificationAsync({
                content: { title: `Actividad pendiente: ${n.tipo}`, body: n.detalles || 'Revisa tus actividades' },
                trigger: when
              });
              scheduled.add(String(n.id));
            }
          }
          await AsyncStorage.setItem(key, JSON.stringify(Array.from(scheduled)));
        } catch {}
      } catch {
        if (mounted) setNotifications([]);
      }
    };
    fetchNotifs();
    registerFcm();
    timer = setInterval(fetchNotifs, 60000);
    return () => { mounted = false; if (timer) clearInterval(timer); };
  }, [token, userName, userEmail]);

  return (
    <View style={styles.container}>
      <Pressable style={styles.iconWrap} onPress={() => setNotifOpen((v) => !v)}>
        <Feather name="bell" size={20} color="#0f172a" />
        {notifications.length > 0 && (
          <View style={styles.badge}><Text style={styles.badgeText}>{notifications.length}</Text></View>
        )}
      </Pressable>
      <Pressable style={styles.iconWrap} onPress={() => setOpen(!open)}>
        <Feather name="user" size={20} color="#0f172a" />
        <Feather name="chevron-down" size={16} color="#64748b" />
      </Pressable>
      {notifOpen ? (
        <View style={[styles.dropdown, { right: 60, width: 300 }]}> 
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <Feather name="bell" size={16} color="#0f172a" />
            <Text style={{ marginLeft: 6, fontWeight: '700', color: '#0f172a' }}>Notificaciones</Text>
          </View>
          {notifications.length === 0 ? (
            <Text style={{ color: '#64748b' }}>Sin actividades pendientes.</Text>
          ) : (
            <ScrollView style={{ maxHeight: 240 }}>
              {notifications.map((n) => (
                <View key={String(n.id)} style={styles.notifItem}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.notifTitle}>{n.tipo}</Text>
                    <Text style={styles.notifSub}>{n.detalles || '—'}</Text>
                    <Text style={styles.notifDate}>{n.fecha ? new Date(n.fecha).toLocaleDateString() : ''}</Text>
                  </View>
                  <Pressable style={styles.notifBtn} onPress={() => { setNotifOpen(false); nav.navigate('Actividades'); }}>
                    <Feather name="arrow-right" size={14} color="#fff" />
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          )}
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 }}>
            <Pressable style={[styles.notifViewAll]} onPress={() => { setNotifOpen(false); nav.navigate('Actividades'); }}>
              <Text style={{ color: '#0f172a', fontWeight: '700' }}>Ver todas</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
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
  notifItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  notifTitle: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  notifSub: { fontSize: 12, color: '#64748b', marginTop: 2 },
  notifDate: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  notifBtn: { backgroundColor: '#16A34A', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, marginLeft: 8 },
  notifViewAll: { backgroundColor: '#f1f5f9', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
});
