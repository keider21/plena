import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store/useStore';
import { COLORS, NEOM } from '../utils/theme';
import { firebaseLoginGoogle } from '../utils/firebase';

export default function AuthScreen() {
  const [mode, setMode] = useState('login'); // login | register
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const store = useStore();
  const { login, register } = store;

  const handleSubmit = async () => {
    if (!email || !password) return Alert.alert('Completa los campos');
    if (mode === 'register' && !name) return Alert.alert('Ingresa tu nombre');
    setLoading(true);
    const result = mode === 'login'
      ? await login(email.trim().toLowerCase(), password)
      : await register(name.trim(), email.trim().toLowerCase(), password);
    setLoading(false);
    if (result.error) Alert.alert('Error', result.error);
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    const { user, error } = await firebaseLoginGoogle();
    if (error) {
      Alert.alert('Error Google', error);
      setLoading(false);
      return;
    }
    const googlePass = 'google-' + user.uid;
    // Intenta login primero (usuario ya registrado), si falla registra
    let result = await login(user.email, googlePass);
    if (result.error) {
      result = await register(user.displayName || 'Usuario', user.email, googlePass);
    }
    if (result?.error) {
      Alert.alert('Error', result.error);
      setLoading(false);
      return;
    }
    // El respaldo/restauración ahora lo maneja Supabase dentro de login/register.
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: COLORS.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.bg} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

        <View style={styles.logoArea}>
          <View style={styles.logoCircle}>
            <Ionicons name="star" size={32} color="#fff" />
          </View>
          <Text style={styles.appName}>Vida Plena</Text>
          <Text style={styles.appSub}>Tu guía de crecimiento personal</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{mode === 'login' ? 'Bienvenido de vuelta' : 'Crear cuenta'}</Text>
          <Text style={styles.cardSub}>{mode === 'login' ? 'Ingresa a tu espacio personal' : 'Empieza tu transformación hoy'}</Text>

          {mode === 'register' && (
            <View style={styles.inputWrap}>
              <Ionicons name="person-outline" size={18} color={COLORS.textMuted} style={styles.inputIcon} />
              <TextInput
                placeholder="Tu nombre"
                placeholderTextColor={COLORS.textMuted}
                style={styles.input}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            </View>
          )}

          <View style={styles.inputWrap}>
            <Ionicons name="mail-outline" size={18} color={COLORS.textMuted} style={styles.inputIcon} />
            <TextInput
              placeholder="Correo electrónico"
              placeholderTextColor={COLORS.textMuted}
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputWrap}>
            <Ionicons name="lock-closed-outline" size={18} color={COLORS.textMuted} style={styles.inputIcon} />
            <TextInput
              placeholder="Contraseña"
              placeholderTextColor={COLORS.textMuted}
              style={[styles.input, { flex: 1 }]}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPass}
            />
            <TouchableOpacity onPress={() => setShowPass(!showPass)} style={{ padding: 4 }}>
              <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={handleSubmit} activeOpacity={0.85} style={[styles.btn, { marginTop: 8 }]}>
            <Text style={styles.btnText}>{loading ? 'Cargando...' : (mode === 'login' ? 'Entrar' : 'Crear mi cuenta')}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setMode(mode === 'login' ? 'register' : 'login')} style={styles.switchRow}>
            <Text style={styles.switchText}>
              {mode === 'login' ? '¿No tienes cuenta? ' : '¿Ya tienes cuenta? '}
              <Text style={{ color: COLORS.purple, fontWeight: '600' }}>
                {mode === 'login' ? 'Regístrate' : 'Inicia sesión'}
              </Text>
            </Text>
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>O continúa con</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity onPress={handleGoogleLogin} activeOpacity={0.8} style={styles.googleBtn} disabled={loading}>
            <Ionicons name="logo-google" size={20} color={COLORS.text} />
            <Text style={styles.googleText}>Google</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.features}>
          {[
            { icon: 'trending-up-outline', text: 'Seguimiento de hábitos diarios' },
            { icon: 'bar-chart-outline', text: 'Gráficas de progreso real' },
            { icon: 'notifications-outline', text: 'Recordatorios personalizados' },
            { icon: 'wallet-outline', text: 'Control financiero completo' },
          ].map((f, i) => (
            <View key={i} style={styles.featureRow}>
              <View style={styles.featureIcon}>
                <Ionicons name={f.icon} size={16} color={COLORS.purple} />
              </View>
              <Text style={styles.featureText}>{f.text}</Text>
            </View>
          ))}
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: COLORS.bg },
  container: { padding: 24, paddingTop: 60 },
  logoArea: { alignItems: 'center', marginBottom: 32 },
  logoCircle: {
    width: 72, height: 72, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
    ...NEOM.float,
    backgroundColor: COLORS.purple, marginBottom: 16,
  },
  appName: { fontSize: 28, fontWeight: '800', color: COLORS.text, letterSpacing: -0.5 },
  appSub: { fontSize: 14, color: COLORS.textSub, marginTop: 4 },
  card: { ...NEOM.float, padding: 22, marginBottom: 24 },
  cardTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  cardSub: { fontSize: 13, color: COLORS.textSub, marginBottom: 20 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    ...NEOM.pressed, paddingHorizontal: 14, marginBottom: 12,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, height: 48, color: COLORS.text, fontSize: 15 },
  btn: {
    backgroundColor: COLORS.purple, borderRadius: 14, paddingVertical: 15,
    alignItems: 'center',
    shadowColor: COLORS.purple, shadowOpacity: 0.4, shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  switchRow: { marginTop: 16, alignItems: 'center' },
  switchText: { fontSize: 14, color: COLORS.textSub },
  features: { gap: 12 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  featureIcon: { width: 32, height: 32, borderRadius: 8, backgroundColor: COLORS.purpleDim, alignItems: 'center', justifyContent: 'center' },
  featureText: { fontSize: 14, color: COLORS.textSub },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20, gap: 10 },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  dividerText: { fontSize: 12, color: COLORS.textMuted },
  googleBtn: { flexDirection: 'row', ...NEOM.card, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', gap: 10 },
  googleText: { color: COLORS.text, fontWeight: '600', fontSize: 15 },
});
