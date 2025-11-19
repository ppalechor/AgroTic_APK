import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, Image, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { login } from '../services/api';

export default function LoginScreen() {
  const [numeroDocumento, setNumeroDocumento] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');

  const handleLogin = useCallback(async () => {
    setLoading(true);
    setStatus('');
    try {
      const { token, user } = await login({ numero_documento: numeroDocumento.trim(), password });
      const shortToken = `${token.slice(0, 14)}...${token.slice(-10)}`;
      setStatus(`Inicio correcto. Token: ${shortToken}`);
    } catch (err) {
      setStatus(err?.message || 'Error de autenticación');
    } finally {
      setLoading(false);
    }
  }, [numeroDocumento, password]);

  return (
    <View style={styles.root}>
      <Image source={require('../../assets/icon.png')} style={styles.logo} />
      <View style={styles.card}>
        <Text style={styles.title}>Iniciar Sesión</Text>
        <Text style={styles.subtitle}>Accede a tu cuenta AgroTIC</Text>
        <TextInput
          value={numeroDocumento}
          onChangeText={setNumeroDocumento}
          placeholder="Número de identificación"
          keyboardType="number-pad"
          style={styles.input}
        />
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Contraseña"
          secureTextEntry
          style={styles.input}
        />
        <Pressable style={styles.link} onPress={() => setStatus('Recuperación de contraseña no implementada')}>
          <Text style={styles.linkText}>¿Olvidaste tu contraseña?</Text>
        </Pressable>
        <Pressable style={styles.primaryBtn} onPress={handleLogin} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Iniciar Sesión</Text>}
        </Pressable>
        <View style={styles.divider} />
        <Pressable style={styles.secondaryBtn} onPress={() => setStatus('Registro no implementado')}>
          <Text style={styles.secondaryBtnText}>Crear cuenta</Text>
        </Pressable>
        {status ? <Text style={styles.status}>{status}</Text> : null}
      </View>
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
    width: 84,
    height: 84,
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
  input: {
    borderWidth: 1,
    borderColor: '#D0D5DD',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginTop: 8,
  },
  link: {
    alignItems: 'center',
    marginVertical: 10,
  },
  linkText: {
    color: '#16A34A',
    fontSize: 12,
  },
  primaryBtn: {
    backgroundColor: '#22C55E',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    marginTop: 4,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#E4E7EC',
    marginVertical: 12,
  },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: '#D0D5DD',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
  },
  secondaryBtnText: {
    color: '#16A34A',
    fontSize: 14,
    fontWeight: '600',
  },
  status: {
    textAlign: 'center',
    marginTop: 12,
    fontSize: 12,
    color: '#475467',
  },
});