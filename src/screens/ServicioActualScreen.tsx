import React, { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Alert, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api/client';
import { useConductor } from '../auth/ConductorContext';
import { GradientButton } from '../components/GradientButton';
import { StatusChip } from '../components/StatusChip';
import { colors, radius } from '../theme';

const NUMERO_CENTRAL = '22222222';

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

  useFocusEffect(
    useCallback(() => {
      recargar();
    }, [recargar])
  );

  const viaje: Solicitud | undefined = (perfil?.solicitudes_hoy ?? []).find((s: Solicitud) =>
    ['ASIGNADO', 'EN_CURSO'].includes(s.estado)
  );

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

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.accionesRapidas}>
        <GradientButton
          title="Llamar a Central" variant="outline"
          onPress={() => llamar(NUMERO_CENTRAL)}
          style={{ flex: 1 }}
        />
        <GradientButton
          title="EMERGENCIA" variant="danger"
          onPress={() => llamar(NUMERO_CENTRAL)}
          style={{ flex: 1 }}
        />
      </View>

      {!viaje ? (
        <View style={styles.center}>
          <Ionicons name="car-outline" size={40} color={colors.textFaint} />
          <Text style={styles.centerText}>No tienes un servicio en curso.</Text>
        </View>
      ) : (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.folio}>{viaje.folio}</Text>
            <StatusChip estado={viaje.estado} />
          </View>

          {viaje.pasajero_nombre && (
            <View style={styles.infoRow}>
              <Ionicons name="person-outline" size={15} color={colors.textMuted} />
              <Text style={styles.infoText}>{viaje.pasajero_nombre}</Text>
            </View>
          )}
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={15} color={colors.textMuted} />
            <Text style={styles.infoText}>{viaje.origen}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="flag-outline" size={15} color={colors.textMuted} />
            <Text style={styles.infoText}>{viaje.destino}</Text>
          </View>

          <View style={{ height: 8 }} />

          {viaje.pasajero_telefono && (
            <GradientButton
              title="Llamar al pasajero" variant="outline"
              onPress={() => llamar(viaje.pasajero_telefono!)}
              style={{ marginBottom: 10 }}
            />
          )}
          <GradientButton title={ETIQUETA_ACCION[viaje.estado]} onPress={avanzarEstado} style={{ marginBottom: 10 }} />
          {viaje.estado === 'ASIGNADO' && (
            <GradientButton title="Cancelar viaje" variant="danger" onPress={confirmarCancelar} />
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, flexGrow: 1, backgroundColor: colors.paper },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 10 },
  centerText: { color: colors.textMuted, fontSize: 14 },
  accionesRapidas: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  folio: { fontWeight: '800', fontSize: 19, color: colors.text, fontVariant: ['tabular-nums'] },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  infoText: { fontSize: 14, color: colors.text },
});
