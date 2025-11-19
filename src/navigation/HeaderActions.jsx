import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';

export default function HeaderActions() {
  const { user } = useAuth();
  return (
    <View style={styles.container}>
      <Pressable style={styles.iconWrap} onPress={() => {}}>
        <Feather name="bell" size={20} color="#0f172a" />
        <View style={styles.badge}><Text style={styles.badgeText}>3</Text></View>
      </Pressable>
      <Pressable style={styles.iconWrap} onPress={() => {}}>
        <Feather name="user" size={20} color="#0f172a" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', paddingRight: 8 },
  iconWrap: { flexDirection: 'row', alignItems: 'center', marginLeft: 10 },
  badge: { position: 'absolute', top: -4, right: -6, backgroundColor: '#ef4444', borderRadius: 10, paddingHorizontal: 4, height: 16, alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
});