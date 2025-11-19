import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { View, Image, Platform } from 'react-native';
import DashboardPage from '../pages/DashboardPage';
import ModulePage from '../pages/ModulePage';
import CustomDrawerContent from './CustomDrawerContent';
import HeaderActions from './HeaderActions';
import { Feather } from '@expo/vector-icons';

const Drawer = createDrawerNavigator();

function LogoHeader() {
  return (
    <View style={{ paddingHorizontal: 12 }}>
      <Image source={require('../../assets/logo.png')} style={{ width: 28, height: 28 }} />
    </View>
  );
}

export default function AppDrawer() {
  return (
    <Drawer.Navigator
      screenOptions={{ headerLeft: () => <LogoHeader />, headerRight: () => <HeaderActions />, drawerType: Platform.OS === 'web' ? 'permanent' : 'front', drawerStyle: { width: 280 } }}
      drawerContent={(props) => <CustomDrawerContent {...props} />}
    >
      <Drawer.Screen name="Inicio" component={DashboardPage} options={{ drawerIcon: ({ color, size }) => <Feather name="home" color={color} size={size} /> }} />
      <Drawer.Screen name="IoT" children={() => <ModulePage title="IoT" />} options={{ drawerIcon: ({ color, size }) => <Feather name="zap" color={color} size={size} /> }} />
      <Drawer.Screen name="Gestión de Cultivos" children={() => <ModulePage title="Gestión de Cultivos" />} options={{ drawerIcon: ({ color, size }) => <Feather name="droplet" color={color} size={size} /> }} />
      <Drawer.Screen name="Mapa de Lotes" children={() => <ModulePage title="Mapa de Lotes" />} options={{ drawerIcon: ({ color, size }) => <Feather name="map" color={color} size={size} /> }} />
      <Drawer.Screen name="Actividades" children={() => <ModulePage title="Actividades" />} options={{ drawerIcon: ({ color, size }) => <Feather name="activity" color={color} size={size} /> }} />
      <Drawer.Screen name="Calendario" children={() => <ModulePage title="Calendario" />} options={{ drawerIcon: ({ color, size }) => <Feather name="calendar" color={color} size={size} /> }} />
      <Drawer.Screen name="Gestión de EPA" children={() => <ModulePage title="Gestión de EPA" />} options={{ drawerIcon: ({ color, size }) => <Feather name="package" color={color} size={size} /> }} />
      <Drawer.Screen name="Tratamientos" children={() => <ModulePage title="Tratamientos" />} options={{ drawerIcon: ({ color, size }) => <Feather name="shield" color={color} size={size} /> }} />
      <Drawer.Screen name="Finanzas" children={() => <ModulePage title="Finanzas" />} options={{ drawerIcon: ({ color, size }) => <Feather name="dollar-sign" color={color} size={size} /> }} />
      <Drawer.Screen name="Gestión de Inventario" children={() => <ModulePage title="Gestión de Inventario" />} options={{ drawerIcon: ({ color, size }) => <Feather name="box" color={color} size={size} /> }} />
      <Drawer.Screen name="Almacenes" children={() => <ModulePage title="Almacenes" />} options={{ drawerIcon: ({ color, size }) => <Feather name="box" color={color} size={size} /> }} />
      <Drawer.Screen name="Categorías" children={() => <ModulePage title="Categorías" />} options={{ drawerIcon: ({ color, size }) => <Feather name="layers" color={color} size={size} /> }} />
      <Drawer.Screen name="Reportes" children={() => <ModulePage title="Reportes" />} options={{ drawerIcon: ({ color, size }) => <Feather name="bar-chart-2" color={color} size={size} /> }} />
      <Drawer.Screen name="Usuarios" children={() => <ModulePage title="Usuarios" />} options={{ drawerIcon: ({ color, size }) => <Feather name="users" color={color} size={size} /> }} />
    </Drawer.Navigator>
  );
}