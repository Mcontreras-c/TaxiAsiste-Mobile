import React, { useCallback, useEffect, useState } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { api } from '../api/client';
import { getPendientes, getPendientesConDistancia, SolicitudPendiente } from '../api/solicitudes';
import { useConductor } from '../auth/ConductorContext';
import { GradientButton } from '../components/GradientButton';
import { IlustracionTaxi } from '../components/IlustracionTaxi';
import { colors, radius } from '../theme';
import { formatoHora } from '../utils/formatoFecha';

// A partir de este tiempo de espera, la solicitud se resalta como urgente
// (barra/texto naranja) en vez del azul por defecto de "recien llegada".
const MINUTOS_ESPERA_URGENTE = 10;

function minutosDesde(fechaHoraIso: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(fechaHoraIso).getTime()) / 60000));
}

function formatoTiempoEspera(minutos: number): string {
  if (minutos < 1) return 'Recién ahora';
  if (minutos < 60) return `Hace ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  return `Hace ${horas} h ${minutos % 60} min`;
}

// El origen llega como texto libre de la Central ("Av. Mapocho 7420, Cerro
// Navia, Santiago") -- se separa en calle (linea principal) + comuna/resto
// (subtitulo) por la primera coma, para que se lea igual que en el mockup
// aprobado. Sin coma, se muestra entero como linea principal.
function separarDireccion(origen: string): { calle: string; resto: string | null } {
  const idx = origen.indexOf(',');
  if (idx === -1) return { calle: origen, resto: null };
  return { calle: origen.slice(0, idx).trim(), resto: origen.slice(idx + 1).trim() };
}

// El nombre de pasajero del backend incluye el RUT entre parentesis
// (Pasajero.__str__) -- util en la web de Central, pero el diseño aprobado
// para esta pantalla lo omite a proposito por limpieza visual.
function nombreSinRut(nombre: string): string {
  return nombre.replace(/\s*\([^)]*\)\s*$/, '');
}

function IlustracionEspera() {
  return (
    <View style={styles.ilustracionWrap}>
      <IlustracionTaxi />
      <Text style={styles.ilustracionTexto}>Te avisaremos cuando lleguen nuevas solicitudes</Text>
    </View>
  );
}

export function SolicitudesScreen() {
  const { perfil, recargar } = useConductor();
  const navigation = useNavigation();
  const [pendientes, setPendientes] = useState<SolicitudPendiente[]>([]);
  const [loading, setLoading] = useState(false);
  const [accionando, setAccionando] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ultimaActualizacion, setUltimaActualizacion] = useState<Date | null>(null);
  const [, forzarTick] = useState(0);

  // Recalcula "Hace X min" cada 30s sin volver a pedir datos al backend --
  // es puramente cosmetico (usa fecha_hora que ya esta en memoria).
  useEffect(() => {
    const id = setInterval(() => forzarTick((n) => n + 1), 30000);
    return () => clearInterval(id);
  }, []);

  const cargarPendientes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // La posicion se pide una sola vez por carga de pantalla (apertura o
      // pull-to-refresh), nunca en un timer en segundo plano -- cada
      // solicitud pendiente con distancia/ETA implica una llamada a Google
      // Directions del lado del backend, y no queremos gastar cuota en
      // actualizaciones silenciosas (ver pendientes_con_distancia en el
      // Backend).
      const posicion = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      }).catch(() => null);

      const datos = posicion
        ? await getPendientesConDistancia(posicion.coords.latitude, posicion.coords.longitude)
        : await getPendientes();
      setPendientes(datos);
      setUltimaActualizacion(new Date());
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

  const tieneViajeActivo = (perfil?.solicitudes_hoy ?? []).some((s: { estado: string }) =>
    ['ASIGNADO', 'EN_CURSO'].includes(s.estado)
  );

  async function aceptarSolicitud(solicitud: SolicitudPendiente) {
    if (!perfil?.movil) return;
    setAccionando(solicitud.id_solicitud);
    setError(null);
    try {
      await api.post(`/solicitudes/${solicitud.id_solicitud}/cambiar_estado/`, {
        estado: 'ASIGNADO',
        movil: perfil.movil.id_movil,
      });
      await Promise.all([cargarPendientes(), recargar()]);
      // Apenas se acepta, lo mas util es ver el mapa con la ruta al punto
      // de recogida — no quedarse en la lista de pendientes (que ademas
      // ahora se deshabilita, ver tieneViajeActivo).
      navigation.navigate('ServicioActual' as never);
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

  const horaActualizacion = ultimaActualizacion
    ? formatoHora(ultimaActualizacion)
    : '—';

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

      <View style={styles.destinoCard}>
        <View style={styles.destinoIconWrap}>
          <Ionicons name="medical" size={22} color={colors.info} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.destinoLabel}>Destino de todas las solicitudes</Text>
          <Text style={styles.destinoNombre}>Hospital Félix Bulnes</Text>
          <Text style={styles.destinoComuna}>Cerro Navia, Santiago</Text>
        </View>
        <View style={styles.destinoNota}>
          <Ionicons name="location" size={16} color={colors.textFaint} />
          <Text style={styles.destinoNotaTexto}>Mismo destino{'\n'}para todos los viajes</Text>
        </View>
      </View>

      <View style={styles.resumenRow}>
        <View>
          <Text style={styles.resumenTitulo}>{pendientes.length} pendiente{pendientes.length === 1 ? '' : 's'}</Text>
          <Text style={styles.resumenSubtitulo}>Mayor espera primero</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <View style={styles.enVivoRow}>
            <View style={styles.enVivoPunto} />
            <Text style={styles.enVivoTexto}>Actualización en vivo</Text>
          </View>
          <Text style={styles.enVivoHora}>Última actualización {horaActualizacion}</Text>
        </View>
      </View>

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
        ListFooterComponent={pendientes.length > 0 ? <IlustracionEspera /> : null}
        renderItem={({ item, index }) => {
          const minutos = minutosDesde(item.fecha_hora);
          const urgente = minutos >= MINUTOS_ESPERA_URGENTE;
          const colorAcento = urgente ? colors.warn : colors.info;
          const caption = index === 0 && pendientes.length > 1
            ? 'Mayor tiempo de espera'
            : urgente ? 'Espera prolongada' : 'Solicitud reciente';
          const { calle, resto } = separarDireccion(item.origen);

          return (
            <View style={[styles.card, { borderLeftColor: colorAcento, borderLeftWidth: 4 }]}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <View style={styles.esperaRow}>
                    <Ionicons name="time-outline" size={15} color={colorAcento} />
                    <Text style={[styles.esperaTexto, { color: colorAcento }]}>
                      {formatoTiempoEspera(minutos)}
                    </Text>
                  </View>
                  <Text style={[styles.esperaCaption, { color: colorAcento }]}>{caption}</Text>
                </View>
                <Text style={styles.folio}>Folio {item.folio}</Text>
              </View>

              {item.pasajero_nombre && (
                <View style={styles.filaIcono}>
                  <Ionicons name="person-outline" size={14} color={colors.textMuted} />
                  <Text style={styles.pasajeroTexto}>{nombreSinRut(item.pasajero_nombre)}</Text>
                </View>
              )}

              <View style={styles.filaIcono}>
                <Ionicons name="location" size={14} color={colors.textMuted} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.calleTexto} numberOfLines={1}>{calle}</Text>
                  {resto && <Text style={styles.comunaTexto} numberOfLines={1}>{resto}</Text>}
                </View>
              </View>

              {item.distancia_km != null && item.duracion_min != null && (
                <View style={styles.distanciaBox}>
                  <Ionicons name="car-outline" size={18} color={colors.textMuted} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.distanciaLabel}>Hasta la recogida</Text>
                    <Text style={styles.distanciaValor}>{item.distancia_km} km · {item.duracion_min} min</Text>
                  </View>
                  <View style={styles.distanciaDivisor} />
                  <View>
                    <View style={styles.filaIcono}>
                      <Text style={styles.distanciaLabel}>Estimación</Text>
                      <Ionicons name="information-circle-outline" size={13} color={colors.textFaint} />
                    </View>
                    <Text style={styles.distanciaValorChico}>Por tránsito actual</Text>
                  </View>
                </View>
              )}

              <GradientButton
                title="Aceptar solicitud"
                icon={<Ionicons name="car-sport" size={18} color={colors.ink} />}
                onPress={() => aceptarSolicitud(item)}
                loading={accionando === item.id_solicitud}
                disabled={tieneViajeActivo}
                style={{ marginTop: 8 }}
              />
            </View>
          );
        }}
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

  destinoCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.infoBg, borderRadius: radius.lg, padding: 14, marginBottom: 14,
  },
  destinoIconWrap: {
    width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  destinoLabel: { fontSize: 11, color: colors.textMuted, fontWeight: '600' },
  destinoNombre: { fontSize: 15, fontWeight: '800', color: colors.info },
  destinoComuna: { fontSize: 12, color: colors.textMuted },
  destinoNota: { alignItems: 'center', maxWidth: 70 },
  destinoNotaTexto: { fontSize: 9.5, color: colors.textFaint, textAlign: 'center', marginTop: 2 },

  resumenRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12,
  },
  resumenTitulo: { fontSize: 20, fontWeight: '800', color: colors.text },
  resumenSubtitulo: { fontSize: 12.5, color: colors.textMuted },
  enVivoRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  enVivoPunto: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.good },
  enVivoTexto: { fontSize: 12, fontWeight: '700', color: colors.good },
  enVivoHora: { fontSize: 10.5, color: colors.textFaint, marginTop: 2 },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 16,
    marginBottom: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  esperaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  esperaTexto: { fontSize: 15, fontWeight: '800' },
  esperaCaption: { fontSize: 10.5, fontWeight: '600', marginTop: 1 },
  folio: { fontSize: 11.5, color: colors.textFaint, fontVariant: ['tabular-nums'] },

  filaIcono: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pasajeroTexto: { fontSize: 13.5, color: colors.text, fontWeight: '600' },
  calleTexto: { fontSize: 14.5, color: colors.text, fontWeight: '700' },
  comunaTexto: { fontSize: 12, color: colors.textMuted },

  distanciaBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.paper, borderRadius: radius.md, padding: 10,
  },
  distanciaDivisor: { width: 1, height: 28, backgroundColor: colors.border },
  distanciaLabel: { fontSize: 10.5, color: colors.textMuted },
  distanciaValor: { fontSize: 13.5, fontWeight: '800', color: colors.text },
  distanciaValorChico: { fontSize: 11, color: colors.textMuted },

  ilustracionWrap: { alignItems: 'center', paddingVertical: 20, gap: 8 },
  ilustracionTexto: { fontSize: 12.5, color: colors.textFaint, textAlign: 'center' },
});
