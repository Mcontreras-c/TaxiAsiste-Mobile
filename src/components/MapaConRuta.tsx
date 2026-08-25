import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { WebView } from 'react-native-webview';
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

// HTML estatico con Leaflet cargado por CDN (misma libreria que el mapa web,
// via unpkg en vez del bundle de npm — no hay build step nativo para traerla
// como asset). Se comunica con React Native solo en un sentido: RN llama
// window.actualizarMoviles(...)/mostrarRuta(...) via injectJavaScript; no
// hace falta el canal inverso porque esta vista es de solo lectura.
const HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #mapa { height: 100%; margin: 0; padding: 0; background: #fbf9f4; }
  </style>
</head>
<body>
  <div id="mapa"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    var CENTRO_DEFECTO = [-33.4489, -70.6693];
    var map = L.map('mapa', { zoomControl: true }).setView(CENTRO_DEFECTO, 14);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      subdomains: 'abcd',
      maxZoom: 20,
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    }).addTo(map);

    var marcadores = {};
    var yaCentrado = false;

    function iconoAuto(color, heading, esMio) {
      var rotacion = heading || 0;
      var anillo = esMio ? '#0072bc' : 'white';
      var svg = '<svg width="36" height="36" viewBox="0 0 38 38" xmlns="http://www.w3.org/2000/svg">' +
        '<circle cx="19" cy="19" r="18" fill="' + color + '" fill-opacity="0.16"/>' +
        '<g transform="rotate(' + rotacion + ' 19 19)">' +
        '<path d="M19 6.2C13.6 6.2 11 9 10.6 13.5L9.8 24.5C9.6 27.6 11.6 29.6 14.4 29.9L14.4 27.4C14.4 26.6 15 26 15.8 26L22.2 26C23 26 23.6 26.6 23.6 27.4L23.6 29.9C26.4 29.6 28.4 27.6 28.2 24.5L27.4 13.5C27 9 24.4 6.2 19 6.2Z" fill="' + color + '" stroke="white" stroke-width="1.4"/>' +
        '<path d="M13.2 13.8C13.6 11 15.2 9.2 19 9.2C22.8 9.2 24.4 11 24.8 13.8C25 15.3 24 16 22.6 16L15.4 16C14 16 13 15.3 13.2 13.8Z" fill="white" fill-opacity="0.92"/>' +
        '</g>' +
        '<circle cx="19" cy="19" r="18" fill="none" stroke="' + anillo + '" stroke-width="' + (esMio ? 2.4 : 1.2) + '" stroke-opacity="0.9"/>' +
        '</svg>';
      return L.divIcon({ html: svg, className: 'marcador-vehiculo', iconSize: [36, 36], iconAnchor: [18, 18], popupAnchor: [0, -18] });
    }

    function actualizarMoviles(datos) {
      var vistos = {};
      datos.forEach(function (m) {
        vistos[m.movil] = true;
        var color = m.esMio ? '#f2c400' : '#2563eb';
        var etiqueta = m.esMio ? 'Tu movil — ' + m.patente : m.patente + (m.socio_nombre ? ' · ' + m.socio_nombre : '');
        if (marcadores[m.movil]) {
          marcadores[m.movil].setLatLng([m.lat, m.lng]);
          marcadores[m.movil].setIcon(iconoAuto(color, m.heading, m.esMio));
        } else {
          marcadores[m.movil] = L.marker([m.lat, m.lng], { icon: iconoAuto(color, m.heading, m.esMio) })
            .addTo(map)
            .bindPopup(etiqueta);
        }
      });
      Object.keys(marcadores).forEach(function (id) {
        if (!vistos[id]) {
          map.removeLayer(marcadores[id]);
          delete marcadores[id];
        }
      });

      var mio = datos.find(function (m) { return m.esMio; });
      if (mio && !yaCentrado) {
        map.setView([mio.lat, mio.lng], 15);
        yaCentrado = true;
      }
    }

    var marcadorObjetivo = null;
    var lineaRuta = null;

    // color: '#16a34a' (verde, recogida) o '#c2410c' (naranja, destino) —
    // mismos colores que usa MapaDespacho.tsx en el Frontend web para
    // origen/destino de una solicitud EN_CURSO.
    function mostrarRuta(lat, lng, color, etiqueta, coordenadasRuta) {
      if (marcadorObjetivo) map.removeLayer(marcadorObjetivo);
      if (lineaRuta) map.removeLayer(lineaRuta);

      marcadorObjetivo = L.circleMarker([lat, lng], {
        radius: 9, color: 'white', weight: 2, fillColor: color, fillOpacity: 1,
      }).addTo(map).bindPopup(etiqueta);

      if (coordenadasRuta && coordenadasRuta.length > 0) {
        // GeoJSON/OSRM entrega [lng, lat] -- Leaflet usa [lat, lng].
        var posiciones = coordenadasRuta.map(function (c) { return [c[1], c[0]]; });
        lineaRuta = L.polyline(posiciones, { color: '#7e22ce', weight: 4, opacity: 0.75 }).addTo(map);
        map.fitBounds(lineaRuta.getBounds(), { padding: [40, 40] });
      } else {
        map.setView([lat, lng], 14);
      }
    }

    function limpiarRuta() {
      if (marcadorObjetivo) { map.removeLayer(marcadorObjetivo); marcadorObjetivo = null; }
      if (lineaRuta) { map.removeLayer(lineaRuta); lineaRuta = null; }
    }

    window.actualizarMoviles = actualizarMoviles;
    window.mostrarRuta = mostrarRuta;
    window.limpiarRuta = limpiarRuta;
    window.centrarEnPosicion = function (lat, lng) {
      map.setView([lat, lng], 15);
    };
    true;
  </script>
