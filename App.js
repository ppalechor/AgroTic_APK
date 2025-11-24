import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import LoginPage from './src/pages/auth/LoginPage';
import ForgotPasswordPage from './src/pages/auth/ForgotPasswordPage';
import RegisterPage from './src/pages/auth/RegisterPage';
import AppDrawer from './src/navigation/AppDrawer';
import { View } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const Stack = createNativeStackNavigator();

function RootNavigator() {
  const { token } = useAuth();
  const initial = token ? 'App' : 'Login';
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName={initial}>
        <Stack.Screen name="Login" component={LoginPage} options={{ headerShown: false }} />
        <Stack.Screen name="Forgot" component={ForgotPasswordPage} options={{ title: 'Recuperar contraseña' }} />
        <Stack.Screen name="Register" component={RegisterPage} options={{ title: 'Crear cuenta' }} />
        <Stack.Screen name="App" component={AppDrawer} options={{ headerShown: false }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const queryClient = new QueryClient();

export default function App() {
  return (
    <View style={{flex:1}}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RootNavigator />
        </AuthProvider>
      </QueryClientProvider>
      <StatusBar style="dark" />
    </View>
  );
}
