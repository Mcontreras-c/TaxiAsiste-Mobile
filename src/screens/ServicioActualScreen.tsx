import React, { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Alert, Button, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { api } from '../api/client';
import { useConductor } from '../auth/ConductorContext';

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
        <View style={styles.accionBoton}>
          <Button title="Llamar a Central" onPress={() => llamar(NUMERO_CENTRAL)} />
        </View>
        <View style={styles.accionBoton}>
          <Button title="EMERGENCIA" color="#c62828" onPress={() => llamar(NUMERO_CENTRAL)} />
        </View>
      </View>

      {!viaje ? (
        <View style={styles.center}>
          <Text>No tienes un servicio en curso.</Text>
        </View>
      ) : (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.folio}>{viaje.folio}</Text>
            <Text style={styles.estado}>{viaje.estado}</Text>
          </View>
          {viaje.pasajero_nombre && <Text style={styles.linea}>Pasajero: {viaje.pasajero_nombre}</Text>}
          <Text style={styles.linea}>Origen: {viaje.origen}</Text>
          <Text style={styles.linea}>Destino: {viaje.destino}</Text>

          {viaje.pasajero_telefono && (
            <Button title="Llamar al pasajero" onPress={() => llamar(viaje.pasajero_telefono!)} />
          )}
          <Button title={ETIQUETA_ACCION[viaje.estado]} onPress={avanzarEstado} />
          {viaje.estado === 'ASIGNADO' && (
            <Button title="Cancelar viaje" color="#c62828" onPress={confirmarCancelar} />
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, flexGrow: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  accionesRapidas: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  accionBoton: { flex: 1 },
  card: {
    backgroundColor: '#e3f2fd',
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  folio: { fontWeight: 'bold', fontSize: 18 },
  estado: { fontWeight: '600', color: '#1565c0' },
  linea: { fontSize: 15 },
});