</body>
</html>
`;

export const MapaConRuta = forwardRef<MapaConRutaHandle, Props>(function MapaConRuta(
  { idMovil, mostrarFlota, viaje, puntoRuta, espacioInferior = 16 },
  ref
) {
  const webviewRef = useRef<WebView>(null);
  const [webviewListo, setWebviewListo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorRuta, setErrorRuta] = useState<string | null>(null);
  const [ultimaPropia, setUltimaPropia] = useState<Ubicacion | null>(null);

  const consultar = useCallback(async () => {
    try {
      const response = await api.get<Ubicacion[]>('/ubicaciones/');
      setError(null);
      const propia = response.data.find((u) => u.movil === idMovil) ?? null;
      setUltimaPropia(propia ?? null);
      if (mostrarFlota) {
        const datos = response.data.map((u) => ({ ...u, esMio: u.movil === idMovil }));
        webviewRef.current?.injectJavaScript(`window.actualizarMoviles(${JSON.stringify(datos)}); true;`);
      } else if (propia) {
        // Sin flota: solo se centra la primera vez con la posicion propia
        // (actualizarMoviles hace esto internamente cuando se muestra la
        // flota completa; aca se replica el mismo "centrar una vez").
        webviewRef.current?.injectJavaScript(
          `window.actualizarMoviles(${JSON.stringify([{ ...propia, esMio: true }])}); true;`
        );
      }
    } catch {
      setError('No se pudo actualizar el mapa.');
    }
  }, [idMovil, mostrarFlota]);

  useEffect(() => {
    if (!webviewListo) return;

    if (!viaje || !puntoRuta) {
      webviewRef.current?.injectJavaScript('window.limpiarRuta(); true;');
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
        const ruta = await obtenerRuta(
          { lat: ultimaPropia.lat, lng: ultimaPropia.lng },
          { lat: geo.lat, lng: geo.lng }
        );
        if (cancelado) return;
        webviewRef.current?.injectJavaScript(
          `window.mostrarRuta(${geo.lat}, ${geo.lng}, ${JSON.stringify(puntoRuta.color)}, ${JSON.stringify(
            puntoRuta.etiqueta
          )}, ${JSON.stringify(ruta.geometry.coordinates)}); true;`
        );
      } catch {
        if (!cancelado) setErrorRuta('No se pudo trazar la ruta al punto de la solicitud.');
      }
    })();

    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [webviewListo, viaje?.id_solicitud, puntoRuta?.campo, !!ultimaPropia]);

  useFocusEffect(
    useCallback(() => {
      let cancelado = false;
      let intervalId: ReturnType<typeof setInterval> | null = null;

      if (webviewListo) {
        consultar();
        intervalId = setInterval(() => {
          if (!cancelado) consultar();
        }, INTERVALO_MS);
      }

      return () => {
        cancelado = true;
        if (intervalId) clearInterval(intervalId);
      };
    }, [consultar, webviewListo])
  );

  useImperativeHandle(ref, () => ({
    centrarEnMi() {
      if (ultimaPropia) {
        webviewRef.current?.injectJavaScript(
          `window.centrarEnPosicion(${ultimaPropia.lat}, ${ultimaPropia.lng}); true;`
        );
      }
    },
  }));

  return (
    <View style={styles.container}>
      <WebView
        ref={webviewRef}
        originWhitelist={['*']}
        source={{ html: HTML }}
        style={styles.webview}
        onLoadEnd={() => setWebviewListo(true)}
        javaScriptEnabled
        domStorageEnabled
      />

      {!webviewListo && (
        <View style={styles.overlayCenter} pointerEvents="none">
          <ActivityIndicator color={colors.accent600} size="large" />
        </View>
      )}

      {(error || errorRuta) && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error ?? errorRuta}</Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.botonCentrar, { bottom: espacioInferior }]}
        onPress={() => ultimaPropia && webviewRef.current?.injectJavaScript(
          `window.centrarEnPosicion(${ultimaPropia.lat}, ${ultimaPropia.lng}); true;`
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
  webview: { flex: 1, backgroundColor: colors.paper },
  overlayCenter: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
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
