import React, { useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import LoginForm from '../../components/molecules/LoginForm';
import { useRoute } from '@react-navigation/native';
import AlertBubble from '../../components/molecules/AlertBubble';
import Button from '../../components/atoms/Button';

export default function LoginPage({ navigation }) {
  const route = useRoute();
  const [alert, setAlert] = useState(null);
  useEffect(() => {
    const a = route?.params?.alert;
    if (a) setAlert(a);
  }, [route?.params]);

  

  
  return (
    <View style={styles.root}>
      <Image source={require('../../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
      <View style={styles.card}>
        <Text style={styles.title}>Iniciar Sesión</Text>
        <Text style={styles.subtitle}>Accede a tu cuenta AgroTIC</Text>
        <LoginForm onSuccess={() => navigation.replace('App')} />
        <View style={styles.divider} />
        <Button title="Crear cuenta" variant="secondary" onPress={() => navigation.navigate('Register')} />
      </View>
      {alert ? (
        <AlertBubble title={alert.title} text={alert.text} type={alert.type} onClose={() => setAlert(null)} />
      ) : null}
      
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#f4f5f7',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  logo: {
    width: 220,
    height: 110,
    marginBottom: 12,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 18,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 12,
    color: '#667085',
    textAlign: 'center',
    marginBottom: 12,
  },
  divider: { height: 1, backgroundColor: '#E4E7EC', marginVertical: 12 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.25)', alignItems: 'center', justifyContent: 'center' },
  resetCard: { width: '92%', maxWidth: 460, backgroundColor: '#fff', borderRadius: 12, padding: 16 },
  resetTitle: { fontSize: 20, fontWeight: '700', color: '#16A34A', textAlign: 'center', marginBottom: 6 },
  resetMsg: { fontSize: 13, color: '#334155', textAlign: 'center', marginBottom: 10 },
  resetError: { color: '#DC2626', textAlign: 'center', marginBottom: 8 },
  resetSuccess: { color: '#16A34A', textAlign: 'center', marginBottom: 8 },
  resetClose: { alignSelf: 'flex-end', marginTop: 8 },
  resetCloseText: { color: '#334155' },
});
