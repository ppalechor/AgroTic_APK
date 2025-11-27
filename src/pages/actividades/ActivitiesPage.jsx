import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, FlatList, Pressable, StyleSheet, Modal, ActivityIndicator, ScrollView, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { useAuth } from '../../contexts/AuthContext';
import { baseUrl, listActividades, createActividad, updateActividad, deleteActividad, listCultivos, uploadActividadFoto, listActividadFotos, deleteActividadFoto, createRealiza, listUsuarios } from '../../services/api';
import ActivityFormModal from '../../components/molecules/ActivityFormModal';
// import { Picker } from '@react-native-picker/picker';

LocaleConfig.locales['es'] = {
  monthNames: ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'],
  monthNamesShort: ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'],
  dayNames: ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'],
  dayNamesShort: ['DOM','LUN','MAR','MIÉ','JUE','VIE','SÁB'],
  today: 'Hoy',
};
LocaleConfig.defaultLocale = 'es';

function ConfirmModal({ visible, onCancel, onConfirm, text }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Confirmar</Text>
          <Text style={styles.modalText}>{text}</Text>
          <View style={styles.modalActions}>
            <Pressable style={[styles.btn, styles.btnSecondary]} onPress={onCancel}><Text style={styles.btnSecondaryText}>Cancelar</Text></Pressable>
            <Pressable style={[styles.btn, styles.btnDanger]} onPress={onConfirm}><Text style={styles.btnPrimaryText}>Eliminar</Text></Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function DetailsModal({ visible, onClose, item, statusConfig, photos = [], onDeletePhoto, onOpenPhoto, canDeletePhotos = true }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Detalles de Actividad</Text>
          <ScrollView style={{ maxHeight: 360 }} contentContainerStyle={{ gap: 8 }}>
            <Text style={styles.detailsHeader}>{item?.tipo_actividad || 'Actividad'}</Text>
            <Text style={styles.detailsSub}>{item?.fecha ? new Date(item.fecha).toLocaleDateString() : '—'}</Text>
            <View style={styles.detailRow}><Text style={styles.detailLabel}>Responsable</Text><Text style={styles.detailValue}>{item?.responsable || '—'}</Text></View>
            <View style={styles.detailRow}><Text style={styles.detailLabel}>Detalles</Text><Text style={styles.detailValue}>{item?.detalles || '—'}</Text></View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Estado</Text>
              <View style={[styles.statusChip, { backgroundColor: statusConfig[item?.estado]?.bgColor || '#f0f0f0' }]}>
                <Text style={[styles.statusText, { color: statusConfig[item?.estado]?.color || '#000' }]}>{item?.estado || '—'}</Text>
              </View>
            </View>
            <Text style={styles.detailsSectionTitle}>Fotodocumentación</Text>
            {Array.isArray(photos) && photos.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                {photos.map((p, idx) => {
                  const uri = typeof p === 'string' ? p : (p?.uri || '');
                  const pid = typeof p === 'object' ? p.id : null;
                  return (
                    <View key={idx} style={styles.photoWrap}>
                      <Pressable onPress={() => onOpenPhoto?.(uri)} style={{flex:1}}>
                        <Image source={{ uri }} style={styles.photoImg} />
                      </Pressable>
                      {pid && canDeletePhotos ? (
                        <Pressable style={styles.photoDel} onPress={() => onDeletePhoto?.(pid)}>
                          <Feather name="trash-2" size={14} color="#fff" />
                        </Pressable>
                      ) : null}
                    </View>
                  );
                })}
              </ScrollView>
            ) : (
              <Text style={styles.detailsMuted}>No hay fotos para esta actividad.</Text>
            )}
            {null}
          </ScrollView>
          <View style={styles.modalActions}>
            <Pressable style={[styles.btn, styles.btnPrimary]} onPress={onClose}><Text style={styles.btnPrimaryText}>Cerrar</Text></Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function ActivitiesPage() {
  const { token, user } = useAuth();
  const [query, setQuery] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [openConfirm, setOpenConfirm] = useState(false);
  const [openForm, setOpenForm] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [toEdit, setToEdit] = useState(null);
  const [openDetails, setOpenDetails] = useState(false);
  const [detailsItem, setDetailsItem] = useState(null);
  const [detailPhotos, setDetailPhotos] = useState([]);
  const [photoError, setPhotoError] = useState('');
  const [openPreview, setOpenPreview] = useState(false);
  const [previewUri, setPreviewUri] = useState('');
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [crops, setCrops] = useState([]);
  const [selectedCrop, setSelectedCrop] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [cropSelectVisible, setCropSelectVisible] = useState(false);
  const [cropSearch, setCropSearch] = useState('');
  const [datePicker, setDatePicker] = useState({ visible: false, type: null, temp: '' });
  const [users, setUsers] = useState([]);
  const isGuest = useMemo(() => String(user?.id_rol?.nombre_rol || user?.nombre_rol || user?.rol || '').toLowerCase() === 'invitado', [user]);

  const statusConfig = {
    pendiente: { color: '#f57c00', bgColor: '#fff3e0' },
    en_progreso: { color: '#1976d2', bgColor: '#e3f2fd' },
    completada: { color: '#2e7d32', bgColor: '#e8f5e9' },
    cancelada: { color: '#d32f2f', bgColor: '#ffebee' }
  };

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const params = { q: query, page, limit: 10 };
      if (selectedCrop) params.id_cultivo = selectedCrop;
      if (startDate) params.fecha_inicio = startDate;
      if (endDate) params.fecha_fin = endDate;
      const { items: list, meta } = await listActividades(token, params);
      setItems(list);
      setTotalPages(meta?.totalPages || 1);
    } catch (e) {
      setError(e?.message || 'Error obteniendo actividades');
    } finally {
      setLoading(false);
    }
  };

  const fetchCrops = async () => {
    try {
      const { items: cropsList } = await listCultivos(token, { page: 1, limit: 100 });
      setCrops(cropsList);
    } catch (e) {
      console.error('Error obteniendo cultivos:', e);
    }
  };

  useEffect(() => { fetchData(); }, [page]);
  useEffect(() => {
    const id = setTimeout(fetchData, 400);
    return () => clearTimeout(id);
  }, [query, selectedCrop, startDate, endDate]);
  useEffect(() => { fetchCrops(); }, []);
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        if (!token) { setUsers([]); return; }
        const { items } = await listUsuarios(token, { page: 1, limit: 100 });
        setUsers(items || []);
      } catch (e) {
        setUsers([]);
      }
    };
    fetchUsers();
  }, [token]);

  const filteredItems = useMemo(() => {
    if (!query) return items;
    return items.filter(item =>
      (item.tipo_actividad || '').toLowerCase().includes(query.toLowerCase()) ||
      (item.responsable || '').toLowerCase().includes(query.toLowerCase()) ||
      (item.detalles || '').toLowerCase().includes(query.toLowerCase())
    );
  }, [query, items]);

  const filteredCrops = useMemo(() => {
    const q = cropSearch.trim().toLowerCase();
    const list = Array.isArray(crops) ? crops : [];
    if (!q) return list;
    return list.filter(c => {
      const name = String(c.nombre_cultivo || c.displayName || c.tipo_cultivo || '').toLowerCase();
      return name.includes(q);
    });
  }, [crops, cropSearch]);

  const renderItem = ({ item }) => (
    <View style={styles.row}>
      <Text numberOfLines={1} ellipsizeMode="tail" style={[styles.cell, styles.colTipo]}>{item.tipo_actividad || '—'}</Text>
      <Text numberOfLines={1} ellipsizeMode="tail" style={[styles.cell, styles.colCultivo]}>{getCropName(item.id_cultivo) || '—'}</Text>
      <Text numberOfLines={1} ellipsizeMode="tail" style={[styles.cell, styles.colFecha]}>{item.fecha ? new Date(item.fecha).toLocaleDateString() : '—'}</Text>
      <Text numberOfLines={1} ellipsizeMode="tail" style={[styles.cell, styles.colResp]}>{item.responsable || '—'}</Text>
      <View style={[styles.cell, styles.colEstado]}>
        <View style={[styles.statusChip, { backgroundColor: statusConfig[item.estado]?.bgColor || '#f0f0f0' }]}>
          <Text style={[styles.statusText, { color: statusConfig[item.estado]?.color || '#000' }]}>{statusConfig[item.estado]?.label || item.estado || '—'}</Text>
        </View>
      </View>
      <View style={[styles.cell, styles.colActions, styles.actions]}>
        {!isGuest && (
          <Pressable style={styles.iconBtn} onPress={async () => {
          try {
            setPhotoError('');
            const mod = await import('expo-image-picker');
            const { status } = await mod.requestCameraPermissionsAsync();
            if (status !== 'granted') { setPhotoError('Permiso de cámara denegado'); return; }
            const res = await mod.launchCameraAsync({ allowsEditing: true, quality: 0.7 });
            if (!res.canceled && res.assets && res.assets[0]?.uri) {
              const asset = res.assets[0];
              const id = item?.id_actividad || item?.id;
              if (!id) { setPhotoError('Actividad no seleccionada'); return; }
              try {
                await uploadActividadFoto(id, { uri: asset.uri, name: 'actividad.jpg', type: 'image/jpeg' }, token);
                const arr = await listActividadFotos(id, token);
                setDetailsItem(item);
                setDetailPhotos(arr.map((f) => ({ id: f.id, uri: f.url_imagen })));
                setOpenDetails(true);
              } catch (e) {
                setPhotoError(e?.message || 'Error subiendo foto');
              }
            }
          } catch (e) {
            setPhotoError('Instala expo-image-picker para usar cámara');
          }
        }}><Feather name="camera" size={16} color="#16A34A" /></Pressable>
        )}
        <Pressable style={styles.iconBtn} onPress={async () => { setPhotoError(''); setDetailsItem(item); setOpenDetails(true); try { const arr = await listActividadFotos(item.id_actividad || item.id, token); setDetailPhotos(arr.map((f) => ({ id: f.id, uri: f.url_imagen }))); } catch (e) { setDetailPhotos([]); } }}><Feather name="eye" size={16} color="#2080FE" /></Pressable>
        {!isGuest && (
          <Pressable style={styles.iconBtn} onPress={() => { setToEdit(item); setOpenForm(true); }}><Feather name="edit-2" size={16} color="#16A34A" /></Pressable>
        )}
        {!isGuest && (
          <Pressable style={styles.iconBtn} onPress={() => { setToDelete(item); setOpenConfirm(true); }}><Feather name="trash-2" size={16} color="#ef4444" /></Pressable>
        )}
      </View>
    </View>
  );

  const getCropName = (cropId) => {
    const crop = crops.find(c => c.id_cultivo === cropId || c.id === cropId);
    return crop ? (crop.nombre_cultivo || crop.displayName || crop.tipo_cultivo) : 'N/A';
  };

  return (
    <View style={styles.root}>
      <Text style={styles.title}>Gestión de Actividades</Text>
      {!isGuest && (
        <Pressable style={styles.addBtn} onPress={() => { setToEdit(null); setOpenForm(true); }}>
          <Feather name="plus" size={16} color="#fff" />
          <Text style={styles.addBtnText}>Nueva Actividad</Text>
        </Pressable>
      )}

      <View style={styles.filtersBox}>
        <View style={styles.filtersRow}>
          <View style={styles.fieldWrapper}>
            <Feather name="search" size={18} color="#9CA3AF" style={styles.inputIconLeft} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar por tipo, responsable o detalles..."
              value={query}
              onChangeText={setQuery}
            />
          </View>
          <View style={styles.fieldWrapper}>
            <Pressable style={styles.selectInput} onPress={() => setCropSelectVisible(true)}>
              <Text style={[styles.inputText, !selectedCrop && styles.placeholder]}>
                {selectedCrop ? (getCropName(selectedCrop) || 'Cultivo') : 'Cultivo'}
              </Text>
            </Pressable>
            <Feather name="tag" size={18} color="#9CA3AF" style={styles.inputIconRight} />
          </View>
        </View>
        <View style={styles.filtersRow}>
          <View style={styles.fieldWrapper}>
            <Pressable style={styles.dateInput} onPress={() => setDatePicker({ visible: true, type: 'inicio', temp: startDate || '' })}>
              <Text style={[styles.inputText, !startDate && styles.placeholder]}> {startDate || 'Fecha inicio'} </Text>
            </Pressable>
            <Feather name="calendar" size={18} color="#9CA3AF" style={styles.inputIconRight} />
          </View>
          <View style={styles.fieldWrapper}>
            <Pressable style={styles.dateInput} onPress={() => setDatePicker({ visible: true, type: 'fin', temp: endDate || '' })}>
              <Text style={[styles.inputText, !endDate && styles.placeholder]}> {endDate || 'Fecha fin'} </Text>
            </Pressable>
            <Feather name="calendar" size={18} color="#9CA3AF" style={styles.inputIconRight} />
          </View>
        </View>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.tableContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View>
            <View style={styles.tableHeader}>
              <Text style={[styles.th, styles.colTipo]}>Tipo</Text>
              <Text style={[styles.th, styles.colCultivo]}>Cultivo</Text>
              <Text style={[styles.th, styles.colFecha]}>Fecha</Text>
              <Text style={[styles.th, styles.colResp]}>Responsable</Text>
              <Text style={[styles.th, styles.colEstado]}>Estado</Text>
              {!isGuest && <Text style={[styles.th, styles.colActions]}>Acciones</Text>}
            </View>
            {loading ? <ActivityIndicator size="large" color="#16A34A" /> : (
              <FlatList
                data={filteredItems}
                renderItem={renderItem}
                keyExtractor={(it) => String(it.id_actividad || it.id)}
              />
            )}
          </View>
        </ScrollView>
      </View>

      {totalPages > 1 && (
        <View style={styles.pagination}>
          <Pressable
            style={[styles.pageBtn, page === 1 && styles.disabled]}
            onPress={() => page > 1 && setPage(page - 1)}
            disabled={page === 1}
          >
            <Text style={styles.pageText}>Anterior</Text>
          </Pressable>
          <Text style={styles.pageInfo}>Página {page} de {totalPages}</Text>
          <Pressable
            style={[styles.pageBtn, page === totalPages && styles.disabled]}
            onPress={() => page < totalPages && setPage(page + 1)}
            disabled={page === totalPages}
          >
            <Text style={styles.pageText}>Siguiente</Text>
          </Pressable>
        </View>
      )}

      <ConfirmModal
        visible={openConfirm}
        text={`¿Eliminar la actividad "${toDelete?.tipo_actividad || ''}"?`}
        onCancel={() => { setOpenConfirm(false); setToDelete(null); }}
        onConfirm={async () => {
          try {
            await deleteActividad(toDelete?.id_actividad || toDelete?.id, token);
            setOpenConfirm(false); setToDelete(null);
            fetchData();
          } catch (e) {
            setError(e?.message || 'Error eliminando actividad');
          }
        }}
      />

      <ActivityFormModal
        visible={openForm}
        activity={toEdit}
        crops={crops}
        users={users}
        loading={saving}
        onClose={() => { setOpenForm(false); setToEdit(null); }}
        onSubmit={async (payload) => {
          setSaving(true);
          try {
            const { id_usuario, id_usuario_asignado, ...actividadPayload } = payload || {};
            const cleanUpdatePayload = Object.fromEntries(Object.entries(actividadPayload).filter(([k, v]) => v !== null && v !== '' && v !== undefined));
            if (cleanUpdatePayload.tipo_actividad) {
              const allowed = ['siembra','riego','fertilizacion','poda','cosecha','otro'];
              const s = String(cleanUpdatePayload.tipo_actividad).toLowerCase();
              if (!allowed.includes(s)) {
                delete cleanUpdatePayload.tipo_actividad;
              } else {
                cleanUpdatePayload.tipo_actividad = s;
              }
            }
            if (toEdit) {
              await updateActividad(toEdit.id_actividad || toEdit.id, cleanUpdatePayload, token);
              if (id_usuario) {
                const idAct = toEdit.id_actividad || toEdit.id;
                try { await createRealiza({ usuario: { id_usuarios: id_usuario }, actividad: { id_actividad: idAct } }, token); } catch (e) {}
              }
            } else {
              if (!actividadPayload.id_cultivo) {
                throw new Error('Selecciona un cultivo para crear la actividad');
              }
              const created = await createActividad(actividadPayload, token);
              const idAct = created?.id_actividad || created?.id;
              if (id_usuario && idAct) {
                try { await createRealiza({ usuario: { id_usuarios: id_usuario }, actividad: { id_actividad: idAct } }, token); } catch (e) {}
              }
            }
            setOpenForm(false); setToEdit(null);
            fetchData();
          } catch (e) {
            throw e;
          } finally {
            setSaving(false);
          }
        }}
      />

      {/* Modal Selector de Cultivo */}
      {cropSelectVisible && (
        <Modal visible={cropSelectVisible} transparent animationType="fade" onRequestClose={() => setCropSelectVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeaderBar}>
                <Feather name="tag" size={18} color="#fff" />
                <Text style={{ color: '#fff', marginLeft: 8, fontWeight: '700' }}>Seleccionar cultivo</Text>
              </View>
              <View style={{ padding: 12 }}>
                <TextInput
                  style={styles.dateInput}
                  placeholder="Buscar cultivo..."
                  placeholderTextColor="#9CA3AF"
                  value={cropSearch}
                  onChangeText={setCropSearch}
                />
                <ScrollView style={{ maxHeight: 280 }}>
                  {filteredCrops.map((crop) => {
                    const id = crop.id_cultivo || crop.id;
                    const name = crop.nombre_cultivo || crop.displayName || crop.tipo_cultivo;
                    const selected = String(selectedCrop || '') === String(id);
                    return (
                      <Pressable key={String(id)} style={styles.optionRow} onPress={() => { setSelectedCrop(id); setCropSelectVisible(false); }}>
                        <Text style={[styles.optionText, selected && styles.optionSelected]}>{name}</Text>
                        {selected && <Feather name="check" size={18} color="#16A34A" />}
                      </Pressable>
                    );
                  })}
                  {filteredCrops.length === 0 && (
                    <Text style={styles.detailsMuted}>Sin resultados</Text>
                  )}
                </ScrollView>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, padding: 12 }}>
                <Pressable style={styles.cancelBtn} onPress={() => setCropSelectVisible(false)}>
                  <Text style={styles.cancelText}>Cerrar</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Modal Selector de Fecha */}
      {datePicker.visible && (
        <Modal visible={datePicker.visible} transparent animationType="fade" onRequestClose={() => setDatePicker({ visible: false, type: null, temp: '' })}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeaderBar}>
                <Feather name="calendar" size={18} color="#fff" />
                <Text style={{ color: '#fff', marginLeft: 8, fontWeight: '700' }}>{datePicker.type === 'inicio' ? 'Fecha inicio' : 'Fecha fin'}</Text>
              </View>
              <View style={{ padding: 12 }}>
                <Calendar
                  onDayPress={(d) => setDatePicker((p) => ({ ...p, temp: d.dateString }))}
                  markedDates={datePicker.temp ? { [datePicker.temp]: { selected: true, selectedColor: '#16A34A' } } : undefined}
                  enableSwipeMonths
                  firstDay={1}
                />
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, padding: 12 }}>
                <Pressable style={styles.cancelBtn} onPress={() => setDatePicker({ visible: false, type: null, temp: '' })}>
                  <Text style={styles.cancelText}>Cancelar</Text>
                </Pressable>
                <Pressable style={styles.confirmBtn} onPress={() => {
                  if (datePicker.type === 'inicio') setStartDate(datePicker.temp || '');
                  if (datePicker.type === 'fin') setEndDate(datePicker.temp || '');
                  setDatePicker({ visible: false, type: null, temp: '' });
                }}>
                  <Text style={styles.confirmText}>Confirmar</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      )}
      <DetailsModal
        visible={openDetails}
        item={detailsItem}
        statusConfig={statusConfig}
        photos={detailPhotos}
        canDeletePhotos={!isGuest}
        onDeletePhoto={async (pid) => {
          try {
            const id = detailsItem?.id_actividad || detailsItem?.id;
            await deleteActividadFoto(pid, token);
            const arr = await listActividadFotos(id, token);
            setDetailPhotos(arr.map((f) => ({ id: f.id, uri: f.url_imagen })));
          } catch (e) {
            setError(e?.message || 'No se pudo eliminar la foto');
          }
        }}
        onOpenPhoto={(uri) => { setPreviewUri(uri); setOpenPreview(true); }}
        onClose={() => { setOpenDetails(false); setDetailsItem(null); }}
      />

      <Modal visible={openPreview} transparent animationType="fade" onRequestClose={() => setOpenPreview(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', alignItems: 'center', justifyContent: 'center' }}>
          <Pressable style={{ position: 'absolute', top: 24, right: 24 }} onPress={() => setOpenPreview(false)}>
            <Feather name="x" size={22} color="#fff" />
          </Pressable>
          <Image source={{ uri: previewUri }} style={{ width: '92%', height: '80%' }} resizeMode="contain" />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff', padding: 12 },
  title: { fontSize: 18, fontWeight: '700', color: '#16A34A', marginBottom: 8 },
  addBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#16A34A', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, alignSelf: 'flex-start', marginBottom: 8 },
  addBtnText: { color: '#fff', marginLeft: 8 },
  filtersContainer: { marginBottom: 8 },
  filtersBox: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  filtersRow: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  fieldWrapper: { position: 'relative', flex: 1 },
  inputIconLeft: { position: 'absolute', left: 10, top: 12 },
  inputIconRight: { position: 'absolute', right: 12, top: 12 },
  searchInput: { borderWidth: 1, borderColor: '#E4E7EC', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 32, flex: 1 },
  pickerContainer: { borderWidth: 1, borderColor: '#E4E7EC', borderRadius: 8, backgroundColor: '#fff' },
  picker: { height: 40 },
  selectInput: { borderWidth: 1, borderColor: '#E4E7EC', borderRadius: 8, paddingHorizontal: 12, height: 44, alignSelf: 'stretch', justifyContent: 'center', backgroundColor: '#fff' },
  dateInput: { borderWidth: 1, borderColor: '#E4E7EC', borderRadius: 8, paddingHorizontal: 12, height: 44, alignSelf: 'stretch', justifyContent: 'center', backgroundColor: '#fff' },
  inputText: { color: '#0f172a' },
  placeholder: { color: '#9CA3AF' },
  modalHeaderBar: { backgroundColor: '#23A047', paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 8, borderTopLeftRadius: 12, borderTopRightRadius: 12 },
  optionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  optionText: { color: '#0f172a' },
  optionSelected: { fontWeight: '700' },
  tableContainer: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, overflow: 'hidden' },
  tableHeader: { flexDirection: 'row', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#E4E7EC', backgroundColor: '#F9FAFB' },
  th: { fontSize: 12, fontWeight: '700', color: '#16A34A' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', backgroundColor: '#fff' },
  cell: { fontSize: 12, color: '#0f172a', paddingRight: 8 },
  colTipo: { width: 140 },
  colCultivo: { width: 160 },
  colFecha: { width: 120 },
  colResp: { width: 160 },
  colEstado: { width: 120 },
  colActions: { width: 160 },
  statusChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end' },
  iconBtn: { marginLeft: 10 },
  error: { marginBottom: 8, color: '#DC2626' },
  pagination: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, marginTop: 8 },
  pageBtn: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#16A34A', borderRadius: 8 },
  disabled: { backgroundColor: '#ccc' },
  pageText: { color: '#fff', fontSize: 14 },
  pageInfo: { fontSize: 14, color: '#0f172a' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', alignItems: 'center', justifyContent: 'center' },
  modalCard: { width: '90%', maxWidth: 360, backgroundColor: '#fff', borderRadius: 12, padding: 16 },
  modalTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  modalText: { fontSize: 13, color: '#334155' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12 },
  btn: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8 },
  btnSecondary: { borderWidth: 1, borderColor: '#E4E7EC', marginRight: 8 },
  btnSecondaryText: { color: '#334155', fontSize: 13 },
  btnDanger: { backgroundColor: '#ef4444' },
  btnPrimaryText: { color: '#fff', fontSize: 13 },
  btnPrimary: { backgroundColor: '#16A34A' },
  detailsHeader: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  detailsSub: { fontSize: 12, color: '#334155' },
  detailsSectionTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginTop: 8 },
  detailsMuted: { fontSize: 13, color: '#64748b' },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  detailLabel: { color: '#334155', fontWeight: '600' },
  detailValue: { color: '#0f172a' },
  photoWrap: { width: 96, height: 96, borderRadius: 8, marginRight: 8, borderWidth: 1, borderColor: '#E5E7EB', overflow: 'hidden' },
  photoImg: { width: '100%', height: '100%' },
  photoDel: { position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 10, padding: 4 },
});
