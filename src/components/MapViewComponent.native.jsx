import React from 'react';
import { View, Text, Platform } from 'react-native';

let MapView, Polygon, Polyline, Marker, PROVIDER_GOOGLE;

if (Platform.OS !== 'web') {
  try {
    const maps = require('react-native-maps');
    MapView = maps?.default || maps.MapView;
    Polygon = maps.Polygon;
    Polyline = maps.Polyline;
    Marker = maps.Marker;
    PROVIDER_GOOGLE = maps.PROVIDER_GOOGLE;
  } catch (e) {
    MapView = () => <Text>Mapa no disponible en esta build</Text>;
    Polygon = () => null;
    Polyline = () => null;
    Marker = () => null;
    PROVIDER_GOOGLE = null;
  }
} else {
  MapView = () => <Text>Mapa no disponible en web</Text>;
  Polygon = () => null;
  Polyline = () => null;
  Marker = () => null;
  PROVIDER_GOOGLE = null;
}

export { MapView, Polygon, Polyline, Marker, PROVIDER_GOOGLE };
