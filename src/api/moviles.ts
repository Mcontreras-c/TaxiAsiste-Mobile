import { api } from './client';

export interface UbicacionPayload {
  lat: number;
  lng: number;
  heading?: number | null;
  velocidad_kmh?: number | null;
}

export const postUbicacion = (idMovil: number, data: UbicacionPayload) =>
  api.post(`/moviles/${idMovil}/ubicacion/`, data);

export const desconectarMovil = (idMovil: number) =>
  api.post(`/moviles/${idMovil}/desconectar/`);

export const conectarMovil = (idMovil: number) =>
  api.post(`/moviles/${idMovil}/conectar/`);
