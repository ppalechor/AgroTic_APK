import React from 'react';
import { View, Text, Platform } from 'react-native';

let MapView, Polygon, Marker, PROVIDER_GOOGLE;

if (Platform.OS !== 'web') {
  const maps = require('react-native-maps');
  MapView = maps.MapView;
  Polygon = maps.Polygon;
  Marker = maps.Marker;
  PROVIDER_GOOGLE = maps.PROVIDER_GOOGLE;
} else {
  MapView = () => <Text>Mapa no disponible en web</Text>;
  Polygon = () => null;
  Marker = () => null;
  PROVIDER_GOOGLE = null;
}

export { MapView, Polygon, Marker, PROVIDER_GOOGLE };
