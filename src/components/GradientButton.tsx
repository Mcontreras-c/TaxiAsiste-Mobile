import React from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, ViewStyle } from 'react-native';
import { colors, gradients, radius } from '../theme';

type Props = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'danger' | 'outline';
  icon?: React.ReactNode;
  style?: ViewStyle;
};

export function GradientButton({ title, onPress, disabled, loading, variant = 'primary', icon, style }: Props) {
  const isBusy = disabled || loading;
  const contenido = (textStyle: object, spinnerColor: string) =>
    loading ? (
      <ActivityIndicator color={spinnerColor} />
    ) : (
      <>
        {icon}
        <Text style={textStyle}>{title}</Text>
      </>
    );

  if (variant === 'danger') {
    return (
      <TouchableOpacity
        onPress={onPress} disabled={isBusy} activeOpacity={0.85}
        style={[styles.base, styles.row, { backgroundColor: colors.crit, opacity: isBusy ? 0.6 : 1 }, style]}
      >
        {contenido(styles.textLight, '#fff')}
      </TouchableOpacity>
    );
  }

  if (variant === 'outline') {
    return (
      <TouchableOpacity
        onPress={onPress} disabled={isBusy} activeOpacity={0.85}
        style={[styles.base, styles.row, styles.outline, { opacity: isBusy ? 0.6 : 1 }, style]}
      >
        {contenido(styles.textOutline, colors.textMuted)}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity onPress={onPress} disabled={isBusy} activeOpacity={0.85} style={style}>
      <LinearGradient
        colors={gradients.button}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[styles.base, styles.row, { opacity: isBusy ? 0.6 : 1 }]}
      >
        {contenido(styles.textDark, colors.ink)}
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: { flexDirection: 'row', gap: 8 },
  outline: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  textDark: { color: colors.ink, fontWeight: '700', fontSize: 14.5 },
  textLight: { color: '#fff', fontWeight: '700', fontSize: 14.5 },
  textOutline: { color: colors.textMuted, fontWeight: '600', fontSize: 14.5 },
});
