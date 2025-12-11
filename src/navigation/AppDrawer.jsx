import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { View, Image, Platform } from 'react-native';

const LotsMapPage = require('../pages/cultivos/LotsMapPage').default;
import DashboardPage from '../pages/dashboard/DashboardPage';
import IotPage from '../pages/iot/IotPage';
import CalendarPage from '../pages/calendar/CalendarPage';
import FinanzasPage from '../pages/finanzas/FinanzasPage';
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
import { useAuth } from '../contexts/AuthContext';
import RestrictedAccessModal from '../components/molecules/RestrictedAccessModal';
import { useNavigation } from '@react-navigation/native';
import PermissionGate from '../components/molecules/PermissionGate';

const Drawer = createDrawerNavigator();

function LogoHeader() {
  return (
    <View style={{ paddingHorizontal: 12 }}>
      <Image source={require('../../assets/logo.png')} style={{ width: 28, height: 28 }} />
    </View>
  );
}

export default function AppDrawer() {
  const { user } = useAuth();
  const navigation = useNavigation();
  const isGuest = String(user?.id_rol?.nombre_rol || user?.nombre_rol || user?.rol || '').toLowerCase() === 'invitado';
  if (isGuest) {
    // Solo mostrar la ventana de invitado; sin Drawer ni sidebar detrás
    return (
      <>
        <RestrictedAccessModal visible={true} />
      </>
    );
  }
  return (
    <Drawer.Navigator
      screenOptions={{ headerLeft: () => <LogoHeader />, headerRight: () => <HeaderActions />, drawerType: Platform.OS === 'web' ? 'permanent' : 'front', drawerStyle: { width: 280 } }}
      drawerContent={(props) => <CustomDrawerContent {...props} />}
    >
      <Drawer.Screen name="Inicio" component={DashboardPage} options={{ drawerIcon: ({ color, size }) => <Feather name="home" color={color} size={size} /> }} />
      <Drawer.Screen name="IoT" component={IotPage} options={{ drawerIcon: ({ color, size }) => <Feather name="zap" color={color} size={size} /> }} />
      <Drawer.Screen name="Gestión de Cultivos" options={{ drawerIcon: ({ color, size }) => <Feather name="droplet" color={color} size={size} /> }}>
        {(props) => (
          <PermissionGate requiredKey="cultivos:ver" pageName="Gestión de Cultivos">
            <CropsPage {...props} />
          </PermissionGate>
        )}
      </Drawer.Screen>
      <Drawer.Screen name="Gestión de Lotes" options={{ drawerIcon: ({ color, size }) => <Feather name="map" color={color} size={size} /> }}>
        {(props) => (
          <PermissionGate requiredKey="lotes:ver" pageName="Gestión de Lotes">
            <LotsPage {...props} />
          </PermissionGate>
        )}
      </Drawer.Screen>
      <Drawer.Screen name="Mapa de Lotes" options={{ drawerIcon: ({ color, size }) => <Feather name="map-pin" color={color} size={size} /> }}>
        {(props) => (
          <PermissionGate requiredKey="lotes:ver" pageName="Mapa de Lotes">
            <LotsMapPage {...props} />
          </PermissionGate>
        )}
      </Drawer.Screen>
      <Drawer.Screen name="Actividades" options={{ drawerIcon: ({ color, size }) => <Feather name="activity" color={color} size={size} /> }}>
        {(props) => (
          <PermissionGate requiredKey="actividades:ver" pageName="Actividades">
            <ActivitiesPage {...props} />
          </PermissionGate>
        )}
      </Drawer.Screen>
      <Drawer.Screen name="Calendario" options={{ drawerIcon: ({ color, size }) => <Feather name="calendar" color={color} size={size} /> }}>
        {(props) => (
          <PermissionGate requiredKey="actividades:ver" pageName="Calendario">
            <CalendarPage {...props} />
          </PermissionGate>
        )}
      </Drawer.Screen>
      <Drawer.Screen name="Gestión de EPA" options={{ drawerIcon: ({ color, size }) => <Feather name="package" color={color} size={size} /> }}>
        {(props) => (
          <PermissionGate requiredKey="epa:ver" pageName="Gestión de EPA">
            <EpasPage {...props} />
          </PermissionGate>
        )}
      </Drawer.Screen>
      <Drawer.Screen name="Tratamientos" options={{ drawerIcon: ({ color, size }) => <Feather name="shield" color={color} size={size} /> }}>
        {(props) => (
          <PermissionGate requiredKey="tratamientos:ver" pageName="Tratamientos">
            <TratamientosPage {...props} />
          </PermissionGate>
        )}
      </Drawer.Screen>
      <Drawer.Screen name="Finanzas" options={{ drawerIcon: ({ color, size }) => <Feather name="dollar-sign" color={color} size={size} /> }}>
        {(props) => (
          <PermissionGate requiredKey="finanzas:ver" pageName="Finanzas">
            <FinanzasPage {...props} />
          </PermissionGate>
        )}
      </Drawer.Screen>
      <Drawer.Screen name="Gestión de Inventario" options={{ drawerIcon: ({ color, size }) => <Feather name="box" color={color} size={size} /> }}>
        {(props) => (
          <PermissionGate requiredKey="inventario:ver" pageName="Gestión de Inventario">
            <InventoryPage {...props} />
          </PermissionGate>
        )}
      </Drawer.Screen>
      <Drawer.Screen name="Almacenes" options={{ drawerIcon: ({ color, size }) => <Feather name="box" color={color} size={size} /> }}>
        {(props) => (
          <PermissionGate requiredKey="almacenes:ver" pageName="Almacenes">
            <AlmacenesPage {...props} />
          </PermissionGate>
        )}
      </Drawer.Screen>
      <Drawer.Screen name="Categorías" options={{ drawerIcon: ({ color, size }) => <Feather name="layers" color={color} size={size} /> }}>
        {(props) => (
          <PermissionGate requiredKey="categorias:ver" pageName="Categorías">
            <CategoriasPage {...props} />
          </PermissionGate>
        )}
      </Drawer.Screen>
      <Drawer.Screen name="Reportes" component={ReportesPage} options={{ drawerIcon: ({ color, size }) => <Feather name="bar-chart-2" color={color} size={size} /> }} />
      <Drawer.Screen name="Usuarios" options={{ drawerIcon: ({ color, size }) => <Feather name="users" color={color} size={size} /> }}>
        {(props) => (
          <PermissionGate requiredKey="usuarios:ver" pageName="Usuarios">
            <UsersPage {...props} />
          </PermissionGate>
        )}
      </Drawer.Screen>
    </Drawer.Navigator>
  );
}
