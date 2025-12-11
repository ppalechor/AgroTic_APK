import React, { useEffect, useState } from 'react';
import { Modal, View, Text, StyleSheet, Pressable, Image, Platform } from 'react-native';
import Input from '../atoms/Input';
import Button from '../atoms/Button';

const TYPES = [
  { value: 'enfermedad', label: 'Enfermedad' },
  { value: 'plaga', label: 'Plaga' },
  { value: 'arvense', label: 'Arvense' },
];

export default function EpaFormModal({ visible, onClose, onSubmit, epa }) {
  const [form, setForm] = useState({ nombre_epa: '', descripcion: '', tipo: 'enfermedad', estado: 'activo' });
  const [openType, setOpenType] = useState(false);
  const [openEstado, setOpenEstado] = useState(false);
  const [error, setError] = useState('');
  const [imageFile, setImageFile] = useState(null);

  useEffect(() => {
    if (epa) setForm({ nombre_epa: epa.nombre_epa || epa.nombre || '', descripcion: epa.descripcion || '', tipo: epa.tipo || 'enfermedad', estado: epa.estado || 'activo' });
    else setForm({ nombre_epa: '', descripcion: '', tipo: 'enfermedad', estado: 'activo' });
    setError('');
    setImageFile(null);
  }, [epa, visible]);

  const handleSave = async () => {
    const len = (s) => (s || '').trim().length;
    const errs = [];
    if (!len(form.nombre_epa)) errs.push('nombre');
    if (!len(form.descripcion)) errs.push('descripcion');
    if (!form.tipo) errs.push('tipo');
    if (errs.length) { setError('Por favor, completa los campos requeridos'); return; }
    try {
      await onSubmit({ ...form }, imageFile);
      onClose();
    } catch (e) {
      setError(e?.message || 'Error guardando');
    }
  };


  const handlePickFromCamera = async () => {
    try {
      setError('');
      if (Platform.OS === 'web') {
        setError('La cámara no está soportada en web. Usa la app móvil.');
        return;
      }
      const mod = await import('expo-image-picker');
      const perm = await mod.requestCameraPermissionsAsync();
      if (perm.status !== 'granted') { setError('Permiso de cámara denegado'); return; }
      const res = await mod.launchCameraAsync({ allowsEditing: true, quality: 0.7 });
      if (!res.canceled && res.assets && res.assets[0]?.uri) {
        const asset = res.assets[0];
        const name = asset.fileName || 'epa.jpg';
        const type = asset.type === 'video' ? 'image/jpeg' : 'image/jpeg';
        setImageFile({ uri: asset.uri, name, type });
      }
    } catch (e) {
      setError('Instala expo-image-picker para usar la cámara');
    }
  };

  const handlePickFromLibrary = async () => {
    try {
      setError('');
      if (Platform.OS === 'web') {
        setError('La galería no está soportada en web. Usa la app móvil.');
        return;
      }
      const mod = await import('expo-image-picker');
      const perm = await mod.requestMediaLibraryPermissionsAsync();
      if (perm.status !== 'granted') { setError('Permiso de galería denegado'); return; }
      const res = await mod.launchImageLibraryAsync({ allowsMultipleSelection: false, allowsEditing: true, quality: 0.8 });
      if (!res.canceled && res.assets && res.assets[0]?.uri) {
        const asset = res.assets[0];
        const name = asset.fileName || 'epa.jpg';
        const type = 'image/jpeg';
        setImageFile({ uri: asset.uri, name, type });
      }
    } catch (e) {
      setError('Instala expo-image-picker para seleccionar imágenes');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>{epa ? 'Editar EPA' : 'Nueva EPA'}</Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Input label="Nombre de EPA" value={form.nombre_epa} onChangeText={(v) => setForm((p) => ({ ...p, nombre_epa: v }))} placeholder="Ingresa el nombre de la EPA" />
          <Input label="Descripción" value={form.descripcion} onChangeText={(v) => setForm((p) => ({ ...p, descripcion: v }))} placeholder="Ingresa una descripción" />
          <Text style={styles.label}>Tipo</Text>
          <Pressable style={styles.select} onPress={() => setOpenType(!openType)}>
            <Text style={styles.selectText}>{TYPES.find(t => t.value === form.tipo)?.label}</Text>
          </Pressable>
          {openType ? (
            <View style={styles.selectMenu}>
              {TYPES.map((t) => (
                <Pressable key={t.value} style={styles.selectItem} onPress={() => { setForm((p) => ({ ...p, tipo: t.value })); setOpenType(false); }}>
                  <Text style={styles.selectItemText}>{t.label}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
          <Text style={styles.label}>Estado</Text>
          <Pressable style={styles.select} onPress={() => setOpenEstado(!openEstado)}>
            <Text style={styles.selectText}>{form.estado === 'inactivo' ? 'Inactivo' : 'Activo'}</Text>
          </Pressable>
          {openEstado ? (
            <View style={styles.selectMenu}>
              {['activo','inactivo'].map((v) => (
                <Pressable key={v} style={styles.selectItem} onPress={() => { setForm((p) => ({ ...p, estado: v })); setOpenEstado(false); }}>
                  <Text style={styles.selectItemText}>{v === 'inactivo' ? 'Inactivo' : 'Activo'}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
          <View style={{ flexDirection: 'row', marginTop: 8 }}>
            <Button title="Tomar foto" variant="secondary" onPress={handlePickFromCamera} />
            <View style={{ width: 8 }} />
            <Button title="Seleccionar imagen" variant="secondary" onPress={handlePickFromLibrary} />
          </View>
          {imageFile ? (
            <View style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center' }}>
              <Image source={{ uri: imageFile.uri }} style={{ width: 72, height: 72, borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB' }} />
              <Text style={{ marginLeft: 8, fontSize: 12, color: '#334155' }}>{imageFile.name}</Text>
            </View>
          ) : null}
          <View style={styles.actions}>
            <View style={{ flex: 1 }} />
            <Button title="Cancelar" variant="secondary" onPress={onClose} />
            <View style={{ width: 12 }} />
            <Button title="Guardar" onPress={handleSave} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', alignItems: 'center', justifyContent: 'center' },
  card: { width: '90%', maxWidth: 420, backgroundColor: '#fff', borderRadius: 12, padding: 16 },
  title: { fontSize: 16, fontWeight: '700', textAlign: 'center', marginBottom: 8, color: '#16A34A' },
  label: { fontSize: 12, color: '#333', marginTop: 8 },
  select: { borderWidth: 1, borderColor: '#D0D5DD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginTop: 4 },
  selectText: { fontSize: 14, color: '#0f172a' },
  selectMenu: { borderWidth: 1, borderColor: '#E4E7EC', borderRadius: 8, marginTop: 6 },
  selectItem: { paddingHorizontal: 12, paddingVertical: 10 },
  selectItemText: { fontSize: 14, color: '#334155' },
  actions: { flexDirection: 'row', marginTop: 12, justifyContent: 'flex-end' },
  error: { marginTop: 8, fontSize: 12, color: '#DC2626', textAlign: 'center' },
});
