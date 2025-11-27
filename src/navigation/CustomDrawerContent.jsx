import React, { useState, useMemo } from 'react';
import { View, Text, Pressable, Image, ScrollView, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import menuItems from './menuItems';
import { useAuth } from '../contexts/AuthContext';

export default function CustomDrawerContent({ navigation }) {
  const [expanded, setExpanded] = useState({});
  const toggle = (id) => setExpanded((s) => ({ ...s, [id]: !s[id] }));

  const { user } = useAuth();
  const isGuest = String(user?.id_rol?.nombre_rol || user?.nombre_rol || user?.rol || '').toLowerCase() === 'invitado';
  const items = useMemo(() => {
    if (!isGuest) return menuItems;
    const cultivos = menuItems.find((it) => it.id === 'cultivos');
    const allowed = ['Gestión de Cultivos', 'Actividades', 'Calendario'];
    const sub = (cultivos?.submodules || []).filter((sub) => allowed.includes(sub.label));
    return [
      { id: 'cultivos', label: 'Cultivos', icon: 'droplet', submodules: sub }
    ];
  }, [isGuest]);

  const go = (label) => navigation.navigate(label);

  return (
    <ScrollView style={styles.root}>
      <View style={styles.header}>
        <Image source={require('../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
      </View>
      {items.map((item) => (
        <View key={item.id} style={styles.item}>
          <Pressable style={styles.itemBtn} onPress={() => (item.submodules ? toggle(item.id) : go(item.label))}>
            <Feather name={item.icon} size={18} color="#0f172a" style={styles.icon} />
            <Text style={styles.itemText}>{item.label}</Text>
            {item.submodules ? (
              <Feather name={expanded[item.id] ? 'chevron-down' : 'chevron-right'} size={16} color="#334155" />
            ) : null}
          </Pressable>
          {item.submodules && expanded[item.id] ? (
            <View style={styles.sublist}>
              {item.submodules.map((sub) => (
                <Pressable key={sub.id} style={styles.subBtn} onPress={() => go(sub.label)}>
                  <Feather name={sub.icon} size={16} color="#334155" style={styles.subIcon} />
                  <Text style={styles.subText}>{sub.label}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#ffffff' },
  header: { paddingHorizontal: 16, paddingVertical: 14 },
  logo: { width: 160, height: 80 },
  item: { },
  itemBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  icon: { marginRight: 10 },
  itemText: { flex: 1, fontSize: 14, color: '#0f172a' },
  sublist: { paddingLeft: 32, paddingBottom: 8 },
  subBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  subIcon: { marginRight: 8 },
  subText: { fontSize: 13, color: '#334155' },
});
