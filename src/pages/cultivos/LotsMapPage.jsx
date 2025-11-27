import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Pressable, ScrollView, Dimensions, TextInput, Platform, Switch } from 'react-native';
import { MapView, Polygon, Polyline, Marker, PROVIDER_GOOGLE } from '../../components/MapViewComponent';
import * as Location from 'expo-location';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useAlert } from '../../contexts/AlertContext';
import lotService from '../../services/lotService';
import sublotService from '../../services/sublotService';
import cropService from '../../services/cropService';
import LotFormModal from '../../components/molecules/LotFormModal';
import SublotFormModal from '../../components/molecules/SublotFormModal';

// Convierte diferentes formatos de coordenadas a arreglo de { latitude, longitude }
const toLatLng = (input) => {
  if (!input) return [];
  try {
    // Si viene como objeto GeoJSON { type, coordinates }
    const coords = input?.coordinates ? input.coordinates : input;

    // Si viene como string WKT: POLYGON((lng lat, lng lat, ...))
    if (typeof coords === 'string') {
      const wkt = String(coords).toUpperCase();
      if (wkt.includes('POLYGON')) {
        const inner = wkt.split('((')[1]?.split('))')[0] || '';
        return inner
          .split(',')
          .map((pair) => pair.trim().split(/\s+/))
          .map(([lngStr, latStr]) => ({ latitude: parseFloat(latStr), longitude: parseFloat(lngStr) }))
          .filter((p) => Number.isFinite(p.latitude) && Number.isFinite(p.longitude));
      }
      return [];
    }

    // Si es un arreglo: puede ser [[lng,lat], ...] o [[[lng,lat], ...], [huecos]]
    if (Array.isArray(coords)) {
      // Polygon con anillos: [anilloExterior, ...]
      if (Array.isArray(coords[0]) && Array.isArray(coords[0][0])) {
        const outerRing = coords[0];
        return outerRing.map(([lng, lat]) => ({ latitude: lat, longitude: lng }));
      }
      // Arreglo plano de pares [lng,lat]
      if (Array.isArray(coords[0])) {
        return coords.map(([lng, lat]) => ({ latitude: lat, longitude: lng }));
      }
    }
  } catch {}
  return [];
};

const swapCoords = (coords) => {
  if (!coords) return [];
  if (Array.isArray(coords)) {
    if (coords.length === 2 && typeof coords[0] === 'number' && typeof coords[1] === 'number') {
      return [coords[1], coords[0]];
    }
    if (Array.isArray(coords[0])) {
      return coords.map((c) => swapCoords(c));
    }
  }
  return [];
};

const polygonAreaMeters = (positions) => {
  const R = 6371008.8;
  const pts = Array.isArray(positions) ? positions : [];
  if (pts.length < 3) return 0;
  const lat0 = pts.reduce((s, p) => s + (p.latitude || 0), 0) / pts.length;
  const k = Math.cos((lat0 * Math.PI) / 180);
  const toXY = (p) => {
    const x = R * ((p.longitude || 0) * Math.PI / 180) * k;
    const y = R * ((p.latitude || 0) * Math.PI / 180);
    return { x, y };
  };
  let area = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = toXY(pts[i]);
    const b = toXY(pts[(i + 1) % pts.length]);
    area += (a.x * b.y) - (b.x * a.y);
  }
  return Math.abs(area / 2);
};

