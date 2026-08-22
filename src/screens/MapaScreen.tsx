import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api/client';
import { useConductor } from '../auth/ConductorContext';
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

// HTML estatico con Leaflet cargado por CDN (misma libreria que el mapa web,
// via unpkg en vez del bundle de npm — no hay build step nativo para traerla
// como asset). Se comunica con React Native solo en un sentido: RN llama
// window.actualizarMoviles(...) via injectJavaScript en cada ciclo de
// polling; no hace falta el canal inverso (postMessage) porque esta pantalla
// es de solo lectura.
const HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #mapa { height: 100%; margin: 0; padding: 0; background: #fbf9f4; }
    .marcador-mio { filter: drop-shadow(0 0 0 transparent); }
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

    window.actualizarMoviles = actualizarMoviles;
    window.centrarEnPosicion = function (lat, lng) {
      map.setView([lat, lng], 15);
    };
    true;
  </script>
</body>
</html>
`;

export function MapaScreen() {
  const { perfil } = useConductor();
  const webviewRef = useRef<WebView>(null);
  const [webviewListo, setWebviewListo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ultimaPropia, setUltimaPropia] = useState<Ubicacion | null>(null);
  const idMovil = perfil?.movil?.id_movil;

  const consultar = useCallback(async () => {
    try {
      const response = await api.get<Ubicacion[]>('/ubicaciones/');
      setError(null);
      const datos = response.data.map((u) => ({ ...u, esMio: u.movil === idMovil }));
      const propia = datos.find((u) => u.esMio) ?? null;
      setUltimaPropia(propia ?? null);
      webviewRef.current?.injectJavaScript(`window.actualizarMoviles(${JSON.stringify(datos)}); true;`);
    } catch (err: any) {
      setError('No se pudo actualizar el mapa.');
    }
  }, [idMovil]);

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

  function centrarEnMi() {
    if (ultimaPropia) {
      webviewRef.current?.injectJavaScript(
        `window.centrarEnPosicion(${ultimaPropia.lat}, ${ultimaPropia.lng}); true;`
      );
    }
  }

  if (!perfil?.movil) {
    return (
      <View style={styles.center}>
        <Text style={styles.centerText}>No tienes un movil vinculado a tu cuenta.</Text>
      </View>
    );
  }

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

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <TouchableOpacity style={styles.botonCentrar} onPress={centrarEnMi} disabled={!ultimaPropia}>
        <Ionicons name="locate" size={22} color={ultimaPropia ? colors.ink : colors.textFaint} />
      </TouchableOpacity>

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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  webview: { flex: 1, backgroundColor: colors.paper },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16, backgroundColor: colors.paper },
  centerText: { color: colors.textMuted, fontSize: 14 },
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
    bottom: 16,
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
    bottom: 16,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: radius.md,
    padding: 10,
    gap: 6,
  },
  leyendaFila: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  leyendaPunto: { width: 10, height: 10, borderRadius: 5 },
  leyendaTexto: { fontSize: 12, color: colors.textMuted },
});
