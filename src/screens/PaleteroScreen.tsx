import React, { useCallback, useEffect, useState } from 'react';
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
import { useAuth } from '../auth/AuthContext';

type EntradaFila = {
  id_fila: number;
  movil: number;
  patente: string;
  socio_nombre: string;
  posicion: number;
  estado: string;
};

export function PaleteroScreen() {
  const { logout } = useAuth();
  const [fila, setFila] = useState<EntradaFila[]>([]);
  const [loading, setLoading] = useState(false);
  const [accionando, setAccionando] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargarFila = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/fila-base/', { params: { todos: 1 } });
      const activos = response.data.filter((e: EntradaFila) =>
        ['EN_ESPERA', 'LLAMADO'].includes(e.estado)
      );
      setFila(activos);
    } catch (err: any) {
      setError('No se pudo cargar la fila.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarFila();
  }, [cargarFila]);

  async function llamarMovil(entrada: EntradaFila) {
    setAccionando(entrada.id_fila);
    setError(null);
    try {
      await api.post(`/fila-base/${entrada.id_fila}/llamar/`);
      await cargarFila();
    } catch (err: any) {
      setError(err.response?.data?.detail ?? 'No se pudo llamar al movil.');
    } finally {
      setAccionando(null);
    }
  }

  async function retirarMovil(entrada: EntradaFila) {
    setAccionando(entrada.id_fila);
    setError(null);
    try {
      await api.post(`/fila-base/${entrada.id_fila}/retirar/`);
      await cargarFila();
    } catch (err: any) {
      setError(err.response?.data?.detail ?? 'No se pudo retirar al movil.');
    } finally {
      setAccionando(null);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Base — Paletero</Text>
        <Button title="Salir" onPress={logout} />
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      {loading ? (
        <ActivityIndicator />
      ) : (
        <FlatList
          data={fila}
          keyExtractor={(item) => String(item.id_fila)}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={cargarFila} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text>No hay moviles en la base.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.posicionChip}>{item.posicion}</Text>
                <View style={styles.info}>
                  <Text style={styles.patente}>{item.patente}</Text>
                  <Text style={styles.socio}>{item.socio_nombre}</Text>
                  <Text style={styles.estado}>{item.estado}</Text>
                </View>
              </View>

              {item.estado === 'EN_ESPERA' && (
                <Button
                  title="Llamar"
                  onPress={() => llamarMovil(item)}
                  disabled={accionando === item.id_fila}
                />
              )}
              <Button
                title="Retirar"
                color="#c62828"
                onPress={() => retirarMovil(item)}
                disabled={accionando === item.id_fila}
              />
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, paddingTop: 48 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 22, fontWeight: 'bold' },
  error: { color: 'red', marginBottom: 8 },
  card: {
    backgroundColor: '#f2f2f2',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    gap: 8,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  info: { flex: 1 },
  posicionChip: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1565c0',
    color: '#fff',
    textAlign: 'center',
    textAlignVertical: 'center',
    fontWeight: 'bold',
    fontSize: 16,
  },
  patente: { fontSize: 16, fontWeight: '600' },
  socio: { fontSize: 13, color: '#666' },
  estado: { fontSize: 13, fontWeight: '600', color: '#1565c0' },
});
