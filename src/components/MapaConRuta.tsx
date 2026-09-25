import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Camera, Marker, MapMarker, Polyline, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api/client';
import { geocodificar, obtenerRuta } from '../api/mapas';
import { useGpsEnVivo } from '../hooks/useGpsEnVivo';
import { colors, radius } from '../theme';
import { formatoDistancia, formatoMinutos, horaLlegada, progresoEnRuta } from '../utils/rutaProgreso';
import { diferenciaAngular, proyectarEnRuta, suavizarRumbo } from '../utils/rumbo';
import { IconoAuto } from './IconoAuto';

// Mismo intervalo que el polling del mapa web (useUbicacionesMoviles.ts en
// TaxiAsiste-Frontend) — el backend filtra ahi solo moviles que reportaron
// GPS en los ultimos 45s (SEGUNDOS_ONLINE en moviles/views.py).
const INTERVALO_MS = 4000;

// Cuanto se puede alejar de la ruta antes de considerar que se desvio, y
// cuantas lecturas seguidas (1 por segundo) hacen falta para confirmarlo --
// evita recalcular por un salto puntual del GPS. Recalcular llama a Google
// Directions, asi que ademas hay un tiempo minimo entre recalculos.
const DESVIO_M = 80;
const LECTURAS_PARA_DESVIO = 3;
const MS_ENTRE_RECALCULOS = 20000;

// Hasta que distancia de la ruta se "pega" el auto a la calle (el GPS tiene
// 5-15 m de error) y desde que velocidad el rumbo del GPS manda sobre el de la
// ruta: solo si va claramente en contra (mas de 110 grados) se respeta el GPS.
const PEGAR_A_RUTA_M = 30;
// Al quedar menos que esto por recorrer se considera que ya llego y la linea se quita.
const LLEGADA_M = 25;
const CONTRAMANO_GRADOS = 110;

const ZOOM_VIAJE = 17;
const ZOOM_FLOTA = 15.5;
const INCLINACION_VIAJE = 45;

type Ubicacion = {
  movil: number;
  patente: string;
  socio_nombre: string;
  lat: number;
  lng: number;
  heading: number | null;
};

// A los otros conductores solo se les muestra el nombre: sin patente ni RUT
// (el backend ya no los envia; esto es por si llegara "Nombre (RUT)").
const soloNombre = (texto: string) => texto.replace(/\(.*?\)/g, '').trim();

export type PuntoRuta = { campo: 'origen' | 'destino'; color: string; etiqueta: string };
export type ViajeConRuta = { id_solicitud: number; origen: string; destino: string };
export type Coordenadas = { lat: number; lng: number };

export type MapaConRutaHandle = { centrarEnMi: () => void };

type RutaTrazada = {
  coords: { latitude: number; longitude: number }[];
  distanciaM: number;
  duracionS: number;
};

interface Props {
  idMovil: number | undefined;
  /** true: pantalla "Mapa" (muestra toda la flota en linea). false: vista
   * de viaje en curso (solo la posicion propia + el pin/ruta objetivo, sin
   * el ruido de otros moviles — mas parecido a una app de viajes). */
  mostrarFlota: boolean;
  viaje?: ViajeConRuta;
  puntoRuta?: PuntoRuta;
  /** Deja lugar abajo para no tapar los indicadores con un panel flotante. */
  espacioInferior?: number;
  /** Avisa las coordenadas del punto de recogida/destino ya geocodificado
   * (o null si no hay viaje) -- las usa el boton de Waze de la pantalla. */
  onObjetivo?: (punto: Coordenadas | null) => void;
}

