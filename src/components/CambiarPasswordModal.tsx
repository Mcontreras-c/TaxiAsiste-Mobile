import React, { useState } from 'react';
import { KeyboardAvoidingView, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { cambiarPassword } from '../api/usuarios';
import { colors, radius } from '../theme';
import { CampoPassword } from './CampoPassword';
import { GradientButton } from './GradientButton';

const MIN_LEN = 6;

type Props = { visible: boolean; onClose: () => void };

/** El usuario cambia su propia contraseña (pide la actual): sirve para reemplazar la provisoria del correo. */
export function CambiarPasswordModal({ visible, onClose }: Props) {
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [repetir, setRepetir] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [guardando, setGuardando] = useState(false);

  function cerrar() {
    setActual('');
    setNueva('');
    setRepetir('');
    setError(null);
    setOk(false);
    onClose();
  }

  async function guardar() {
    setError(null);
    if (!actual || !nueva) return setError('Completa todos los campos.');
    if (nueva.length < MIN_LEN) return setError(`La nueva contraseña debe tener al menos ${MIN_LEN} caracteres.`);
    if (nueva !== repetir) return setError('Las contraseñas nuevas no coinciden.');
    setGuardando(true);
    try {
      await cambiarPassword(actual, nueva);
      setOk(true);
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'No se pudo cambiar la contraseña.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={cerrar}>
      <KeyboardAvoidingView behavior="padding" style={styles.fondo}>
        <View style={styles.tarjeta}>
          <Text style={styles.titulo}>Cambiar contraseña</Text>
          {ok ? (
            <>
              <View style={styles.okBox}>
                <Text style={styles.okText}>Contraseña actualizada correctamente.</Text>
              </View>
              <GradientButton title="Cerrar" onPress={cerrar} />
            </>
          ) : (
            <>
              <Text style={styles.label}>Contraseña actual</Text>
              <CampoPassword style={styles.campo} value={actual} onChangeText={setActual} placeholder="La que llegó a tu correo" />
              <Text style={styles.label}>Contraseña nueva</Text>
              <CampoPassword style={styles.campo} value={nueva} onChangeText={setNueva} placeholder={`Mínimo ${MIN_LEN} caracteres`} />
              <Text style={styles.label}>Repite la nueva</Text>
              <CampoPassword style={styles.campo} value={repetir} onChangeText={setRepetir} />
              {error && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}
              <GradientButton title="Guardar" onPress={guardar} loading={guardando} />
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
  titulo: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 12 },
  label: { fontSize: 12.5, fontWeight: '600', color: colors.textMuted, marginBottom: 6, marginTop: 4 },
  campo: { marginBottom: 10 },
  errorBox: { backgroundColor: colors.critBg, borderRadius: radius.sm, padding: 10, marginBottom: 10 },
  errorText: { color: colors.crit, fontSize: 13, textAlign: 'center' },
  okBox: { backgroundColor: colors.goodBg, borderRadius: radius.sm, padding: 12, marginBottom: 14 },
  okText: { color: colors.good, fontSize: 14, textAlign: 'center', fontWeight: '600' },
  cancelar: { alignItems: 'center', paddingVertical: 12 },
  cancelarTexto: { color: colors.textMuted, fontWeight: '600' },
});
