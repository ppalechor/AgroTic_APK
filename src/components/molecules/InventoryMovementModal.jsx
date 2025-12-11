import React, { useEffect, useState } from 'react';
import { Modal, View, Text, StyleSheet, Pressable } from 'react-native';
import Input from '../atoms/Input';
import Button from '../atoms/Button';

const TYPES = [
  { value: 'Entrada', label: 'Entrada' },
  { value: 'Salida', label: 'Salida' },
];

const toApiDate = (d) => {
  const pad = (n) => String(n).padStart(2, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  return `${year}-${month}-${day}`;
};
const toUiDate = (apiDate) => {
  const s = String(apiDate || '');
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return s || '';
  const [, y, mo, d] = m;
  return `${d}/${mo}/${y}`;
};

export default function InventoryMovementModal({ visible, onClose, onSubmit, insumos = [], cultivos = [], preset }) {
  const [values, setValues] = useState({ tipo_movimiento: 'Entrada', id_insumo: '', cantidad: '', unidad_medida: '', fecha_movimiento: '', id_cultivo: '', valor_unidad: '' });
  const [openTipo, setOpenTipo] = useState(false);
  const [openInsumo, setOpenInsumo] = useState(false);
  const [openCultivo, setOpenCultivo] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const today = toApiDate(new Date());
    setValues((p) => {
      // Prefill from preset if available; otherwise ensure today as default on open
      const next = {
        tipo_movimiento: preset?.tipo_movimiento || p.tipo_movimiento || 'Entrada',
        id_insumo: preset?.id_insumo || preset?.id || p.id_insumo || '',
        cantidad: preset?.cantidad != null ? String(preset?.cantidad) : p.cantidad || '',
        unidad_medida: preset?.unidad_medida || p.unidad_medida || '',
        fecha_movimiento: preset?.fecha_movimiento || p.fecha_movimiento || today,
        id_cultivo: preset?.id_cultivo ?? p.id_cultivo ?? '',
        valor_unidad: preset?.valor_unidad != null ? String(preset?.valor_unidad) : (p.valor_unidad ?? ''),
      };
      // If editing, keep original fecha_movimiento from preset
      if (preset?.id_movimiento) {
        next.fecha_movimiento = preset.fecha_movimiento || today;
      }
      return next;
    });
    setError('');
  }, [preset, visible]);

  const handleSave = async () => {
    const len = (s) => (s || '').trim().length;
    const errs = [];
    if (!values.id_insumo) errs.push('id_insumo');
    if (!len(values.cantidad)) errs.push('cantidad');
    if (!len(values.unidad_medida)) errs.push('unidad_medida');
    if (!len(values.fecha_movimiento)) errs.push('fecha_movimiento');
    if (!len(values.tipo_movimiento)) errs.push('tipo_movimiento');
    const isSalida = String(values.tipo_movimiento).toLowerCase() === 'salida';
    if (isSalida) {
      if (!values.id_cultivo) errs.push('id_cultivo');
      if (!len(values.valor_unidad)) errs.push('valor_unidad');
    }
    if (errs.length) { setError('Completa todos los campos'); return; }
    try {
      const tipoFound = TYPES.find(t => t.value.toLowerCase() === String(values.tipo_movimiento).toLowerCase());
      const tipo = tipoFound ? tipoFound.value : String(values.tipo_movimiento);
      const payload = { ...values, tipo_movimiento: tipo, id_insumo: Number(values.id_insumo), cantidad: Number(values.cantidad) };
      if (isSalida) {
        payload.id_cultivo = Number(values.id_cultivo);
        payload.valor_unidad = Number(values.valor_unidad);
      } else {
        delete payload.id_cultivo;
        delete payload.valor_unidad;
      }
      // Ensure fecha_movimiento is set to today for new records
      if (!preset?.id_movimiento) {
        payload.fecha_movimiento = toApiDate(new Date());
      }
      await onSubmit(payload);
      onClose();
    } catch (e) {
      setError(e?.message || 'Error guardando');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.headerBar}><Text style={styles.headerTitle}>{preset?.id_movimiento ? 'Editar Movimiento' : 'Registrar movimiento'}</Text></View>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Text style={styles.label}>Tipo</Text>
          <Pressable style={styles.select} onPress={() => setOpenTipo(!openTipo)}>
            <Text style={styles.selectText}>{TYPES.find(t => t.value.toLowerCase() === String(values.tipo_movimiento).toLowerCase())?.label || 'Selecciona tipo'}</Text>
          </Pressable>
          {openTipo ? (
            <View style={styles.selectMenu}>
              {TYPES.map((t) => (
                <Pressable key={t.value} style={styles.selectItem} onPress={() => { setValues((p) => ({ ...p, tipo_movimiento: t.value })); setOpenTipo(false); }}>
                  <Text style={styles.selectItemText}>{t.label}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
          <Text style={styles.label}>Insumo</Text>
          <Pressable style={styles.select} onPress={() => setOpenInsumo(!openInsumo)}>
            <Text style={styles.selectText}>{(() => {
              const found = insumos.find((i) => String(i.id_insumo || i.id) === String(values.id_insumo));
              return found?.nombre_insumo || 'Selecciona insumo';
            })()}</Text>
          </Pressable>
          {openInsumo ? (
            <View style={styles.selectMenu}>
              {insumos.map((i, idx) => (
                <Pressable key={String(i.id_insumo || i.id || idx)} style={styles.selectItem} onPress={() => { setValues((p) => ({ ...p, id_insumo: i.id_insumo || i.id })); setOpenInsumo(false); }}>
                  <Text style={styles.selectItemText}>{i.nombre_insumo || i.nombre || `Insumo ${i.id_insumo || i.id}`}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
          {String(values.tipo_movimiento).toLowerCase() === 'salida' ? (
            <>
              <Text style={styles.label}>Cultivo</Text>
              <Pressable style={styles.select} onPress={() => setOpenCultivo(!openCultivo)}>
                <Text style={styles.selectText}>{(() => {
                  const found = cultivos.find((c) => String(c.id_cultivo || c.id) === String(values.id_cultivo));
                  return found?.nombre_cultivo || found?.displayName || found?.nombre || 'Selecciona cultivo';
                })()}</Text>
              </Pressable>
              {openCultivo ? (
                <View style={styles.selectMenu}>
                  {cultivos.map((c, idx) => (
                    <Pressable key={String(c.id_cultivo || c.id || idx)} style={styles.selectItem} onPress={() => { setValues((p) => ({ ...p, id_cultivo: c.id_cultivo || c.id })); setOpenCultivo(false); }}>
                      <Text style={styles.selectItemText}>{c.nombre_cultivo || c.displayName || c.nombre || `Cultivo ${c.id_cultivo || c.id}`}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
              <Input label="Valor unitario" value={String(values.valor_unidad)} onChangeText={(v) => setValues((p) => ({ ...p, valor_unidad: v }))} placeholder="Ej: 5.50" />
            </>
          ) : null}
          <Input label="Cantidad" value={String(values.cantidad)} onChangeText={(v) => setValues((p) => ({ ...p, cantidad: v }))} placeholder="Ej: 10" />
          <Input label="Unidad de medida" value={values.unidad_medida} onChangeText={(v) => setValues((p) => ({ ...p, unidad_medida: v }))} placeholder="Ej: kg, L, und" />
          <Input label="Fecha" value={toUiDate(values.fecha_movimiento)} editable={false} placeholder="" />
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
  headerBar: { backgroundColor: '#22C55E', borderTopLeftRadius: 12, borderTopRightRadius: 12, marginTop: -16, marginHorizontal: -16, paddingVertical: 12, alignItems: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#fff' },
  label: { fontSize: 12, color: '#333', marginTop: 8 },
  select: { borderWidth: 1, borderColor: '#D0D5DD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginTop: 4 },
  selectText: { fontSize: 14, color: '#0f172a' },
  selectMenu: { borderWidth: 1, borderColor: '#E4E7EC', borderRadius: 8, marginTop: 6 },
  selectItem: { paddingHorizontal: 12, paddingVertical: 10 },
  selectItemText: { fontSize: 14, color: '#334155' },
  actions: { flexDirection: 'row', marginTop: 12, justifyContent: 'flex-end' },
  error: { marginTop: 8, fontSize: 12, color: '#DC2626', textAlign: 'center' },
});
