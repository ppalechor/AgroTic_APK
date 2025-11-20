import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';

const SublotFormModal = ({ visible, onClose, onSave, sublot, loading: externalLoading }) => {
  const [formData, setFormData] = useState({
    descripcion: '',
    ubicacion: '',
    id_lote: ''
  });
  const [localLoading, setLocalLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');

  const loading = externalLoading || localLoading;

  useEffect(() => {
    if (sublot) {
      setFormData({
        descripcion: sublot.descripcion || '',
        ubicacion: sublot.ubicacion || '',
        id_lote: sublot.id_lote ? sublot.id_lote.toString() : ''
      });
    } else {
      setFormData({
        descripcion: '',
        ubicacion: '',
        id_lote: ''
      });
    }
  }, [sublot, visible]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.descripcion.trim()) {
      newErrors.descripcion = 'La descripción es requerida';
    }

    if (!formData.ubicacion.trim()) {
      newErrors.ubicacion = 'La ubicación es requerida';
    }

    if (!formData.id_lote || parseInt(formData.id_lote, 10) < 1) {
      newErrors.id_lote = 'El ID del lote es requerido y debe ser mayor a 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleSubmit = async () => {
    setServerError('');

    if (!validateForm()) {
      return;
    }

    setLocalLoading(true);
    try {
      await onSave({
        ...formData,
        id_lote: parseInt(formData.id_lote, 10)
      });
    } catch (error) {
      setServerError(error.message || 'Error al guardar el sublote');
      Alert.alert('Error', error.message || 'Error al guardar el sublote');
    } finally {
      setLocalLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
      setFormData({
        descripcion: '',
        ubicacion: '',
        id_lote: ''
      });
      setErrors({});
      setServerError('');
    }
  };

  return (
    <Modal
      visible={visible}
      onRequestClose={handleClose}
      transparent={true}
      animationType="slide"
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>
            {sublot ? 'Editar Sublote' : 'Nuevo Sublote'}
          </Text>

          {serverError ? (
            <Text style={styles.error}>{serverError}</Text>
          ) : null}

          <TextInput
            style={[styles.input, errors.descripcion && styles.inputError]}
            placeholder="Descripción"
            value={formData.descripcion}
            onChangeText={(value) => handleChange('descripcion', value)}
          />
          {errors.descripcion ? <Text style={styles.errorText}>{errors.descripcion}</Text> : null}

          <TextInput
            style={[styles.input, errors.ubicacion && styles.inputError]}
            placeholder="Ubicación"
            value={formData.ubicacion}
            onChangeText={(value) => handleChange('ubicacion', value)}
          />
          {errors.ubicacion ? <Text style={styles.errorText}>{errors.ubicacion}</Text> : null}

          <TextInput
            style={[styles.input, errors.id_lote && styles.inputError]}
            placeholder="ID del Lote Asociado"
            value={formData.id_lote}
            onChangeText={(value) => handleChange('id_lote', value)}
            keyboardType="numeric"
          />
          {errors.id_lote ? <Text style={styles.errorText}>{errors.id_lote}</Text> : null}

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleClose}
              disabled={loading}
            >
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.saveButton]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveText}>
                  {sublot ? 'Actualizar' : 'Crear Sublote'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  error: {
    color: '#DC2626',
    marginBottom: 10,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E4E7EC',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    fontSize: 16,
  },
  inputError: {
    borderColor: '#DC2626',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 12,
    marginBottom: 10,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  button: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E4E7EC',
  },
  saveButton: {
    backgroundColor: '#16A34A',
  },
  cancelText: {
    color: '#334155',
    fontWeight: 'bold',
  },
  saveText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default SublotFormModal;