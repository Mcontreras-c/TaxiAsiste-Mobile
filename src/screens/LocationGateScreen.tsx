import React from 'react';
import { SafeAreaView, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../theme';
import type { LocationGate } from '../hooks/useLocationGate';

export function LocationGateScreen({ gate }: { gate: LocationGate }) {
  const { puedePedirPermisoDeNuevo, reintentar, abrirAjustes } = gate;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.paper }}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 }}>
        <View style={{ width: '100%', maxWidth: 320 }}>
          <Text style={{ fontSize: 28, fontWeight: '800', color: colors.ink, textAlign: 'center', marginBottom: 16 }}>
            Vaya
          </Text>
          <Text style={{ fontSize: 15, color: colors.textMuted, textAlign: 'center', lineHeight: 22, marginBottom: 28 }}>
            Para usar TaxiAsiste tienes que habilitar el acceso a tu ubicación. Inténtalo de nuevo y pulsa OK.
          </Text>
          <TouchableOpacity
            onPress={reintentar}
            style={{
              width: '100%',
              backgroundColor: colors.accent500,
              borderRadius: 999,
              paddingVertical: 14,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: colors.ink, fontWeight: '800', fontSize: 14, letterSpacing: 0.5 }}>
              INTÉNTALO DE NUEVO
            </Text>
          </TouchableOpacity>

          {!puedePedirPermisoDeNuevo && (
            <TouchableOpacity onPress={abrirAjustes} style={{ marginTop: 16, alignItems: 'center' }}>
              <Text style={{ color: colors.info, fontWeight: '600', fontSize: 13 }}>
                Abrir ajustes de la app
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}
