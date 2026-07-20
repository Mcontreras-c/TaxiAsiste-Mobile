import React, { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator,
  Button,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { api } from '../api/client';
import { useConductor } from '../auth/ConductorContext';

type Solicitud = {
  id_solicitud: number;
  folio: string;
  estado: string;
  pasajero_nombre: string | null;
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

export function SolicitudesScreen() {
  const { perfil, recargar } = useConductor();
  const [accionando, setAccionando] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      recargar();
    }, [recargar])
  );

  const solicitudes: Solicitud[] = perfil?.solicitudes_hoy ?? [];

  async function avanzarEstado(solicitud: Solicitud) {
    const nuevoEstado = SIGUIENTE_ESTADO[solicitud.estado];
    if (!nuevoEstado) return;
    setAccionando(solicitud.id_solicitud);
    setError(null);
    try {
      await api.post(`/solicitudes/${solicitud.id_solicitud}/cambiar_estado/`, {
        estado: nuevoEstado,
      });
      await recargar();
    } catch (err: any) {
      setError(err.response?.data?.detail ?? 'No se pudo actualizar la solicitud.');
    } finally {
      setAccionando(null);
    }
  }

  if (!perfil?.movil) {
    return (
      <View style={styles.center}>
        <Text>No tienes un movil vinculado a tu cuenta.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {error && <Text style={styles.error}>{error}</Text>}

      {!perfil ? (
        <ActivityIndicator />
      ) : (
        <FlatList
          data={solicitudes}
          keyExtractor={(item) => String(item.id_solicitud)}
          refreshControl={<RefreshControl refreshing={false} onRefresh={recargar} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text>No tienes solicitudes hoy.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.folio}>{item.folio}</Text>
                <Text style={styles.estado}>{item.estado}</Text>
              </View>
              {item.pasajero_nombre && <Text>Pasajero: {item.pasajero_nombre}</Text>}
              <Text>Origen: {item.origen}</Text>
              <Text>Destino: {item.destino}</Text>

              {SIGUIENTE_ESTADO[item.estado] && (
                <Button
                  title={ETIQUETA_ACCION[item.estado]}
                  onPress={() => avanzarEstado(item)}
                  disabled={accionando === item.id_solicitud}
                />
              )}
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  error: { color: 'red', marginBottom: 8 },
  card: {
    backgroundColor: '#f2f2f2',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    gap: 4,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  folio: { fontWeight: 'bold', fontSize: 16 },
  estado: { fontWeight: '600', color: '#1565c0' },
});
