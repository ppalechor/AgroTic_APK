import React, { useEffect, useRef, createContext, useContext } from 'react';
import L from 'leaflet';

// Contexto para compartir la instancia del mapa con las capas
const MapContext = createContext(null);

// Aproximar zoom desde deltas (si vienen)
function deltaToZoom(latDelta, lngDelta) {
  const delta = Math.max(latDelta || 0.05, lngDelta || 0.05);
  if (delta >= 60) return 2;
  if (delta >= 30) return 3;
  if (delta >= 10) return 5;
  if (delta >= 5) return 7;
  if (delta >= 1) return 10;
  if (delta >= 0.5) return 12;
  if (delta >= 0.2) return 13;
  if (delta >= 0.1) return 14;
  return 15;
}

// Normaliza el prop style para admitir arrays de React Native
function normalizeStyle(style) {
  if (!style) return {};
  if (Array.isArray(style)) {
    return style.reduce((acc, cur) => {
      if (cur && typeof cur === 'object') Object.assign(acc, cur);
      return acc;
    }, {});
  }
  return style;
}

export function MapView({ style, initialRegion, region, children, onPress, mapType = 'satellite' }) {
  const divRef = useRef(null);
  const mapRef = useRef(null);
  const tilesGoogleRef = useRef(null);
  const tilesOSMRef = useRef(null);
  const tilesOSMPlainRef = useRef(null);
  const tilesCartoRef = useRef(null);
  const cssInjectedRef = useRef(false);

  useEffect(() => {
    if (!cssInjectedRef.current && typeof document !== 'undefined') {
      const id = 'leaflet-css';
      if (!document.getElementById(id)) {
        const link = document.createElement('link');
        link.id = id;
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }
      cssInjectedRef.current = true;
    }
    if (!mapRef.current && divRef.current) {
      mapRef.current = L.map(divRef.current, {
        zoomControl: true,
      });
      tilesGoogleRef.current = L.tileLayer(
        'https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
        { subdomains: ['mt0', 'mt1', 'mt2', 'mt3'], attribution: '&copy; Google Maps' }
      );
      tilesOSMRef.current = L.tileLayer(
        'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        { attribution: '&copy; OpenStreetMap contributors' }
      );
      tilesOSMPlainRef.current = L.tileLayer(
        'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
        { attribution: '&copy; OpenStreetMap contributors' }
      );
      tilesCartoRef.current = L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
        { subdomains: ['a', 'b', 'c', 'd'], attribution: '&copy; CARTO' }
      );
      tilesGoogleRef.current.on('tileerror', () => {
        const map = mapRef.current;
        const osm = tilesOSMRef.current;
        const carto = tilesCartoRef.current;
        const osmPlain = tilesOSMPlainRef.current;
        if (!map) return;
        if (osm && !map.hasLayer(osm)) {
          osm.addTo(map);
        } else if (osmPlain && !map.hasLayer(osmPlain)) {
          osmPlain.addTo(map);
        } else if (carto && !map.hasLayer(carto)) {
          carto.addTo(map);
        }
      });
      if (mapType === 'satellite') {
        tilesGoogleRef.current.addTo(mapRef.current);
      } else {
        tilesOSMRef.current.addTo(mapRef.current);
      }
      // Click handler para compatibilidad con onPress de react-native-maps
      if (onPress) {
        mapRef.current.on('click', (e) => {
          const { lat, lng } = e.latlng || {};
          if (typeof lat === 'number' && typeof lng === 'number') {
            onPress({ nativeEvent: { coordinate: { latitude: lat, longitude: lng } } });
          }
        });
      }
    }
    const r = region || initialRegion;
    if (mapRef.current && r) {
      const center = [r.latitude, r.longitude];
      const zoom = deltaToZoom(r.latitudeDelta, r.longitudeDelta);
      mapRef.current.setView(center, zoom);
    }
    return () => {};
  }, [initialRegion, region, onPress]);

  useEffect(() => {
    const map = mapRef.current;
    const g = tilesGoogleRef.current;
    const o = tilesOSMRef.current;
    const op = tilesOSMPlainRef.current;
    const c = tilesCartoRef.current;
    if (!map || !g || !o) return;
    if (mapType === 'satellite') {
      if (o && map.hasLayer(o)) o.remove();
      if (op && map.hasLayer(op)) op.remove();
      if (c && map.hasLayer(c)) c.remove();
      if (g && !map.hasLayer(g)) g.addTo(map);
    } else {
      if (g && map.hasLayer(g)) g.remove();
      if (op && map.hasLayer(op)) op.remove();
      if (c && map.hasLayer(c)) c.remove();
      if (o && !map.hasLayer(o)) o.addTo(map);
      o.on('tileerror', () => {
        if (op && !map.hasLayer(op)) {
          op.addTo(map);
        } else if (c && !map.hasLayer(c)) {
          c.addTo(map);
        }
      });
    }
  }, [mapType]);

  const containerStyle = {
    width: '100%',
    height: '100%',
    minHeight: 320,
    ...normalizeStyle(style),
  };

  return (
    <MapContext.Provider value={mapRef}>
      <div ref={divRef} style={containerStyle} />
      {children}
    </MapContext.Provider>
  );
}

