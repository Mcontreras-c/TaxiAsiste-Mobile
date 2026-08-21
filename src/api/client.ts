import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// En builds standalone/preview (sin Metro corriendo) NO hay hostUri que
// detectar — hay que fijar la IP del backend en tiempo de build via
// EXPO_PUBLIC_API_BASE_URL (ver eas.json). Sin esto, el fallback de abajo
// (10.0.2.2, solo valido dentro del emulador de Android Studio) hace que
// TODA la app falle en silencio en un telefono real: login, tracking, todo.
function detectarHost(): string {
  if (process.env.EXPO_PUBLIC_API_BASE_URL) {
    return process.env.EXPO_PUBLIC_API_BASE_URL;
  }

  // Detecta automaticamente la IP de la PC que corre "npx expo start",
  // leyendo la misma direccion que usa Metro (exp://<ip>:8081) para el
  // celular/emulador. Solo aplica en dev (Expo Go / dev client con Metro).
  const hostUri = Constants.expoConfig?.hostUri ?? Constants.expoGoConfig?.debuggerHost;
  const ip = hostUri?.split(':')[0];

  if (ip) {
    return `http://${ip}:8000`;
  }

  // Ultimo fallback: emulador Android Studio (10.0.2.2 apunta al localhost
  // de la PC). NO sirve en un telefono fisico ni en un build standalone.
  return Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://localhost:8000';
}

const BASE_URL = `${detectarHost()}/api`;
console.log('[API] usando backend:', BASE_URL);

export const api = axios.create({ baseURL: BASE_URL });

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// AuthProvider se suscribe aca para poder cerrar sesion cuando el backend
// rechaza el token (vencido, o sesion cerrada porque se inicio sesion en
// otro dispositivo). Vive fuera de React porque el interceptor de axios
// no tiene acceso directo al contexto.
let onSessionExpired: (() => void) | null = null;
export function setOnSessionExpired(cb: (() => void) | null) {
  onSessionExpired = cb;
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      onSessionExpired?.();
    }
    return Promise.reject(error);
  }
);
