import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, Pressable } from 'react-native';
import Input from '../../components/atoms/Input';
import Button from '../../components/atoms/Button';
import { registerUser } from '../../services/api';
import { useNavigation } from '@react-navigation/native';

const DOC_TYPES = [
  { value: 'C.C.', label: 'Cédula de Ciudadanía (C.C.)' },
  { value: 'T.I.', label: 'Tarjeta de Identidad (T.I.)' },
  { value: 'C.E.', label: 'Cédula de Extranjería (C.E.)' },
  { value: 'PASAPORTE', label: 'Pasaporte' },
];

export default function RegisterPage() {
  const nav = useNavigation();
  const [nombres, setNombres] = useState('');
  const [email, setEmail] = useState('');
  const [tipoDocumento, setTipoDocumento] = useState('C.C.');
  const [numeroDocumento, setNumeroDocumento] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [docOpen, setDocOpen] = useState(false);

  const handleSubmit = async () => {
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }
    if ((password || '').length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const payload = {
        nombres,
        email,
        password,
        tipo_documento: tipoDocumento,
        numero_documento: numeroDocumento,
        id_rol: 5,
      };
      await registerUser(payload);
      nav.replace('Login', {
        alert: {
          type: 'success',
          title: '¡Registro Exitoso!',
          text: 'Tu cuenta ha sido creada correctamente. Ahora puedes iniciar sesión.',
        },
      });
    } catch (e) {
      setError(e?.message || 'Error al registrar el usuario');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <Image source={require('../../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
      <View style={styles.card}>
        <Text style={styles.title}>Crear cuenta</Text>
        <Text style={styles.message}>Completa el formulario para crear tu cuenta en AgroTIC.</Text>
        {error ? <View style={styles.alertError}><Text style={styles.alertTitle}>Error de Registro</Text><Text style={styles.alertText}>{error}</Text></View> : null}

        <Input label="Nombres completos" value={nombres} onChangeText={setNombres} placeholder="Ingresa tus nombres completos" />
        <Input label="Correo electrónico" value={email} onChangeText={setEmail} placeholder="ejemplo@correo.com" keyboardType="email-address" />

        <Text style={styles.label}>Tipo de documento</Text>
        <Pressable style={styles.select} onPress={() => setDocOpen(!docOpen)}>
          <Text style={styles.selectText}>{DOC_TYPES.find(d => d.value === tipoDocumento)?.label}</Text>
        </Pressable>
        {docOpen ? (
          <View style={styles.selectMenu}>
            {DOC_TYPES.map((d) => (
              <Pressable key={d.value} style={styles.selectItem} onPress={() => { setTipoDocumento(d.value); setDocOpen(false); }}>
                <Text style={styles.selectItemText}>{d.label}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        <Input label="Número de documento" value={numeroDocumento} onChangeText={setNumeroDocumento} placeholder="Ingresa tu número de documento" keyboardType="number-pad" />
        <Input label="Contraseña" value={password} onChangeText={setPassword} placeholder="Mínimo 8 caracteres" secureTextEntry />
        <Input label="Confirmar contraseña" value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Vuelve a escribir tu contraseña" secureTextEntry />

        <View style={{ marginTop: 12 }}>
          <Button title={loading ? '' : 'Crear cuenta'} onPress={handleSubmit} disabled={loading} />
        </View>

        <View style={styles.footerWrap}>
          <Text style={styles.footerText}>¿Ya tienes una cuenta?</Text>
          <Pressable onPress={() => nav.replace('Login')}><Text style={styles.linkText}> Inicia sesión aquí</Text></Pressable>
        </View>
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
  label: { fontSize: 12, color: '#333', marginTop: 8 },
  select: { borderWidth: 1, borderColor: '#D0D5DD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginTop: 4 },
  selectText: { fontSize: 14, color: '#0f172a' },
  selectMenu: { borderWidth: 1, borderColor: '#E4E7EC', borderRadius: 8, marginTop: 6 },
  selectItem: { paddingHorizontal: 12, paddingVertical: 10 },
  selectItemText: { fontSize: 14, color: '#334155' },
  alertTitle: { fontSize: 14, fontWeight: '700', marginBottom: 4, color: '#0f172a' },
  alertText: { fontSize: 12, color: '#334155' },
  alertError: { borderLeftWidth: 4, borderLeftColor: '#DC2626', backgroundColor: '#FEF2F2', padding: 10, borderRadius: 8, marginBottom: 8 },
  footerWrap: { flexDirection: 'row', marginTop: 12, justifyContent: 'center' },
  footerText: { fontSize: 12, color: '#334155' },
  linkText: { fontSize: 12, color: '#16A34A' },
});