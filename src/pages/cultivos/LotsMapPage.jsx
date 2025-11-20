import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert, Pressable } from 'react-native';
import { MapView, Polygon } from '../../components/MapViewComponent';
import { useAuth } from '../../contexts/AuthContext';
import { getMapData, createLote } from '../../services/api';
import LotFormModal from '../../components/molecules/LotFormModal';

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

export default function LotsMapPage() {
  const { token } = useAuth();
  const [mapData, setMapData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [region, setRegion] = useState(null);
  const [showLotes, setShowLotes] = useState(true);
  const [showSublotes, setShowSublotes] = useState(true);
  const [openLotForm, setOpenLotForm] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getMapData(token);
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
        Alert.alert('Error', e?.message || 'Error cargando mapa');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [token]);

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

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mapa de Lotes</Text>
      {/* Barra de acciones y resumen */}
      <View style={styles.topBar}>
        <View style={styles.cardsRow}>
          <View style={styles.card}><Text style={styles.cardTitle}>Lotes</Text><Text style={styles.cardNumber}>{Array.isArray(mapData) ? mapData.length : 0}</Text></View>
          <View style={styles.card}><Text style={styles.cardTitle}>Sublotes</Text><Text style={styles.cardNumber}>{Array.isArray(mapData) ? mapData.reduce((s,l)=>s + (Array.isArray(l.sublotes)?l.sublotes.length:0),0) : 0}</Text></View>
        </View>
        <View style={styles.actionsRow}>
          <Pressable style={[styles.actionBtn, styles.primary]} onPress={() => setOpenLotForm(true)}><Text style={styles.actionBtnText}>Nuevo Lote</Text></Pressable>
          <Pressable style={[styles.actionBtn, styles.secondary]} onPress={() => Alert.alert('Acción','Formulario de Sublote pendiente')}><Text style={styles.secondaryText}>Nuevo Sublote</Text></Pressable>
          <Pressable style={[styles.actionBtn, styles.secondary]} onPress={() => Alert.alert('Navegación','Usa el menú "Gestión de Lotes"')}><Text style={styles.secondaryText}>Ver Lotes</Text></Pressable>
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
      </View>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: 1.89,
          longitude: -76.09,
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
        }}
        {...(region ? { region } : {})}
      >
        {mapData.map((lote) => {
          const lotePositions = toLatLng(lote.coordenadas);
          return (
            <React.Fragment key={`lote-${lote.id_lote}`}>
              {showLotes && lotePositions.length > 0 && (
                <Polygon
                  coordinates={lotePositions}
                  strokeColor="#4CAF50"
                  fillColor="rgba(76, 175, 80, 0.3)"
                  strokeWidth={3}
                />
              )}
              {Array.isArray(lote.sublotes) && lote.sublotes.map((sublote) => {
                const subPositions = toLatLng(sublote.coordenadas);
                return showSublotes && subPositions.length > 0 ? (
                  <Polygon
                    key={`sublote-${sublote.id_sublote}`}
                    coordinates={subPositions}
                    strokeColor="#2196F3"
                    fillColor="rgba(33, 150, 243, 0.3)"
                    strokeWidth={2}
                  />
                ) : null;
              })}
            </React.Fragment>
          );
        })}
        {Array.isArray(mapData) && mapData.every((l) => !toLatLng(l.coordenadas).length) && (
          <View style={styles.center}>
            <Text style={styles.error}>No hay coordenadas para dibujar lotes</Text>
          </View>
        )}
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

      {/* Modal Crear Lote */}
      <LotFormModal
        visible={openLotForm}
        loading={saving}
        onClose={() => setOpenLotForm(false)}
        onSubmit={async (payload) => {
          setSaving(true);
          try {
            await createLote(payload, token);
            setOpenLotForm(false);
            // Refrescar datos del mapa
            const data = await getMapData(token);
            setMapData(data);
          } catch (e) {
            Alert.alert('Error', e?.message || 'Error creando lote');
          } finally {
            setSaving(false);
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
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
  map: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  error: { color: '#DC2626', textAlign: 'center' },
  overlayTopRight: { position: 'absolute', top: 12, right: 12, backgroundColor: '#16A34A', borderRadius: 16, paddingHorizontal: 10, paddingVertical: 4 },
  badge: { color: '#fff', fontWeight: '700' },
  legend: { position: 'absolute', bottom: 12, left: 12, backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6 },
  legendRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  legendSwatch: { width: 16, height: 10, marginRight: 6, borderRadius: 2 },
  legendText: { color: '#111' },
});
