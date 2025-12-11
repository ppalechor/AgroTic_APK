import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Button from '../../components/atoms/Button';
import { useAuth } from '../../contexts/AuthContext';
import ImageCarousel from '../../components/molecules/ImageCarousel';

export default function DashboardPage({ navigation }) {
  const { user, logout } = useAuth();

  return (
    <ScrollView contentContainerStyle={styles.root}>
      <View style={styles.card}>
        <View style={styles.cardLeft}>
          <Text style={styles.brand}>AgroTic</Text>
          <Text style={styles.paragraph}>Bienvenido a AgroTic, la plataforma líder en tecnología para el sector agrícola. Conectamos a productores, proveedores y expertos para mejorar la eficiencia y productividad en el campo.</Text>
          <Text style={styles.sectionTitle}>Nuestro objetivo</Text>
          <View style={styles.list}>
            <Text style={styles.listItem}><Text style={styles.bullet}>•</Text> Mejorar la productividad y competitividad</Text>
            <Text style={styles.listItem}><Text style={styles.bullet}>•</Text> Acceder a innovaciones y tecnologías emergentes</Text>
            <Text style={styles.listItem}><Text style={styles.bullet}>•</Text> Conectar con la comunidad agrícola</Text>
            <Text style={styles.listItem}><Text style={styles.bullet}>•</Text> Optimizar procesos y reducir costos</Text>
          </View>
          
        </View>
        <View style={styles.cardRight}>
          <ImageCarousel
            images={[
              require('../../../assets/home-hero.jpg'),
              require('../../../assets/home-hero-2.jpg'),
              require('../../../assets/home-hero-3.jpeg'),
            ]}
            size={140}
            intervalMs={3000}
          />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { padding: 16, backgroundColor: '#f4f5f7' },
  card: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  cardLeft: { flex: 1, paddingRight: 12 },
  cardRight: { alignItems: 'center', justifyContent: 'center' },
  brand: { fontSize: 22, fontWeight: '700', color: '#16A34A', marginBottom: 10 },
  paragraph: { fontSize: 13, color: '#334155', marginBottom: 8 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#16A34A', marginTop: 12 },
  list: { marginTop: 8 },
  listItem: { fontSize: 13, color: '#334155', marginTop: 4 },
  bullet: { color: '#16A34A', fontSize: 18, marginRight: 6 },
  actions: { marginTop: 14 },
  imageCircle: { },
  image: { },
});
