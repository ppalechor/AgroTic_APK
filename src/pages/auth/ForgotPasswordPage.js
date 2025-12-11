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

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await requestPasswordReset(email.trim());
      const token = data?.token;
      const resetUrl = data?.resetUrl;
      if (token) {
        // Navegar a la página de restablecimiento con el token
        nav.navigate('Reset', { token });
      } else {
        nav.replace('Login', {
          alert: {
            type: 'success',
            title: '¡Enlace generado!',
            text: resetUrl ? `Si no ves el correo, usa el enlace: ${resetUrl}` : `Hemos generado tu enlace de recuperación.`,
          },
        });
      }
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
  logo: { width: 220, height: 110, marginBottom: 12 },
  card: { width: '100%', maxWidth: 420, backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 20, paddingVertical: 18, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  title: { fontSize: 20, fontWeight: '700', textAlign: 'center', marginBottom: 6, color: '#16A34A' },
  message: { fontSize: 13, color: '#334155', textAlign: 'center', marginBottom: 12 },
  divider: { height: 1, backgroundColor: '#E4E7EC', marginVertical: 12 },
  alertError: { backgroundColor: '#FEF2F2', borderColor: '#FCA5A5', borderWidth: 1, padding: 10, borderRadius: 8, marginBottom: 10 },
  alertTitle: { color: '#B91C1C', fontWeight: '700', marginBottom: 4 },
  alertText: { color: '#B91C1C' },
});
