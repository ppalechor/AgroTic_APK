import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, Linking, Pressable } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Input from '../atoms/Input';
import Button from '../atoms/Button';
import { resetPassword } from '../../services/api';

export default function ResetPasswordModal() {
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
        nav.goBack();
        nav.replace('Login', { 
          alert: { type: 'success', title: '¡Éxito!', text: 'Tu contraseña ha sido restablecida. Inicia sesión.' }
        });
      }, 800);
    } catch (e) {
      setError(e?.message || 'No se pudo restablecer la contraseña');
    } finally { setLoading(false); }
  };

  return (
    <View style={styles.backdrop}>
      <View style={styles.modal}>
        <View style={styles.header}>
          <Image source={require('../../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
          <Pressable onPress={() => nav.goBack()} style={styles.closeBtn}>
            <Text style={styles.closeText}>✕</Text>
          </Pressable>
        </View>
        <Text style={styles.title}>Restablecer contraseña</Text>
        <Text style={styles.message}>Ingresa tu nueva contraseña. Asegúrate de que sea segura y no la compartas con nadie.</Text>
        {!!error && <Text style={styles.error}>{error}</Text>}
        {!!success && <Text style={styles.success}>{success}</Text>}
        <Input label="Nueva contraseña" value={password} onChangeText={setPassword} placeholder="Mínimo 8 caracteres" secureTextEntry />
        <Input label="Confirmar contraseña" value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Vuelve a escribir tu contraseña" secureTextEntry />
        <View style={{ marginTop: 8 }}>
          <Input label="Token (si no se detecta)" value={token} onChangeText={setToken} placeholder="Pega el token aquí" />
        </View>
        <View style={{ marginTop: 12 }}>
          <Button title={loading ? '' : 'Restablecer contraseña'} onPress={handleSubmit} disabled={loading} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.25)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  modal: { width: '100%', maxWidth: 460, backgroundColor: '#fff', borderRadius: 16, paddingHorizontal: 20, paddingVertical: 18, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 5 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  logo: { width: 180, height: 90 },
  closeBtn: { paddingHorizontal: 10, paddingVertical: 6 },
  closeText: { fontSize: 18, color: '#111827' },
  title: { fontSize: 20, fontWeight: '700', textAlign: 'center', marginTop: 6, marginBottom: 6, color: '#16A34A' },
  message: { fontSize: 13, color: '#334155', textAlign: 'center', marginBottom: 10 },
  error: { color: '#DC2626', textAlign: 'center', marginBottom: 8 },
  success: { color: '#16A34A', textAlign: 'center', marginBottom: 8 },
});

