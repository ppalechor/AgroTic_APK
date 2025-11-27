import React, { useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet, Linking } from 'react-native';
import Input from '../../components/atoms/Input';
import Button from '../../components/atoms/Button';
import { resetPassword } from '../../services/api';
import { useNavigation, useRoute } from '@react-navigation/native';

export default function ResetPasswordPage() {
  const nav = useNavigation();
  const route = useRoute();
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    let mounted = true;
    const fromParams = route?.params?.token;
    if (fromParams) setToken(fromParams);

    const parseUrl = (url) => {
      try {
        const u = new URL(url);
        const t = u.searchParams.get('token');
        if (t && mounted) setToken(t);
      } catch {}
    };
    (async () => {
      try {
        const initial = await Linking.getInitialURL();
        if (mounted && initial) parseUrl(initial);
      } catch {}
    })();
    const sub = Linking.addEventListener('url', (e) => parseUrl(e?.url || ''));
    return () => { mounted = false; sub.remove(); };
  }, [route?.params]);

  const handleSubmit = async () => {
    setError('');
    if ((password || '').length < 8) { setError('La contraseña debe tener al menos 8 caracteres'); return; }
    if (password !== confirmPassword) { setError('Las contraseñas no coinciden'); return; }
    if (!token) { setError('Token inválido o faltante'); return; }
    setLoading(true);
    try {
      await resetPassword(token, password);
      setSuccess('Tu contraseña ha sido actualizada');
      setTimeout(() => {
        nav.replace('Login', { 
          alert: { type: 'success', title: '¡Éxito!', text: 'Tu contraseña ha sido restablecida. Inicia sesión.' }
        });
      }, 800);
    } catch (e) {
      setError(e?.message || 'No se pudo restablecer la contraseña');
    } finally { setLoading(false); }
  };

  return (
    <View style={styles.root}>
      <Image source={require('../../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
      <View style={styles.card}>
        <Text style={styles.title}>Restablecer contraseña</Text>
        <Text style={styles.message}>Ingresa tu nueva contraseña. Asegúrate de que sea segura y no la compartas con nadie.</Text>
        {!!error && <Text style={styles.error}>{error}</Text>}
        {!!success && <Text style={styles.success}>{success}</Text>}
        <Input label="Nueva contraseña" value={password} onChangeText={setPassword} placeholder="Mínimo 8 caracteres" secureTextEntry />
        <Input label="Confirmar contraseña" value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Vuelve a escribir tu contraseña" secureTextEntry />
        <View style={{ marginTop: 12 }}>
          <Button title={loading ? '' : 'Restablecer contraseña'} onPress={handleSubmit} disabled={loading} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f4f5f7', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  logo: { width: 220, height: 110, marginBottom: 12 },
  card: { width: '100%', maxWidth: 420, backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 20, paddingVertical: 18, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  title: { fontSize: 20, fontWeight: '700', textAlign: 'center', marginBottom: 6, color: '#16A34A' },
  message: { fontSize: 13, color: '#334155', textAlign: 'center', marginBottom: 10 },
  error: { color: '#DC2626', textAlign: 'center', marginBottom: 8 },
  success: { color: '#16A34A', textAlign: 'center', marginBottom: 8 },
});
