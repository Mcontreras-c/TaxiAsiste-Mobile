import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MapaConRuta, PuntoRuta, ViajeConRuta } from '../components/MapaConRuta';
import { useConductor } from '../auth/ConductorContext';
import { colors } from '../theme';

type Solicitud = { id_solicitud: number; estado: string; origen: string; destino: string };

// ASIGNADO: hay que ir a buscar al pasajero -> mostrar ruta al origen.
// EN_CURSO: el pasajero ya esta a bordo -> mostrar ruta al destino.
const PUNTO_RUTA: Record<string, PuntoRuta> = {
  ASIGNADO: { campo: 'origen', color: '#16a34a', etiqueta: 'Recogida' },
  EN_CURSO: { campo: 'destino', color: '#c2410c', etiqueta: 'Destino' },
};

export function MapaScreen() {
  const { perfil } = useConductor();

  const viaje: Solicitud | undefined = (perfil?.solicitudes_hoy ?? []).find((s: Solicitud) =>
    ['ASIGNADO', 'EN_CURSO'].includes(s.estado)
  );
  const puntoRuta = viaje ? PUNTO_RUTA[viaje.estado] : undefined;
  const viajeParaMapa: ViajeConRuta | undefined = viaje
    ? { id_solicitud: viaje.id_solicitud, origen: viaje.origen, destino: viaje.destino }
    : undefined;

  if (!perfil?.movil) {
    return (
      <View style={styles.center}>
        <Text style={styles.centerText}>No tienes un movil vinculado a tu cuenta.</Text>
      </View>
    );
  }

  return (
    <MapaConRuta
      idMovil={perfil.movil.id_movil}
      mostrarFlota
      viaje={viajeParaMapa}
      puntoRuta={puntoRuta}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16, backgroundColor: colors.paper },
  centerText: { color: colors.textMuted, fontSize: 14 },
});
