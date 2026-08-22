import { api } from './client';

export interface GeocodResultado {
  lat: number;
  lng: number;
  direccion_formateada: string;
}

export interface RutaResultado {
  geometry: { type: 'LineString'; coordinates: [number, number][] }; // [lng, lat]
  distancia_m: number;
  duracion_s: number;
}

export const geocodificar = (direccion: string) =>
  api.get<GeocodResultado>('/geocodificar/', { params: { direccion } }).then((r) => r.data);

export const obtenerRuta = (origen: { lat: number; lng: number }, destino: { lat: number; lng: number }) =>
  api
    .get<RutaResultado>('/ruta/', {
      params: {
        origen_lat: origen.lat,
        origen_lng: origen.lng,
        destino_lat: destino.lat,
        destino_lng: destino.lng,
      },
    })
    .then((r) => r.data);
