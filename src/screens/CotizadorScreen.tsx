import React, { useRef, useState } from 'react';
import {
  Keyboard, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { cotizarTarifa, Cotizacion, OrigenCotizacion } from '../api/mapas';
import { GradientButton } from '../components/GradientButton';
import { colors, radius } from '../theme';

type ModoOrigen = 'hospital' | 'gps' | 'texto';

const MODOS: { valor: ModoOrigen; etiqueta: string }[] = [
  { valor: 'hospital', etiqueta: 'Hospital' },
  { valor: 'gps', etiqueta: 'Estoy aquí' },
  { valor: 'texto', etiqueta: 'Otra dirección' },
];

const CENTRO_DEFECTO = { latitude: -33.4489, longitude: -70.6693, latitudeDelta: 0.08, longitudeDelta: 0.08 };
const COLOR_ACTIVA = '#7e22ce';
const COLOR_ALTERNATIVA = '#94a3b8';

const formatoPeso = (n: number) => `$${n.toLocaleString('es-CL')}`;
const formatoMinutos = (s: number) => `${Math.max(1, Math.round(s / 60))} min`;
const formatoKm = (m: number) => `${(m / 1000).toFixed(1)} km`;

/**
 * Calculador de tarifa aproximada: el pasajero pregunta "¿cuánto sale a X?" en
 * la salida del hospital o desde la calle. Origen por defecto: el hospital;
 * o la ubicación actual del conductor; o una dirección. Muestra cada ruta
 * posible con su valor (depende del camino que se tome).
 */
export function CotizadorScreen() {
  const mapRef = useRef<MapView>(null);
  const [modo, setModo] = useState<ModoOrigen>('hospital');
  const [origenTexto, setOrigenTexto] = useState('');
  const [destino, setDestino] = useState('');
  const [calculando, setCalculando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cotizacion, setCotizacion] = useState<Cotizacion | null>(null);
  const [activa, setActiva] = useState(0);

  async function obtenerOrigen(): Promise<OrigenCotizacion> {
    if (modo === 'hospital') return { tipo: 'hospital' };
    if (modo === 'texto') return { tipo: 'texto', texto: origenTexto.trim() };
    const permiso = await Location.requestForegroundPermissionsAsync();
    if (permiso.status !== 'granted') throw new Error('Falta el permiso de ubicación.');
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    return { tipo: 'gps', lat: pos.coords.latitude, lng: pos.coords.longitude };
  }

  async function calcular() {
    Keyboard.dismiss();
    if (!destino.trim()) {
      setError('Escribe la dirección de destino.');
      return;
    }
    if (modo === 'texto' && !origenTexto.trim()) {
      setError('Escribe la dirección de origen.');
      return;
    }
    setCalculando(true);
    setError(null);
    try {
      const origen = await obtenerOrigen();
      const resultado = await cotizarTarifa(origen, destino.trim());
      setCotizacion(resultado);
      setActiva(0);
      const puntos = resultado.rutas.flatMap((r) =>
        r.geometry.coordinates.map((c) => ({ latitude: c[1], longitude: c[0] }))
      );
      mapRef.current?.fitToCoordinates(puntos, {
        edgePadding: { top: 40, right: 40, bottom: 40, left: 40 },
        animated: true,
      });
    } catch (err: any) {
      setCotizacion(null);
      setError(err?.response?.data?.detail ?? err?.message ?? 'No se pudo calcular la tarifa.');
    } finally {
      setCalculando(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contenido} keyboardShouldPersistTaps="handled">
      <View style={styles.mapaWrap}>
        <MapView ref={mapRef} provider={PROVIDER_GOOGLE} style={styles.mapa} initialRegion={CENTRO_DEFECTO} toolbarEnabled={false}>
          {cotizacion?.rutas.map((r, i) =>
            i === activa ? null : (
              <Polyline
                key={`alt-${i}`}
                coordinates={r.geometry.coordinates.map((c) => ({ latitude: c[1], longitude: c[0] }))}
                strokeColor={COLOR_ALTERNATIVA}
                strokeWidth={5}
                tappable
                onPress={() => setActiva(i)}
              />
            )
          )}
          {cotizacion?.rutas[activa] && (
            <Polyline
              coordinates={cotizacion.rutas[activa].geometry.coordinates.map((c) => ({ latitude: c[1], longitude: c[0] }))}
              strokeColor={COLOR_ACTIVA}
              strokeWidth={6}
              zIndex={5}
            />
          )}
          {cotizacion && (
            <>
              <Marker
                coordinate={{ latitude: cotizacion.origen.lat, longitude: cotizacion.origen.lng }}
                title="Salida"
                description={cotizacion.origen.direccion ?? undefined}
                pinColor="green"
              />
              <Marker
                coordinate={{ latitude: cotizacion.destino.lat, longitude: cotizacion.destino.lng }}
                title="Destino"
                description={cotizacion.destino.direccion ?? undefined}
                pinColor="orange"
              />
            </>
          )}
        </MapView>
      </View>

      <View style={styles.tarjeta}>
        <Text style={styles.etiqueta}>Salida desde</Text>
        <View style={styles.chips}>
          {MODOS.map((m) => (
            <TouchableOpacity
              key={m.valor}
              style={[styles.chip, modo === m.valor && styles.chipActivo]}
              onPress={() => {
                setModo(m.valor);
                setCotizacion(null);
                setError(null);
              }}
            >
              <Text style={[styles.chipTexto, modo === m.valor && styles.chipTextoActivo]}>{m.etiqueta}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {modo === 'hospital' && <Text style={styles.ayuda}>Hospital Félix Bulnes, Cerro Navia</Text>}
        {modo === 'gps' && <Text style={styles.ayuda}>Se usará tu ubicación actual al calcular.</Text>}
        {modo === 'texto' && (
          <TextInput
            style={styles.input}
            placeholder="Calle y número de origen"
            placeholderTextColor={colors.textFaint}
            value={origenTexto}
            onChangeText={setOrigenTexto}
          />
        )}

        <Text style={[styles.etiqueta, { marginTop: 14 }]}>Destino</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej: Av. Pajaritos 3000, Maipú"
          placeholderTextColor={colors.textFaint}
          value={destino}
          onChangeText={setDestino}
          returnKeyType="search"
          onSubmitEditing={calcular}
        />

        <GradientButton
          title="Calcular tarifa"
          onPress={calcular}
          loading={calculando}
          icon={<Ionicons name="calculator-outline" size={18} color={colors.ink} />}
          style={{ marginTop: 14 }}
        />
        {error && <Text style={styles.error}>{error}</Text>}
      </View>

      {cotizacion && (
        <View style={styles.resultados}>
          <Text style={styles.ayuda}>Hacia: {cotizacion.destino.direccion}</Text>
          {cotizacion.rutas.map((r, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.ruta, i === activa && styles.rutaActiva]}
              onPress={() => setActiva(i)}
              activeOpacity={0.8}
            >
              <View style={styles.rutaFila}>
                <Text style={styles.rutaPrecio}>{formatoPeso(r.tarifa_estimada)}</Text>
                <Text style={styles.rutaTag}>{i === 0 ? 'Recomendada' : `Alternativa ${i}`}</Text>
              </View>
              <Text style={styles.rutaDetalle}>
                {formatoKm(r.distancia_m)} · {formatoMinutos(r.duracion_s)} · vía {r.resumen}
              </Text>
            </TouchableOpacity>
          ))}
          <Text style={styles.nota}>
            Valor aproximado según taxímetro (bajada {formatoPeso(cotizacion.bajada_de_bandera)}). Puede variar con el
            tráfico y la ruta real.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  contenido: { paddingBottom: 32 },
  mapaWrap: { height: 260 },
  mapa: { flex: 1 },

  tarjeta: {
    margin: 14,
    padding: 16,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  etiqueta: { fontSize: 11.5, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', marginBottom: 6 },
  chips: { flexDirection: 'row', gap: 8 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    backgroundColor: colors.neutralBg,
  },
  chipActivo: { backgroundColor: colors.accent500 },
  chipTexto: { fontSize: 13, color: colors.textMuted, fontWeight: '600' },
  chipTextoActivo: { color: colors.ink, fontWeight: '800' },
  ayuda: { fontSize: 12.5, color: colors.textMuted, marginTop: 8 },
  input: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.paper,
  },
  error: { color: colors.crit, fontSize: 13, marginTop: 10 },

  resultados: { marginHorizontal: 14, gap: 10 },
  ruta: {
    padding: 14,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  rutaActiva: { borderColor: colors.accent600, backgroundColor: '#fffbe0' },
  rutaFila: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  rutaPrecio: { fontSize: 26, fontWeight: '800', color: colors.text, fontVariant: ['tabular-nums'] },
  rutaTag: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
  rutaDetalle: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  nota: { fontSize: 11.5, color: colors.textFaint, marginTop: 4 },
});
