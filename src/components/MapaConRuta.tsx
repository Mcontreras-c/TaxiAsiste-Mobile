import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import Svg, { Circle, Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api/client';
import { geocodificar, obtenerRuta } from '../api/mapas';
import { colors, radius } from '../theme';

// Mismo intervalo que el polling del mapa web (useUbicacionesMoviles.ts en
// TaxiAsiste-Frontend) — el backend filtra ahi solo moviles que reportaron
// GPS en los ultimos 45s (SEGUNDOS_ONLINE en moviles/views.py).
const INTERVALO_MS = 4000;

type Ubicacion = {
  movil: number;
  patente: string;
  socio_nombre: string;
  lat: number;
  lng: number;
  heading: number | null;
};

export type PuntoRuta = { campo: 'origen' | 'destino'; color: string; etiqueta: string };
export type ViajeConRuta = { id_solicitud: number; origen: string; destino: string };

export type MapaConRutaHandle = { centrarEnMi: () => void };

interface Props {
  idMovil: number | undefined;
  /** true: pantalla "Mapa" (muestra toda la flota en linea). false: vista
   * de viaje en curso (solo la posicion propia + el pin/ruta objetivo, sin
   * el ruido de otros moviles — mas parecido a una app de viajes). */
  mostrarFlota: boolean;
  viaje?: ViajeConRuta;
  puntoRuta?: PuntoRuta;
  /** Deja lugar abajo para no tapar el botón de centrar con un panel flotante. */
  espacioInferior?: number;
}

const CENTRO_DEFECTO: Region = {
  latitude: -33.4489,
  longitude: -70.6693,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

// Mismo dibujo de auto vista-superior que usa MapaDespacho.tsx en el Frontend
// web, pero como componente SVG nativo (react-native-svg) en vez de un
// string HTML — el marcador rota con la propiedad `heading` del propio auto.
function IconoAuto({ color, esMio }: { color: string; esMio: boolean }) {
  const anillo = esMio ? '#0072bc' : '#fff';
  return (
    <Svg width={36} height={36} viewBox="0 0 38 38">
      <Circle cx={19} cy={19} r={18} fill={color} fillOpacity={0.16} />
      <Path
        d="M19 6.2C13.6 6.2 11 9 10.6 13.5L9.8 24.5C9.6 27.6 11.6 29.6 14.4 29.9L14.4 27.4C14.4 26.6 15 26 15.8 26L22.2 26C23 26 23.6 26.6 23.6 27.4L23.6 29.9C26.4 29.6 28.4 27.6 28.2 24.5L27.4 13.5C27 9 24.4 6.2 19 6.2Z"
        fill={color}
        stroke="white"
        strokeWidth={1.4}
      />
      <Path
        d="M13.2 13.8C13.6 11 15.2 9.2 19 9.2C22.8 9.2 24.4 11 24.8 13.8C25 15.3 24 16 22.6 16L15.4 16C14 16 13 15.3 13.2 13.8Z"
        fill="white"
        fillOpacity={0.92}
      />
      <Circle cx={19} cy={19} r={18} fill="none" stroke={anillo} strokeWidth={esMio ? 2.4 : 1.2} strokeOpacity={0.9} />
    </Svg>
  );
}

export const MapaConRuta = forwardRef<MapaConRutaHandle, Props>(function MapaConRuta(
  { idMovil, mostrarFlota, viaje, puntoRuta, espacioInferior = 16 },
  ref
) {
  const mapRef = useRef<MapView>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorRuta, setErrorRuta] = useState<string | null>(null);
  const [ultimaPropia, setUltimaPropia] = useState<Ubicacion | null>(null);
  const [otrosMoviles, setOtrosMoviles] = useState<Ubicacion[]>([]);
  const [yaCentrado, setYaCentrado] = useState(false);
  const [puntoObjetivo, setPuntoObjetivo] = useState<{ lat: number; lng: number } | null>(null);
  const [coordenadasRuta, setCoordenadasRuta] = useState<{ latitude: number; longitude: number }[]>([]);

  const consultar = useCallback(async () => {
    try {
      const response = await api.get<Ubicacion[]>('/ubicaciones/');
      setError(null);
      const propia = response.data.find((u) => u.movil === idMovil) ?? null;
      setUltimaPropia(propia);
      setOtrosMoviles(mostrarFlota ? response.data.filter((u) => u.movil !== idMovil) : []);

      if (propia && !yaCentrado) {
        mapRef.current?.animateToRegion(
          { latitude: propia.lat, longitude: propia.lng, latitudeDelta: 0.02, longitudeDelta: 0.02 },
          400
        );
        setYaCentrado(true);
      }
    } catch {
      setError('No se pudo actualizar el mapa.');
    }
  }, [idMovil, mostrarFlota, yaCentrado]);

  useEffect(() => {
    if (!viaje || !puntoRuta) {
      setPuntoObjetivo(null);
      setCoordenadasRuta([]);
      setErrorRuta(null);
      return;
    }
    if (!ultimaPropia) return; // espera al primer ciclo de polling con posicion propia

    let cancelado = false;

    (async () => {
      try {
        setErrorRuta(null);
        const direccion = viaje[puntoRuta.campo];
        const geo = await geocodificar(direccion);
        const rutaCalculada = await obtenerRuta(
          { lat: ultimaPropia.lat, lng: ultimaPropia.lng },
          { lat: geo.lat, lng: geo.lng }
        );
        if (cancelado) return;
        setPuntoObjetivo({ lat: geo.lat, lng: geo.lng });
        // GeoJSON/Directions entrega [lng, lat] -- react-native-maps usa {latitude, longitude}.
        const coords = rutaCalculada.geometry.coordinates.map((c) => ({ latitude: c[1], longitude: c[0] }));
        setCoordenadasRuta(coords);
        mapRef.current?.fitToCoordinates(coords, {
          edgePadding: { top: 60, right: 60, bottom: 60, left: 60 },
          animated: true,
        });
      } catch {
        if (!cancelado) setErrorRuta('No se pudo trazar la ruta al punto de la solicitud.');
      }
    })();

    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viaje?.id_solicitud, puntoRuta?.campo, !!ultimaPropia]);

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
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [idMovil, mostrarFlota])
  );

  useImperativeHandle(ref, () => ({
    centrarEnMi() {
      if (ultimaPropia) {
        mapRef.current?.animateToRegion(
          { latitude: ultimaPropia.lat, longitude: ultimaPropia.lng, latitudeDelta: 0.02, longitudeDelta: 0.02 },
          400
        );
      }
    },
  }));

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.mapa}
        initialRegion={CENTRO_DEFECTO}
        showsCompass={false}
      >
        {ultimaPropia && (
          <Marker
            coordinate={{ latitude: ultimaPropia.lat, longitude: ultimaPropia.lng }}
            rotation={ultimaPropia.heading ?? 0}
            anchor={{ x: 0.5, y: 0.5 }}
            flat
            title={`Tu móvil — ${ultimaPropia.patente}`}
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
            title={m.patente}
            description={m.socio_nombre}
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

        {coordenadasRuta.length > 0 && (
          <Polyline coordinates={coordenadasRuta} strokeColor="#7e22ce" strokeWidth={4} />
        )}
      </MapView>

      {(error || errorRuta) && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error ?? errorRuta}</Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.botonCentrar, { bottom: espacioInferior }]}
        onPress={() => ultimaPropia && mapRef.current?.animateToRegion(
          { latitude: ultimaPropia.lat, longitude: ultimaPropia.lng, latitudeDelta: 0.02, longitudeDelta: 0.02 },
          400
        )}
        disabled={!ultimaPropia}
      >
        <Ionicons name="locate" size={22} color={ultimaPropia ? colors.ink : colors.textFaint} />
      </TouchableOpacity>

      {mostrarFlota && (
        <View style={[styles.leyenda, { bottom: espacioInferior }]}>
          <View style={styles.leyendaFila}>
            <View style={[styles.leyendaPunto, { backgroundColor: '#f2c400' }]} />
            <Text style={styles.leyendaTexto}>Tu móvil</Text>
          </View>
          <View style={styles.leyendaFila}>
            <View style={[styles.leyendaPunto, { backgroundColor: '#2563eb' }]} />
            <Text style={styles.leyendaTexto}>Otros móviles en línea</Text>
          </View>
          {puntoRuta && (
            <View style={styles.leyendaFila}>
              <View style={[styles.leyendaPunto, { backgroundColor: puntoRuta.color }]} />
              <Text style={styles.leyendaTexto}>{puntoRuta.etiqueta} de tu viaje activo</Text>
            </View>
          )}
        </View>
      )}
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
  botonCentrar: {
    position: 'absolute',
    right: 16,
    width: 46,
    height: 46,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  leyenda: {
    position: 'absolute',
    left: 12,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: radius.md,
    padding: 10,
    gap: 6,
  },
  leyendaFila: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  leyendaPunto: { width: 10, height: 10, borderRadius: 5 },
  leyendaTexto: { fontSize: 12, color: colors.textMuted },
});
