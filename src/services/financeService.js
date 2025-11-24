import axios from 'axios';
import { baseUrl } from './api';

const api = axios.create({ baseURL: baseUrl });
const authHeader = (token) => ({ Authorization: `Bearer ${token}` });
const filterParams = (params = {}) => Object.entries(params || {}).reduce((acc, [k, v]) => {
  if (v !== undefined && v !== null && String(v).length) acc[k] = v;
  return acc;
}, {});

export const getResumen = async (token, { cultivoId, from, to, groupBy, tipo } = {}) => {
  const res = await api.get('/finanzas/resumen', { params: filterParams({ cultivoId, from, to, groupBy, tipo }), headers: authHeader(token) });
  return res.data;
};

export const getMargenLista = async (token, { from, to } = {}) => {
  const res = await api.get('/finanzas/margen', { params: filterParams({ from, to }), headers: authHeader(token) });
  return res.data;
};

export const getRentabilidad = async (token, { cultivoId, from, to, criterio, umbral } = {}) => {
  const res = await api.get('/finanzas/rentabilidad', { params: filterParams({ cultivoId, from, to, criterio, umbral }), headers: authHeader(token) });
  return res.data;
};

export const getGastosComparativo = async (token, params = {}) => {
  const res = await api.get('/finanzas/gastos-comparativo', { params: filterParams(params), headers: authHeader(token) });
  return res.data;
};

export const getIngresos = async (token, params = {}) => {
  const res = await api.get('/ingresos', { params: filterParams(params), headers: authHeader(token) });
  return res.data;
};

export const getSalidas = async (token, params = {}) => {
  const res = await api.get('/salidas', { params: filterParams(params), headers: authHeader(token) });
  return res.data;
};

export const getActividades = async (token, params = {}) => {
  const res = await api.get('/actividades', { params: filterParams(params), headers: authHeader(token) });
  return res.data;
};

export const exportExcel = async (token, params = {}) => {
  const res = await api.get('/finanzas/export/excel', { params: filterParams(params), headers: authHeader(token), responseType: 'blob' });
  return res.data;
};

export const exportPdf = async (token, params = {}) => {
  const res = await api.get('/finanzas/export/pdf', { params: filterParams(params), headers: authHeader(token), responseType: 'blob' });
  return res.data;
};

export default {
  getResumen,
  getMargenLista,
  getRentabilidad,
  getGastosComparativo,
  getIngresos,
  getSalidas,
  getActividades,
  exportExcel,
  exportPdf,
};
