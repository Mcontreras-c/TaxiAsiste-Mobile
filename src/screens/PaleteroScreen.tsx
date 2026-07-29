import React, { useCallback, useEffect, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { GradientButton } from '../components/GradientButton';
import { StatusChip } from '../components/StatusChip';
import { colors, gradients, radius } from '../theme';

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
    <View style={styles.root}>
      <LinearGradient colors={gradients.sidebar} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0.3 }} style={styles.header}>
        <View>
          <Text style={styles.headerLabel}>BASE</Text>
          <Text style={styles.headerTitle}>Panel del Paletero</Text>
        </View>
        <TouchableOpacity onPress={logout}>
          <Text style={styles.logout}>Salir</Text>
        </TouchableOpacity>
      </LinearGradient>

      <View style={styles.container}>
        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <Text style={styles.subtitle}>Móviles en base ({fila.length})</Text>

        {loading ? (
          <ActivityIndicator color={colors.accent600} />
        ) : (
          <FlatList
            data={fila}
            keyExtractor={(item) => String(item.id_fila)}
            refreshControl={<RefreshControl refreshing={loading} onRefresh={cargarFila} tintColor={colors.accent600} />}
            ListEmptyComponent={
              <View style={styles.center}>
                <Text style={styles.centerText}>No hay móviles en la base.</Text>
              </View>
            }
            renderItem={({ item }) => (
              <View style={styles.card}>
                <View style={styles.cardTop}>
                  <LinearGradient colors={gradients.button} style={styles.posicionBadge}>
                    <Text style={styles.posicionText}>{item.posicion}</Text>
                  </LinearGradient>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.patente}>{item.patente}</Text>
                    <Text style={styles.socio}>{item.socio_nombre}</Text>
                  </View>
                  <StatusChip estado={item.estado} />
                </View>

                <View style={styles.cardActions}>
                  {item.estado === 'EN_ESPERA' && (
                    <GradientButton
                      title="Llamar"
                      onPress={() => llamarMovil(item)}
                      loading={accionando === item.id_fila}
                      style={{ flex: 1 }}
                    />
                  )}
                  <GradientButton
                    title="Retirar" variant="danger"
                    onPress={() => retirarMovil(item)}
                    loading={accionando === item.id_fila}
                    style={{ flex: 1 }}
                  />
                </View>
              </View>
            )}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  header: {
    paddingTop: 56,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '700', letterSpacing: 1.5 },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '800', marginTop: 2 },
  logout: { color: '#fff', fontWeight: '700', fontSize: 13.5 },
  container: { flex: 1, padding: 16 },
  center: { alignItems: 'center', justifyContent: 'center', padding: 30 },
  centerText: { color: colors.textMuted, fontSize: 14 },
  errorBox: { backgroundColor: colors.critBg, borderRadius: radius.sm, padding: 10, marginBottom: 12 },
  errorText: { color: colors.crit, fontSize: 13 },
  subtitle: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 10 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 16,
    marginBottom: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  posicionBadge: { width: 36, height: 36, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  posicionText: { color: colors.ink, fontWeight: '800', fontSize: 15 },
  patente: { fontSize: 16, fontWeight: '700', color: colors.text },
  socio: { fontSize: 12.5, color: colors.textMuted },
  cardActions: { flexDirection: 'row', gap: 10 },
});
