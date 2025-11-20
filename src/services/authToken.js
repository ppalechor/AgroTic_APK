import AsyncStorage from '@react-native-async-storage/async-storage';

let cachedToken = '';

export async function initAuthToken() {
  try {
    const t = await AsyncStorage.getItem('auth_token');
    cachedToken = t || '';
  } catch {}
}

export function setToken(t) {
  cachedToken = t || '';
  if (t) AsyncStorage.setItem('auth_token', t);
  else AsyncStorage.removeItem('auth_token');
}

export function getToken() {
  return cachedToken;
}

