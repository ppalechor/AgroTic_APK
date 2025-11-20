import React, { useState } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import Input from '../../components/atoms/Input';
import Button from '../../components/atoms/Button';
import { requestPasswordReset } from '../../services/api';
import { useNavigation } from '@react-navigation/native';

export default function ForgotPasswordPage() {
  const nav = useNavigation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await requestPasswordReset(email.trim());
      nav.replace('Login', {
        alert: {
          type: 'success',
          title: '¡Enlace Enviado!',
          text: `Hemos enviado un enlace a ${email.trim()} para restablecer tu contraseña.`,
        },
      });
    } catch (e) {
      setError(e?.message || 'Ocurrió un error. Intenta de nuevo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <Image source={require('../../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
      <View style={styles.card}>
        <Text style={styles.title}>¿Olvidaste tu contraseña?</Text>
        <Text style={styles.message}>Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.</Text>
        {error ? (
          <View style={styles.alertError}><Text style={styles.alertTitle}>Error</Text><Text style={styles.alertText}>{error}</Text></View>
        ) : null}
        <Input label="Correo electrónico" value={email} onChangeText={setEmail} placeholder="tucorreo@ejemplo.com" keyboardType="email-address" />
        <View style={{ marginTop: 12 }}>
          <Button title={loading ? '' : 'Enviar enlace'} onPress={handleSubmit} disabled={loading || !email.trim()} />
        </View>
        <View style={styles.divider} />
        <Button title="Volver al inicio de sesión" variant="secondary" onPress={() => nav.replace('Login')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f4f5f7', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  logo: { width: 100, height: 50, marginBottom: 12 },
  card: { width: '100%', maxWidth: 420, backgroundColor: '#fff', borderRadius: 12, padding: 16, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  title: { fontSize: 18, fontWeight: '700', color: '#16A34A', marginBottom: 8, textAlign: 'center' },
  message: { fontSize: 13, color: '#334155', marginBottom: 8, textAlign: 'center' },
  divider: { height: 1, backgroundColor: '#E4E7EC', marginVertical: 12 },
  alertTitle: { fontSize: 14, fontWeight: '700', marginBottom: 4, color: '#0f172a' },
  alertText: { fontSize: 12, color: '#334155' },
  alertSuccess: { borderLeftWidth: 4, borderLeftColor: '#16A34A', backgroundColor: '#F0FDF4', padding: 10, borderRadius: 8, marginBottom: 8 },
  alertError: { borderLeftWidth: 4, borderLeftColor: '#DC2626', backgroundColor: '#FEF2F2', padding: 10, borderRadius: 8, marginBottom: 8 },
});
