import React, { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { api } from '../api/client';
import { useConductor } from '../auth/ConductorContext';
import { GradientButton } from '../components/GradientButton';
import { colors, radius } from '../theme';

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
        <Text style={styles.centerText}>No tienes un movil vinculado a tu cuenta.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {tieneViajeActivo && (
        <View style={styles.aviso}>
          <Text style={styles.avisoText}>Ya tienes un servicio en curso. Revisa "Servicio Actual".</Text>
        </View>
      )}

      <Text style={styles.subtitle}>Solicitudes pendientes ({pendientes.length})</Text>

      <FlatList
        data={pendientes}
        keyExtractor={(item) => String(item.id_solicitud)}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            tintColor={colors.accent600}
            onRefresh={() => {
              cargarPendientes();
              recargar();
            }}
          />
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.center}>
              <Text style={styles.centerText}>No hay solicitudes pendientes.</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.folio}>{item.folio}</Text>
              <View style={styles.pendChip}><Text style={styles.pendChipText}>PENDIENTE</Text></View>
            </View>
            {item.pasajero_nombre && <Text style={styles.linea}>Pasajero: <Text style={styles.lineaBold}>{item.pasajero_nombre}</Text></Text>}
            <View style={styles.ruta}>
              <Text style={styles.rutaText} numberOfLines={1}>{item.origen}</Text>
              <Text style={styles.rutaArrow}>→</Text>
              <Text style={styles.rutaText} numberOfLines={1}>{item.destino}</Text>
            </View>
            <GradientButton
              title="Aceptar solicitud"
              onPress={() => aceptarSolicitud(item)}
              loading={accionando === item.id_solicitud}
              disabled={tieneViajeActivo}
              style={{ marginTop: 6 }}
            />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: colors.paper },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  centerText: { color: colors.textMuted, fontSize: 14 },
  errorBox: { backgroundColor: colors.critBg, borderRadius: radius.sm, padding: 10, marginBottom: 12 },
  errorText: { color: colors.crit, fontSize: 13 },
  aviso: { backgroundColor: colors.infoBg, borderRadius: radius.sm, padding: 10, marginBottom: 12 },
  avisoText: { color: colors.info, fontSize: 13, fontWeight: '600' },
  subtitle: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 10 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 16,
    marginBottom: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  folio: { fontWeight: '700', fontSize: 15, color: colors.text, fontVariant: ['tabular-nums'] },
  pendChip: { backgroundColor: colors.warnBg, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3 },
  pendChipText: { color: colors.warn, fontSize: 10.5, fontWeight: '700' },
  linea: { fontSize: 13, color: colors.textMuted },
  lineaBold: { fontWeight: '700', color: colors.text },
  ruta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  rutaText: { fontSize: 13.5, color: colors.text, fontWeight: '600', flexShrink: 1 },
  rutaArrow: { color: colors.textFaint },
});
