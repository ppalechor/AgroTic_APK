import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function ModulePage({ title }) {
  return (
    <View style={styles.root}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>Contenido móvil en construcción</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  subtitle: {
    marginTop: 6,
    fontSize: 12,
    color: '#667085',
  },
});