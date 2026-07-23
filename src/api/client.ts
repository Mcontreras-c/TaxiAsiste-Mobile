import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Detecta automaticamente la IP de la PC que corre "npx expo start",
// leyendo la misma direccion que usa Metro (exp://<ip>:8081) para el celular/emulador.
// Asi no hay que editar este archivo cada vez que cambia la IP de la red.
function detectarHost(): string {
  const hostUri = Constants.expoConfig?.hostUri ?? Constants.expoGoConfig?.debuggerHost;
  const ip = hostUri?.split(':')[0];

  if (ip) {
    return `http://${ip}:8000`;
  }

  // Fallback: emulador Android Studio (10.0.2.2 apunta al localhost de la PC).
  return Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://localhost:8000';
}

const BASE_URL = `${detectarHost()}/api`;

export const api = axios.create({ baseURL: BASE_URL });

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
