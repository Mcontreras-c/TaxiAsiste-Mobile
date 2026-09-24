import React, { useCallback, useEffect, useRef, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { useKeepAwake } from 'expo-keep-awake';
import { Ionicons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  Vibration,
  View,
} from 'react-native';
import { api } from '../api/client';
import { getPendientes } from '../api/solicitudes';
import { useAuth } from '../auth/AuthContext';
import { GradientButton } from '../components/GradientButton';
import { IlustracionTaxi } from '../components/IlustracionTaxi';
import { colors, gradients, radius } from '../theme';
import { minutosDesde, nombreSinRut, textoEspera, textoLlamado } from '../utils/tiempoFila';

type EntradaFila = {
  id_fila: number;
  movil: number;
  patente: string;
  socio_nombre: string;
  posicion: number;
  estado: string;
  fecha_ingreso: string | null;
  fecha_llamado: string | null;
};

const INTERVALO_FILA_MS = 3000;
const INTERVALO_PENDIENTES_MS = 10000;
// Un movil que lleva mas que esto en la fila, o que fue llamado y aun no sale,
// se resalta en naranja para que el paletero lo note.
const MIN_ESPERA_LARGA = 30;
const MIN_LLAMADO_LARGO = 3;
// Mismo tamano que la ilustracion de la pantalla Solicitudes.
const ANCHO_ILUSTRACION = 260;

export function PaleteroScreen() {
  const { logout } = useAuth();
  // El paletero deja la app abierta todo el turno: la pantalla no se apaga.
  useKeepAwake();

  const [fila, setFila] = useState<EntradaFila[]>([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [sinConexion, setSinConexion] = useState(false);
  const [accionando, setAccionando] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendientes, setPendientes] = useState<number | null>(null);
  const [menu, setMenu] = useState<EntradaFila | null>(null);
  const [confirmar, setConfirmar] = useState<EntradaFila | null>(null);
  const [, forzarTick] = useState(0);
  const idsPrevios = useRef<Set<number> | null>(null);

  // Refresca "hace X min" sin volver a pedir datos.
  useEffect(() => {
    const id = setInterval(() => forzarTick((n) => n + 1), 15000);
    return () => clearInterval(id);
  }, []);

  const cargarFila = useCallback(async () => {
    try {
      const response = await api.get<EntradaFila[]>('/fila-base/', { params: { todos: 1 } });
      const activos = response.data.filter((e) => ['EN_ESPERA', 'LLAMADO'].includes(e.estado));
      // Un movil nuevo en la fila (no en la primera carga) avisa con una
      // vibracion corta, porque el paletero no siempre mira la pantalla.
      const previos = idsPrevios.current;
      if (previos && activos.some((e) => e.estado === 'EN_ESPERA' && !previos.has(e.id_fila))) {
        Vibration.vibrate(400);
      }
      idsPrevios.current = new Set(activos.map((e) => e.id_fila));
      // Se actualiza sin desmontar la lista para que el refresco automatico
      // no parpadee.
      setFila(activos);
      setSinConexion(false);
    } catch {
      setSinConexion(true);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarFila();
    const id = setInterval(cargarFila, INTERVALO_FILA_MS);
    return () => clearInterval(id);
  }, [cargarFila]);

  useEffect(() => {
    let vivo = true;
    const cargar = () =>
      getPendientes()
        .then((d) => vivo && setPendientes(d.length))
        .catch(() => {});
    cargar();
    const id = setInterval(cargar, INTERVALO_PENDIENTES_MS);
    return () => {
      vivo = false;
      clearInterval(id);
    };
  }, []);

  async function refrescarManual() {
    setRefrescando(true);
    await cargarFila();
    setRefrescando(false);
  }

  async function ejecutar(entrada: EntradaFila, accion: 'llamar' | 'retirar', mensajeError: string) {
    setAccionando(entrada.id_fila);
    setError(null);
    try {
      await api.post(`/fila-base/${entrada.id_fila}/${accion}/`);
    } catch (err: any) {
      // 404: ya no existe (otro paletero la retiro): solo se refresca la lista.
      if (err.response?.status !== 404) setError(err.response?.data?.detail ?? mensajeError);
    } finally {
      await cargarFila();
      setAccionando(null);
    }
  }

  const llamarMovil = (e: EntradaFila) => ejecutar(e, 'llamar', 'No se pudo llamar al móvil.');
  const retirarMovil = (e: EntradaFila) => ejecutar(e, 'retirar', 'No se pudo retirar al móvil.');

  const enEspera = fila.filter((e) => e.estado === 'EN_ESPERA').sort((a, b) => a.posicion - b.posicion);
  const llamados = fila
    .filter((e) => e.estado === 'LLAMADO')
    .sort((a, b) => (a.fecha_llamado ?? '').localeCompare(b.fecha_llamado ?? ''));
  const siguiente = enEspera[0];
  const resto = enEspera.slice(1);

  const encabezado = (
    <View>
      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
      {sinConexion && (
        <View style={styles.avisoConexion}>
          <Ionicons name="cloud-offline-outline" size={16} color={colors.warn} />
          <Text style={styles.avisoConexionTexto}>Sin conexión, reintentando…</Text>
        </View>
      )}

      <View style={styles.resumen}>
        <View style={styles.enVivo}>
          <View style={[styles.punto, { backgroundColor: sinConexion ? colors.crit : colors.good }]} />
          <Text style={[styles.enVivoTexto, { color: sinConexion ? colors.crit : colors.good }]}>
            {sinConexion ? 'Sin señal' : 'En vivo'}
          </Text>
        </View>
        <Indicador valor={enEspera.length} etiqueta="En espera" />
        <View style={styles.divisor} />
        <Indicador valor={llamados.length} etiqueta="Llamados" />
        <View style={styles.divisor} />
        <Indicador
          valor={pendientes}
          etiqueta="Solicitudes pendientes"
          alerta={(pendientes ?? 0) > 0}
        />
      </View>

      {llamados.length > 0 && (
        <View style={styles.bloqueLlamados}>
          <Text style={styles.tituloLlamados}>Llamados · {llamados.length}</Text>
          {llamados.map((e) => {
            const min = minutosDesde(e.fecha_llamado);
            const largo = min >= MIN_LLAMADO_LARGO;
            return (
              <View key={e.id_fila} style={styles.filaLlamado}>
                <View style={styles.datos}>
                  <Text style={styles.patenteMedia}>{e.patente}</Text>
                  <Text style={styles.nombre} numberOfLines={1}>{nombreSinRut(e.socio_nombre)}</Text>
                  <Text style={[styles.tiempo, largo && styles.tiempoAlerta]}>
                    {textoLlamado(min)}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.botonCarrera, accionando === e.id_fila && { opacity: 0.6 }]}
                  onPress={() => retirarMovil(e)}
                  disabled={accionando !== null}
                  activeOpacity={0.85}
                >
                  {accionando === e.id_fila ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.botonCarreraTexto}>Salió en carrera</Text>
                  )}
                </TouchableOpacity>
                <BotonMenu onPress={() => setMenu(e)} />
              </View>
            );
          })}
        </View>
      )}

      {siguiente && (
        <View style={styles.tarjetaSigue}>
          <Text style={styles.etiquetaSigue}>SIGUE</Text>
          <View style={styles.filaSigue}>
            <Posicion numero={siguiente.posicion} grande />
            <View style={styles.datos}>
              <Text style={styles.patenteGrande}>{siguiente.patente}</Text>
              <Text style={styles.nombre} numberOfLines={1}>{nombreSinRut(siguiente.socio_nombre)}</Text>
              <Text style={[styles.tiempo, minutosDesde(siguiente.fecha_ingreso) >= MIN_ESPERA_LARGA && styles.tiempoAlerta]}>
                {textoEspera(minutosDesde(siguiente.fecha_ingreso))}
              </Text>
            </View>
            <BotonMenu onPress={() => setMenu(siguiente)} />
          </View>
          <GradientButton
            title="Llamar"
            icon={<Ionicons name="notifications" size={20} color={colors.ink} />}
            onPress={() => llamarMovil(siguiente)}
            loading={accionando === siguiente.id_fila}
            disabled={accionando !== null}
            style={{ marginTop: 12 }}
          />
        </View>
      )}
    </View>
  );

  const vacio = !cargando && fila.length === 0;

  return (
    <View style={styles.root}>
      {/* Fondo: la ilustracion queda detras de todo el contenido y siempre visible.
          Va primero entre los hijos (se dibuja debajo de los siguientes): un
          zIndex negativo en Android con la nueva arquitectura lo manda detras
          del fondo del propio contenedor y desaparece. */}
      <View style={styles.fondo} pointerEvents="none">
        <IlustracionTaxi width={ANCHO_ILUSTRACION} />
      </View>

      <LinearGradient colors={gradients.sidebar} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0.3 }} style={styles.header}>
        <View>
          <Text style={styles.headerLabel}>BASE</Text>
          <Text style={styles.headerTitle}>Panel del Paletero</Text>
        </View>
        <TouchableOpacity onPress={logout}>
          <Text style={styles.logout}>Salir</Text>
        </TouchableOpacity>
      </LinearGradient>

      {cargando ? (
        <ActivityIndicator color={colors.accent600} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={resto}
          keyExtractor={(item) => String(item.id_fila)}
          contentContainerStyle={styles.lista}
          refreshControl={<RefreshControl refreshing={refrescando} onRefresh={refrescarManual} tintColor={colors.accent600} />}
          ListHeaderComponent={encabezado}
          ListEmptyComponent={
            vacio ? (
              <View style={styles.vacio}>
                <Text style={styles.vacioTitulo}>No hay móviles en la base</Text>
                <Text style={styles.vacioTexto}>Cuando un conductor entre a la fila, aparecerá aquí.</Text>
              </View>
            ) : null
          }
          renderItem={({ item }) => {
            const min = minutosDesde(item.fecha_ingreso);
            return (
              <View style={styles.filaEspera}>
                <Posicion numero={item.posicion} />
                <View style={styles.datos}>
                  <Text style={styles.patenteMedia}>{item.patente}</Text>
                  <Text style={styles.nombre} numberOfLines={1}>{nombreSinRut(item.socio_nombre)}</Text>
                  <Text style={[styles.tiempo, min >= MIN_ESPERA_LARGA && styles.tiempoAlerta]}>
                    {textoEspera(min)}
                  </Text>
                </View>
                <BotonMenu onPress={() => setMenu(item)} />
              </View>
            );
          }}
        />
      )}

      {/* Menu de acciones del movil */}
      <Hoja visible={!!menu} onCerrar={() => setMenu(null)}>
        {menu && (
          <>
            <Text style={styles.hojaTitulo}>{menu.patente}</Text>
            <Text style={styles.hojaSub}>{nombreSinRut(menu.socio_nombre)}</Text>
            {menu.estado === 'EN_ESPERA' && menu.id_fila !== siguiente?.id_fila && (
              <OpcionHoja
                icono="notifications-outline"
                texto="Llamar fuera de turno"
                onPress={() => {
                  const e = menu;
                  setMenu(null);
                  llamarMovil(e);
                }}
              />
            )}
            <OpcionHoja
              icono="exit-outline"
              texto="Retirar de la fila"
              peligro
              onPress={() => {
                const e = menu;
                setMenu(null);
                setConfirmar(e);
              }}
            />
            <TouchableOpacity style={styles.botonCancelarHoja} onPress={() => setMenu(null)}>
              <Text style={styles.botonCancelarHojaTexto}>Cancelar</Text>
            </TouchableOpacity>
          </>
        )}
      </Hoja>

      {/* Confirmacion de retiro: no se puede deshacer (al volver a entrar queda al final). */}
      <Hoja visible={!!confirmar} onCerrar={() => setConfirmar(null)}>
        {confirmar && (
          <>
            <Text style={styles.confirmTitulo}>¿Retirar el móvil {confirmar.patente}?</Text>
            <Text style={styles.hojaSub}>{nombreSinRut(confirmar.socio_nombre)}</Text>
            <Text style={styles.confirmTexto}>El móvil saldrá de la fila.</Text>
            <View style={styles.confirmBotones}>
              <GradientButton title="Cancelar" variant="outline" onPress={() => setConfirmar(null)} style={{ flex: 1 }} />
              <GradientButton
                title="Retirar"
                variant="danger"
                onPress={() => {
                  const e = confirmar;
                  setConfirmar(null);
                  retirarMovil(e);
                }}
                style={{ flex: 1 }}
              />
            </View>
          </>
        )}
      </Hoja>
    </View>
  );
}

