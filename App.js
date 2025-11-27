import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';import { AlertProvider } from './src/contexts/AlertContext';
import LoginPage from './src/pages/auth/LoginPage';
import RegisterPage from './src/pages/auth/RegisterPage';
import ResetPasswordPage from './src/pages/auth/ResetPasswordPage';
import ForgotPasswordPage from './src/pages/auth/ForgotPasswordPage';
import AppDrawer from './src/navigation/AppDrawer';
import { View } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const Stack = createNativeStackNavigator();

function RootNavigator() {
  const { token } = useAuth();
  const initial = token ? 'App' : 'Login';
  const webPrefix = (process.env.EXPO_PUBLIC_WEB_URL || 'http://localhost:3000').replace(/\/+$/, '');
  const linking = {
    prefixes: [Linking.createURL('/'), webPrefix],
    config: {
      screens: {
        Login: 'login',
        Forgot: 'forgot-password',
        Reset: 'reset-password',
        Register: 'register',
      },
    },
  };
  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator initialRouteName={initial}>
        <Stack.Screen name="Login" component={LoginPage} options={{ headerShown: false }} />
        <Stack.Screen name="Forgot" component={ForgotPasswordPage} options={{ title: 'Recuperar contraseña' }} />
        <Stack.Screen name="Reset" component={ResetPasswordPage} options={{ title: 'Restablecer contraseña' }} />
        <Stack.Screen name="Register" component={RegisterPage} options={{ title: 'Crear cuenta' }} />
        <Stack.Screen name="App" component={AppDrawer} options={{ headerShown: false }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const queryClient = new QueryClient();

export default function App() {
  useEffect(() => {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({ shouldShowAlert: true, shouldPlaySound: false, shouldSetBadge: false })
    });
    (async () => {
      try {
        const settings = await Notifications.getPermissionsAsync();
        let status = settings.status;
        if (status !== 'granted') {
          const req = await Notifications.requestPermissionsAsync();
          status = req.status;
        }
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'default', importance: Notifications.AndroidImportance.DEFAULT,
            vibrationPattern: [0, 250, 250, 250], lightColor: '#FF231F7C'
          });
        }
      } catch {}
    })();
  }, []);
  return (
    <View style={{flex:1}}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AlertProvider>
            <RootNavigator />
          </AlertProvider>
        </AuthProvider>
      </QueryClientProvider>
      <StatusBar style="dark" />
    </View>
  );
}
