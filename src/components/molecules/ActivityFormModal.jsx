import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Modal, ScrollView, ActivityIndicator, Image, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '../../contexts/AuthContext';
import { listActividadFotos, deleteActividadFoto, listUsuarios, listInsumos } from '../../services/api';
const PhotoUploadModal = React.lazy(() => import('./PhotoUploadModal'));

const activityTypes = [
  { value: 'siembra', label: 'Siembra' },
  { value: 'riego', label: 'Riego' },
  { value: 'fertilizacion', label: 'Fertilización' },
  { value: 'poda', label: 'Poda' },
  { value: 'cosecha', label: 'Cosecha' },
  { value: 'otro', label: 'Otro' }
];

const statusOptions = [
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'en_progreso', label: 'En Progreso' },
  { value: 'completada', label: 'Completada' },
  { value: 'cancelada', label: 'Cancelada' }
];

export default function ActivityFormModal({ visible, onClose, onSubmit, activity, crops = [], users: usersProp = [], loading }) {
  const { token } = useAuth();
  const [formData, setFormData] = useState({
    tipo_actividad: '',
    fecha: null,
    responsable: '',
    id_usuario: '',
    detalles: '',
    estado: 'pendiente',
    id_cultivo: '',
    costo_mano_obra: '',
    costo_maquinaria: ''
  });
  const [recursos, setRecursos] = useState([]);
  const [insumos, setInsumos] = useState([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [photoError, setPhotoError] = useState('');
  const [openPhotoModal, setOpenPhotoModal] = useState(false);
  const [users, setUsers] = useState([]);
  const [usersError, setUsersError] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    if (activity) {
      setFormData({
        tipo_actividad: (() => {
          const raw = activity.tipo_actividad || '';
          const s = String(raw).toLowerCase();
          const allowed = ['siembra','riego','fertilizacion','poda','cosecha','otro'];
          return allowed.includes(s) ? s : '';
        })(),
        fecha: activity.fecha ? new Date(activity.fecha) : new Date(),
        responsable: activity.responsable || '',
        id_usuario: activity.id_usuario || activity.id_responsable || '',
        detalles: activity.detalles || '',
        estado: activity.estado || 'pendiente',
        id_cultivo: activity.id_cultivo || '',
        costo_mano_obra: (activity.costo_mano_obra ?? activity.costoManoObra ?? ''),
        costo_maquinaria: (activity.costo_maquinaria ?? activity.costoMaquinaria ?? '')
      });
      setRecursos(Array.isArray(activity?.recursos) ? activity.recursos.map((r) => ({
        tipo_recurso: (r.tipo_recurso || r.tipo || 'consumible'),
        id_insumo: r.id_insumo || r.insumo?.id_insumo || '',
        cantidad: r.cantidad ?? '',
        horas_uso: r.horas_uso ?? '',
        costo_unitario: r.costo_unitario ?? '',
      })) : []);
      (async () => {
        try {
          setPhotoError('');
          const id = activity.id_actividad || activity.id;
          if (id) {
            const arr = await listActividadFotos(id, token);
            setPhotos(arr.map((f) => ({ id: f.id, uri: f.url_imagen })));
          } else {
            setPhotos([]);
          }
        } catch (e) {
          setPhotos([]);
        }
      })();
    } else {
      setFormData({
        tipo_actividad: '',
        fecha: new Date(),
        responsable: '',
        id_usuario: '',
        detalles: '',
        estado: 'pendiente',
        id_cultivo: '',
        costo_mano_obra: '',
        costo_maquinaria: ''
      });
      setRecursos([]);
      setPhotos([]);
    }
  }, [activity, visible]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        if (!token) { setUsers([]); return; }
        setUsersError('');
        const { items } = await listUsuarios(token, { page: 1, limit: 100 });
        setUsers(items || []);
      } catch (e) {
        setUsers([]);
        setUsersError(e?.message || 'Error obteniendo usuarios');
      }
    };
  if (visible) fetchUsers();
  }, [visible, token]);

  useEffect(() => {
    const fetchInsumos = async () => {
      try {
        if (!token) { setInsumos([]); return; }
        const resp = await listInsumos(token);
        const arr = Array.isArray(resp) ? resp : (Array.isArray(resp?.items) ? resp.items : []);
        setInsumos(arr);
      } catch (e) {
        setInsumos([]);
      }
    };
    if (visible) fetchInsumos();
  }, [visible, token]);

  const allUsers = (Array.isArray(usersProp) && usersProp.length ? usersProp : users);
  const filteredUsers = allUsers.filter(u => {
    const q = String(userSearch || '').trim().toLowerCase();
    if (!q) return true;
    const name = String(u.nombres || '').toLowerCase();
    const email = String(u.email || '').toLowerCase();
    const doc = String(u.numero_documento || '').toLowerCase();
    return name.includes(q) || email.includes(q) || doc.includes(q);
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      handleChange('fecha', selectedDate);
    }
  };

  const handleSubmit = async () => {
    // Validaciones mínimas requeridas por el backend
    const errors = [];
    if (!formData.tipo_actividad) errors.push('Selecciona el tipo de actividad');
    if (!formData.fecha) errors.push('Selecciona la fecha');
    if (!formData.id_cultivo) errors.push('Selecciona el cultivo');
    if (!formData.responsable || String(formData.responsable).trim().length === 0) errors.push('Selecciona o escribe el responsable');
    if (!formData.detalles || String(formData.detalles).trim().length === 0) errors.push('Escribe los detalles');
    if (errors.length > 0) {
      setSubmitError(errors[0]);
      return;
    }

    const responsableId = formData.id_usuario ? parseInt(formData.id_usuario, 10) : undefined;
    const toISO = (d) => {
      try {
        const dt = typeof d === 'string' ? new Date(d) : d;
        const y = dt.getFullYear();
        const m = String(dt.getMonth() + 1).padStart(2, '0');
        const day = String(dt.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      } catch { return undefined; }
    };
    const dateStr = toISO(formData.fecha);
    const payload = {
      tipo_actividad: formData.tipo_actividad,
      fecha: dateStr,
      fecha_actividad: dateStr,
      responsable: formData.responsable,
      responsable_id: responsableId,
      detalles: formData.detalles,
      estado: formData.estado,
      id_cultivo: formData.id_cultivo ? parseInt(formData.id_cultivo, 10) : undefined,
      costo_mano_obra: formData.costo_mano_obra !== '' ? Number(formData.costo_mano_obra) : undefined,
      costo_maquinaria: formData.costo_maquinaria !== '' ? Number(formData.costo_maquinaria) : undefined,
      recursos: recursos
        .filter((r) => r.id_insumo)
        .map((r) => ({
          id_insumo: r.id_insumo ? Number(r.id_insumo) : undefined,
          cantidad: r.cantidad !== '' ? Number(r.cantidad) : undefined,
          horas_uso: r.horas_uso !== '' ? Number(r.horas_uso) : undefined,
          costo_unitario: r.costo_unitario !== '' ? Number(r.costo_unitario) : undefined,
        }))
    };
    if (payload.tipo_actividad) {
      const allowed = ['siembra','riego','fertilizacion','poda','cosecha','otro'];
      const s = String(payload.tipo_actividad).toLowerCase();
      payload.tipo_actividad = allowed.includes(s) ? s : undefined;
    }
    if (payload.tipo_actividad) {
      const allowed = ['siembra','riego','fertilizacion','poda','cosecha','otro'];
      const s = String(payload.tipo_actividad).toLowerCase();
      if (!allowed.includes(s)) {
        payload.tipo_actividad = undefined;
      } else {
        payload.tipo_actividad = s;
      }
    }
    try {
      setSubmitError('');
      await onSubmit(payload);
    } catch (e) {
      const msg = e?.message || 'Error guardando actividad';
      setSubmitError(msg);
      try { Alert.alert('Error', msg); } catch {}
    }
  };

  return (
    <View style={{ flex: 1 }}>
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent presentationStyle="overFullScreen">
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.card}>
          <Text style={styles.title}>{activity ? 'Editar Actividad' : 'Nueva Actividad'}</Text>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator
          >
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formData.tipo_actividad}
                onValueChange={(value) => handleChange('tipo_actividad', value)}
                style={styles.picker}
              >
                <Picker.Item label="Seleccionar tipo..." value="" />
                {activityTypes.map(option => (
                  <Picker.Item key={option.value} label={option.label} value={option.value} />
                ))}
              </Picker>
            </View>
            {!formData.tipo_actividad ? (
              <Text style={styles.detailsMuted}>Selecciona el tipo de tarea a realizar.</Text>
            ) : null}

            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={String(formData.id_cultivo || '')}
                onValueChange={(value) => handleChange('id_cultivo', String(value))}
                style={styles.picker}
              >
                <Picker.Item label="Seleccionar cultivo..." value="" />
                {crops.map(crop => (
                  <Picker.Item key={String(crop.id_cultivo || crop.id)} label={crop.nombre_cultivo || crop.displayName || crop.tipo_cultivo} value={String(crop.id_cultivo || crop.id)} />
                ))}
              </Picker>
            </View>
            {!formData.id_cultivo ? (
              <Text style={styles.detailsMuted}>Selecciona el cultivo asociado a la actividad.</Text>
            ) : null}

            <Pressable style={styles.dateBtn} onPress={() => setShowDatePicker(true)}>
              <Text style={styles.dateText}
              >
                Fecha: {formData.fecha ? formData.fecha.toLocaleDateString() : 'Seleccionar'}
              </Text>
            </Pressable>
            <Text style={styles.detailsMuted}>Selecciona la fecha programada de la actividad.</Text>

            <TextInput
              style={styles.input}
              placeholder="Buscar usuario por nombre, email o documento..."
              value={userSearch}
              onChangeText={setUserSearch}
            />
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={String(formData.id_usuario || '')}
                onValueChange={(value) => {
                   const sel = allUsers.find(u => String(u.id || u.id_usuarios || u.id_usuario) === String(value));
                  const nombre = sel ? (sel.nombres || sel.email || '') : '';
                  setFormData(prev => ({ ...prev, id_usuario: String(value), responsable: nombre }));
                }}
                style={styles.picker}
              >
                <Picker.Item label="Seleccionar responsable..." value="" />
                {filteredUsers.map(u => (
                  <Picker.Item key={String(u.id || u.id_usuarios || u.id_usuario)} label={(u.nombres || u.email)} value={String(u.id || u.id_usuarios || u.id_usuario)} />
                ))}
              </Picker>
            </View>
            {!formData.id_usuario && !formData.responsable ? (
              <Text style={styles.detailsMuted}>Selecciona un usuario o escribe el responsable.</Text>
            ) : null}
            {usersError ? <Text style={{ color: '#d32f2f', marginTop: 4 }}>{usersError}</Text> : null}
            {filteredUsers.length === 0 && (
              <TextInput
                style={styles.input}
                placeholder="Responsable (texto)"
                value={formData.responsable}
                onChangeText={(value) => setFormData(prev => ({ ...prev, responsable: value, id_usuario: '' }))}
              />
            )}

            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formData.estado}
                onValueChange={(value) => handleChange('estado', value)}
                style={styles.picker}
              >
                {statusOptions.map(option => (
                  <Picker.Item key={option.value} label={option.label} value={option.value} />
                ))}
              </Picker>
            </View>

            <Text style={styles.sectionTitle}>Costos</Text>
            <TextInput
              style={styles.input}
              placeholder="Costo mano de obra (COP)"
              value={String(formData.costo_mano_obra || '')}
              onChangeText={(v) => handleChange('costo_mano_obra', v.replace(/[^0-9.]/g, ''))}
              keyboardType="numeric"
            />
            <Text style={styles.detailsMuted}>Valor en moneda, usa punto para decimales (ej.: 1200.50).</Text>
            <TextInput
              style={styles.input}
              placeholder="Costo maquinaria (COP)"
              value={String(formData.costo_maquinaria || '')}
              onChangeText={(v) => handleChange('costo_maquinaria', v.replace(/[^0-9.]/g, ''))}
              keyboardType="numeric"
            />
            <Text style={styles.detailsMuted}>Valor en moneda, usa punto para decimales (ej.: 800.00).</Text>

            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Detalles"
              value={formData.detalles}
              onChangeText={(value) => handleChange('detalles', value)}
              multiline
              numberOfLines={3}
            />
            <Text style={styles.detailsMuted}>Añade descripción y observaciones de la actividad.</Text>

            <Text style={styles.sectionTitle}>Recursos utilizados</Text>
            <Text style={styles.detailsMuted}>Registra insumos y herramientas; herramientas usan horas y consumibles usan cantidad.</Text>
            <Pressable style={[styles.btn, styles.btnSecondary, { alignSelf: 'flex-start' }]} onPress={() => setRecursos((prev) => ([...prev, { tipo_recurso: 'consumible', id_insumo: '', cantidad: '', horas_uso: '', costo_unitario: '' }]))}>
              <Text style={styles.btnSecondaryText}>Agregar recurso</Text>
            </Pressable>
            {recursos.map((r, idx) => {
              const tipo = r.tipo_recurso || r.tipo || 'consumible';
              const isConsumible = tipo === 'consumible';
              const subtotal = (() => {
                const cu = Number(r.costo_unitario || 0);
                const cant = Number(r.cantidad || 0);
                const hrs = Number(r.horas_uso || 0);
                return isConsumible ? (cant * cu) : (hrs * cu);
              })();
              return (
                <View key={`rec-${idx}`} style={{ borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, padding: 10, marginBottom: 10 }}>
                  <View style={styles.pickerContainer}>
                    <Picker selectedValue={tipo} onValueChange={(v) => setRecursos((p) => p.map((x, i) => i === idx ? { ...x, tipo_recurso: v } : x))} style={styles.picker}>
                      <Picker.Item label="Consumible" value="consumible" />
                      <Picker.Item label="Herramienta" value="herramienta" />
                    </Picker>
                  </View>
                  <View style={styles.pickerContainer}>
                    <Picker selectedValue={String(r.id_insumo || '')} onValueChange={(v) => setRecursos((p) => p.map((x, i) => i === idx ? { ...x, id_insumo: v } : x))} style={styles.picker}>
                      <Picker.Item label="Seleccionar insumo..." value="" />
                      {insumos.map((i) => (
                        <Picker.Item key={String(i.id_insumo || i.id)} label={i.nombre_insumo || i.nombre || `Insumo ${i.id_insumo || i.id}`} value={String(i.id_insumo || i.id)} />
                      ))}
                    </Picker>
                  </View>
                  {isConsumible ? (
                    <TextInput style={styles.input} placeholder="Cantidad" value={String(r.cantidad || '')} onChangeText={(v) => setRecursos((p) => p.map((x, i) => i === idx ? { ...x, cantidad: v.replace(/[^0-9.]/g, '') } : x))} keyboardType="numeric" />
                  ) : (
                    <TextInput style={styles.input} placeholder="Horas de uso" value={String(r.horas_uso || '')} onChangeText={(v) => setRecursos((p) => p.map((x, i) => i === idx ? { ...x, horas_uso: v.replace(/[^0-9.]/g, '') } : x))} keyboardType="numeric" />
                  )}
                  <TextInput style={styles.input} placeholder="Costo unitario (COP)" value={String(r.costo_unitario || '')} onChangeText={(v) => setRecursos((p) => p.map((x, i) => i === idx ? { ...x, costo_unitario: v.replace(/[^0-9.]/g, '') } : x))} keyboardType="numeric" />
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ color: '#334155' }}>Subtotal: {Number.isFinite(subtotal) ? `COP ${Math.round(subtotal).toLocaleString('es-CO')}` : '—'}</Text>
                    <Pressable style={[styles.btn, { backgroundColor: '#EF4444' }]} onPress={() => setRecursos((p) => p.filter((_, i) => i !== idx))}><Text style={styles.btnPrimaryText}>Eliminar</Text></Pressable>
                  </View>
                </View>
              );
            })}
            {activity ? (
              <>
                <Text style={styles.sectionTitle}>Imágenes</Text>
                {!loading && (
                  <Pressable style={[styles.btn, styles.btnSecondary, { alignSelf: 'flex-start', marginBottom: 8 }]} onPress={() => setOpenPhotoModal(true)}>
                    <Feather name="camera" size={16} color="#334155" />
                    <Text style={styles.btnSecondaryText}>Agregar foto</Text>
                  </Pressable>
                )}
                {Array.isArray(photos) && photos.length > 0 ? (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                    {photos.map((p, idx) => (
                      <View key={idx} style={styles.photoWrap}>
                        <Image source={{ uri: p.uri }} style={styles.photoImg} />
                        {p.id ? (
                          <Pressable
                            style={styles.photoDel}
                            onPress={async () => {
                              try {
                                const id = activity?.id_actividad || activity?.id;
                                await deleteActividadFoto(p.id, token);
                                const arr = await listActividadFotos(id, token);
                                setPhotos(arr.map((f) => ({ id: f.id, uri: f.url_imagen })));
                              } catch (e) {
                                setPhotoError(e?.message || 'No se pudo eliminar la foto');
                              }
                            }}
                          >
                            <Feather name="trash-2" size={14} color="#fff" />
                          </Pressable>
                        ) : null}
                      </View>
                    ))}
                  </ScrollView>
                ) : (
                  <Text style={styles.detailsMuted}>No hay fotos para esta actividad.</Text>
                )}
                {photoError ? <Text style={[styles.detailsMuted, { color: '#d32f2f' }]}>{photoError}</Text> : null}
              </>
            ) : null}
          </ScrollView>
          {submitError ? <Text style={{ color: '#d32f2f', marginTop: 4 }}>{submitError}</Text> : null}
          <View style={styles.actions}>
            <Pressable style={[styles.btn, styles.btnSecondary]} onPress={onClose}>
              <Text style={styles.btnSecondaryText}>Cancelar</Text>
            </Pressable>
            <Pressable style={[styles.btn, styles.btnPrimary]} onPress={handleSubmit} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnPrimaryText}>{activity ? 'Actualizar' : 'Crear'}</Text>}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
      {showDatePicker && (
        <DateTimePicker
          value={formData.fecha || new Date()}
          mode="date"
          display="default"
          onChange={handleDateChange}
        />
      )}
    </Modal>
    {openPhotoModal ? (
      <React.Suspense fallback={null}>
        <PhotoUploadModal
          visible={openPhotoModal}
          activity={activity}
          onClose={() => setOpenPhotoModal(false)}
          onUploaded={async () => {
            try {
              const id = activity?.id_actividad || activity?.id;
              if (id) {
                const arr = await listActividadFotos(id, token);
                setPhotos(arr.map((f) => ({ id: f.id, uri: f.url_imagen })));
              }
            } catch (e) {
              setPhotoError(e?.message || 'No se pudo refrescar las fotos');
            }
          }}
        />
      </React.Suspense>
    ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'stretch', paddingHorizontal: 12, paddingVertical: 20 },
  card: { width: '100%', height: '90%', backgroundColor: '#fff', borderRadius: 12, padding: 16 },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 16, textAlign: 'center' },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: 24 },
  input: { borderWidth: 1, borderColor: '#E4E7EC', borderRadius: 8, padding: 10, marginBottom: 12, fontSize: 14 },
  textArea: { height: 80, textAlignVertical: 'top' },
  pickerContainer: { borderWidth: 1, borderColor: '#E4E7EC', borderRadius: 8, marginBottom: 12 },
  picker: { height: 50 },
  dateBtn: { borderWidth: 1, borderColor: '#E4E7EC', borderRadius: 8, padding: 10, marginBottom: 12, backgroundColor: '#f9f9f9' },
  dateText: { fontSize: 14, color: '#0f172a' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16 },
  btn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, marginLeft: 8 },
  btnSecondary: { borderWidth: 1, borderColor: '#E4E7EC' },
  btnSecondaryText: { color: '#334155', fontSize: 14 },
  btnPrimary: { backgroundColor: '#16A34A' },
  btnPrimaryText: { color: '#fff', fontSize: 14 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginTop: 8 },
  detailsMuted: { fontSize: 13, color: '#64748b' },
  photoWrap: { width: 96, height: 96, borderRadius: 8, marginRight: 8, borderWidth: 1, borderColor: '#E5E7EB', overflow: 'hidden' },
  photoImg: { width: '100%', height: '100%' },
  photoDel: { position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 10, padding: 4 },
});