export default function LotsMapPage() {
   const { token } = useAuth();
   const alert = useAlert();
   const [mapData, setMapData] = useState([]);
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState('');
   const [region, setRegion] = useState(null);
   const [showLotes, setShowLotes] = useState(true);
   const [showSublotes, setShowSublotes] = useState(true);
   const [openLotForm, setOpenLotForm] = useState(false);
  const [openSublotForm, setOpenSublotForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [userPos, setUserPos] = useState(null);
  const [drawMode, setDrawMode] = useState('off'); // 'off' | 'line' | 'polygon'
  const [drawPoints, setDrawPoints] = useState([]);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState(null); // { type: 'lote'|'sublote', id, nombre }
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [mapType, setMapType] = useState('satellite');
  const [estadoFilter, setEstadoFilter] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [cultivoFilterId, setCultivoFilterId] = useState('');
  const [crops, setCrops] = useState([]);
  const [lotsModalOpen, setLotsModalOpen] = useState(false);
  const [lotsList, setLotsList] = useState([]);
  const [lotsLoading, setLotsLoading] = useState(false);
  const [lotsError, setLotsError] = useState('');
  const [assignOpen, setAssignOpen] = useState(false);
  const mapRef = useRef(null);
  const MAP_HEIGHT = Math.round(Dimensions.get('window').height * 0.55);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await lotService.getMapData(token);
        setMapData(data);
        // Ajustar región inicial con el primer lote que tenga coordenadas válidas
        const firstValid = (Array.isArray(data) ? data : []).find((l) => toLatLng(l?.coordenadas).length > 0);
        const positions = firstValid ? toLatLng(firstValid.coordenadas) : [];
        if (positions.length > 0) {
          const lats = positions.map((p) => p.latitude);
          const lngs = positions.map((p) => p.longitude);
          const minLat = Math.min(...lats);
          const maxLat = Math.max(...lats);
          const minLng = Math.min(...lngs);
          const maxLng = Math.max(...lngs);
          const centerLat = (minLat + maxLat) / 2;
          const centerLng = (minLng + maxLng) / 2;
          const padding = 0.02;
          setRegion({
            latitude: centerLat,
            longitude: centerLng,
            latitudeDelta: Math.max(0.01, (maxLat - minLat) + padding),
            longitudeDelta: Math.max(0.01, (maxLng - minLng) + padding),
          });
        }
      } catch (e) {
        setError(e?.message || 'Error cargando mapa');
        alert.error('Error', e?.message || 'Error cargando mapa');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [token, alert]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { items } = await cropService.getCrops(token, 1, 100);
        if (mounted) setCrops(items || []);
      } catch {}
    })();
    return () => { mounted = false; };
  }, [token]);

  useEffect(() => {
    if (!lotsModalOpen) return;
    let mounted = true;
    (async () => {
      setLotsLoading(true);
      setLotsError('');
      try {
        const list = await lotService.getLots(token);
        if (mounted) setLotsList(list || []);
      } catch (e) {
        if (mounted) setLotsError(e?.message || 'Error obteniendo lotes');
      } finally {
        if (mounted) setLotsLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [lotsModalOpen, token]);

  const locateMe = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        alert.error('Permisos', 'Permiso de ubicación denegado');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = pos.coords || {};
      if (typeof latitude === 'number' && typeof longitude === 'number') {
        setUserPos({ latitude, longitude });
        setRegion({ latitude, longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 });
        alert.success('Ubicación', 'Centrado en tu posición');
      }
    } catch (e) {
      alert.error('Ubicación', e?.message || 'Error obteniendo ubicación');
    }
  };

  const centerToPositions = (positions) => {
    try {
      const pts = Array.isArray(positions) ? positions : [];
      if (pts.length === 0) return;
      const lats = pts.map((p) => p.latitude);
      const lngs = pts.map((p) => p.longitude);
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      const minLng = Math.min(...lngs);
      const maxLng = Math.max(...lngs);
      const centerLat = (minLat + maxLat) / 2;
      const centerLng = (minLng + maxLng) / 2;
      const padding = 0.02;
      setRegion({
        latitude: centerLat,
        longitude: centerLng,
        latitudeDelta: Math.max(0.005, (maxLat - minLat) + padding),
        longitudeDelta: Math.max(0.005, (maxLng - minLng) + padding),
      });
    } catch {}
  };

  const fitToAll = () => {
    try {
      const coords = [];
      const safe = Array.isArray(mapData) ? mapData : [];
      safe.forEach((lote) => {
        const lp = toLatLng(lote.coordenadas);
        lp.forEach((p) => coords.push(p));
        if (Array.isArray(lote.sublotes)) {
          lote.sublotes.forEach((s) => {
            const sp = toLatLng(s.coordenadas);
            sp.forEach((p) => coords.push(p));
          });
        }
      });
      if (coords.length > 0 && mapRef.current && typeof mapRef.current.fitToCoordinates === 'function') {
        mapRef.current.fitToCoordinates(coords, {
          edgePadding: { top: 40, right: 40, bottom: 40, left: 40 },
          animated: true,
        });
      }
    } catch {}
  };

  const handleMapPress = (e) => {
    if (drawMode === 'off') return;
    const coord = e?.nativeEvent?.coordinate;
    if (!coord) return;
    setDrawPoints((pts) => [...pts, coord]);
  };

  const clearDrawing = () => setDrawPoints([]);
  const stopDrawing = () => { setDrawMode('off'); setToolsOpen(false); };
  const saveDrawing = async () => {
    if (!selectedEntity) {
      alert.error('Dibujo', 'Selecciona un lote o sublote tocando su polígono');
      return;
    }
    if (drawMode === 'off') {
      alert.error('Dibujo', 'Activa modo Línea o Polígono antes de guardar');
      return;
    }
    if (drawMode === 'line') {
      alert.error('Dibujo', 'El backend solo admite Polígono para coordenadas');
      return;
    }
    if (drawPoints.length < (drawMode === 'polygon' ? 3 : 2)) {
      alert.error('Dibujo', 'Agrega más puntos antes de guardar');
      return;
    }
    const coordsLonLat = drawPoints.map((p) => [p.longitude, p.latitude]);
    const geometry = drawMode === 'polygon'
      ? { type: 'Polygon', coordinates: [ [...coordsLonLat, coordsLonLat[0]] ] }
      : { type: 'LineString', coordinates: coordsLonLat };
    setSaving(true);
    try {
      if (selectedEntity.type === 'lote') {
        await lotService.updateCoordinates(token, selectedEntity.id, geometry);
      } else if (selectedEntity.type === 'sublote') {
        await sublotService.updateCoordinates(token, selectedEntity.id, geometry);
      }
      alert.success('Guardado', `Geometría (${drawMode}) guardada en ${selectedEntity.type} ${selectedEntity.nombre || selectedEntity.id}`);
      clearDrawing();
      setToolsOpen(false);
      // Refrescar el mapa para ver cambios
      const data = await lotService.getMapData(token);
      setMapData(data);
    } catch (e) {
      alert.error('Guardado', e?.message || 'Error al guardar geometría');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#16A34A" />
        <Text>Cargando mapa...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }

  const componentsReady = Boolean(MapView && Polygon && Marker);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <Text style={styles.title}>Mapa de Lotes</Text>
      {/* Barra de acciones y resumen */}
      <View style={styles.topBar}>
        <View style={styles.cardsRow}>
          <View style={styles.card}><Text style={styles.cardTitle}>Lotes</Text><Text style={styles.cardNumber}>{Array.isArray(mapData) ? mapData.length : 0}</Text></View>
          <View style={styles.card}><Text style={styles.cardTitle}>Sublotes</Text><Text style={styles.cardNumber}>{Array.isArray(mapData) ? mapData.reduce((s,l)=>s + (Array.isArray(l.sublotes)?l.sublotes.length:0),0) : 0}</Text></View>
        </View>
        <View style={styles.actionsRow}>
          <Pressable style={[styles.actionBtn, styles.primary]} onPress={() => setOpenLotForm(true)}><Text style={styles.actionBtnText}>Nuevo Lote</Text></Pressable>
          <Pressable style={[styles.actionBtn, styles.secondary]} onPress={() => setOpenSublotForm(true)}><Text style={styles.secondaryText}>Nuevo Sublote</Text></Pressable>
          <Pressable style={[styles.actionBtn, styles.secondary]} onPress={() => setLotsModalOpen(true)}><Text style={styles.secondaryText}>Ver Lotes</Text></Pressable>
        </View>
      </View>
      {/* Toggles de capas */}
      <View style={styles.toggleRow}>
        <Pressable style={[styles.toggleChip, showLotes ? styles.toggleActive : styles.toggleInactive]} onPress={() => setShowLotes((v)=>!v)}>
          <Text style={showLotes ? styles.toggleTextActive : styles.toggleTextInactive}>Lotes</Text>
        </Pressable>
        <Pressable style={[styles.toggleChip, showSublotes ? styles.toggleActive : styles.toggleInactive]} onPress={() => setShowSublotes((v)=>!v)}>
          <Text style={showSublotes ? styles.toggleTextActive : styles.toggleTextInactive}>Sublotes</Text>
        </Pressable>
        <Pressable style={[styles.toggleChip, mapType === 'satellite' ? styles.toggleActive : styles.toggleInactive]} onPress={() => setMapType('satellite')}>
          <Text style={mapType === 'satellite' ? styles.toggleTextActive : styles.toggleTextInactive}>Satélite</Text>
        </Pressable>
        <Pressable style={[styles.toggleChip, mapType === 'standard' ? styles.toggleActive : styles.toggleInactive]} onPress={() => setMapType('standard')}>
          <Text style={mapType === 'standard' ? styles.toggleTextActive : styles.toggleTextInactive}>Callejero</Text>
        </Pressable>
      </View>
      <View style={styles.toggleRow}>
        <Pressable style={[styles.toggleChip, estadoFilter === '' ? styles.toggleActive : styles.toggleInactive]} onPress={() => setEstadoFilter('')}>
          <Text style={estadoFilter === '' ? styles.toggleTextActive : styles.toggleTextInactive}>Todos</Text>
        </Pressable>
        <Pressable style={[styles.toggleChip, estadoFilter === 'sembrado' ? styles.toggleActive : styles.toggleInactive]} onPress={() => setEstadoFilter('sembrado')}>
          <Text style={estadoFilter === 'sembrado' ? styles.toggleTextActive : styles.toggleTextInactive}>Sembrado</Text>
        </Pressable>
        <Pressable style={[styles.toggleChip, estadoFilter === 'cosechado' ? styles.toggleActive : styles.toggleInactive]} onPress={() => setEstadoFilter('cosechado')}>
          <Text style={estadoFilter === 'cosechado' ? styles.toggleTextActive : styles.toggleTextInactive}>Cosechado</Text>
        </Pressable>
        <Pressable style={[styles.toggleChip, cultivoFilterId ? styles.toggleActive : styles.toggleInactive]} onPress={() => setFilterOpen((v)=>!v)}>
          <Text style={cultivoFilterId ? styles.toggleTextActive : styles.toggleTextInactive}>{cultivoFilterId ? 'Cultivo seleccionado' : 'Cultivo'}</Text>
        </Pressable>
      </View>
      <MapView
        style={[styles.map, { height: MAP_HEIGHT }]}
        initialRegion={{
          latitude: 1.89,
          longitude: -76.09,
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
        }}
        {...(region ? { region } : {})}
        onPress={handleMapPress}
        showsUserLocation={true}
        mapType={mapType}
        ref={mapRef}
      >
        {mapData.map((lote) => {
          const lotePositions = toLatLng(lote.coordenadas);
          const lotId = lote.id_lote || lote.id;
          const clist = (crops || []).filter(c => String(c.id_lote) === String(lotId));
          const estadoOk = estadoFilter ? clist.some(c => String(c.estado_cultivo || '').toLowerCase() === estadoFilter) : true;
          const cultivoOk = cultivoFilterId ? clist.some(c => String(c.id) === String(cultivoFilterId)) : true;
          const isActive = lote.activo !== false;
          const passes = estadoOk && cultivoOk && isActive;
          return (
            <React.Fragment key={`lote-${lote.id_lote || lote.id}`}>
              {showLotes && lotePositions.length > 0 && passes && (
                <Polygon
                  coordinates={lotePositions}
                  strokeColor={(selectedEntity?.type === 'lote' && (selectedEntity?.id === (lote.id_lote || lote.id))) ? '#F59E0B' : '#4CAF50'}
                  fillColor={(selectedEntity?.type === 'lote' && (selectedEntity?.id === (lote.id_lote || lote.id))) ? 'rgba(245, 158, 11, 0.25)' : 'rgba(76, 175, 80, 0.3)'}
                  strokeWidth={(selectedEntity?.type === 'lote' && (selectedEntity?.id === (lote.id_lote || lote.id))) ? 4 : 3}
                  {...(Platform.OS !== 'web' ? { tappable: true } : {})}
                  onPress={() => { const entity = { type: 'lote', id: (lote.id_lote || lote.id), nombre: lote.nombre_lote || lote.nombre }; setSelectedEntity(entity); centerToPositions(lotePositions); }}
                  {...(Platform.OS === 'web' ? { tooltip: `Lote: ${lote.nombre_lote || lote.nombre || ''}` } : {})}
                />
              )}
              {Array.isArray(lote.sublotes) && lote.sublotes.map((sublote) => {
                const subPositions = toLatLng(sublote.coordenadas);
                return showSublotes && subPositions.length > 0 && passes ? (
                  <Polygon
                    key={`sublote-${sublote.id_sublote}`}
                    coordinates={subPositions}
                    strokeColor={(selectedEntity?.type === 'sublote' && selectedEntity?.id === sublote.id_sublote) ? '#F59E0B' : '#2196F3'}
                    fillColor={(selectedEntity?.type === 'sublote' && selectedEntity?.id === sublote.id_sublote) ? 'rgba(245, 158, 11, 0.25)' : 'rgba(33, 150, 243, 0.3)'}
                    strokeWidth={(selectedEntity?.type === 'sublote' && selectedEntity?.id === sublote.id_sublote) ? 3 : 2}
                    {...(Platform.OS !== 'web' ? { tappable: true } : {})}
                    onPress={() => { const entity = { type: 'sublote', id: sublote.id_sublote, nombre: sublote.descripcion || `Sublote ${sublote.id_sublote}` }; setSelectedEntity(entity); centerToPositions(subPositions); }}
                    {...(Platform.OS === 'web' ? { tooltip: `Sublote: ${sublote.descripcion || ''}` } : {})}
                  />
                ) : null;
              })}
            </React.Fragment>
          );
        })}
        {/* Dibujo interactivo */}
        {drawMode === 'line' && drawPoints.length > 1 && Polyline ? (
          <Polyline coordinates={drawPoints} strokeColor="#FF9800" strokeWidth={3} />
        ) : null}
        {drawMode === 'polygon' && drawPoints.length >= 3 && (
          <Polygon coordinates={drawPoints} strokeColor="#FF9800" fillColor="rgba(255,152,0,0.3)" strokeWidth={3} />
        )}
        {/* Marcador de Mi Posición (web + móvil) */}
        {userPos && (<Marker coordinate={userPos} title="Mi posición" />)}
      </MapView>
      {/* Badge de conteo y leyenda */}
      <View style={styles.overlayTopRight}>
        <Text style={styles.badge}>{Array.isArray(mapData) ? mapData.length : 0}</Text>
      </View>
      <View style={styles.legend}>
        <View style={styles.legendRow}>
          <View style={[styles.legendSwatch,{backgroundColor:'rgba(76, 175, 80, 0.6)'}]} />
          <Text style={styles.legendText}>Lote</Text>
        </View>
        <View style={styles.legendRow}>
          <View style={[styles.legendSwatch,{backgroundColor:'rgba(33, 150, 243, 0.6)'}]} />
          <Text style={styles.legendText}>Sublote</Text>
        </View>
      </View>

      {/* Botones flotantes: Mi Posición y Dibujo */}
      <View style={styles.fabContainer}>
        <Pressable style={styles.fab} onPress={locateMe}><Feather name="navigation" size={18} color="#fff" /></Pressable>
        <Pressable style={[styles.fab, styles.fabSecondary]} onPress={() => setToolsOpen((v)=>!v)}><Feather name="edit-2" size={18} color="#0f172a" /></Pressable>
        <Pressable style={[styles.fab, styles.fabSecondary]} onPress={fitToAll}><Feather name="maximize-2" size={18} color="#0f172a" /></Pressable>
        <Pressable style={[styles.fab, styles.fabSecondary]} onPress={() => setSearchOpen((v)=>!v)}><Feather name="search" size={18} color="#0f172a" /></Pressable>
      </View>
      {toolsOpen && (
        <View style={styles.toolsPanel}>
          <Text style={styles.toolsTitle}>Herramientas</Text>
          {selectedEntity ? (
            <Text style={styles.selectedInfo}>Seleccionado: {selectedEntity.type === 'lote' ? 'Lote' : 'Sublote'} {selectedEntity.nombre || selectedEntity.id}</Text>
          ) : (
            <Text style={styles.selectedInfoMuted}>Toca un polígono para seleccionar lote/sublote</Text>
          )}
          <View style={styles.toolsRow}>
            <Pressable style={[styles.toolBtn, styles.toolSecondary]} onPress={() => setAssignOpen(true)}>
              <Text style={styles.toolSecondaryText}>Seleccionar Lote/Sublote</Text>
            </Pressable>
          </View>
          {selectedEntity ? (() => {
            const entity = selectedEntity;
            let positions = [];
            const lot = (mapData || []).find(l => (l.id_lote || l.id) === entity.id);
            if (entity.type === 'lote' && lot) positions = toLatLng(lot.coordenadas);
            if (entity.type === 'sublote' && lot && Array.isArray(lot.sublotes)) {
              const s = lot.sublotes.find(x => x.id_sublote === entity.id);
              if (s) positions = toLatLng(s.coordenadas);
            }
            const area = polygonAreaMeters(positions);
            const ha = (area / 10000).toFixed(2);
            return (<Text style={styles.toolsHint}>Área: {ha} ha</Text>);
          })() : null}
          <View style={styles.toolsRow}>
            <Pressable style={[styles.toolChip, drawMode==='line'?styles.toolActive:styles.toolInactive]} onPress={() => setDrawMode('line')}><Text style={drawMode==='line'?styles.toolTextActive:styles.toolTextInactive}>Línea</Text></Pressable>
            <Pressable style={[styles.toolChip, drawMode==='polygon'?styles.toolActive:styles.toolInactive]} onPress={() => setDrawMode('polygon')}><Text style={drawMode==='polygon'?styles.toolTextActive:styles.toolTextInactive}>Polígono</Text></Pressable>
          </View>
          <View style={styles.toolsRow}>
            <Pressable style={[styles.toolBtn, styles.toolPrimary]} onPress={saveDrawing} disabled={saving}><Text style={styles.toolPrimaryText}>{saving?'Guardando...':'Guardar'}</Text></Pressable>
            <Pressable style={[styles.toolBtn, styles.toolSecondary]} onPress={clearDrawing}><Text style={styles.toolSecondaryText}>Limpiar</Text></Pressable>
            <Pressable style={[styles.toolBtn, styles.toolSecondary]} onPress={() => { stopDrawing(); setSelectedEntity(null); }}><Text style={styles.toolSecondaryText}>Cerrar</Text></Pressable>
          </View>
          <Text style={styles.toolsHint}>{drawMode==='off'?'Selecciona Línea o Polígono y toca el mapa.':'Toca el mapa para agregar puntos.'}</Text>
        </View>
      )}

      {searchOpen && (
        <View style={styles.searchPanel}>
          <Text style={styles.toolsTitle}>Buscar</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Nombre de lote o sublote..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <ScrollView style={{ maxHeight: 180 }}>
            {(Array.isArray(mapData) ? mapData : []).filter(l => {
              const q = searchQuery.trim().toLowerCase();
              if (!q) return true;
              const ln = String(l.nombre_lote || l.nombre || '').toLowerCase();
              if (ln.includes(q)) return true;
              const anySub = (l.sublotes || []).some(s => String(s.descripcion || '').toLowerCase().includes(q));
              return anySub;
            }).map(l => (
              <View key={`srch-${l.id_lote || l.id}`} style={styles.optionRow}>
                <Pressable onPress={() => { const pos = toLatLng(l.coordenadas); centerToPositions(pos); setSelectedEntity({ type: 'lote', id: (l.id_lote || l.id), nombre: l.nombre_lote || l.nombre }); setSearchOpen(false); }}>
                  <Text style={styles.optionText}>{l.nombre_lote || l.nombre || `Lote ${l.id_lote || l.id}`}</Text>
                </Pressable>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {filterOpen && (
        <View style={styles.filterPanel}>
          <Text style={styles.toolsTitle}>Cultivo</Text>
          <ScrollView style={{ maxHeight: 180 }}>
            <View style={styles.optionRow}>
              <Pressable onPress={() => { setCultivoFilterId(''); setFilterOpen(false); }}>
                <Text style={styles.optionText}>Todos</Text>
              </Pressable>
            </View>
            {(Array.isArray(crops) ? crops : []).map(c => (
              <View key={`cf-${c.id}`} style={styles.optionRow}>
                <Pressable onPress={() => { setCultivoFilterId(String(c.id)); setFilterOpen(false); }}>
                  <Text style={styles.optionText}>{c.displayName || c.nombre_cultivo || c.tipo_cultivo || String(c.id)}</Text>
                </Pressable>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {assignOpen && (
        <View style={styles.assignPanel}>
          <Text style={styles.toolsTitle}>Asignar a</Text>
          <ScrollView style={{ maxHeight: 260 }}>
            {(Array.isArray(mapData) ? mapData : []).map(l => (
              <View key={`as-${l.id_lote || l.id}`} style={styles.optionRow}>
                <Pressable onPress={() => { setSelectedEntity({ type: 'lote', id: (l.id_lote || l.id), nombre: l.nombre_lote || l.nombre }); setAssignOpen(false); }}>
                  <Text style={styles.optionText}>Lote: {l.nombre_lote || l.nombre || `Lote ${l.id_lote || l.id}`}</Text>
                </Pressable>
              </View>
            ))}
            {(Array.isArray(mapData) ? mapData : []).flatMap(l => (Array.isArray(l.sublotes) ? l.sublotes.map(s => ({ s, l })) : [])).map(({ s, l }) => (
              <View key={`as-sub-${s.id_sublote}`} style={styles.optionRow}>
                <Pressable onPress={() => { setSelectedEntity({ type: 'sublote', id: s.id_sublote, nombre: s.descripcion || `Sublote ${s.id_sublote}` }); setAssignOpen(false); }}>
                  <Text style={styles.optionText}>Sublote: {s.descripcion || `Sublote ${s.id_sublote}`} · {l.nombre_lote || l.nombre || ''}</Text>
                </Pressable>
              </View>
            ))}
          </ScrollView>
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingTop: 8 }}>
            <Pressable style={[styles.toolBtn, styles.toolSecondary]} onPress={() => setAssignOpen(false)}>
              <Text style={styles.toolSecondaryText}>Cerrar</Text>
            </Pressable>
          </View>
        </View>
      )}

      {lotsModalOpen && (
        <View style={styles.lotsPanel}>
          <View style={styles.lotsTitleBar}><Text style={styles.lotsTitle}>Listado de Lotes</Text></View>
          {lotsError ? <Text style={styles.error}>{lotsError}</Text> : null}
          {lotsLoading ? (
            <View style={{ padding: 12 }}><ActivityIndicator size="small" color="#16A34A" /></View>
          ) : (
            <ScrollView style={{ maxHeight: 360 }}>
              {(Array.isArray(lotsList) ? lotsList : []).map(l => (
                <View key={`lm-${l.id || l.id_lote}`} style={styles.lotRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.lotName}>{l.nombre || l.nombre_lote || `Lote ${l.id || l.id_lote}`}</Text>
                    <Text style={styles.lotDesc}>{l.descripcion || ''}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <View style={[styles.statusChip, (l.activo !== false) ? styles.statusActive : styles.statusInactive]}>
                      <Text style={styles.statusText}>{(l.activo !== false) ? 'Activo' : 'Inactivo'}</Text>
                    </View>
                    <Switch
                      value={l.activo !== false}
                      onValueChange={async (val) => {
                        try {
                          await lotService.updateLot(token, l.id_lote || l.id, { activo: val });
                          setLotsList((prev) => prev.map(x => (String(x.id || x.id_lote) === String(l.id || l.id_lote)) ? { ...x, activo: val } : x));
                          const data = await lotService.getMapData(token);
                          setMapData(data);
                        } catch (e) {
                          setLotsError(e?.message || 'Error actualizando lote');
                        }
                      }}
                    />
                  </View>
                </View>
              ))}
            </ScrollView>
          )}
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', padding: 12 }}>
            <Pressable style={[styles.actionBtn, styles.primary]} onPress={() => setLotsModalOpen(false)}><Text style={styles.actionBtnText}>Cerrar</Text></Pressable>
          </View>
        </View>
      )}

      {/* Modal Crear Lote */}
      {LotFormModal ? (
      <LotFormModal
        visible={openLotForm}
        loading={saving}
        onClose={() => setOpenLotForm(false)}
        onSubmit={async (payload) => {
          setSaving(true);
          try {
            await lotService.createLot(token, payload);
            setOpenLotForm(false);
            // Refrescar datos del mapa
            const data = await lotService.getMapData(token);
            setMapData(data);
            alert.success('Lotes', 'Lote creado correctamente');
          } catch (e) {
            alert.error('Error', e?.message || 'Error creando lote');
          } finally {
            setSaving(false);
          }
        }}
      />
      ) : null}

      {/* Modal Crear Sublote */}
      {SublotFormModal ? (
      <SublotFormModal
        visible={openSublotForm}
        onClose={() => setOpenSublotForm(false)}
        onSave={async (payload) => {
          try {
            await sublotService.createSublot(token, payload);
            setOpenSublotForm(false);
            // Refrescar datos del mapa
            const data = await lotService.getMapData(token);
            setMapData(data);
            alert.success('Sublotes', 'Sublote creado correctamente');
          } catch (e) {
            alert.error('Error', e?.message || 'Error creando sublote');
          }
        }}
        sublot={null}
      />
      ) : null}
      <View style={{ height: 16 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scrollContent: { paddingBottom: 24 },
  title: { fontSize: 18, fontWeight: '700', color: '#16A34A', padding: 12 },
  topBar: { paddingHorizontal: 12, paddingBottom: 8 },
  cardsRow: { flexDirection: 'row', marginBottom: 8 },
  card: { flexDirection: 'column', backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#E4E7EC', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginRight: 8 },
  cardTitle: { fontSize: 12, color: '#334155' },
  cardNumber: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  actionsRow: { flexDirection: 'row', marginBottom: 8 },
  actionBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginRight: 8 },
  primary: { backgroundColor: '#16A34A' },
  actionBtnText: { color: '#fff', fontWeight: '700' },
  secondary: { borderWidth: 1, borderColor: '#E4E7EC', backgroundColor: '#fff' },
  secondaryText: { color: '#334155', fontWeight: '700' },
  toggleRow: { flexDirection: 'row', paddingHorizontal: 12, marginBottom: 8 },
  toggleChip: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6, marginRight: 8 },
  toggleActive: { backgroundColor: '#16A34A', borderColor: '#16A34A' },
  toggleInactive: { backgroundColor: '#fff', borderColor: '#E4E7EC' },
  toggleTextActive: { color: '#fff', fontWeight: '700' },
  toggleTextInactive: { color: '#334155', fontWeight: '700' },
  map: { width: '100%', borderRadius: 8 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  error: { color: '#DC2626', textAlign: 'center' },
  overlayTopRight: { position: 'absolute', top: 12, right: 12, backgroundColor: '#16A34A', borderRadius: 16, paddingHorizontal: 10, paddingVertical: 4 },
  badge: { color: '#fff', fontWeight: '700' },
  legend: { position: 'absolute', bottom: 12, left: 12, backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6 },
  legendRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  legendSwatch: { width: 16, height: 10, marginRight: 6, borderRadius: 2 },
  legendText: { color: '#111' },
  selectedInfo: { marginTop: 4, color: '#0f172a', fontWeight: '600' },
  selectedInfoMuted: { marginTop: 4, color: '#64748b' },
  fabContainer: { position: 'absolute', right: 12, bottom: 80, alignItems: 'flex-end' },
  fab: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#16A34A', alignItems: 'center', justifyContent: 'center', marginBottom: 10, elevation: 3 },
  fabSecondary: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E4E7EC' },
  toolsPanel: { position: 'absolute', right: 12, bottom: 140, backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, width: 220, borderWidth: 1, borderColor: '#E4E7EC' },
  searchPanel: { position: 'absolute', right: 12, bottom: 300, backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, width: 260, borderWidth: 1, borderColor: '#E4E7EC' },
  filterPanel: { position: 'absolute', right: 12, bottom: 300, backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, width: 260, borderWidth: 1, borderColor: '#E4E7EC' },
  lotsPanel: { position: 'absolute', left: '50%', top: '10%', transform: [{ translateX: -180 }], width: 360, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#E4E7EC', overflow: 'hidden' },
  lotsTitleBar: { backgroundColor: '#16A34A', paddingHorizontal: 12, paddingVertical: 10 },
  lotsTitle: { color: '#fff', fontWeight: '700', textAlign: 'center' },
  lotRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  lotName: { color: '#0f172a', fontWeight: '700' },
  lotDesc: { color: '#334155', fontSize: 12 },
  statusChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-end', marginBottom: 6 },
  statusActive: { backgroundColor: '#DCFCE7' },
  statusInactive: { backgroundColor: '#FFE4E6' },
  statusText: { color: '#0f172a', fontSize: 12 },
  assignPanel: { position: 'absolute', right: 12, bottom: 140, backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, width: 300, borderWidth: 1, borderColor: '#E4E7EC' },
  toolsTitle: { color: '#0f172a', fontWeight: '700', marginBottom: 6 },
  toolsRow: { flexDirection: 'row', marginBottom: 8 },
  toolChip: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 6, marginRight: 8 },
  toolActive: { backgroundColor: '#DCFCE7', borderColor: '#16A34A' },
  toolInactive: { backgroundColor: '#fff', borderColor: '#E4E7EC' },
  toolTextActive: { color: '#166534', fontWeight: '700' },
  toolTextInactive: { color: '#334155', fontWeight: '700' },
  toolBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, marginRight: 8 },
  toolPrimary: { backgroundColor: '#16A34A' },
  toolPrimaryText: { color: '#fff', fontWeight: '700' },
  toolSecondary: { borderWidth: 1, borderColor: '#E4E7EC', backgroundColor: '#fff' },
  toolSecondaryText: { color: '#334155', fontWeight: '700' },
  toolsHint: { color: '#64748b', fontSize: 12 },
  searchInput: { borderWidth: 1, borderColor: '#E4E7EC', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 8 },
  optionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  optionText: { color: '#0f172a' },
  toolsHint: { color: '#64748b', fontSize: 12 }
});
