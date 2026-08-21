import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Linking,
  Modal,
  PanResponder,
  Text,
  View,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const SEGUNDOS_CUENTA_REGRESIVA = 3;
const ANCHO_PISTA = 260;
const TAMANO_PERILLA = 56;
const RECORRIDO = ANCHO_PISTA - TAMANO_PERILLA - 8; // margen interno de la pista

interface Props {
  visible: boolean;
  numero: string;
  etiqueta: string;
  onCancelar: () => void;
  onLlamada: () => void;
}

// Fondo tipo "pantalla con estatica/pixelada": grilla de celdas con opacidad
// semi-aleatoria. Se genera una sola vez por apertura del modal (no en cada
// render) para no recalcular mientras corre la cuenta regresiva.
function usePatronPixelado(filas: number, columnas: number) {
  return useMemo(() => {
    const celdas: number[] = [];
    for (let i = 0; i < filas * columnas; i++) {
      celdas.push(Math.random() * 0.14 + 0.03);
    }
    return celdas;
  }, [filas, columnas]);
}

function FondoPixelado() {
  const filas = 18;
  const columnas = 10;
  const celdas = usePatronPixelado(filas, columnas);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {celdas.map((opacidad, i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            top: `${(Math.floor(i / columnas) / filas) * 100}%`,
            left: `${((i % columnas) / columnas) * 100}%`,
            width: `${100 / columnas}%`,
            height: `${100 / filas}%`,
            backgroundColor: '#ffffff',
            opacity: opacidad,
          }}
        />
      ))}
    </View>
  );
}

export function EmergencyCallOverlay({ visible, numero, etiqueta, onCancelar, onLlamada }: Props) {
  const [segundosRestantes, setSegundosRestantes] = useState(SEGUNDOS_CUENTA_REGRESIVA);
  const pan = useRef(new Animated.Value(0)).current;
  const cancelado = useRef(false);

  useEffect(() => {
    if (!visible) return;
    cancelado.current = false;
    setSegundosRestantes(SEGUNDOS_CUENTA_REGRESIVA);
    pan.setValue(0);

    const inicio = Date.now();
    const intervalo = setInterval(() => {
      const transcurrido = (Date.now() - inicio) / 1000;
      const restante = Math.max(0, SEGUNDOS_CUENTA_REGRESIVA - Math.floor(transcurrido));
      setSegundosRestantes(restante);
      if (transcurrido >= SEGUNDOS_CUENTA_REGRESIVA && !cancelado.current) {
        cancelado.current = true;
        clearInterval(intervalo);
        Linking.openURL(`tel:${numero}`);
        onLlamada();
      }
    }, 100);

    return () => clearInterval(intervalo);
  }, [visible, numero, onLlamada, pan]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_evt, gesto) => {
        const x = Math.max(0, Math.min(RECORRIDO, gesto.dx));
        pan.setValue(x);
      },
      onPanResponderRelease: (_evt, gesto) => {
        if (gesto.dx >= RECORRIDO * 0.6) {
          // Deslizo lo suficiente: cancela la emergencia.
          cancelado.current = true;
          Animated.timing(pan, { toValue: RECORRIDO, duration: 120, useNativeDriver: false }).start(() => {
            onCancelar();
          });
        } else {
          // No llego al umbral: la perilla vuelve a su lugar, la cuenta sigue.
          Animated.spring(pan, { toValue: 0, useNativeDriver: false }).start();
        }
      },
    })
  ).current;

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onCancelar}>
      <View style={styles.fondo}>
        <FondoPixelado />

        <View style={styles.contenido}>
          <View style={styles.badgeIcono}>
            <Ionicons name="shield-outline" size={30} color="#fff" />
          </View>

          <Text style={styles.numero}>{numero}</Text>
          <Text style={styles.etiqueta}>{etiqueta}</Text>

          <Text style={styles.cuentaRegresiva}>
            Llamando en {segundosRestantes}s...
          </Text>
          <Text style={styles.ayuda}>
            Si fue un error, desliza el botón hacia la derecha para cancelar
          </Text>
        </View>

        <View style={styles.zonaDeslizar}>
          <View style={styles.pista}>
            <View style={styles.pistaFlechas}>
              <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.35)" />
              <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.35)" />
              <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.35)" />
            </View>
            <Text style={styles.textoPista}>Desliza para cancelar</Text>

            <Animated.View
              {...panResponder.panHandlers}
              style={[styles.perilla, { transform: [{ translateX: pan }] }]}
            >
              <Ionicons name="close" size={26} color="#fff" />
            </Animated.View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fondo: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 60,
  },
  contenido: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 32,
  },
  badgeIcono: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(192,57,43,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  numero: {
    color: '#ffffff',
    fontSize: 56,
    fontWeight: '800',
    letterSpacing: 2,
  },
  etiqueta: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 24,
  },
  cuentaRegresiva: {
    color: '#ff6b5e',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  ayuda: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12.5,
    textAlign: 'center',
    maxWidth: 260,
  },
  zonaDeslizar: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  pista: {
    width: ANCHO_PISTA,
    height: TAMANO_PERILLA + 8,
    borderRadius: (TAMANO_PERILLA + 8) / 2,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    paddingLeft: 4,
  },
  pistaFlechas: {
    position: 'absolute',
    left: 20,
    top: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  textoPista: {
    position: 'absolute',
    alignSelf: 'center',
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12.5,
    fontWeight: '600',
  },
  perilla: {
    width: TAMANO_PERILLA,
    height: TAMANO_PERILLA,
    borderRadius: TAMANO_PERILLA / 2,
    backgroundColor: '#c0392b',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
});
