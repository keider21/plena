import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store/useStore';
import { COLORS } from '../utils/theme';
import { CURRENCY_LIST } from '../utils/currency';
import { goalProgress } from '../utils/goals';

export default function ProfileScreen({ navigation }) {
  const { currentUser, logout, habits, goals, settings, setCurrency, getTodayStats, getWeeklyScore } = useStore();
  const stats = getTodayStats();
  const weekly = getWeeklyScore();
  const avgWeekly = weekly.length > 0
    ? Math.round(weekly.reduce((a, b) => a + b, 0) / weekly.length)
    : 0;
  const completedGoals = goals.filter(g => goalProgress(g) === 100).length;

  const handleLogout = () => {
    Alert.alert('Cerrar sesión', '¿Estás seguro?', [
      { text: 'Cancelar' },
      { text: 'Salir', style: 'destructive', onPress: logout },
    ]);
  };

  const MENU = [
    { icon: 'notifications-outline', label: 'Notificaciones y recordatorios', color: COLORS.purple },
    { icon: 'barbell-outline', label: 'Editar mis hábitos', color: COLORS.green, onPress: () => navigation.navigate('Habitos') },
    { icon: 'star-outline', label: 'Editar mis metas', color: COLORS.amber, onPress: () => navigation.navigate('Metas') },
    { icon: 'shield-outline', label: 'Privacidad y datos', color: COLORS.blue },
    { icon: 'help-circle-outline', label: 'Ayuda y soporte', color: COLORS.textSub },
  ];

  return (
    <ScrollView style={styles.bg} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

      <LinearGradient colors={['#1A0A3E', '#0D0D1A']} style={styles.header}>
        <View style={styles.avatarArea}>
          <LinearGradient colors={['#7C3AED', '#6D28D9']} style={styles.avatar}>
            <Text style={styles.avatarText}>{currentUser?.name?.charAt(0).toUpperCase()}</Text>
          </LinearGradient>
          <Text style={styles.userName}>{currentUser?.name}</Text>
          <Text style={styles.userEmail}>{currentUser?.email}</Text>
          <View style={styles.memberBadge}>
            <Ionicons name="star" size={12} color={COLORS.amber} />
            <Text style={styles.memberText}>Miembro desde {currentUser?.createdAt || 'hoy'}</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.statsGrid}>
        {[
          { label: 'Hábitos activos', value: habits.filter(h => h.active).length, color: COLORS.purple, icon: 'refresh' },
          { label: 'Promedio semanal', value: `${avgWeekly}%`, color: COLORS.green, icon: 'trending-up' },
          { label: 'Metas en prog.', value: goals.length, color: COLORS.amber, icon: 'star' },
          { label: 'Metas logradas', value: completedGoals, color: COLORS.pink, icon: 'trophy' },
        ].map((s, i) => (
          <View key={i} style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: s.color + '22' }]}>
              <Ionicons name={s.icon + '-outline'} size={16} color={s.color} />
            </View>
            <Text style={[styles.statVal, { color: s.color }]}>{s.value}</Text>
            <Text style={styles.statLbl}>{s.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Moneda</Text>
        <View style={styles.currencyRow}>
          {CURRENCY_LIST.map((c) => {
            const sel = settings.currency === c.code;
            return (
              <TouchableOpacity
                key={c.code}
                onPress={() => setCurrency(c.code)}
                activeOpacity={0.8}
                style={[styles.currencyBtn, sel && styles.currencyBtnOn]}
              >
                <Text style={[styles.currencySym, sel && styles.currencySymOn]}>{c.symbol}</Text>
                <Text style={[styles.currencyName, sel && styles.currencyNameOn]}>{c.name}</Text>
                {sel && <Ionicons name="checkmark-circle" size={16} color={COLORS.purpleLight} />}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Configuración</Text>
        {MENU.map((m, i) => (
          <TouchableOpacity
            key={i}
            onPress={m.onPress}
            style={styles.menuRow}
            activeOpacity={0.7}
          >
            <View style={[styles.menuIcon, { backgroundColor: m.color + '22' }]}>
              <Ionicons name={m.icon} size={18} color={m.color} />
            </View>
            <Text style={styles.menuLabel}>{m.label}</Text>
            <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.section}>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={18} color={COLORS.red} />
          <Text style={styles.logoutText}>Cerrar sesión</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.appInfo}>
        <Text style={styles.appInfoText}>Vida Plena v1.0.0</Text>
        <Text style={styles.appInfoText}>Construido con amor para tu crecimiento</Text>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: COLORS.bg },
  container: {},
  header: { padding: 20, paddingTop: 56, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, marginBottom: 8 },
  avatarArea: { alignItems: 'center', gap: 8 },
  avatar: { width: 80, height: 80, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  avatarText: { fontSize: 32, fontWeight: '800', color: '#fff' },
  userName: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  userEmail: { fontSize: 13, color: COLORS.textSub },
  memberBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: COLORS.amberDim, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, marginTop: 4 },
  memberText: { fontSize: 11, color: COLORS.amber, fontWeight: '600' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 16, paddingTop: 16 },
  statCard: { width: '47%', backgroundColor: COLORS.card, borderRadius: 14, padding: 14, borderWidth: 0.5, borderColor: COLORS.cardBorder, alignItems: 'center', gap: 6 },
  statIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  statVal: { fontSize: 20, fontWeight: '800' },
  statLbl: { fontSize: 11, color: COLORS.textMuted, textAlign: 'center' },
  section: { paddingHorizontal: 16, paddingTop: 20 },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: COLORS.text, marginBottom: 12 },
  currencyRow: { flexDirection: 'row', gap: 10 },
  currencyBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.card,
    borderRadius: 14, padding: 14, borderWidth: 0.5, borderColor: COLORS.cardBorder,
  },
  currencyBtnOn: { borderColor: COLORS.purple, backgroundColor: COLORS.purpleDim + '55' },
  currencySym: { fontSize: 18, fontWeight: '800', color: COLORS.textSub },
  currencySymOn: { color: COLORS.purpleLight },
  currencyName: { flex: 1, fontSize: 13, color: COLORS.textSub },
  currencyNameOn: { color: COLORS.text, fontWeight: '600' },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, borderBottomWidth: 0.5, borderColor: COLORS.border },
  menuIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { flex: 1, fontSize: 14, color: COLORS.text },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, backgroundColor: COLORS.redDim, borderRadius: 14, borderWidth: 0.5, borderColor: COLORS.red + '44' },
  logoutText: { fontSize: 15, color: COLORS.red, fontWeight: '600' },
  appInfo: { alignItems: 'center', paddingTop: 24, gap: 4 },
  appInfoText: { fontSize: 12, color: COLORS.textMuted },
});