const CENTRO_DEFECTO: Region = {
  latitude: -33.4489,
  longitude: -70.6693,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

export const MapaConRuta = forwardRef<MapaConRutaHandle, Props>(function MapaConRuta(
  { idMovil, mostrarFlota, viaje, puntoRuta, espacioInferior = 16, onObjetivo },
  ref
) {
  const mapRef = useRef<MapView>(null);
  const gps = useGpsEnVivo();
  const [error, setError] = useState<string | null>(null);
  const [errorRuta, setErrorRuta] = useState<string | null>(null);
  const [ultimaPropia, setUltimaPropia] = useState<Ubicacion | null>(null);
  const [otrosMoviles, setOtrosMoviles] = useState<Ubicacion[]>([]);
  const [puntoObjetivo, setPuntoObjetivo] = useState<Coordenadas | null>(null);
  const [ruta, setRuta] = useState<RutaTrazada | null>(null);
  const [siguiendo, setSiguiendo] = useState(true);
  const primerCentradoServidor = useRef(false);
  const zoomPendiente = useRef(true);
  const lecturasDesviado = useRef(0);
  const ultimoRecalculo = useRef(0);

  const enViaje = !!viaje;

  // Una respuesta lenta de /ubicaciones/ puede llegar despues de empezar el
  // viaje: se lee el valor actual (no el de la closure) para no volver a
  // cargar la flota que en viaje el conductor no debe ver.
  // Para cerrar el globo con el nombre al tocar el mapa (si no, queda abierto
  // tapando la vista hasta tocar otro marcador).
  const marcadoresFlota = useRef(new Map<number, MapMarker>());
  const cerrarGlobos = useCallback(() => {
    marcadoresFlota.current.forEach((m) => m.hideCallout());
  }, []);

  const mostrarFlotaRef = useRef(mostrarFlota);
  mostrarFlotaRef.current = mostrarFlota;

  // Posicion cruda: el GPS del celular (1 por segundo) si esta disponible;
  // si no (sin permiso, sin fix todavia), la que reporto el servidor.
  const posicionCruda = useMemo(() => {
    if (gps) return { lat: gps.lat, lng: gps.lng, rumbo: gps.rumbo, rumboFiable: gps.rumboFiable };
    if (ultimaPropia) return { lat: ultimaPropia.lat, lng: ultimaPropia.lng, rumbo: ultimaPropia.heading, rumboFiable: false };
    return null;
  }, [gps, ultimaPropia]);

  // Proyeccion sobre la ruta activa: sirve para pegar el auto a la calle y
  // para saber hacia donde deberia mirar.
  const proyeccion = useMemo(() => {
    if (!ruta || !posicionCruda) return null;
    const p = proyectarEnRuta(ruta.coords, { latitude: posicionCruda.lat, longitude: posicionCruda.lng });
    return p && p.desviacionM <= PEGAR_A_RUTA_M ? p : null;
  }, [ruta, posicionCruda]);

  // Rumbo al que "quiere" apuntar el auto: la direccion de la ruta; solo si el
  // GPS confirma que va en contra se usa el del GPS. Sin ninguno de los dos se
  // conserva el ultimo (no se vuelve al norte).
  const rumboObjetivo = useMemo(() => {
    if (!posicionCruda) return null;
    const gpsRumbo = posicionCruda.rumboFiable ? posicionCruda.rumbo : null;
    if (proyeccion) {
      if (gpsRumbo !== null && Math.abs(diferenciaAngular(proyeccion.rumbo, gpsRumbo)) > CONTRAMANO_GRADOS) {
        return gpsRumbo;
      }
      return proyeccion.rumbo;
    }
    return gpsRumbo ?? posicionCruda.rumbo;
  }, [posicionCruda, proyeccion]);

  const [rumbo, setRumbo] = useState<number | null>(null);
  useEffect(() => {
    if (rumboObjetivo === null) return;
    setRumbo((actual) => suavizarRumbo(actual, rumboObjetivo));
  }, [rumboObjetivo]);

  const posicionPropia = useMemo(() => {
    if (!posicionCruda) return null;
    if (proyeccion) return { lat: proyeccion.punto.latitude, lng: proyeccion.punto.longitude, rumbo };
    return { lat: posicionCruda.lat, lng: posicionCruda.lng, rumbo };
  }, [posicionCruda, proyeccion, rumbo]);

  const consultar = useCallback(async () => {
    try {
      const response = await api.get<Ubicacion[]>('/ubicaciones/');
      setError(null);
      const propia = response.data.find((u) => u.movil === idMovil) ?? null;
      setUltimaPropia(propia);
      setOtrosMoviles(mostrarFlotaRef.current ? response.data.filter((u) => u.movil !== idMovil) : []);
    } catch {
      setError('No se pudo actualizar el mapa.');
    }
  }, [idMovil, mostrarFlota]);

  // Al empezar un viaje se vacia la flota de inmediato.
  useEffect(() => {
    if (!mostrarFlota) setOtrosMoviles([]);
  }, [mostrarFlota]);

  useFocusEffect(
    useCallback(() => {
      let cancelado = false;
      consultar();
      const intervalId = setInterval(() => {
        if (!cancelado) consultar();
      }, INTERVALO_MS);

      return () => {
        cancelado = true;
        clearInterval(intervalId);
      };
    }, [consultar])
  );

  // Sin GPS propio, al menos centrar una vez con la posicion del servidor.
  useEffect(() => {
    if (gps || !ultimaPropia || primerCentradoServidor.current) return;
    primerCentradoServidor.current = true;
    mapRef.current?.animateToRegion(
      { latitude: ultimaPropia.lat, longitude: ultimaPropia.lng, latitudeDelta: 0.02, longitudeDelta: 0.02 },
      400
    );
  }, [gps, ultimaPropia]);

  // Trazado de la ruta al punto de la solicitud (una vez por viaje/tramo).
  useEffect(() => {
    if (!viaje || !puntoRuta) {
      setPuntoObjetivo(null);
      setRuta(null);
      setErrorRuta(null);
      onObjetivo?.(null);
      return;
    }
    if (!posicionPropia) return; // espera al primer dato de posicion propia

    let cancelado = false;

    (async () => {
      try {
        setErrorRuta(null);
        const geo = await geocodificar(viaje[puntoRuta.campo]);
        const rutaCalculada = await obtenerRuta(
          { lat: posicionPropia.lat, lng: posicionPropia.lng },
          { lat: geo.lat, lng: geo.lng }
        );
        if (cancelado) return;
        const objetivo = { lat: geo.lat, lng: geo.lng };
        setPuntoObjetivo(objetivo);
        onObjetivo?.(objetivo);
        // GeoJSON/Directions entrega [lng, lat] -- react-native-maps usa {latitude, longitude}.
        setRuta({
          coords: rutaCalculada.geometry.coordinates.map((c) => ({ latitude: c[1], longitude: c[0] })),
          distanciaM: rutaCalculada.distancia_m,
          duracionS: rutaCalculada.duracion_s,
        });
      } catch {
        if (!cancelado) setErrorRuta('No se pudo trazar la ruta al punto de la solicitud.');
      }
    })();

    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viaje?.id_solicitud, puntoRuta?.campo, !!posicionPropia]);

  // Cuanto falta, calculado sobre la ruta ya descargada (sin llamar a Google).
  const progreso = useMemo(() => {
    if (!ruta || !gps) return null;
    return progresoEnRuta(
      ruta.coords,
      { latitude: gps.lat, longitude: gps.lng },
      ruta.distanciaM,
      ruta.duracionS
    );
  }, [ruta, gps]);

  // Solo lo que falta por recorrer: el tramo ya andado se quita para no
  // ensuciar el mapa. Al llegar (o sin ruta) no se dibuja nada. Si el auto
  // esta lejos de la ruta (proyeccion nula) se deja completa hasta recalcular.
  const rutaRestante = useMemo(() => {
    if (!ruta || ruta.coords.length === 0) return null;
    if (progreso && progreso.restanteM <= LLEGADA_M) return null;
    if (!proyeccion) return ruta.coords;
    return [proyeccion.punto, ...ruta.coords.slice(proyeccion.indice + 1)];
  }, [ruta, proyeccion, progreso]);

  // Si el conductor se sale de la ruta de forma sostenida, se pide una nueva
  // desde donde esta (unica razon por la que se vuelve a llamar a Directions).
  useEffect(() => {
    if (!progreso || !gps || !puntoObjetivo) return;
    if (progreso.desviacionM <= DESVIO_M) {
      lecturasDesviado.current = 0;
      return;
    }
    lecturasDesviado.current += 1;
    if (lecturasDesviado.current < LECTURAS_PARA_DESVIO) return;
    if (Date.now() - ultimoRecalculo.current < MS_ENTRE_RECALCULOS) return;

    lecturasDesviado.current = 0;
    ultimoRecalculo.current = Date.now();
    obtenerRuta({ lat: gps.lat, lng: gps.lng }, puntoObjetivo)
      .then((r) =>
        setRuta({
          coords: r.geometry.coordinates.map((c) => ({ latitude: c[1], longitude: c[0] })),
          distanciaM: r.distancia_m,
          duracionS: r.duracion_s,
        })
      )
      .catch(() => {});
  }, [progreso, gps, puntoObjetivo]);

  // Al empezar/terminar un viaje se vuelve a seguir al conductor con el zoom
  // que corresponde a cada modo.
  useEffect(() => {
    zoomPendiente.current = true;
    setSiguiendo(true);
  }, [enViaje]);

  // Camara tipo Google Maps: sigue al conductor. En viaje va de cara al
  // rumbo y con inclinacion; en la vista de flota queda con el norte arriba
  // (para poder mirar a los otros moviles). El zoom solo se fija al empezar a
  // seguir: despues se respeta el que el conductor elija con los dedos.
  useEffect(() => {
    if (!siguiendo || !posicionPropia) return;
    const camara: Partial<Camera> = {
      center: { latitude: posicionPropia.lat, longitude: posicionPropia.lng },
      heading: enViaje ? (posicionPropia.rumbo ?? 0) : 0,
      pitch: enViaje ? INCLINACION_VIAJE : 0,
    };
    if (zoomPendiente.current) {
      camara.zoom = enViaje ? ZOOM_VIAJE : ZOOM_FLOTA;
      zoomPendiente.current = false;
    }
    mapRef.current?.animateCamera(camara, { duration: 900 });
  }, [siguiendo, posicionPropia?.lat, posicionPropia?.lng, posicionPropia?.rumbo, enViaje]);

  const centrar = useCallback(() => {
    zoomPendiente.current = true;
    setSiguiendo(true);
  }, []);

  useImperativeHandle(ref, () => ({ centrarEnMi: centrar }), [centrar]);

  const velocidadTexto = gps?.velocidadKmh != null ? String(Math.round(gps.velocidadKmh)) : '--';

  return (
    <View style={styles.container}>
      <MapView
        // key: al pasar de flota a viaje se recrea el mapa; en Android los
        // marcadores personalizados de otros moviles quedaban "pegados" en el
        // mapa nativo aunque React ya los hubiera quitado.
        key={enViaje ? 'viaje' : 'flota'}
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.mapa}
        initialRegion={CENTRO_DEFECTO}
        showsCompass={false}
        toolbarEnabled={false}
        // El panel de abajo tapa parte del mapa: el margen hace que la camara
        // centre al auto en la zona visible y no en el medio de toda la pantalla.
        mapPadding={{ top: 0, right: 0, left: 0, bottom: viaje ? espacioInferior : 0 }}
        onPress={cerrarGlobos}
        onPanDrag={() => setSiguiendo(false)}
      >
        {posicionPropia && (
          <Marker
            coordinate={{ latitude: posicionPropia.lat, longitude: posicionPropia.lng }}
            rotation={posicionPropia.rumbo ?? 0}
            anchor={{ x: 0.5, y: 0.5 }}
            flat
            title={ultimaPropia ? `Tu móvil — ${ultimaPropia.patente}` : 'Tu móvil'}
          >
            <IconoAuto color="#f2c400" esMio />
          </Marker>
        )}

        {mostrarFlota && otrosMoviles.map((m) => (
          <Marker
            key={m.movil}
            coordinate={{ latitude: m.lat, longitude: m.lng }}
            rotation={m.heading ?? 0}
            anchor={{ x: 0.5, y: 0.5 }}
            flat
            ref={(marcador) => {
              if (marcador) marcadoresFlota.current.set(m.movil, marcador);
              else marcadoresFlota.current.delete(m.movil);
            }}
            title={soloNombre(m.socio_nombre)}
          >
            <IconoAuto color="#2563eb" esMio={false} />
          </Marker>
        ))}

        {puntoObjetivo && puntoRuta && (
          <Marker
            coordinate={{ latitude: puntoObjetivo.lat, longitude: puntoObjetivo.lng }}
            title={puntoRuta.etiqueta}
            pinColor={puntoRuta.color}
          />
        )}

        {rutaRestante && rutaRestante.length > 1 && (
          <Polyline coordinates={rutaRestante} strokeColor="#7e22ce" strokeWidth={5} />
        )}
      </MapView>

      {(error || errorRuta) && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error ?? errorRuta}</Text>
        </View>
      )}

      <View style={[styles.filaInferior, { bottom: espacioInferior }]} pointerEvents="box-none">
        <View style={styles.colIzquierda} pointerEvents="box-none">
          {mostrarFlota && (
            <View style={styles.leyenda}>
              <View style={styles.leyendaFila}>
                <View style={[styles.leyendaPunto, { backgroundColor: '#f2c400' }]} />
                <Text style={styles.leyendaTexto}>Tu móvil</Text>
              </View>
              <View style={styles.leyendaFila}>
                <View style={[styles.leyendaPunto, { backgroundColor: '#2563eb' }]} />
                <Text style={styles.leyendaTexto}>Otros móviles en línea</Text>
              </View>
            </View>
          )}
          <View style={styles.burbujaVelocidad}>
            <Text style={styles.velocidadNumero}>{velocidadTexto}</Text>
            <Text style={styles.velocidadUnidad}>km/h</Text>
          </View>
        </View>

        {progreso ? (
          <View style={styles.tarjetaLlegada}>
            <Text style={styles.llegadaMinutos}>{formatoMinutos(progreso.restanteS)}</Text>
            <Text style={styles.llegadaDetalle}>
              {formatoDistancia(progreso.restanteM)} · {horaLlegada(progreso.restanteS)}
            </Text>
          </View>
        ) : (
          <View style={{ flex: 1 }} pointerEvents="none" />
        )}

        <View style={styles.colDerecha} pointerEvents="box-none">
          {!siguiendo && (
            <TouchableOpacity
              style={styles.botonCentrar}
              onPress={centrar}
              disabled={!posicionPropia}
              accessibilityLabel="Centrar el mapa en mi posición"
            >
              <Ionicons name="navigate" size={18} color={colors.ink} />
              <Text style={styles.botonCentrarTexto}>Centrar</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  mapa: { flex: 1 },
  errorBox: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    backgroundColor: colors.critBg,
    borderRadius: radius.sm,
    padding: 10,
  },
  errorText: { color: colors.crit, fontSize: 13 },

  filaInferior: {
    position: 'absolute',
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  colIzquierda: { alignItems: 'flex-start', gap: 8 },
  colDerecha: { alignItems: 'flex-end', minWidth: 0 },

  burbujaVelocidad: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  velocidadNumero: { fontSize: 22, fontWeight: '800', color: colors.text, fontVariant: ['tabular-nums'], lineHeight: 24 },
  velocidadUnidad: { fontSize: 10, color: colors.textMuted, fontWeight: '600' },

  tarjetaLlegada: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  llegadaMinutos: { fontSize: 20, fontWeight: '800', color: colors.good, fontVariant: ['tabular-nums'] },
  llegadaDetalle: { fontSize: 12.5, color: colors.textMuted, fontVariant: ['tabular-nums'] },

  botonCentrar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 44,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  botonCentrarTexto: { fontSize: 14, fontWeight: '700', color: colors.ink },

  leyenda: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: radius.md,
    padding: 10,
    gap: 6,
  },
  leyendaFila: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  leyendaPunto: { width: 10, height: 10, borderRadius: 5 },
  leyendaTexto: { fontSize: 12, color: colors.textMuted },
});
