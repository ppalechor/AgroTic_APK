import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import LoginPage from './src/pages/LoginPage';
import ForgotPasswordPage from './src/pages/ForgotPasswordPage';
import RegisterPage from './src/pages/RegisterPage';
import AppDrawer from './src/navigation/AppDrawer';
import { View } from 'react-native';

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

export default function App() {
  return (
    <View style={{flex:1}}>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
      <StatusBar style="dark" />
    </View>
  );
}
