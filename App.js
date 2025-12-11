import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';import { AlertProvider } from './src/contexts/AlertContext';
import LoginPage from './src/pages/auth/LoginPage';
import RegisterPage from './src/pages/auth/RegisterPage';
import ResetPasswordPage from './src/pages/auth/ResetPasswordPage';
import ResetPasswordModal from './src/components/modals/ResetPasswordModal';
import ForgotPasswordPage from './src/pages/auth/ForgotPasswordPage';
import AppDrawer from './src/navigation/AppDrawer';
import { View, Text, Pressable, LogBox } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as ExpoLinking from 'expo-linking';
let NotificationsModule = null;
import { Platform } from 'react-native';

const Stack = createNativeStackNavigator();

class GlobalErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: '90%', maxWidth: 360, backgroundColor: '#fff', borderRadius: 12, padding: 16 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', marginBottom: 8 }}>Se produjo un error</Text>
            <Text style={{ fontSize: 13, color: '#334155' }}>La aplicación ha detectado un problema inesperado. Puedes reintentar para continuar.</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12 }}>
              <Pressable style={{ paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, backgroundColor: '#16A34A' }} onPress={() => this.setState({ error: null })}>
                <Text style={{ color: '#fff', fontSize: 13 }}>Reintentar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      );
    }
    return this.props.children;
  }
}

function RootNavigator() {
  const { token, user } = useAuth();
  const initial = token && user ? 'App' : 'Login';
  const runtimePrefix = ExpoLinking.createURL('/').replace(/\/+$/, '');
  const envWebPrefix = (process.env.EXPO_PUBLIC_WEB_URL || runtimePrefix).replace(/\/+$/, '');
  const linking = {
    prefixes: ['agrotic://', envWebPrefix, runtimePrefix],
    config: {
      screens: {
        Login: 'login',
        Forgot: 'forgot-password',
        // Deep link de restablecimiento con parseo de query param `token`
        Reset: {
          path: 'reset-password',
          parse: {
            token: (token) => token,
          },
        },
        Register: 'register',
      },
    },
  };
  return (
    <GlobalErrorBoundary>
      <NavigationContainer linking={linking}>
        <Stack.Navigator initialRouteName={initial}>
          <Stack.Screen name="Login" component={LoginPage} options={{ headerShown: false }} />
          <Stack.Screen name="Forgot" component={ForgotPasswordPage} options={{ title: 'Recuperar contraseña' }} />
          <Stack.Screen name="Reset" component={ResetPasswordPage} options={{ title: 'Restablecer contraseña' }} />
          <Stack.Screen name="Register" component={RegisterPage} options={{ title: 'Crear cuenta' }} />
          <Stack.Screen name="App" component={AppDrawer} options={{ headerShown: false }} />
        </Stack.Navigator>
      </NavigationContainer>
    </GlobalErrorBoundary>
  );
}

const queryClient = new QueryClient();

export default function App() {
  const [fatalError, setFatalError] = useState(null);
  const [navKey, setNavKey] = useState(0);
  useEffect(() => {
    (async () => {
      try {
        try {
          LogBox.ignoreLogs([
            'expo-notifications: Android Push notifications (remote notifications) functionality provided by expo-notifications was removed from Expo Go',
            'expo-notifications functionality is not fully supported in Expo Go',
            'We recommend you instead use a development build to avoid limitations'
          ]);
        } catch {}
        const ConstantsModule = await import('expo-constants');
        const isExpoGo = (ConstantsModule?.default?.appOwnership === 'expo');
        if (!NotificationsModule) {
          NotificationsModule = await import('expo-notifications');
        }
        NotificationsModule.setNotificationHandler({
          handleNotification: async () => ({ shouldShowAlert: true, shouldPlaySound: false, shouldSetBadge: false })
        });
        const settings = await NotificationsModule.getPermissionsAsync();
        let status = settings.status;
        if (status !== 'granted') {
          const req = await NotificationsModule.requestPermissionsAsync();
          status = req.status;
        }
        if (Platform.OS === 'android' && !isExpoGo) {
          await NotificationsModule.setNotificationChannelAsync('default', {
            name: 'default', importance: NotificationsModule.AndroidImportance.DEFAULT,
            vibrationPattern: [0, 250, 250, 250], lightColor: '#FF231F7C'
          });
        }
      } catch {}
    })();
    try {
      const g = global;
      if (g && g.ErrorUtils && typeof g.ErrorUtils.setGlobalHandler === 'function') {
        const handler = (error, isFatal) => {
          try {
            console.error('Unhandled error', error);
            setFatalError({ error, isFatal });
          } catch {}
        };
        g.ErrorUtils.setGlobalHandler(handler);
      }
    } catch {}
  }, []);
  return (
    <View style={{flex:1}}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AlertProvider>
            <View style={{ flex: 1 }} key={navKey}>
              <RootNavigator />
              {fatalError && (
                <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.35)' }}>
                  <View style={{ width: '90%', maxWidth: 360, backgroundColor: '#fff', borderRadius: 12, padding: 16 }}>
                    <Text style={{ fontSize: 16, fontWeight: '700', marginBottom: 8 }}>Se produjo un error inesperado</Text>
                    <Text style={{ fontSize: 13, color: '#334155' }}>La app encontró un problema y evitó cerrarse. Puedes reintentar.</Text>
                    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12 }}>
                      <Pressable style={{ paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, backgroundColor: '#64748B', marginRight: 8 }} onPress={() => { try { setFatalError(null); setNavKey((k)=>k+1); } catch {} }}>
                        <Text style={{ color: '#fff', fontSize: 13 }}>Reiniciar navegación</Text>
                      </Pressable>
                      <Pressable style={{ paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, backgroundColor: '#16A34A' }} onPress={() => { try { setFatalError(null); } catch {} }}>
                        <Text style={{ color: '#fff', fontSize: 13 }}>Continuar</Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              )}
            </View>
          </AlertProvider>
        </AuthProvider>
      </QueryClientProvider>
      <StatusBar style="dark" />
    </View>
  );
}
