import React, { useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import {
  KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { GradientButton } from '../components/GradientButton';
import { useAuth } from '../auth/AuthContext';
import { colors, gradients, radius } from '../theme';

export function LoginScreen() {
  const { login, loading, error } = useAuth();
  const [username, setUsername] = useState('conductor');
  const [password, setPassword] = useState('conductor123');

  return (
    <LinearGradient colors={gradients.sidebar} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={styles.bg}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.brandMark}>
            <Text style={styles.brandMarkText}>TA</Text>
          </View>
          <Text style={styles.title}>TaxiAsiste</Text>
          <Text style={styles.subtitle}>Panel de conductor y paletero</Text>

          <View style={styles.card}>
            <Text style={styles.label}>Usuario</Text>
            <TextInput
              style={styles.input}
              placeholder="usuario"
              placeholderTextColor={colors.textFaint}
              autoCapitalize="none"
              value={username}
              onChangeText={setUsername}
            />

            <Text style={styles.label}>Contraseña</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor={colors.textFaint}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />

            {error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <GradientButton
              title="Iniciar sesión"
              onPress={() => login(username, password)}
              loading={loading}
              style={{ marginTop: 8 }}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  brandMark: {
    width: 56, height: 56, borderRadius: radius.lg,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
    alignSelf: 'center', marginBottom: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  brandMarkText: { color: '#fff', fontSize: 20, fontWeight: '800', letterSpacing: 1 },
  title: { fontSize: 26, fontWeight: '800', color: '#fff', textAlign: 'center' },
  subtitle: { fontSize: 13, color: 'rgba(255,255,255,0.7)', textAlign: 'center', marginTop: 4, marginBottom: 28 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: 22,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  label: { fontSize: 12.5, fontWeight: '600', color: colors.textMuted, marginBottom: 6, marginTop: 4 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginBottom: 14,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.paper,
  },
  errorBox: {
    backgroundColor: colors.critBg,
    borderRadius: radius.sm,
    padding: 10,
    marginBottom: 14,
  },
  errorText: { color: colors.crit, fontSize: 13, textAlign: 'center' },
});