export function Polygon({ coordinates = [], strokeColor = '#4CAF50', fillColor = 'rgba(76, 175, 80, 0.3)', strokeWidth = 3, onPress, tooltip }) {
  const mapRef = useContext(MapContext);
  const layerRef = useRef(null);

  useEffect(() => {
    const map = mapRef?.current;
    if (!map) return;
    const latlngs = (coordinates || []).map((p) => [p.latitude, p.longitude]);
    if (latlngs.length === 0) return;
    layerRef.current = L.polygon(latlngs, {
      color: strokeColor,
      weight: strokeWidth,
      fillColor,
      fillOpacity: 0.3,
    });
    layerRef.current.addTo(map);
    if (tooltip) {
      layerRef.current.bindTooltip(tooltip, { sticky: true });
    }
    if (onPress) {
      layerRef.current.on('click', (e) => {
        const { latlng } = e || {};
        const { lat, lng } = latlng || {};
        onPress({ nativeEvent: { coordinate: { latitude: lat, longitude: lng } } });
      });
    }
    return () => {
      if (layerRef.current) {
        if (onPress) {
          layerRef.current.off('click');
        }
        try { layerRef.current.unbindTooltip(); } catch {}
        layerRef.current.remove();
        layerRef.current = null;
      }
    };
  }, [mapRef, strokeColor, fillColor, strokeWidth, onPress, tooltip, JSON.stringify(coordinates)]);

  return null;
}

export function Marker({ coordinate, title }) {
  const mapRef = useContext(MapContext);
  const markerRef = useRef(null);
  useEffect(() => {
    const map = mapRef?.current;
    if (!map || !coordinate) return;
    markerRef.current = L.marker([coordinate.latitude, coordinate.longitude], { title });
    markerRef.current.addTo(map);
    return () => {
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
    };
  }, [mapRef, coordinate, title]);
  return null;
}

export const PROVIDER_GOOGLE = null;

export function Polyline({ coordinates = [], strokeColor = '#FF9800', strokeWidth = 3 }) {
  const mapRef = useContext(MapContext);
  const layerRef = useRef(null);
  useEffect(() => {
    const map = mapRef?.current;
    if (!map) return;
    const latlngs = (coordinates || []).map((p) => [p.latitude, p.longitude]);
    if (latlngs.length < 2) return;
    layerRef.current = L.polyline(latlngs, {
      color: strokeColor,
      weight: strokeWidth,
    });
    layerRef.current.addTo(map);
    return () => {
      if (layerRef.current) {
        layerRef.current.remove();
        layerRef.current = null;
      }
    };
  }, [mapRef, strokeColor, strokeWidth, JSON.stringify(coordinates)]);
  return null;
}
