import React, { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Alert, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api/client';
import { useConductor } from '../auth/ConductorContext';
import { EmergencyCallOverlay } from '../components/EmergencyCallOverlay';
import { GradientButton } from '../components/GradientButton';
import { MapaConRuta, PuntoRuta, ViajeConRuta } from '../components/MapaConRuta';
import { StatusChip } from '../components/StatusChip';
import { colors, radius } from '../theme';
import { navegarExterno } from '../utils/navegacionExterna';

const NUMERO_CENTRAL = '22222222';
const NUMERO_CARABINEROS = '133';

// ASIGNADO: todavia hay que ir a buscar al pasajero -> ruta/navegacion al origen.
// EN_CURSO: el pasajero ya esta a bordo -> ruta/navegacion al destino.
const PUNTO_RUTA: Record<string, PuntoRuta & { campoNavegacion: 'origen' | 'destino' }> = {
  ASIGNADO: { campo: 'origen', campoNavegacion: 'origen', color: '#16a34a', etiqueta: 'Recogida' },
  EN_CURSO: { campo: 'destino', campoNavegacion: 'destino', color: '#c2410c', etiqueta: 'Destino' },
};

const ETIQUETA_NAVEGACION: Record<string, string> = {
  ASIGNADO: 'Ir a buscar al pasajero',
  EN_CURSO: 'Ir a dejar al pasajero',
};

type Solicitud = {
  id_solicitud: number;
  folio: string;
  estado: string;
  pasajero_nombre: string | null;
  pasajero_telefono: string | null;
  origen: string;
  destino: string;
  fecha_hora: string;
};

const SIGUIENTE_ESTADO: Record<string, string> = {
  ASIGNADO: 'EN_CURSO',
  EN_CURSO: 'COMPLETADO',
};

const ETIQUETA_ACCION: Record<string, string> = {
  ASIGNADO: 'Iniciar viaje',
  EN_CURSO: 'Completar viaje',
};

function llamar(numero: string) {
  Linking.openURL(`tel:${numero}`);
}

export function ServicioActualScreen() {
  const { perfil, recargar } = useConductor();
  const [mostrarEmergencia, setMostrarEmergencia] = useState(false);

  useFocusEffect(
    useCallback(() => {
      recargar();
    }, [recargar])
  );

  const viaje: Solicitud | undefined = (perfil?.solicitudes_hoy ?? []).find((s: Solicitud) =>
    ['ASIGNADO', 'EN_CURSO'].includes(s.estado)
  );
  const puntoRuta = viaje ? PUNTO_RUTA[viaje.estado] : undefined;
  const viajeParaMapa: ViajeConRuta | undefined = viaje
    ? { id_solicitud: viaje.id_solicitud, origen: viaje.origen, destino: viaje.destino }
    : undefined;

  async function avanzarEstado() {
    if (!viaje) return;
    const nuevoEstado = SIGUIENTE_ESTADO[viaje.estado];
    if (!nuevoEstado) return;
    try {
      await api.post(`/solicitudes/${viaje.id_solicitud}/cambiar_estado/`, { estado: nuevoEstado });
      await recargar();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.detail ?? 'No se pudo actualizar la solicitud.');
    }
  }

  function confirmarCancelar() {
    if (!viaje) return;
    Alert.alert('Cancelar viaje', `¿Seguro que quieres cancelar el viaje ${viaje.folio}?`, [
      { text: 'No', style: 'cancel' },
      { text: 'Si, cancelar', style: 'destructive', onPress: cancelar },
    ]);
  }

  async function cancelar() {
    if (!viaje) return;
    try {
      await api.post(`/solicitudes/${viaje.id_solicitud}/cambiar_estado/`, { estado: 'CANCELADO' });
      await recargar();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.detail ?? 'No se pudo cancelar el viaje.');
    }
  }

  if (!viaje) {
    return (
      <View style={styles.center}>
        <Ionicons name="car-outline" size={40} color={colors.textFaint} />
        <Text style={styles.centerText}>No tienes un servicio en curso.</Text>
        <GradientButton
          title="Llamar a Central"
          variant="outline"
          onPress={() => llamar(NUMERO_CENTRAL)}
          style={{ marginTop: 20, minWidth: 200 }}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapaConRuta
        idMovil={perfil?.movil?.id_movil}
        mostrarFlota={false}
        viaje={viajeParaMapa}
        puntoRuta={puntoRuta}
        espacioInferior={220}
      />

      <EmergencyCallOverlay
        visible={mostrarEmergencia}
        numero={NUMERO_CARABINEROS}
        etiqueta="Carabineros de Chile"
        onCancelar={() => setMostrarEmergencia(false)}
        onLlamada={() => setMostrarEmergencia(false)}
      />

      <View style={styles.barraSuperior}>
        <View style={styles.folioChip}>
          <Text style={styles.folioTexto}>{viaje.folio}</Text>
          <StatusChip estado={viaje.estado} />
        </View>
        <View style={styles.accionesTope}>
          <TouchableOpacity style={styles.botonIcono} onPress={() => llamar(NUMERO_CENTRAL)}>
            <Ionicons name="call-outline" size={20} color={colors.ink} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.botonIcono, styles.botonEmergencia]}
            onPress={() => setMostrarEmergencia(true)}
          >
            <Ionicons name="warning-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.panelInferior}>
        {viaje.pasajero_nombre && (
          <View style={styles.filaPasajero}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={20} color={colors.ink} />
            </View>
            <Text style={styles.nombrePasajero} numberOfLines={1}>
              {viaje.pasajero_nombre}
            </Text>
            {viaje.pasajero_telefono && (
              <TouchableOpacity
                style={styles.botonLlamarPasajero}
                onPress={() => llamar(viaje.pasajero_telefono!)}
              >
                <Ionicons name="call" size={18} color={colors.ink} />
              </TouchableOpacity>
            )}
          </View>
        )}

        <View style={styles.infoRow}>
          <Ionicons name={viaje.estado === 'ASIGNADO' ? 'location' : 'flag'} size={15} color={colors.textMuted} />
          <Text style={styles.infoText} numberOfLines={1}>
            {viaje.estado === 'ASIGNADO' ? viaje.origen : viaje.destino}
          </Text>
        </View>

        <GradientButton title={ETIQUETA_ACCION[viaje.estado]} onPress={avanzarEstado} style={{ marginTop: 10, marginBottom: 10 }} />

        <View style={styles.filaSecundaria}>
          {ETIQUETA_NAVEGACION[viaje.estado] && (
            <GradientButton
              title="Navegar"
              variant="outline"
              onPress={() => navegarExterno(viaje[PUNTO_RUTA[viaje.estado].campoNavegacion])}
              style={{ flex: 1 }}
            />
          )}
          {viaje.estado === 'ASIGNADO' && (
            <GradientButton title="Cancelar" variant="danger" onPress={confirmarCancelar} style={{ flex: 1 }} />
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 10, backgroundColor: colors.paper },
  centerText: { color: colors.textMuted, fontSize: 14 },

  barraSuperior: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  folioChip: {
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingVertical: 6,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  folioTexto: { fontWeight: '800', fontSize: 14, color: colors.text, fontVariant: ['tabular-nums'] },
  accionesTope: { flexDirection: 'row', gap: 8 },
  botonIcono: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  botonEmergencia: { backgroundColor: colors.crit },

  panelInferior: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: 18,
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
    elevation: 6,
  },
  filaPasajero: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.neutralBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nombrePasajero: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.text },
  botonLlamarPasajero: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.goodBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoText: { flex: 1, fontSize: 14, color: colors.text },
  filaSecundaria: { flexDirection: 'row', gap: 10 },
});
