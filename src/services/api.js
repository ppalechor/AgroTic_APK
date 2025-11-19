import { Platform } from 'react-native';
const defaultBaseUrl = Platform.OS === 'android' ? 'http://10.0.2.2:3001' : Platform.OS === 'ios' ? 'http://localhost:3001' : 'http://localhost:3001';
const baseUrl = (process.env.EXPO_PUBLIC_API_URL || defaultBaseUrl).replace(/\/+$/, '');

export const getHealthUrl = () => `${baseUrl}/health`;

export async function getHealth() {
  const url = getHealthUrl();
  const res = await fetch(url);
  const contentType = res.headers.get('content-type') || '';
  let preview = '';
  if (contentType.includes('application/json')) {
    const json = await res.json();
    preview = JSON.stringify(json).slice(0, 120);
  } else {
    const text = await res.text();
    preview = text.replace(/\s+/g, ' ').slice(0, 120);
  }
  return { status: res.status, preview, url };
}

export const getLoginUrl = () => `${baseUrl}/auth/login`;

export async function login({ numero_documento, password }) {
  const url = getLoginUrl();
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ numero_documento, password }),
  });

  const contentType = res.headers.get('content-type') || '';
  let data;
  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    const text = await res.text();
    throw new Error(`Respuesta no JSON (${res.status}): ${text.slice(0, 120)}`);
  }

  if (!res.ok) {
    const msg = data?.message || 'Credenciales inválidas';
    throw new Error(msg);
  }

  const token = data?.access_token;
  const user = data?.user;
  if (!token) {
    throw new Error('El servidor no retornó access_token');
  }
  return { token, user };
}

export const getCultivosUrl = () => `${baseUrl}/cultivos`;

export async function getCultivos(token) {
  const url = getCultivosUrl();
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const json = await res.json();
    return { status: res.status, data: json };
  } else {
    const text = await res.text();
    return { status: res.status, data: text };
  }
}

export const getForgotPasswordUrl = () => `${baseUrl}/auth/forgot-password`;

export async function requestPasswordReset(email) {
  const url = getForgotPasswordUrl();
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email }),
  });
  const contentType = res.headers.get('content-type') || '';
  let data;
  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    const text = await res.text();
    throw new Error(`Respuesta no JSON (${res.status}): ${text.slice(0, 120)}`);
  }
  if (!res.ok) {
    const msg = data?.message || 'No se pudo enviar el enlace';
    throw new Error(msg);
  }
  return data;
}

export const getRegisterUrl = () => `${baseUrl}/auth/register`;

export async function registerUser(payload) {
  const url = getRegisterUrl();
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const contentType = res.headers.get('content-type') || '';
  let data;
  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    const text = await res.text();
    throw new Error(`Respuesta no JSON (${res.status}): ${text.slice(0, 120)}`);
  }
  if (!res.ok) {
    const msg = data?.message || 'Error al registrar el usuario';
    throw new Error(msg);
  }
  return data;
}