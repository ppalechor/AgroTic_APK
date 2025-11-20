import React from 'react';
import { View, Text, Platform } from 'react-native';

let MapView, Polygon, Marker;

if (Platform.OS !== 'web') {
  const maps = require('react-native-maps');
  MapView = maps.MapView;
  Polygon = maps.Polygon;
  Marker = maps.Marker;
} else {
  MapView = () => <Text>Mapa no disponible en web</Text>;
  Polygon = () => null;
  Marker = () => null;
}

export { MapView, Polygon, Marker };
