import React, { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { olvidePassword } from '../api/usuarios';
import { colors, radius } from '../theme';
import { GradientButton } from './GradientButton';

type Props = { visible: boolean; onClose: () => void };

/** "Olvidé mi contraseña": se pide el correo y llega una clave temporal (respuesta siempre genérica). */
export function OlvidePasswordModal({ visible, onClose }: Props) {
  const [email, setEmail] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function cerrar() {
    setEmail('');
    setMensaje(null);
    setError(null);
    onClose();
  }

  async function enviar() {
    setError(null);
    if (!email.trim()) return setError('Escribe tu correo.');
    setEnviando(true);
    try {
      const r = await olvidePassword(email.trim());
      setMensaje(r.detail);
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'No se pudo enviar. Intenta de nuevo.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={cerrar}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.fondo}>
        <View style={styles.tarjeta}>
          <Text style={styles.titulo}>Recuperar contraseña</Text>
          {mensaje ? (
            <>
              <View style={styles.okBox}>
                <Text style={styles.okText}>{mensaje}</Text>
              </View>
              <GradientButton title="Cerrar" onPress={cerrar} />
            </>
          ) : (
            <>
              <Text style={styles.ayuda}>Escribe el correo de tu cuenta y te enviaremos una clave temporal.</Text>
              <TextInput
                style={styles.input}
                placeholder="correo@ejemplo.cl"
                placeholderTextColor={colors.textFaint}
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
              />
              {error && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}
              <GradientButton title="Enviar clave temporal" onPress={enviar} loading={enviando} />
              <TouchableOpacity onPress={cerrar} style={styles.cancelar}>
                <Text style={styles.cancelarTexto}>Cancelar</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  tarjeta: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: 22 },
  titulo: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 8 },
  ayuda: { fontSize: 13.5, color: colors.textMuted, marginBottom: 12 },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm,
    paddingHorizontal: 14, paddingVertical: 11, marginBottom: 12,
    fontSize: 15, color: colors.text, backgroundColor: colors.paper,
  },
  errorBox: { backgroundColor: colors.critBg, borderRadius: radius.sm, padding: 10, marginBottom: 10 },
  errorText: { color: colors.crit, fontSize: 13, textAlign: 'center' },
  okBox: { backgroundColor: colors.goodBg, borderRadius: radius.sm, padding: 12, marginBottom: 14 },
  okText: { color: colors.good, fontSize: 14, textAlign: 'center', fontWeight: '600' },
  cancelar: { alignItems: 'center', paddingVertical: 12 },
  cancelarTexto: { color: colors.textMuted, fontWeight: '600' },
});
