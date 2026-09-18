import React, { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api/client';
import { useConductor } from '../auth/ConductorContext';
import { GradientButton } from '../components/GradientButton';
import { IlustracionTaxi } from '../components/IlustracionTaxi';
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
      // ?todos=1 + filtro local: sin esto, en cuanto el paletero llama al
      // conductor (estado pasa a LLAMADO) su propia entrada desaparece de
      // este listado y queda sin forma de verla ni salir de la fila si el
      // paletero no la cierra (bug real: conductor quedaba bloqueado para
      // volver a entrar porque el backend rechaza una segunda entrada activa).
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

  const estadoMovil = !miEntrada
    ? { texto: 'Fuera de la fila', color: colors.textFaint }
    : miEntrada.estado === 'LLAMADO'
      ? { texto: 'Te están llamando', color: colors.info }
      : { texto: 'En la fila', color: colors.good };

  const cantidad = fila.length;

  const header = (
    <View>
      <Text style={styles.intro}>Únete a la fila y recibe los próximos servicios.</Text>

      <View style={styles.card}>
        <View style={styles.movilRow}>
          <View style={styles.taxiCirculo}>
            <Ionicons name="car-sport" size={34} color={colors.accent700} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardLabel}>Tu móvil</Text>
            <Text style={styles.cardPatente}>{perfil.movil.patente}</Text>
            <View style={styles.estadoRow}>
              <View style={[styles.estadoPunto, { backgroundColor: estadoMovil.color }]} />
              <Text style={styles.estadoTexto}>{estadoMovil.texto}</Text>
            </View>
          </View>
        </View>

        {miEntrada && (
          <View style={styles.posicionRow}>
            <LinearGradient colors={gradients.button} style={styles.posicionBadge}>
              <Text style={styles.posicionBadgeText}>{miEntrada.posicion}</Text>
            </LinearGradient>
            <View>
              <Text style={styles.posicionLabel}>Posición en fila</Text>
              <StatusChip estado={miEntrada.estado} />
            </View>
          </View>
        )}

        {miEntrada ? (
          <GradientButton
            title="Salir de la fila"
            variant="danger"
            icon={<Ionicons name="exit-outline" size={18} color="#fff" />}
            onPress={salirDeFila}
            loading={accionando}
          />
        ) : (
          <GradientButton
            title="Entrar a la fila"
            icon={<Ionicons name="people" size={20} color={colors.ink} />}
            onPress={entrarAFila}
            loading={accionando}
          />
        )}
      </View>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <View style={styles.resumenCard}>
        <View style={styles.resumenIcono}>
          <Ionicons name="people" size={22} color={colors.textFaint} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.resumenLabel}>Fila actual</Text>
          <Text style={styles.resumenValor}>{cantidad} {cantidad === 1 ? 'vehículo' : 'vehículos'}</Text>
        </View>
        <View style={[styles.pill, cantidad === 0 ? styles.pillVacia : styles.pillActiva]}>
          {cantidad === 0 && <View style={styles.pillPunto} />}
          <Text style={[styles.pillTexto, cantidad === 0 ? styles.pillTextoVacia : styles.pillTextoActiva]}>
            {cantidad === 0 ? 'Fila vacía' : 'En espera'}
          </Text>
        </View>
      </View>
    </View>
  );

  const vacio = !loading ? (
    <View style={styles.vacioWrap}>
      <IlustracionTaxi width={200} height={114} />
      <Text style={styles.vacioTitulo}>Aún no hay vehículos en la fila</Text>
      <Text style={styles.vacioSub}>Sé el primero en unirte y recibe los próximos servicios en tu zona.</Text>
      <View style={styles.tip}>
        <View style={styles.tipIcono}>
          <Ionicons name="bulb" size={20} color={colors.info} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.tipTitulo}>Tip para empezar</Text>
          <Text style={styles.tipTexto}>Toca “Entrar a la fila” y comienza a recibir servicios automáticamente.</Text>
        </View>
      </View>
    </View>
  ) : null;

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={{ padding: 16 }}
      data={fila}
      keyExtractor={(item) => String(item.id_fila)}
      ListHeaderComponent={header}
      ListEmptyComponent={vacio}
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
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16, backgroundColor: colors.paper },
  centerText: { color: colors.textMuted, fontSize: 14 },
  intro: { fontSize: 14, color: colors.textMuted, marginBottom: 14 },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: 16,
    marginBottom: 12,
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  movilRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  taxiCirculo: {
    width: 68, height: 68, borderRadius: 34, backgroundColor: '#fff6c9',
    alignItems: 'center', justifyContent: 'center',
  },
  cardLabel: { fontSize: 11.5, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  cardPatente: { fontSize: 26, fontWeight: '800', color: colors.text, fontVariant: ['tabular-nums'] },
  estadoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  estadoPunto: { width: 9, height: 9, borderRadius: 5 },
  estadoTexto: { fontSize: 13.5, color: colors.textMuted },
  posicionRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  posicionBadge: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  posicionBadgeText: { color: colors.ink, fontWeight: '800', fontSize: 18 },
  posicionLabel: { fontSize: 12, color: colors.textMuted, marginBottom: 4 },

  errorBox: { backgroundColor: colors.critBg, borderRadius: radius.sm, padding: 10, marginBottom: 12 },
  errorText: { color: colors.crit, fontSize: 13 },

  resumenCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.surface, borderRadius: radius.xl, padding: 14, marginBottom: 12,
    borderWidth: 1, borderColor: colors.border,
  },
  resumenIcono: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: colors.neutralBg,
    alignItems: 'center', justifyContent: 'center',
  },
  resumenLabel: { fontSize: 12.5, color: colors.textMuted },
  resumenValor: { fontSize: 18, fontWeight: '800', color: colors.text },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6 },
  pillVacia: { backgroundColor: colors.goodBg },
  pillActiva: { backgroundColor: colors.infoBg },
  pillPunto: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.good },
  pillTexto: { fontSize: 12.5, fontWeight: '700' },
  pillTextoVacia: { color: colors.good },
  pillTextoActiva: { color: colors.info },

  vacioWrap: { alignItems: 'center', paddingTop: 12, gap: 6 },
  vacioTitulo: { fontSize: 17, fontWeight: '800', color: colors.text, marginTop: 6, textAlign: 'center' },
  vacioSub: { fontSize: 13.5, color: colors.textMuted, textAlign: 'center', paddingHorizontal: 12 },
  tip: {
    flexDirection: 'row', alignItems: 'center', gap: 12, alignSelf: 'stretch',
    backgroundColor: colors.infoBg, borderRadius: radius.lg, padding: 14, marginTop: 14,
  },
  tipIcono: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#d6e4fa',
    alignItems: 'center', justifyContent: 'center',
  },
  tipTitulo: { fontSize: 13.5, fontWeight: '700', color: colors.info },
  tipTexto: { fontSize: 12.5, color: colors.textMuted },

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
