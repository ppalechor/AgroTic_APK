import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { io } from 'socket.io-client';

export default function useIotSocket() {
  const [connected, setConnected] = useState(false);
  const [latestReading, setLatestReading] = useState(null);
  const [bulkReadings, setBulkReadings] = useState([]);
  const [brokersStatus, setBrokersStatus] = useState({});
  const [sensorStatus, setSensorStatus] = useState({});
  const [dashboardData, setDashboardData] = useState(null);
  const socketRef = useRef(null);

  useEffect(() => {
    const defaultBase = Platform.OS === 'android' ? 'http://10.0.2.2:3001' : 'http://localhost:3001';
    const baseUrl = (process.env.EXPO_PUBLIC_API_URL || defaultBase).replace(/\/+$/, '');
    const url = baseUrl;

    const socket = io(url, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    socket.on('connect_error', () => {
      setConnected(false);
    });

    socket.on('reading', (reading) => {
      setLatestReading(reading);
    });

    socket.on('bulkReadings', (readings) => {
      setBulkReadings(Array.isArray(readings) ? readings : []);
    });

    socket.on('brokerStatus', ({ brokerId, status }) => {
      setBrokersStatus(prev => ({ ...prev, [brokerId]: status === 'connected' }));
    });

    socket.on('sensorStatus', ({ deviceId, status }) => {
      setSensorStatus(prev => ({ ...prev, [deviceId]: status === 'online' }));
    });

    socket.on('dashboardUpdate', (data) => {
      setDashboardData(data || null);
    });

    return () => {
      try { socket.disconnect(); } catch {}
      socketRef.current = null;
    };
  }, []);

  const emitMessage = (event, data) => {
    if (socketRef.current && connected) {
      socketRef.current.emit(event, data);
    }
  };

  const isBrokerConnected = (brokerId) => !!brokersStatus[brokerId];
  const isSensorOnline = (deviceId) => !!sensorStatus[deviceId];
  const getLatestReadingByDevice = (deviceId) => {
    if (!latestReading || latestReading.deviceId !== deviceId) return null;
    return latestReading;
  };

  return { connected, latestReading, bulkReadings, brokersStatus, sensorStatus, dashboardData, emitMessage, isBrokerConnected, isSensorOnline, getLatestReadingByDevice };
}
