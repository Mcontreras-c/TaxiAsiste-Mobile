import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

// Cambia esto segun donde estes probando:
// - true  -> emulador Android Studio (usa 10.0.2.2 para llegar al localhost de la PC)
// - false -> celular fisico en la misma WiFi (usa la IP local de la PC)
const USE_EMULATOR = true;

const EMULATOR_HOST = 'http://10.0.2.2:8000';
const PHYSICAL_DEVICE_HOST = 'http://192.168.1.5:8000';

const BASE_URL = `${USE_EMULATOR ? EMULATOR_HOST : PHYSICAL_DEVICE_HOST}/api`;

export const api = axios.create({ baseURL: BASE_URL });

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
