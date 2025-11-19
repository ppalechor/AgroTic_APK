import React, { useState, useCallback } from 'react';
import { View, Pressable, Text, ActivityIndicator, StyleSheet } from 'react-native';
import Input from '../atoms/Input';
import Button from '../atoms/Button';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';

export default function LoginForm({ onSuccess }) {
  const [numeroDocumento, setNumeroDocumento] = useState('');
  const [password, setPassword] = useState('');
  const { login, loading, error } = useAuth();
  const nav = useNavigation();

  const onSubmit = useCallback(async () => {
    try {
      const res = await login({ numero_documento: numeroDocumento.trim(), password });
      if (onSuccess) onSuccess(res);
    } catch {}
  }, [numeroDocumento, password, login, onSuccess]);

  return (
    <View>
      <Input label="Número de identificación" value={numeroDocumento} onChangeText={setNumeroDocumento} placeholder="Número de identificación" keyboardType="number-pad" />
      <Input label="Contraseña" value={password} onChangeText={setPassword} placeholder="Contraseña" secureTextEntry />
      <Pressable style={styles.link} onPress={() => nav.navigate('Forgot')}>
        <Text style={styles.linkText}>¿Olvidaste tu contraseña?</Text>
      </Pressable>
      <Button title={loading ? '' : 'Iniciar Sesión'} onPress={onSubmit} variant="primary" disabled={loading} />
      {loading ? <ActivityIndicator style={{marginTop:8}} /> : null}
      
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  link: {
    alignItems: 'center',
    marginVertical: 10,
  },
  linkText: {
    color: '#16A34A',
    fontSize: 12,
  },
  divider: {
    height: 1,
    backgroundColor: '#E4E7EC',
    marginVertical: 12,
  },
  error: {
    marginTop: 8,
    textAlign: 'center',
    color: '#DC2626',
    fontSize: 12,
  },
});