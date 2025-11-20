import React, { useEffect, useState } from 'react';
import { Modal, View, Text, StyleSheet, Pressable } from 'react-native';
import Input from '../atoms/Input';
import Button from '../atoms/Button';

const TYPES = [
  { value: 'enfermedad', label: 'Enfermedad' },
  { value: 'plaga', label: 'Plaga' },
  { value: 'arvense', label: 'Arvense' },
];

export default function EpaFormModal({ visible, onClose, onSubmit, epa }) {
  const [form, setForm] = useState({ nombre_epa: '', descripcion: '', tipo: 'enfermedad', estado: 'activo', imagen_referencia: '' });
  const [openType, setOpenType] = useState(false);
  const [openEstado, setOpenEstado] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (epa) setForm({ nombre_epa: epa.nombre_epa || epa.nombre || '', descripcion: epa.descripcion || '', tipo: epa.tipo || 'enfermedad', estado: epa.estado || 'activo', imagen_referencia: epa.imagen_referencia || '' });
    else setForm({ nombre_epa: '', descripcion: '', tipo: 'enfermedad', estado: 'activo', imagen_referencia: '' });
    setError('');
  }, [epa, visible]);

  const handleSave = async () => {
    const len = (s) => (s || '').trim().length;
    const errs = [];
    if (!len(form.nombre_epa)) errs.push('nombre');
    if (!len(form.descripcion)) errs.push('descripcion');
    if (!form.tipo) errs.push('tipo');
    if (errs.length) { setError('Por favor, completa los campos requeridos'); return; }
    try {
      await onSubmit({ ...form });
      onClose();
    } catch (e) {
      setError(e?.message || 'Error guardando');
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
          <Input label="Imagen de referencia (URL)" value={form.imagen_referencia} onChangeText={(v) => setForm((p) => ({ ...p, imagen_referencia: v }))} placeholder="https://..." />
          <View style={styles.actions}>
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