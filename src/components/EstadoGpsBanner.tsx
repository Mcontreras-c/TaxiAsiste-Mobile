import React, { useState } from 'react';
import { Modal, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { TrackingUbicacion } from '../hooks/useTrackingUbicacion';
import { colors } from '../theme';

// Mensajes cortos para el toast flotante (maximo 27 caracteres).
const MENSAJE_CORTO: Record<'permiso_denegado' | 'gps_desactivado', string> = {
  permiso_denegado: 'Sin permiso GPS - Toca',
  gps_desactivado: 'GPS apagado - Toca activar',
};

const MENSAJE_DETALLE: Record<'permiso_denegado' | 'gps_desactivado', string> = {
  permiso_denegado: 'Ubicación desactivada — Central no puede verte en el mapa mientras trabajas.',
  gps_desactivado: 'El GPS del teléfono está apagado — actívalo para que Central te vea en el mapa.',
};

// Toast flotante (no ocupa la barra de estado) que abre un modal con el
// detalle y la accion para resolverlo. Antes el rastreo fallaba en silencio
// si el conductor rechazaba el permiso o apagaba el GPS.
export function EstadoGpsBanner({ tracking }: { tracking: TrackingUbicacion }) {
  const { estado, puedePedirPermisoDeNuevo, reintentar, abrirAjustes } = tracking;
  const [modalAbierto, setModalAbierto] = useState(false);

  if (estado === 'activo' || estado === 'verificando' || estado === 'inactivo') {
    return null;
  }

  const esPermiso = estado === 'permiso_denegado';
  const mostrarAjustes = esPermiso && !puedePedirPermisoDeNuevo;
  const accion = mostrarAjustes ? abrirAjustes : (esPermiso ? reintentar : abrirAjustes);
  const etiquetaBoton = mostrarAjustes ? 'Abrir ajustes' : (esPermiso ? 'Permitir ubicación' : 'Abrir ajustes');

  return (
    <>
      <TouchableOpacity
        onPress={() => setModalAbierto(true)}
        activeOpacity={0.85}
        style={{
          position: 'absolute',
          top: 50,
          right: 12,
          zIndex: 999,
          elevation: 999,
          backgroundColor: colors.warnBg,
          borderWidth: 1,
          borderColor: colors.warn,
          borderRadius: 12,
          paddingVertical: 8,
          paddingHorizontal: 12,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          maxWidth: 220,
          shadowColor: '#000',
          shadowOpacity: 0.15,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: 2 },
        }}
      >
        <Ionicons name="warning-outline" size={16} color={colors.warn} />
        <Text style={{ color: colors.warn, fontSize: 11.5, fontWeight: '700', flexShrink: 1 }} numberOfLines={1}>
          {MENSAJE_CORTO[estado]}
        </Text>
      </TouchableOpacity>

      <Modal
        visible={modalAbierto}
        transparent
        animationType="fade"
        onRequestClose={() => setModalAbierto(false)}
      >
        <View style={{
          flex: 1,
          zIndex: 1000,
          elevation: 1000,
          backgroundColor: 'rgba(20,17,11,0.55)',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
        }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 20, width: '100%', maxWidth: 340, gap: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="warning-outline" size={22} color={colors.warn} />
              <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text, flex: 1 }}>
                {esPermiso ? 'Ubicación desactivada' : 'GPS apagado'}
              </Text>
            </View>
            <Text style={{ fontSize: 13.5, color: colors.textMuted, lineHeight: 19 }}>
              {MENSAJE_DETALLE[estado]}
            </Text>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
              <TouchableOpacity
                onPress={() => setModalAbierto(false)}
                style={{ flex: 1, paddingVertical: 10, borderRadius: 999, borderWidth: 1, borderColor: colors.border, alignItems: 'center' }}
              >
                <Text style={{ color: colors.textMuted, fontWeight: '600', fontSize: 13 }}>Cerrar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { accion(); setModalAbierto(false); }}
                style={{ flex: 1, paddingVertical: 10, borderRadius: 999, backgroundColor: colors.warn, alignItems: 'center' }}
              >
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>{etiquetaBoton}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}
