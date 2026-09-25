import { api } from './client';

export const cambiarPassword = (passwordActual: string, passwordNueva: string) =>
  api
    .post<{ detail: string }>('/usuarios/cambiar_password/', {
      password_actual: passwordActual,
      password_nueva: passwordNueva,
    })
    .then((r) => r.data);

// Publico (sin sesion): el backend responde siempre lo mismo exista o no el correo.
export const olvidePassword = (email: string) =>
  api.post<{ detail: string }>('/usuarios/olvide_password/', { email }).then((r) => r.data);
