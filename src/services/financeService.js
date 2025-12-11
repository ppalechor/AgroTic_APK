import axios from 'axios';
import { baseUrl } from './api';

const api = axios.create({ baseURL: baseUrl });
const authHeader = (token) => ({ Authorization: `Bearer ${token}` });
const filterParams = (params = {}) => Object.entries(params || {}).reduce((acc, [k, v]) => {
  if (v !== undefined && v !== null && String(v).length) acc[k] = v;
  return acc;
}, {});
const pickData = (res) => {
  const ct = (res.headers?.['content-type'] || res.headers?.['Content-Type'] || '').toString();
  if (ct.includes('application/json')) return res.data;
  const txt = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
  throw new Error(txt.slice(0, 140));
};

export const getResumen = async (token, { cultivoId, from, to, groupBy, tipo } = {}) => {
  const res = await api.get('/finanzas/resumen', { params: filterParams({ cultivoId, from, to, groupBy, tipo }), headers: authHeader(token) });
  return pickData(res);
};

export const getMargenLista = async (token, { from, to } = {}) => {
  const res = await api.get('/finanzas/margen', { params: filterParams({ from, to }), headers: authHeader(token) });
  return pickData(res);
};

export const getRentabilidad = async (token, { cultivoId, from, to, criterio, umbral } = {}) => {
  const res = await api.get('/finanzas/rentabilidad', { params: filterParams({ cultivoId, from, to, criterio, umbral }), headers: authHeader(token) });
  return pickData(res);
};

export const getGastosComparativo = async (token, params = {}) => {
  const res = await api.get('/finanzas/gastos-comparativo', { params: filterParams(params), headers: authHeader(token) });
  return pickData(res);
};

export const getIngresos = async (token, params = {}) => {
  const res = await api.get('/ingresos', { params: filterParams(params), headers: authHeader(token) });
  return pickData(res);
};

export const getSalidas = async (token, params = {}) => {
  const res = await api.get('/salidas', { params: filterParams(params), headers: authHeader(token) });
  return pickData(res);
};

export const getActividades = async (token, params = {}) => {
  const res = await api.get('/actividades', { params: filterParams(params), headers: authHeader(token) });
  return pickData(res);
};

// Funciones de exportación removidas según solicitud

export default {
  getResumen,
  getMargenLista,
  getRentabilidad,
  getGastosComparativo,
  getIngresos,
  getSalidas,
  getActividades,
};
