import React, { useState } from 'react';
import { StyleProp, StyleSheet, TextInput, TextInputProps, TouchableOpacity, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../theme';

type Props = Omit<TextInputProps, 'secureTextEntry' | 'style'> & {
  /** Estilo del contenedor (caja con borde); el ojito queda dentro, a la derecha. */
  style?: StyleProp<ViewStyle>;
};

/** Campo de contraseña con ojito para mostrar/ocultar lo que se escribe. */
export function CampoPassword({ style, ...props }: Props) {
  const [visible, setVisible] = useState(false);

  return (
    <View style={[styles.caja, style]}>
      <TextInput
        {...props}
        style={styles.input}
        secureTextEntry={!visible}
        autoCapitalize="none"
        autoCorrect={false}
        placeholderTextColor={props.placeholderTextColor ?? colors.textFaint}
      />
      <TouchableOpacity
        onPress={() => setVisible((v) => !v)}
        style={styles.ojo}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityLabel={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
      >
        <Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={22} color={colors.textMuted} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  caja: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    backgroundColor: colors.paper,
    marginBottom: 14,
  },
  input: { flex: 1, paddingLeft: 14, paddingVertical: 11, fontSize: 15, color: colors.text },
  ojo: { paddingHorizontal: 12, paddingVertical: 8 },
});
