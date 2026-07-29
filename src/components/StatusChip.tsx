import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../theme';

const TONES: Record<string, { bg: string; fg: string }> = {
  EN_ESPERA:  { bg: colors.neutralBg, fg: colors.textMuted },
  LLAMADO:    { bg: colors.infoBg, fg: colors.info },
  RETIRADO:   { bg: colors.neutralBg, fg: colors.textFaint },
  PENDIENTE:  { bg: colors.warnBg, fg: colors.warn },
  ASIGNADO:   { bg: colors.infoBg, fg: colors.info },
  EN_CURSO:   { bg: '#f3e8fd', fg: '#7e22ce' },
  COMPLETADO: { bg: colors.goodBg, fg: colors.good },
  CANCELADO:  { bg: colors.neutralBg, fg: colors.textFaint },
};

export function StatusChip({ estado }: { estado: string }) {
  const tone = TONES[estado] ?? { bg: colors.neutralBg, fg: colors.textMuted };
  return (
    <View style={[styles.chip, { backgroundColor: tone.bg }]}>
      <Text style={[styles.text, { color: tone.fg }]}>{estado}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  text: { fontSize: 10.5, fontWeight: '700', letterSpacing: 0.3 },
});
