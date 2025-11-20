import React, { useState, useEffect } from 'react';
import { Modal, View, Text, StyleSheet, Pressable } from 'react-native';
import Input from '../atoms/Input';
import Button from '../atoms/Button';

const DOC_TYPES = [
  { value: 'C.C.', label: 'Cédula de Ciudadanía (C.C.)' },
  { value: 'T.I.', label: 'Tarjeta de Identidad (T.I.)' },
  { value: 'C.E.', label: 'Cédula de Extranjería (C.E.)' },
  { value: 'PASAPORTE', label: 'Pasaporte' },
];

export default function UserEditModal({ visible, onClose, user, onSubmit, loading }) {
  const [nombres, setNombres] = useState('');
  const [email, setEmail] = useState('');
  const [tipoDocumento, setTipoDocumento] = useState('C.C.');
  const [numeroDocumento, setNumeroDocumento] = useState('');
  const [docOpen, setDocOpen] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setNombres(user?.nombres || '');
    setEmail(user?.email || '');
    setTipoDocumento(user?.tipo_documento || 'C.C.');
    setNumeroDocumento(String(user?.numero_documento || ''));
    setError('');
  }, [user]);

  const handleSave = async () => {
    setError('');
    try {
      await onSubmit({ nombres, email, tipo_documento: tipoDocumento });
      onClose();
    } catch (e) {
      setError(e?.message || 'Error guardando');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Editar usuario</Text>
          <Input label="Nombres" value={nombres} onChangeText={setNombres} placeholder="Nombres completos" />
          <Input label="Email" value={email} onChangeText={setEmail} placeholder="correo@ejemplo.com" keyboardType="email-address" />
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
          <Input label="Número de documento" value={numeroDocumento} onChangeText={setNumeroDocumento} placeholder="Número" keyboardType="number-pad" />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={styles.actions}>
            <Button title="Cancelar" variant="secondary" onPress={onClose} />
            <View style={{ width: 12 }} />
            <Button title={loading ? '' : 'Guardar'} onPress={handleSave} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', alignItems: 'center', justifyContent: 'center' },
  card: { width: '90%', maxWidth: 420, backgroundColor: '#fff', borderRadius: 12, padding: 16 },
  title: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  label: { fontSize: 12, color: '#333', marginTop: 8 },
  select: { borderWidth: 1, borderColor: '#D0D5DD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginTop: 4 },
  selectText: { fontSize: 14, color: '#0f172a' },
  selectMenu: { borderWidth: 1, borderColor: '#E4E7EC', borderRadius: 8, marginTop: 6 },
  selectItem: { paddingHorizontal: 12, paddingVertical: 10 },
  selectItemText: { fontSize: 14, color: '#334155' },
  actions: { flexDirection: 'row', marginTop: 12, justifyContent: 'flex-end' },
  error: { marginTop: 8, fontSize: 12, color: '#DC2626' },
});