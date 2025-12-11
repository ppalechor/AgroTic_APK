import React, { useEffect, useState } from 'react';
import { Modal, View, Text, StyleSheet, Pressable } from 'react-native';
import Input from '../atoms/Input';
import Button from '../atoms/Button';
import { listRolesDisponibles } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const DOC_TYPES = [
  { value: 'C.C.', label: 'Cédula de Ciudadanía (C.C.)' },
  { value: 'T.I.', label: 'Tarjeta de Identidad (T.I.)' },
  { value: 'C.E.', label: 'Cédula de Extranjería (C.E.)' },
  { value: 'PASAPORTE', label: 'Pasaporte' },
];

export default function UserCreateModal({ visible, onClose, onSubmit, loading }) {
  const { user: me } = useAuth();
  const [nombres, setNombres] = useState('');
  const [email, setEmail] = useState('');
  const [tipoDocumento, setTipoDocumento] = useState('C.C.');
  const [numeroDocumento, setNumeroDocumento] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [roles, setRoles] = useState([]);
  const [roleOpen, setRoleOpen] = useState(false);
  const [roleId, setRoleId] = useState(null);
  const [docOpen, setDocOpen] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!visible) return;
    let mounted = true;
    (async () => {
      try {
        const list = await listRolesDisponibles();
        if (!mounted) return;
        setRoles(Array.isArray(list) ? list : []);
        if (!roleId && Array.isArray(list) && list.length) {
          // Default to first role to avoid empty state
          setRoleId(list[0].id_rol);
        }
      } catch (e) {
        // ignore silently
      }
    })();
    return () => { mounted = false; };
  }, [visible]);

  useEffect(() => {
    if (!visible) {
      setNombres('');
      setEmail('');
      setTipoDocumento('C.C.');
      setNumeroDocumento('');
      setPassword('');
      setConfirmPassword('');
      setError('');
      setRoleOpen(false);
      setDocOpen(false);
    }
  }, [visible]);

  const handleCreate = async () => {
    setError('');
    if (!nombres.trim() || !email.trim() || !numeroDocumento.trim()) {
      setError('Completa nombres, email y número de documento');
      return;
    }
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return;
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }
    try {
      const payload = {
        nombres,
        email,
        password,
        tipo_documento: tipoDocumento,
        numero_documento: numeroDocumento,
        id_rol: roleId || undefined,
      };
      await onSubmit(payload);
      onClose();
    } catch (e) {
      setError(e?.message || 'Error creando usuario');
    }
  };

  const isAdmin = String(me?.id_rol?.nombre_rol || me?.nombre_rol || me?.rol || '').toLowerCase() === 'administrador';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Nuevo Usuario</Text>
          <Input label="Nombres completos" value={nombres} onChangeText={setNombres} placeholder="Nombres completos" />
          <Input label="Email" value={email} onChangeText={setEmail} placeholder="correo@ejemplo.com" keyboardType="email-address" />
          <Text style={styles.label}>Rol</Text>
          <Pressable
            style={[styles.select, (!isAdmin) && { opacity: 0.8 }]}
            onPress={() => { if (isAdmin) setRoleOpen(!roleOpen); }}
          >
            <Text style={styles.selectText}>
              {(() => {
                const current = roles.find(r => r.id_rol === roleId);
                return current?.nombre_rol || 'Seleccionar rol';
              })()}
            </Text>
          </Pressable>
          {roleOpen ? (
            <View style={styles.selectMenu}>
              {roles.map((r) => (
                <Pressable key={r.id_rol} style={styles.selectItem} onPress={() => { setRoleId(r.id_rol); setRoleOpen(false); }}>
                  <Text style={styles.selectItemText}>{r.nombre_rol}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}

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

          <Input label="Número de Documento" value={numeroDocumento} onChangeText={setNumeroDocumento} placeholder="Número" keyboardType="number-pad" />
          <Input label="Contraseña" value={password} onChangeText={setPassword} placeholder="Mínimo 8 caracteres" secureTextEntry />
          <Input label="Confirmar contraseña" value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Repite la contraseña" secureTextEntry />

          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={styles.actions}>
            <Button title="Cancelar" variant="secondary" onPress={onClose} />
            <View style={{ width: 12 }} />
            <Button title={loading ? '' : 'Crear Usuario'} onPress={handleCreate} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', alignItems: 'center', justifyContent: 'center' },
  card: { width: '90%', maxWidth: 420, backgroundColor: '#fff', borderRadius: 12, padding: 16 },
  title: { fontSize: 16, fontWeight: '700', marginBottom: 8, color: '#16A34A' },
  label: { fontSize: 12, color: '#333', marginTop: 8 },
  select: { borderWidth: 1, borderColor: '#D0D5DD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginTop: 4 },
  selectText: { fontSize: 14, color: '#0f172a' },
  selectMenu: { borderWidth: 1, borderColor: '#E4E7EC', borderRadius: 8, marginTop: 6 },
  selectItem: { paddingHorizontal: 12, paddingVertical: 10 },
  selectItemText: { fontSize: 14, color: '#334155' },
  actions: { flexDirection: 'row', marginTop: 12, justifyContent: 'flex-end' },
  error: { marginTop: 8, fontSize: 12, color: '#DC2626' },
});

