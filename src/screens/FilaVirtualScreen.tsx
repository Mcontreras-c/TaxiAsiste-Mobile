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

type EntradaFila = {
  id_fila: number;
  movil: number;
  patente: string;
  socio_nombre: string;
  posicion: number;
  estado: string;
};

export function FilaVirtualScreen() {
  const { perfil } = useConductor();
  const [fila, setFila] = useState<EntradaFila[]>([]);
  const [loading, setLoading] = useState(false);
  const [accionando, setAccionando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargarFila = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/fila-base/');
      setFila(response.data);
    } catch (err: any) {
      setError('No se pudo cargar la fila.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargarFila();
    }, [cargarFila])
  );

  const miEntrada = fila.find((f) => f.movil === perfil?.movil?.id_movil);

  async function entrarAFila() {
    if (!perfil?.movil) return;
    setAccionando(true);
    setError(null);
    try {
      await api.post('/fila-base/', { movil: perfil.movil.id_movil });
      await cargarFila();
    } catch (err: any) {
      setError(err.response?.data?.detail ?? 'No se pudo entrar a la fila.');
    } finally {
      setAccionando(false);
    }
  }

  async function salirDeFila() {
    if (!miEntrada) return;
    setAccionando(true);
    setError(null);
    try {
      await api.post(`/fila-base/${miEntrada.id_fila}/retirar/`);
      await cargarFila();
    } catch (err: any) {
      setError(err.response?.data?.detail ?? 'No se pudo salir de la fila.');
    } finally {
      setAccionando(false);
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
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Tu movil: {perfil.movil.patente}</Text>
        {miEntrada ? (
          <>
            <Text style={styles.posicion}>Posicion en fila: {miEntrada.posicion}</Text>
            <Text>Estado: {miEntrada.estado}</Text>
            <Button title="Salir de la fila" color="#c62828" onPress={salirDeFila} disabled={accionando} />
          </>
        ) : (
          <Button title="Entrar a la fila" onPress={entrarAFila} disabled={accionando} />
        )}
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      <Text style={styles.subtitle}>Fila actual ({fila.length})</Text>

      {loading ? (
        <ActivityIndicator />
      ) : (
        <FlatList
          data={fila}
          keyExtractor={(item) => String(item.id_fila)}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={cargarFila} />}
          renderItem={({ item }) => (
            <View style={[styles.row, item.movil === perfil.movil?.id_movil && styles.rowMine]}>
              <Text style={styles.posicionChip}>{item.posicion}</Text>
              <View>
                <Text style={styles.rowPatente}>{item.patente}</Text>
                <Text style={styles.rowSocio}>{item.socio_nombre}</Text>
              </View>
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
  card: {
    backgroundColor: '#f2f2f2',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    gap: 8,
  },
  cardTitle: { fontSize: 16, fontWeight: 'bold' },
  posicion: { fontSize: 22, fontWeight: 'bold', color: '#1565c0' },
  subtitle: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  error: { color: 'red', marginBottom: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  rowMine: { backgroundColor: '#e3f2fd' },
  posicionChip: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#1565c0',
    color: '#fff',
    textAlign: 'center',
    textAlignVertical: 'center',
    fontWeight: 'bold',
  },
  rowPatente: { fontSize: 15, fontWeight: '600' },
  rowSocio: { fontSize: 13, color: '#666' },
});