function Indicador({ valor, etiqueta, alerta }: { valor: number | null; etiqueta: string; alerta?: boolean }) {
  return (
    <View style={styles.indicador}>
      <View style={styles.indicadorValor}>
        {alerta && <View style={[styles.punto, { backgroundColor: colors.warn }]} />}
        <Text style={styles.indicadorNumero}>{valor ?? '–'}</Text>
      </View>
      <Text style={styles.indicadorEtiqueta} numberOfLines={2}>{etiqueta}</Text>
    </View>
  );
}

function Posicion({ numero, grande }: { numero: number; grande?: boolean }) {
  const lado = grande ? 44 : 38;
  return (
    <LinearGradient colors={gradients.button} style={[styles.posicion, { width: lado, height: lado, borderRadius: lado / 2 }]}>
      <Text style={[styles.posicionTexto, grande && { fontSize: 19 }]}>{numero}</Text>
    </LinearGradient>
  );
}

function BotonMenu({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity
      style={styles.botonMenu}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityLabel="Más acciones"
    >
      <Ionicons name="ellipsis-vertical" size={20} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

function OpcionHoja({ icono, texto, onPress, peligro }: {
  icono: React.ComponentProps<typeof Ionicons>['name'];
  texto: string;
  onPress: () => void;
  peligro?: boolean;
}) {
  const color = peligro ? colors.crit : colors.text;
  return (
    <TouchableOpacity style={styles.opcionHoja} onPress={onPress} activeOpacity={0.7}>
      <Ionicons name={icono} size={22} color={color} />
      <Text style={[styles.opcionHojaTexto, { color }]}>{texto}</Text>
    </TouchableOpacity>
  );
}

function Hoja({ visible, onCerrar, children }: { visible: boolean; onCerrar: () => void; children: React.ReactNode }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCerrar}>
      <Pressable style={styles.telon} onPress={onCerrar}>
        {/* El Pressable interno evita que tocar la hoja la cierre. */}
        <Pressable style={styles.hoja} onPress={() => {}}>
          <View style={styles.hojaAgarre} />
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  // Centrada en el area bajo la cabecera (el padding superior es su alto aprox.).
  fondo: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, paddingTop: 96, alignItems: 'center', justifyContent: 'center' },
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

  lista: { padding: 16, paddingBottom: 48, gap: 10 },
  errorBox: { backgroundColor: colors.critBg, borderRadius: radius.sm, padding: 10, marginBottom: 10 },
  errorText: { color: colors.crit, fontSize: 13 },
  avisoConexion: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.warnBg, borderRadius: radius.sm, padding: 10, marginBottom: 10,
  },
  avisoConexionTexto: { color: colors.warn, fontSize: 13, fontWeight: '600' },

  resumen: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: radius.lg, paddingVertical: 12, paddingHorizontal: 12,
    borderWidth: 1, borderColor: colors.border, marginBottom: 12,
  },
  enVivo: { flexDirection: 'row', alignItems: 'center', gap: 6, width: 74 },
  enVivoTexto: { fontSize: 13, fontWeight: '700' },
  punto: { width: 9, height: 9, borderRadius: 5 },
  indicador: { flex: 1, alignItems: 'center' },
  indicadorValor: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  indicadorNumero: { fontSize: 24, fontWeight: '800', color: colors.text },
  indicadorEtiqueta: { fontSize: 11, color: colors.textMuted, textAlign: 'center', marginTop: 1 },
  divisor: { width: 1, alignSelf: 'stretch', backgroundColor: colors.border, marginVertical: 4 },

  bloqueLlamados: {
    backgroundColor: colors.infoBg, borderRadius: radius.lg, padding: 12, marginBottom: 12, gap: 10,
    borderWidth: 1, borderColor: 'rgba(51,85,168,0.18)',
  },
  tituloLlamados: { fontSize: 14, fontWeight: '800', color: colors.info },
  filaLlamado: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.surface, borderRadius: radius.md, padding: 10,
  },
  botonCarrera: {
    backgroundColor: colors.info, borderRadius: radius.md, minHeight: 52, paddingHorizontal: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  botonCarreraTexto: { color: '#fff', fontWeight: '800', fontSize: 14 },

  tarjetaSigue: {
    backgroundColor: '#fff9d6', borderRadius: radius.xl, padding: 14, marginBottom: 12,
    borderWidth: 1.5, borderColor: colors.accent500,
  },
  etiquetaSigue: { fontSize: 12, fontWeight: '800', color: colors.accent700, letterSpacing: 1.2, marginBottom: 6 },
  filaSigue: { flexDirection: 'row', alignItems: 'center', gap: 12 },

  filaEspera: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: 12,
    borderWidth: 1, borderColor: colors.border,
  },
  posicion: { alignItems: 'center', justifyContent: 'center' },
  posicionTexto: { color: colors.ink, fontWeight: '800', fontSize: 16 },
  datos: { flex: 1 },
  patenteGrande: { fontSize: 30, fontWeight: '900', color: colors.text, letterSpacing: 1 },
  patenteMedia: { fontSize: 20, fontWeight: '800', color: colors.text, letterSpacing: 0.5 },
  nombre: { fontSize: 14, color: colors.text, marginTop: 1 },
  tiempo: { fontSize: 12.5, color: colors.textMuted, marginTop: 2 },
  tiempoAlerta: { color: colors.warn, fontWeight: '700' },
  botonMenu: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md },

  vacio: { alignItems: 'center', paddingTop: 24, paddingHorizontal: 24 },
  vacioTitulo: { fontSize: 20, fontWeight: '800', color: colors.text, textAlign: 'center' },
  vacioTexto: { fontSize: 15, color: colors.textMuted, textAlign: 'center', marginTop: 6 },

  telon: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  hoja: {
    backgroundColor: colors.paper, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingBottom: 28, paddingTop: 10,
  },
  hojaAgarre: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, marginBottom: 14 },
  hojaTitulo: { fontSize: 22, fontWeight: '800', color: colors.text, textAlign: 'center' },
  hojaSub: { fontSize: 14, color: colors.textMuted, textAlign: 'center', marginTop: 2, marginBottom: 10 },
  opcionHoja: {
    flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 56,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  opcionHojaTexto: { fontSize: 16, fontWeight: '600' },
  botonCancelarHoja: {
    minHeight: 52, alignItems: 'center', justifyContent: 'center', marginTop: 6,
    backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
  },
  botonCancelarHojaTexto: { fontSize: 15, fontWeight: '700', color: colors.text },
  confirmTitulo: { fontSize: 21, fontWeight: '800', color: colors.text, textAlign: 'center' },
  confirmTexto: { fontSize: 15, color: colors.textMuted, textAlign: 'center', marginBottom: 18 },
  confirmBotones: { flexDirection: 'row', gap: 12 },
});
