import React, { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Button, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { api } from '../api/client';
import { useConductor } from '../auth/ConductorContext';

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

export function SolicitudesScreen() {
  const { perfil, recargar } = useConductor();
  const [pendientes, setPendientes] = useState<Solicitud[]>([]);
  const [loading, setLoading] = useState(false);
  const [accionando, setAccionando] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargarPendientes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/solicitudes/pendientes/');
      setPendientes(response.data);
    } catch (err: any) {
      setError('No se pudieron cargar las solicitudes pendientes.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargarPendientes();
      recargar();
    }, [cargarPendientes, recargar])
  );

  const tieneViajeActivo = (perfil?.solicitudes_hoy ?? []).some((s: Solicitud) =>
    ['ASIGNADO', 'EN_CURSO'].includes(s.estado)
  );

  async function aceptarSolicitud(solicitud: Solicitud) {
    if (!perfil?.movil) return;
    setAccionando(solicitud.id_solicitud);
    setError(null);
    try {
      await api.post(`/solicitudes/${solicitud.id_solicitud}/cambiar_estado/`, {
        estado: 'ASIGNADO',
        movil: perfil.movil.id_movil,
      });
      await Promise.all([cargarPendientes(), recargar()]);
    } catch (err: any) {
      setError(err.response?.data?.detail ?? 'No se pudo aceptar la solicitud (puede que ya la tomo otro movil).');
      await cargarPendientes();
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

      {tieneViajeActivo && (
        <Text style={styles.aviso}>
          Ya tienes un servicio en curso. Revisa la pestaña "Servicio Actual".
        </Text>
      )}

      <Text style={styles.subtitle}>Solicitudes pendientes ({pendientes.length})</Text>

      <FlatList
        data={pendientes}
        keyExtractor={(item) => String(item.id_solicitud)}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={() => {
              cargarPendientes();
              recargar();
            }}
          />
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.center}>
              <Text>No hay solicitudes pendientes.</Text>
            </View>
          ) : null
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
            <Button
              title="Aceptar solicitud"
              onPress={() => aceptarSolicitud(item)}
              disabled={accionando === item.id_solicitud || tieneViajeActivo}
            />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  error: { color: 'red', marginBottom: 8 },
  aviso: { color: '#1565c0', marginBottom: 8, fontWeight: '600' },
  subtitle: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
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
