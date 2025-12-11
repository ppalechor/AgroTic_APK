import { baseUrl } from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { connectMqtt } from './mqttClient';

const authHeader = (token) => ({ Authorization: `Bearer ${token}` });

const getJson = async (res) => {
  const ct = res.headers.get('content-type') || '';
  const data = ct.includes('application/json') ? await res.json() : await res.text();
  return { ok: res.ok, data };
};

export const getReadings = async (token, deviceId, limit = 100) => {
  const res = await fetch(`${baseUrl}/api/iot/readings/${deviceId}?limit=${limit}`, { headers: authHeader(token) });
  const { ok, data } = await getJson(res);
  if (!ok) throw new Error(data?.message || 'Error obteniendo lecturas');
  return data?.readings || [];
};

export const getReadingsByTimeRange = async (token, deviceId, startDate, endDate) => {
  const res = await fetch(`${baseUrl}/api/iot/readings/${deviceId}/range?startDate=${startDate}&endDate=${endDate}`, { headers: authHeader(token) });
  const { ok, data } = await getJson(res);
  if (!ok) throw new Error(data?.message || 'Error obteniendo lecturas por rango');
  return data?.readings || [];
};

export const getAllBrokers = async (token) => {
  const res = await fetch(`${baseUrl}/api/iot/brokers`, { headers: authHeader(token) });
  const { ok, data } = await getJson(res);
  if (!ok) return [];
  return data?.brokers || [];
};

export const getActiveBrokers = async (token) => {
  const res = await fetch(`${baseUrl}/api/iot/brokers/active`, { headers: authHeader(token) });
  const { ok, data } = await getJson(res);
  if (!ok) return [];
  return data?.brokers || [];
};

export const createBroker = async (token, payload) => {
  const res = await fetch(`${baseUrl}/api/iot/brokers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader(token) },
    body: JSON.stringify(payload),
  });
  const { ok, data } = await getJson(res);
  if (!ok) throw new Error(data?.message || 'Error creando broker');
  return data?.broker || data;
};

export const updateBroker = async (token, id, payload) => {
  const res = await fetch(`${baseUrl}/api/iot/brokers/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeader(token) },
    body: JSON.stringify(payload),
  });
  const { ok, data } = await getJson(res);
  if (!ok) throw new Error(data?.message || 'Error actualizando broker');
  return data?.broker || data;
};

export const deleteBroker = async (token, id) => {
  const res = await fetch(`${baseUrl}/api/iot/brokers/${id}`, { method: 'DELETE', headers: authHeader(token) });
  const { ok, data } = await getJson(res);
  if (!ok) throw new Error(data?.message || 'Error eliminando broker');
  return data?.message || 'ok';
};

export const getDashboardData = async (token) => {
  const res = await fetch(`${baseUrl}/api/iot/dashboard`, { headers: authHeader(token) });
  const { ok, data } = await getJson(res);
  if (!ok) return null;
  return data || null;
};

export const getLatestReadings = async (token) => {
  const res = await fetch(`${baseUrl}/api/iot/dashboard/readings`, { headers: authHeader(token) });
  const { ok, data } = await getJson(res);
  if (!ok) return [];
  return data?.readings || [];
};

export const getBrokersStatus = async (token) => {
  const res = await fetch(`${baseUrl}/api/iot/dashboard/brokers-status`, { headers: authHeader(token) });
  const { ok, data } = await getJson(res);
  if (!ok) return {};
  return data?.brokerStatus || {};
};

export const getBrokerSettings = async () => {
  const raw = await AsyncStorage.getItem('iot_broker_settings');
  return raw ? JSON.parse(raw) : { brokerUrl: '', topics: [] };
};

export const setBrokerSettings = async (settings) => {
  const safe = {
    brokerUrl: String(settings?.brokerUrl || '').trim(),
    topics: Array.isArray(settings?.topics) ? settings.topics.map((t) => String(t).trim()).filter(Boolean) : [],
  };
  await AsyncStorage.setItem('iot_broker_settings', JSON.stringify(safe));
  return safe;
};

const iotService = {
  getReadings,
  getReadingsByTimeRange,
  getAllBrokers,
  getActiveBrokers,
  createBroker,
  updateBroker,
  deleteBroker,
  getDashboardData,
  getLatestReadings,
  getBrokersStatus,
  getBrokerSettings,
  setBrokerSettings,
};

export default iotService;

export const startMqttConnection = async (onMessage, token) => {
  const brokers = await getActiveBrokers(token);
  if (Array.isArray(brokers) && brokers.length) {
    const b = brokers[0];
    const url = b.url || b.brokerUrl || 'ws://test.mosquitto.org:8080/mqtt';
    const topic = b.topic || (Array.isArray(b.topics) ? b.topics[0] : undefined);
    return connectMqtt({ url, topic, onMessage });
  }
  const settings = await getBrokerSettings();
  return connectMqtt({ url: settings.brokerUrl, topic: settings.topics?.[0], onMessage });
};
