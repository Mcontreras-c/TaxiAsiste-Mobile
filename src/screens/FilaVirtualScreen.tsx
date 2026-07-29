import React, { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { api } from '../api/client';
import { useConductor } from '../auth/ConductorContext';
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
        <Text style={styles.centerText}>No tienes un movil vinculado a tu cuenta.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Tu móvil</Text>
        <Text style={styles.cardPatente}>{perfil.movil.patente}</Text>

        {miEntrada ? (
          <>
            <View style={styles.posicionRow}>
              <LinearGradient colors={gradients.button} style={styles.posicionBadge}>
                <Text style={styles.posicionBadgeText}>{miEntrada.posicion}</Text>
              </LinearGradient>
              <View>
                <Text style={styles.posicionLabel}>Posición en fila</Text>
                <StatusChip estado={miEntrada.estado} />
              </View>
            </View>
            <GradientButton title="Salir de la fila" variant="danger" onPress={salirDeFila} loading={accionando} />
          </>
        ) : (
          <GradientButton title="Entrar a la fila" onPress={entrarAFila} loading={accionando} style={{ marginTop: 4 }} />
        )}
      </View>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <Text style={styles.subtitle}>Fila actual ({fila.length})</Text>

      {loading ? (
        <ActivityIndicator color={colors.accent600} />
      ) : (
        <FlatList
          data={fila}
          keyExtractor={(item) => String(item.id_fila)}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={cargarFila} tintColor={colors.accent600} />}
          renderItem={({ item }) => {
            const esMio = item.movil === perfil.movil?.id_movil;
            return (
              <View style={[styles.row, esMio && styles.rowMine]}>
                <View style={[styles.posicionChip, esMio && styles.posicionChipMine]}>
                  <Text style={[styles.posicionChipText, esMio && styles.posicionChipTextMine]}>{item.posicion}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowPatente}>{item.patente}</Text>
                  <Text style={styles.rowSocio}>{item.socio_nombre}</Text>
                </View>
                <StatusChip estado={item.estado} />
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: colors.paper },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16, backgroundColor: colors.paper },
  centerText: { color: colors.textMuted, fontSize: 14 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 18,
    marginBottom: 16,
    gap: 10,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardLabel: { fontSize: 11.5, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  cardPatente: { fontSize: 24, fontWeight: '800', color: colors.text, fontVariant: ['tabular-nums'] },
  posicionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 4 },
  posicionBadge: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  posicionBadgeText: { color: colors.ink, fontWeight: '800', fontSize: 18 },
  posicionLabel: { fontSize: 12, color: colors.textMuted, marginBottom: 4 },
  subtitle: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 10 },
  errorBox: { backgroundColor: colors.critBg, borderRadius: radius.sm, padding: 10, marginBottom: 12 },
  errorText: { color: colors.crit, fontSize: 13 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    marginBottom: 8,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowMine: { borderColor: colors.accent500, borderWidth: 1.5, backgroundColor: '#fffaf0' },
  posicionChip: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.neutralBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  posicionChipMine: { backgroundColor: colors.accent500 },
  posicionChipText: { color: colors.textMuted, fontWeight: '700', fontSize: 12.5 },
  posicionChipTextMine: { color: colors.ink },
  rowPatente: { fontSize: 15, fontWeight: '700', color: colors.text },
  rowSocio: { fontSize: 12.5, color: colors.textMuted },
});
