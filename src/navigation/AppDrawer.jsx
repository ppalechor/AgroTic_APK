import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { View, Image, Platform } from 'react-native';

const LotsMapPage = require('../pages/cultivos/LotsMapPage').default;
import DashboardPage from '../pages/dashboard/DashboardPage';
import ModulePage from '../pages/common/ModulePage';
import InventoryPage from '../pages/inventario/InventoryPage';
import AlmacenesPage from '../pages/inventario/AlmacenesPage';
import CategoriasPage from '../pages/inventario/CategoriasPage';
import ReportesPage from '../pages/reportes/ReportesPage';
import EpasPage from '../pages/fitosanitario/EpasPage';
import TratamientosPage from '../pages/fitosanitario/TratamientosPage';
import UsersPage from '../pages/users/UsersPage';
import CropsPage from '../pages/cultivos/CropsPage';
import LotsPage from '../pages/cultivos/LotsPage';
import ActivitiesPage from '../pages/actividades/ActivitiesPage';
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
      <Drawer.Screen name="Gestión de Cultivos" component={CropsPage} options={{ drawerIcon: ({ color, size }) => <Feather name="droplet" color={color} size={size} /> }} />
      <Drawer.Screen name="Gestión de Lotes" component={LotsPage} options={{ drawerIcon: ({ color, size }) => <Feather name="map" color={color} size={size} /> }} />
      <Drawer.Screen name="Mapa de Lotes" component={LotsMapPage} options={{ drawerIcon: ({ color, size }) => <Feather name="map-pin" color={color} size={size} /> }} />
      <Drawer.Screen name="Actividades" component={ActivitiesPage} options={{ drawerIcon: ({ color, size }) => <Feather name="activity" color={color} size={size} /> }} />
      <Drawer.Screen name="Calendario" children={() => <ModulePage title="Calendario" />} options={{ drawerIcon: ({ color, size }) => <Feather name="calendar" color={color} size={size} /> }} />
      <Drawer.Screen name="Gestión de EPA" component={EpasPage} options={{ drawerIcon: ({ color, size }) => <Feather name="package" color={color} size={size} /> }} />
      <Drawer.Screen name="Tratamientos" component={TratamientosPage} options={{ drawerIcon: ({ color, size }) => <Feather name="shield" color={color} size={size} /> }} />
      <Drawer.Screen name="Finanzas" children={() => <ModulePage title="Finanzas" />} options={{ drawerIcon: ({ color, size }) => <Feather name="dollar-sign" color={color} size={size} /> }} />
      <Drawer.Screen name="Gestión de Inventario" component={InventoryPage} options={{ drawerIcon: ({ color, size }) => <Feather name="box" color={color} size={size} /> }} />
      <Drawer.Screen name="Almacenes" component={AlmacenesPage} options={{ drawerIcon: ({ color, size }) => <Feather name="box" color={color} size={size} /> }} />
      <Drawer.Screen name="Categorías" component={CategoriasPage} options={{ drawerIcon: ({ color, size }) => <Feather name="layers" color={color} size={size} /> }} />
      <Drawer.Screen name="Reportes" component={ReportesPage} options={{ drawerIcon: ({ color, size }) => <Feather name="bar-chart-2" color={color} size={size} /> }} />
      <Drawer.Screen name="Usuarios" component={UsersPage} options={{ drawerIcon: ({ color, size }) => <Feather name="users" color={color} size={size} /> }} />
    </Drawer.Navigator>
  );
}