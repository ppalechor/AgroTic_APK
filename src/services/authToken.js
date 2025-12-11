import AsyncStorage from '@react-native-async-storage/async-storage';

let cachedToken = '';
let cachedUser = null;

export async function initAuthToken() {
  try {
    const t = await AsyncStorage.getItem('auth_token');
    cachedToken = t || '';
  } catch {}
}

export async function initAuthUser() {
  try {
    const u = await AsyncStorage.getItem('auth_user');
    cachedUser = u ? JSON.parse(u) : null;
  } catch {
    cachedUser = null;
  }
}

export function setToken(t) {
  cachedToken = t || '';
  if (t) AsyncStorage.setItem('auth_token', t);
  else AsyncStorage.removeItem('auth_token');
}

export function setUser(u) {
  cachedUser = u || null;
  if (u) AsyncStorage.setItem('auth_user', JSON.stringify(u));
  else AsyncStorage.removeItem('auth_user');
}

export function getToken() {
  return cachedToken;
}

export function getUser() {
  return cachedUser;
}
