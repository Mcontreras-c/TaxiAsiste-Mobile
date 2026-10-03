// Cuando fue la ultima vez que este telefono envio su ubicacion al servidor, venga de la
// tarea en segundo plano (ubicacionTask) o del "latido" en primer plano (useTrackingUbicacion).
// Sin dependencias nativas a proposito, para poder probarlo y usarlo desde ambos lados.

// El backend saca del mapa a un movil sin reportes en 45 s (SEGUNDOS_ONLINE).
// El envio normal va cada 12 s: pasado este margen se considera que la tarea en segundo
// plano no esta entregando y el latido toma el relevo.
export const INTERVALO_ENVIO_MS = 12000;
export const MARGEN_PARA_LATIDO_MS = 18000;

let ultimoEnvioMs = 0;

/** Se llama cada vez que un envio de ubicacion al servidor sale bien. */
export function marcarEnvio(ahora: number = Date.now()) {
  ultimoEnvioMs = ahora;
}

export function ultimoEnvio(): number {
  return ultimoEnvioMs;
}

/** Solo para pruebas y para reiniciar el estado al cerrar sesion. */
export function reiniciarEnvio() {
  ultimoEnvioMs = 0;
}

/**
 * El latido solo envia si nadie ha enviado hace un rato: mientras la tarea en segundo plano
 * funciona queda callado (sin duplicar envios) y si se detiene, la ubicacion sigue saliendo
 * mientras la app esta abierta.
 */
export function debeEnviarLatido(ahora: number, ultimo: number): boolean {
  return ahora - ultimo >= MARGEN_PARA_LATIDO_MS;
}
