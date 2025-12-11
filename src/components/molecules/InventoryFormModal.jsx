import React, { useEffect, useState } from 'react';
import { Modal, View, Text, StyleSheet, Pressable } from 'react-native';
import Input from '../atoms/Input';
import Button from '../atoms/Button';
import { useAuth } from '../../contexts/AuthContext';
import { listCategorias, listAlmacenes } from '../../services/api';

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

export default function InventoryFormModal({ visible, onClose, onSubmit, insumo }) {
  const { token } = useAuth();
  const [values, setValues] = useState({ nombre_insumo: '', codigo: '', fecha_entrada: '', observacion: '', id_categoria: '', id_almacen: '', cantidad: '', unidad: '' });
  const [error, setError] = useState('');
  const [categorias, setCategorias] = useState([]);
  const [almacenes, setAlmacenes] = useState([]);
  const [openCategoria, setOpenCategoria] = useState(false);
  const [openAlmacen, setOpenAlmacen] = useState(false);

  useEffect(() => {
    const today = toApiDate(new Date());
    if (insumo) setValues({
      nombre_insumo: insumo.nombre_insumo || '',
      codigo: insumo.codigo || '',
      fecha_entrada: insumo.fecha_entrada || today,
      observacion: insumo.observacion || '',
      id_categoria: String(insumo.id_categoria?.id_categoria || insumo.id_categoria || ''),
      id_almacen: String(insumo.id_almacen?.id_almacen || insumo.id_almacen || ''),
      cantidad: '',
      unidad: '',
    });
    else setValues({ nombre_insumo: '', codigo: '', fecha_entrada: today, observacion: '', id_categoria: '', id_almacen: '', cantidad: '', unidad: '' });
    setError('');
  }, [insumo, visible]);

  useEffect(() => {
    let cancelled = false;
    const loadRefs = async () => {
      try {
        const [cats, alms] = await Promise.all([
          listCategorias(token),
          listAlmacenes(token),
        ]);
        if (!cancelled) {
          setCategorias(Array.isArray(cats) ? cats : []);
          setAlmacenes(Array.isArray(alms) ? alms : []);
        }
      } catch (e) {
        // Silenciar errores de carga para no bloquear el modal
      }
    };
    if (visible) loadRefs();
    return () => { cancelled = true; };
  }, [visible, token]);

  const handleSave = async () => {
    const len = (s) => (s || '').trim().length;
    const errs = [];
    if (!len(values.nombre_insumo)) errs.push('nombre_insumo');
    if (!len(values.codigo)) errs.push('codigo');
    if (!len(values.fecha_entrada)) errs.push('fecha_entrada');
    if (!len(values.observacion)) errs.push('observacion');
    if (errs.length) { setError('Completa todos los campos'); return; }
    try {
      const payload = {
        nombre_insumo: values.nombre_insumo,
        codigo: values.codigo,
        fecha_entrada: values.fecha_entrada,
        observacion: values.observacion,
        ...(values.id_categoria ? { id_categoria: Number(values.id_categoria) } : {}),
        ...(values.id_almacen ? { id_almacen: Number(values.id_almacen) } : {}),
      };
      const extra = (!insumo ? {
        cantidad: values.cantidad,
        unidad: values.unidad,
      } : undefined);
      await onSubmit(payload, extra);
      onClose();
    } catch (e) {
      setError(e?.message || 'Error guardando');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.headerBar}><Text style={styles.headerTitle}>{insumo ? 'Actualizar Insumo' : 'Nuevo Insumo'}</Text></View>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Input label="Nombre del insumo *" value={values.nombre_insumo} onChangeText={(v) => setValues((p) => ({ ...p, nombre_insumo: v }))} placeholder="Nombre del insumo" />
          <Input label="Código *" value={values.codigo} onChangeText={(v) => setValues((p) => ({ ...p, codigo: v }))} placeholder="Código" />
          {insumo ? null : (
            <Input label="Cantidad" value={String(values.cantidad)} onChangeText={(v) => setValues((p) => ({ ...p, cantidad: v }))} placeholder="Ej: 0" />
          )}
          {insumo ? null : (
            <Input label="Unidad" value={values.unidad} onChangeText={(v) => setValues((p) => ({ ...p, unidad: v }))} placeholder="Ej: kg, L, und" />
          )}
          <Text style={styles.label}>Categoría</Text>
          <Pressable style={styles.select} onPress={() => setOpenCategoria(!openCategoria)}>
            <Text style={styles.selectText}>{(() => {
              const found = categorias.find((c) => String(c.id) === String(values.id_categoria));
              return found?.nombre || 'Selecciona categoría';
            })()}</Text>
          </Pressable>
          {openCategoria ? (
            <View style={styles.selectMenu}>
              {categorias.map((c, idx) => (
                <Pressable key={String(c.id || idx)} style={styles.selectItem} onPress={() => { setValues((p) => ({ ...p, id_categoria: String(c.id) })); setOpenCategoria(false); }}>
                  <Text style={styles.selectItemText}>{c.nombre}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          <Text style={styles.label}>Almacén</Text>
          <Pressable style={styles.select} onPress={() => setOpenAlmacen(!openAlmacen)}>
            <Text style={styles.selectText}>{(() => {
              const found = almacenes.find((a) => String(a.id) === String(values.id_almacen));
              return found?.nombre || 'Selecciona almacén';
            })()}</Text>
          </Pressable>
          {openAlmacen ? (
            <View style={styles.selectMenu}>
              {almacenes.map((a, idx) => (
                <Pressable key={String(a.id || idx)} style={styles.selectItem} onPress={() => { setValues((p) => ({ ...p, id_almacen: String(a.id) })); setOpenAlmacen(false); }}>
                  <Text style={styles.selectItemText}>{a.nombre}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          <Input label="Fecha de entrada" value={toUiDate(values.fecha_entrada)} editable={false} placeholder="" />
          <Input label="Observación *" value={values.observacion} onChangeText={(v) => setValues((p) => ({ ...p, observacion: v.slice(0, 50) }))} placeholder="Observación" />
          <Text style={styles.counter}>Máximo 50 caracteres ({(values.observacion || '').length}/50)</Text>
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
  counter: { fontSize: 12, color: '#94a3b8', marginTop: 4 },
});
