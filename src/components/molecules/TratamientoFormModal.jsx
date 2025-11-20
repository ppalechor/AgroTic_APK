import React, { useEffect, useState } from 'react';
import { Modal, View, Text, StyleSheet, Pressable } from 'react-native';
import Input from '../atoms/Input';
import Button from '../atoms/Button';

const TYPES = [
  { value: 'Biologico', label: 'Biológico' },
  { value: 'Quimico', label: 'Químico' },
];

export default function TratamientoFormModal({ visible, onClose, onSubmit, tratamiento, epas = [] }) {
  const [values, setValues] = useState({ descripcion: '', dosis: '', frecuencia: '', id_epa: '', tipo: 'Biologico' });
  const [openTipo, setOpenTipo] = useState(false);
  const [openEpa, setOpenEpa] = useState(false);
  const [error, setError] = useState('');
  const normalizeTipo = (v) => {
    const s = String(v || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (s.startsWith('bio') || s.includes('biolog')) return 'Biologico';
    if (s.startsWith('qui') || s.includes('quim')) return 'Quimico';
    return '';
  };

  useEffect(() => {
    if (tratamiento) {
      const tipoNorm = normalizeTipo(tratamiento.tipo || 'Biologico') || 'Biologico';
      setValues({ descripcion: tratamiento.descripcion || '', dosis: tratamiento.dosis || '', frecuencia: tratamiento.frecuencia || '', id_epa: tratamiento.id_epa || '', tipo: tipoNorm });
    } else {
      setValues({ descripcion: '', dosis: '', frecuencia: '', id_epa: '', tipo: 'Biologico' });
    }
    setError('');
  }, [tratamiento, visible]);

  const handleSave = async () => {
    const len = (s) => (s || '').trim().length;
    const errs = [];
    if (!len(values.descripcion)) errs.push('descripcion');
    if (!len(values.dosis)) errs.push('dosis');
    if (!len(values.frecuencia)) errs.push('frecuencia');
    if (!values.id_epa) errs.push('id_epa');
    const tipoNorm = normalizeTipo(values.tipo);
    if (!tipoNorm) errs.push('tipo');
    if (errs.length) { setError('El tipo debe ser Biológico o Químico'); return; }
    try {
      await onSubmit({ ...values, id_epa: Number(values.id_epa), tipo: tipoNorm });
      onClose();
    } catch (e) {
      setError(e?.message || 'Error guardando');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>{tratamiento ? 'Editar Tratamiento' : 'Nuevo Tratamiento'}</Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Input label="Descripción" value={values.descripcion} onChangeText={(v) => setValues((p) => ({ ...p, descripcion: v }))} placeholder="Ingresa una descripción" />
          <Text style={styles.label}>Tipo de tratamiento</Text>
          <Pressable style={styles.select} onPress={() => setOpenTipo(!openTipo)}>
            <Text style={styles.selectText}>{TYPES.find(t => t.value === normalizeTipo(values.tipo))?.label || 'Selecciona tipo'}</Text>
          </Pressable>
          {openTipo ? (
            <View style={styles.selectMenu}>
              {TYPES.map((t) => (
                <Pressable key={t.value} style={styles.selectItem} onPress={() => { setValues((p) => ({ ...p, tipo: t.value })); setOpenTipo(false); }}>
                  <Text style={styles.selectItemText}>{t.label}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
          <Input label="Dosis" value={values.dosis} onChangeText={(v) => setValues((p) => ({ ...p, dosis: v }))} placeholder="Ej: 200ml/ha, 2kg/ha" />
          <Input label="Frecuencia" value={values.frecuencia} onChangeText={(v) => setValues((p) => ({ ...p, frecuencia: v }))} placeholder="Ej: cada 15 días" />
          <Text style={styles.label}>EPA</Text>
          <Pressable style={styles.select} onPress={() => setOpenEpa(!openEpa)}>
            <Text style={styles.selectText}>{(() => {
              const found = epas.find((e) => {
                const eid = e.id ?? e.id_epa;
                return String(eid) === String(values.id_epa);
              });
              return found?.nombre_epa || found?.nombre || 'Selecciona EPA';
            })()}</Text>
          </Pressable>
          {openEpa ? (
            <View style={styles.selectMenu}>
              {epas.map((e, idx) => (
                <Pressable
                  key={String(e.id ?? e.id_epa ?? idx)}
                  style={styles.selectItem}
                  onPress={() => {
                    const eid = e.id ?? e.id_epa;
                    setValues((p) => ({ ...p, id_epa: eid }));
                    setOpenEpa(false);
                  }}
                >
                  <Text style={styles.selectItemText}>{e.nombre_epa || e.nombre || e.descripcion || `EPA ${e.id ?? e.id_epa ?? ''}`}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
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