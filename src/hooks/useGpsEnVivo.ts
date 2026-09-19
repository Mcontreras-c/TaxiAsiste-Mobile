import { useEffect, useRef, useState } from 'react';
import { useIsFocused } from '@react-navigation/native';
import * as Location from 'expo-location';
import { procesarVelocidad } from '../utils/velocidad';

// Bajo esta velocidad (~3,6 km/h) el rumbo del GPS no es confiable (apunta a
// cualquier lado): se conserva el ultimo valido en vez de girar el auto.
const MS_MINIMO_PARA_RUMBO = 1;

// Si el GPS deja de entregar velocidad (un tunel, unos segundos de mala
// señal) se mantiene la ultima lectura este tiempo antes de mostrar "--".
const MS_RETENER_VELOCIDAD = 3000;

export type GpsEnVivo = {
  lat: number;
  lng: number;
  rumbo: number | null;
  velocidadKmh: number | null;
  precisionM: number | null;
};

/**
 * Posicion, rumbo y velocidad del propio celular, una vez por segundo, solo
 * mientras la pantalla que lo usa esta enfocada -- es un watch en primer
 * plano, aparte del servicio de segundo plano que reporta al backend cada 12 s
 * (ver useTrackingUbicacion). Lee directo del GPS en vez de esperar la vuelta
 * al servidor, que llega con hasta ~15 s de atraso.
 *
 * distanceInterval en 0 a proposito: con un valor mayor, Android no entrega
 * lecturas con el auto detenido (ver el comentario en useTrackingUbicacion).
 */
export function useGpsEnVivo(): GpsEnVivo | null {
  const enfocado = useIsFocused();
  const [gps, setGps] = useState<GpsEnVivo | null>(null);
  const ultimaVelocidad = useRef<{ valor: number; t: number } | null>(null);
  const ultimoRumbo = useRef<number | null>(null);

  useEffect(() => {
    if (!enfocado) return;
    let cancelado = false;
    let suscripcion: Location.LocationSubscription | null = null;

    Location.watchPositionAsync(
      { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 1000, distanceInterval: 0 },
      (loc) => {
        const { latitude, longitude, speed, heading, accuracy } = loc.coords;
        const ahora = Date.now();

        const nueva = procesarVelocidad(speed, ultimaVelocidad.current?.valor ?? null);
        let velocidad: number | null = nueva;
        if (nueva !== null) {
          ultimaVelocidad.current = { valor: nueva, t: ahora };
        } else if (ultimaVelocidad.current && ahora - ultimaVelocidad.current.t < MS_RETENER_VELOCIDAD) {
          velocidad = ultimaVelocidad.current.valor;
        }

        if (speed != null && speed >= MS_MINIMO_PARA_RUMBO && heading != null && heading >= 0) {
          ultimoRumbo.current = heading;
        }

        setGps({
          lat: latitude,
          lng: longitude,
          rumbo: ultimoRumbo.current,
          velocidadKmh: velocidad,
          precisionM: accuracy ?? null,
        });
      }
    )
      .then((s) => {
        if (cancelado) s.remove();
        else suscripcion = s;
      })
      // Sin permiso o sin GPS: el mapa sigue funcionando con la posicion
      // que reporta el servidor (ver MapaConRuta).
      .catch(() => {});

    return () => {
      cancelado = true;
      suscripcion?.remove();
    };
  }, [enfocado]);

  return gps;
}
