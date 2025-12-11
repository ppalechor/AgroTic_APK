import React, { useState } from 'react';
import { Modal, View, Text, Pressable, StyleSheet, Image, TextInput, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../contexts/AuthContext';
import { uploadActividadFoto } from '../../services/api';

export default function PhotoUploadModal({ visible, onClose, onUploaded, activity }) {
  const { token } = useAuth();
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const pickFromCamera = async () => {
    try {
      setError('');
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') { setError('Permiso de cámara denegado'); return; }
      const res = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.7 });
      if (!res.canceled && res.assets && res.assets[0]?.uri) {
        const asset = res.assets[0];
        setPreview(asset.uri);
        setFile({ uri: asset.uri, name: 'actividad.jpg', type: 'image/jpeg' });
      }
    } catch (e) {
      setError('Error al abrir la cámara');
    }
  };

  const pickFromGallery = async () => {
    try {
      setError('');
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') { setError('Permiso de galería denegado'); return; }
      const res = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, quality: 0.8 });
      if (!res.canceled && res.assets && res.assets[0]?.uri) {
        const asset = res.assets[0];
        setPreview(asset.uri);
        setFile({ uri: asset.uri, name: 'actividad.jpg', type: 'image/jpeg' });
      }
    } catch (e) {
      setError('Error al abrir la galería');
    }
  };

  const handleUpload = async () => {
    try {
      setError('');
      if (!activity?.id_actividad && !activity?.id) {
        setError('Actividad no seleccionada');
        return;
      }
      if (!file) {
        setError('Selecciona o captura una imagen');
        return;
      }
      setLoading(true);
      const id = activity.id_actividad || activity.id;
      await uploadActividadFoto(id, file, token, description);
      setLoading(false);
      setFile(null);
      setPreview(null);
      setDescription('');
      onUploaded?.();
      onClose?.();
    } catch (e) {
      setLoading(false);
      setError(e?.message || 'No se pudo subir la foto');
    }
  };

  const handleClose = () => {
    setError('');
    setFile(null);
    setPreview(null);
    setDescription('');
    onClose?.();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.headerBar}>
            <Feather name="camera" size={18} color="#fff" />
            <Text style={styles.headerTitle}>Fotodocumentación</Text>
          </View>
          <View style={{ padding: 12 }}>
            <Text style={styles.helper}>Captura o selecciona una imagen y agrega una descripción.</Text>
            {preview ? (
              <Image source={{ uri: preview }} style={styles.preview} />
            ) : (
              <View style={styles.previewPlaceholder}><Feather name="image" size={24} color="#9CA3AF" /></View>
            )}
            <View style={styles.row}>
              <Pressable style={[styles.btn, styles.btnSecondary]} onPress={pickFromCamera}>
                <Feather name="camera" size={16} color="#334155" />
                <Text style={styles.btnSecondaryText}>Capturar</Text>
              </Pressable>
              <Pressable style={[styles.btn, styles.btnSecondary]} onPress={pickFromGallery}>
                <Feather name="image" size={16} color="#334155" />
                <Text style={styles.btnSecondaryText}>Galería</Text>
              </Pressable>
            </View>
            <TextInput
              style={styles.input}
              placeholder="Descripción (opcional)"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={2}
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
          </View>
          <View style={styles.actions}>
            <Pressable style={[styles.btn, styles.btnSecondary]} onPress={handleClose}>
              <Text style={styles.btnSecondaryText}>Cancelar</Text>
            </Pressable>
            <Pressable style={[styles.btn, styles.btnPrimary]} onPress={handleUpload} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnPrimaryText}>Subir</Text>}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', alignItems: 'center', justifyContent: 'center' },
  card: { width: '90%', maxWidth: 400, backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden' },
  headerBar: { backgroundColor: '#23A047', paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { color: '#fff', fontWeight: '700' },
  helper: { fontSize: 13, color: '#334155' },
  preview: { width: '100%', height: 180, borderRadius: 8, marginTop: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  previewPlaceholder: { width: '100%', height: 180, borderRadius: 8, marginTop: 8, borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', justifyContent: 'flex-start', gap: 8, marginTop: 8 },
  btn: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8 },
  btnSecondary: { borderWidth: 1, borderColor: '#E4E7EC', marginRight: 8 },
  btnSecondaryText: { color: '#334155', fontSize: 13 },
  btnPrimaryText: { color: '#fff', fontSize: 13 },
  btnPrimary: { backgroundColor: '#16A34A' },
  input: { borderWidth: 1, borderColor: '#E4E7EC', borderRadius: 8, padding: 10, marginTop: 10, fontSize: 14 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', padding: 12 },
  error: { color: '#DC2626', marginTop: 8 },
});

