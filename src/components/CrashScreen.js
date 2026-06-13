import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Share } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../utils/theme';
import { clearLastCrash } from '../utils/crashReporter';
import { getLogs } from '../utils/logger';

export default function CrashScreen({ crash, onContinue }) {
  const copy = async () => {
    try {
      const logs = await getLogs();
      const logLines = logs.slice(0, 60).map(l => `[${l.level}] ${l.at.slice(11, 23)} ${l.msg}`).join('\n');
      const text = `=== CRASH ===\nAT: ${crash.at}\nMSG: ${crash.message}\n\nSTACK:\n${crash.stack}\n\n=== ÚLTIMOS LOGS ===\n${logLines}`;
      await Share.share({ message: text, title: 'Vida Plena – Crash Report' });
    } catch {}
  };
  const dismiss = async () => { await clearLastCrash(); onContinue(); };

  return (
    <LinearGradient colors={['#1A0A0F', '#0D0D1A']} style={styles.bg}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.iconWrap}>
          <Ionicons name="bug" size={48} color={COLORS.red} />
        </View>
        <Text style={styles.title}>La app se cerró antes</Text>
        <Text style={styles.subtitle}>
          Detectamos un error en la sesión anterior. Mandame este mensaje y lo arreglo al toque.
        </Text>

        <View style={styles.card}>
          <Text style={styles.label}>MENSAJE</Text>
          <Text style={styles.code}>{crash.message}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>STACK</Text>
          <Text style={styles.code} numberOfLines={20} ellipsizeMode="middle">{crash.stack || '(sin stack)'}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>CUÁNDO</Text>
          <Text style={styles.code}>{crash.at}</Text>
        </View>

        <TouchableOpacity onPress={copy} style={styles.copyBtn}>
          <Ionicons name="share-outline" size={18} color="#fff" />
          <Text style={styles.copyText}>Compartir crash + logs completos</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={dismiss} style={styles.continueBtn}>
          <Ionicons name="arrow-forward" size={18} color={COLORS.purpleLight} />
          <Text style={styles.continueText}>Continuar igual (puede crashear de nuevo)</Text>
        </TouchableOpacity>

        <View style={{ height: 30 }} />
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  container: { padding: 24, paddingTop: 64, paddingBottom: 40 },
  iconWrap: { alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 22, fontWeight: '800', color: COLORS.text, textAlign: 'center' },
  subtitle: { fontSize: 13, color: COLORS.textSub, textAlign: 'center', marginTop: 8, marginBottom: 20, lineHeight: 20 },
  card: { backgroundColor: COLORS.card, borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 0.5, borderColor: COLORS.cardBorder },
  label: { fontSize: 10, fontWeight: '700', color: COLORS.textMuted, letterSpacing: 1, marginBottom: 6 },
  code: { fontSize: 12, color: COLORS.text, fontFamily: 'monospace', lineHeight: 18 },
  copyBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.purple, borderRadius: 12, paddingVertical: 14, marginTop: 8 },
  copyText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  continueBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, marginTop: 4 },
  continueText: { color: COLORS.purpleLight, fontSize: 13 },
});
