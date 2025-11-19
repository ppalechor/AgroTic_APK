export default [
  { id: 'inicio', label: 'Inicio', icon: 'home' },
  { id: 'iot', label: 'IoT', icon: 'zap' },
  {
    id: 'cultivos',
    label: 'Cultivos',
    icon: 'droplet',
    submodules: [
      { id: 'cultivos-lista', label: 'Gestión de Cultivos', icon: 'droplet' },
      { id: 'cultivos-mapa', label: 'Mapa de Lotes', icon: 'map' },
      { id: 'cultivos-actividades', label: 'Actividades', icon: 'activity' },
      { id: 'cultivos-calendario', label: 'Calendario', icon: 'calendar' },
    ],
  },
  {
    id: 'fitosanitario',
    label: 'Fitosanitario',
    icon: 'package',
    submodules: [
      { id: 'fitosanitario-epas', label: 'Gestión de EPA', icon: 'package' },
      { id: 'fitosanitario-tratamientos', label: 'Tratamientos', icon: 'shield' },
    ],
  },
  { id: 'finanzas', label: 'Finanzas', icon: 'dollar-sign' },
  {
    id: 'inventario',
    label: 'Inventario',
    icon: 'box',
    submodules: [
      { id: 'inventario-gestion', label: 'Gestión de Inventario', icon: 'box' },
      { id: 'inventario-almacenes', label: 'Almacenes', icon: 'box' },
      { id: 'inventario-categorias', label: 'Categorías', icon: 'layers' },
      { id: 'inventario-reportes', label: 'Reportes', icon: 'bar-chart-2' },
    ],
  },
  { id: 'usuarios', label: 'Usuarios', icon: 'users' },
];