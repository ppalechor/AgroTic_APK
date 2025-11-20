import React, { createContext, useContext } from 'react';
import { Alert } from 'react-native';

const AlertContext = createContext();

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
};

export const AlertProvider = ({ children }) => {
  const addAlert = ({ severity = 'info', title, message, autoHideDuration = 6000 }) => {
    // En React Native, usar Alert.alert para mostrar alertas
    Alert.alert(title || 'Alerta', message, [{ text: 'OK' }]);
    // Retornar un id dummy para compatibilidad
    return Date.now().toString();
  };

  const removeAlert = (id) => {
    // No hay necesidad de remover en Alert.alert, es modal
  };

  const alertFunctions = {
    success: (title, message, options) =>
      addAlert({ severity: 'success', title: title || 'Éxito', message, ...options }),
    error: (title, message, options) =>
      addAlert({ severity: 'error', title: title || 'Error', message, ...options }),
    warning: (title, message, options) =>
      addAlert({ severity: 'warning', title: title || 'Advertencia', message, ...options }),
    info: (title, message, options) =>
      addAlert({ severity: 'info', title: title || 'Información', message, ...options }),
    remove: removeAlert,
  };

  return (
    <AlertContext.Provider value={alertFunctions}>
      {children}
    </AlertContext.Provider>
  );
};

export default AlertContext;