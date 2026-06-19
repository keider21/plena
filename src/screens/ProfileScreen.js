import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Modal, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useStore } from '../store/useStore';
import { COLORS, NEOM } from '../utils/theme';
import { CURRENCY_LIST } from '../utils/currency';
import { goalProgress } from '../utils/goals';
import { exportTransactionsCSV } from '../utils/exportCSV';
import { APP_VERSION, CHANGELOG } from '../utils/version';
import { computePoints, levelFor, progressToNext, LEVELS } from '../utils/levels';

export default function ProfileScreen({ navigation }) {
  const store = useStore();
  const { currentUser, logout, habits, goals, settings, setCurrency, setSetting, getTodayStats, getWeeklyScore, finance, reconcileAccounts } = store;
  const [changelog, setChangelog] = useState(false);
  const points = useMemo(() => computePoints(store), [
    store.habits, store.habitLogs, store.finance?.transactions, store.planning?.dayPlans,
  ]);
  const lvl = levelFor(points.total);
  const prog = progressToNext(points.total);
  const br = points.breakdown;
  const stats = getTodayStats();
  const weekly = getWeeklyScore();
  const avgWeekly = weekly.length > 0
    ? Math.round(weekly.reduce((a, b) => a + b, 0) / weekly.length)
    : 0;
  const completedGoals = goals.filter(g => goalProgress(g) === 100).length;

  const handleExport = async () => {
    const txs = finance?.transactions || [];
    try {
      await exportTransactionsCSV(txs, settings.currency);
    } catch (e) {
      Alert.alert('Error', e.message || 'No se pudo exportar');
    }
  };

  const handleLogout = () => {
    Alert.alert('Cerrar sesión', '¿Estás seguro?', [
      { text: 'Cancelar' },
      { text: 'Salir', style: 'destructive', onPress: logout },
    ]);
  };

  const MENU_GROUPS = [
    {
      title: 'Personalización',
      items: [
        { icon: 'settings-outline', label: 'Categorías y subcategorías', color: COLORS.purple, onPress: () => navigation.navigate('Settings') },
        { icon: 'barbell-outline', label: 'Gestionar mis hábitos', color: COLORS.amber, onPress: () => navigation.navigate('Habitos') },
        { icon: 'star-outline', label: 'Gestionar mis metas', color: '#EC4899', onPress: () => navigation.navigate('Metas') },
      ]
    },
    {
      title: 'App y Seguridad',
      items: [
        { icon: 'notifications-outline', label: 'Notificaciones y permisos', color: COLORS.blue, onPress: () => navigation.navigate('Permisos') },
        { icon: 'download-outline', label: 'Exportar movimientos (CSV)', color: COLORS.green, onPress: handleExport },
        { icon: 'shield-outline', label: 'Privacidad y datos', color: COLORS.blue, onPress: () => Alert.alert('Privacidad', 'Tus datos se guardan localmente y se sincronizan de forma segura con tu cuenta de Supabase.') },
      ]
    },
    {
      title: 'Soporte y Sistema',
      items: [
        { icon: 'help-circle-outline', label: 'Ayuda y soporte', color: COLORS.textSub, onPress: () => Alert.alert('Ayuda', 'Para soporte: contacta con nosotros en el perfil de GitHub.') },
        { icon: 'terminal-outline', label: 'Logs de desarrollo', color: '#A78BFA', onPress: () => navigation.navigate('DevLogs') },
        {
          icon: 'build-outline',
          label: 'Reparar saldos bancarios',
          color: COLORS.amber,
          onPress: () => Alert.alert('Reparar', '¿Recalcular saldos basándose en tu historial de movimientos? Úsalo si los saldos de tus cuentas no cuadran.', [
            { text: 'Cancelar' },
            { text: 'Reparar ahora', onPress: async () => {
              await reconcileAccounts();
              Alert.alert('¡Listo!', 'Los saldos han sido reconciliados.');
            }}
          ])
        },
      ]
    }
  ];

  return (
    <ScrollView style={styles.bg} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

      <View style={styles.header}>
        <View style={styles.avatarArea}>
          <View style={[styles.avatar, { backgroundColor: COLORS.purple }]}>
            <Text style={styles.avatarText}>{currentUser?.name?.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.userName}>{currentUser?.name}</Text>
          <Text style={styles.userEmail}>{currentUser?.email}</Text>
          <View style={styles.memberBadge}>
            <Ionicons name="star" size={12} color={COLORS.amber} />
            <Text style={styles.memberText}>Miembro desde {currentUser?.createdAt || 'hoy'}</Text>
          </View>
        </View>
      </View>

      <View style={styles.levelCard}>
        <View style={styles.levelTop}>
          <View style={[styles.levelIconWrap, { backgroundColor: lvl.color + '22' }]}>
            <Ionicons name={lvl.icon} size={28} color={lvl.color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.levelName}>{lvl.name}</Text>
            <Text style={styles.levelPts}>{points.total} pts</Text>
          </View>
        </View>
        <View style={styles.levelBarBg}>
          <View style={[styles.levelBarFill, { width: prog.pct + '%', backgroundColor: lvl.color }]} />
        </View>
        <Text style={styles.levelHint}>
          {prog.next
            ? `Faltan ${prog.remaining} pts para ${prog.next.name}`
            : '¡Nivel máximo! 🪶'}
        </Text>
        <View style={styles.levelRow}>
          <View style={styles.levelChip}>
            <Ionicons name="flame-outline" size={14} color={COLORS.amber} />
            <Text style={styles.levelChipTxt}>Hábitos {br.habits.points >= 0 ? '+' : ''}{br.habits.points}</Text>
          </View>
          <View style={styles.levelChip}>
            <Ionicons name="wallet-outline" size={14} color={COLORS.purple} />
            <Text style={styles.levelChipTxt}>Finanzas +{br.transactions.points + br.transactions.paymentPts}</Text>
          </View>
          <View style={styles.levelChip}>
            <Ionicons name="calendar-outline" size={14} color={COLORS.green} />
            <Text style={styles.levelChipTxt}>Plan {br.plan.points >= 0 ? '+' : ''}{br.plan.points}</Text>
          </View>
        </View>
      </View>

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
        <Text style={styles.sectionTitle}>Apariencia</Text>
        <View style={styles.currencyRow}>
          {[
            { code: 'dark', label: 'Oscuro', icon: 'moon' },
            { code: 'light', label: 'Claro', icon: 'sunny' },
          ].map((t) => {
            const sel = (settings.themeMode || 'dark') === t.code;
            return (
              <TouchableOpacity
                key={t.code}
                onPress={() => setSetting('themeMode', t.code)}
                style={[styles.currencyPill, sel && styles.currencyPillOn]}
              >
                <Ionicons name={t.icon + '-outline'} size={16} color={sel ? COLORS.purpleLight : COLORS.textSub} />
                <Text style={[styles.currencyTxt, sel && styles.currencyTxtOn]}>{t.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={styles.versionNote}>Próximamente más opciones de tema</Text>
      </View>

      {MENU_GROUPS.map((group, gIdx) => (
        <View key={gIdx} style={styles.section}>
          <Text style={styles.sectionTitle}>{group.title}</Text>
          <View style={styles.groupCard}>
            {group.items.map((m, i) => (
              <TouchableOpacity
                key={i}
                onPress={m.onPress}
                style={[styles.menuRow, i === group.items.length - 1 && { borderBottomWidth: 0 }]}
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
        </View>
      ))}

      <View style={styles.section}>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={18} color={COLORS.red} />
          <Text style={styles.logoutText}>Cerrar sesión</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Versión de la aplicación</Text>
        <TouchableOpacity style={styles.versionRow} onPress={() => setChangelog(true)} activeOpacity={0.8}>
          <View style={styles.versionBadge}><Text style={styles.versionBadgeText}>v{APP_VERSION}</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.menuLabel}>Versión {APP_VERSION}</Text>
            <Text style={styles.versionSub}>Toca para ver las novedades</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
        </TouchableOpacity>
      </View>

      <View style={styles.appInfo}>
        <Text style={styles.appInfoText}>Vida Plena v{APP_VERSION}</Text>
        <Text style={styles.appInfoText}>Construido con amor para tu crecimiento</Text>
      </View>

      <View style={{ height: 40 }} />

      <Modal visible={changelog} transparent animationType="slide" onRequestClose={() => setChangelog(false)}>
        <View style={styles.clBackdrop}>
          <View style={styles.clSheet}>
            <View style={styles.clHead}>
              <Text style={styles.clTitle}>Novedades</Text>
              <TouchableOpacity onPress={() => setChangelog(false)}><Ionicons name="close" size={24} color={COLORS.textSub} /></TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 440 }} showsVerticalScrollIndicator={false}>
              {CHANGELOG.map((c) => (
                <View key={c.v} style={styles.clVersion}>
                  <Text style={styles.clVer}>Versión {c.v} <Text style={styles.clDate}>· {c.fecha}</Text></Text>
                  {c.cambios.map((ch, i) => (
                    <View key={i} style={styles.clItem}><Text style={styles.clBullet}>•</Text><Text style={styles.clText}>{ch}</Text></View>
                  ))}
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: COLORS.bg },
  container: {},
  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    padding: 20, paddingTop: 56, paddingBottom: 24,
    backgroundColor: COLORS.bg,
    borderBottomWidth: 1, borderBottomColor: COLORS.border, marginBottom: 4,
  },
  avatarArea: { alignItems: 'center', gap: 8 },
  avatar: { width: 80, height: 80, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.purple, marginBottom: 4, ...NEOM.float, shadowColor: COLORS.purple },
  avatarText: { fontSize: 32, fontWeight: '800', color: COLORS.white },
  userName: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  userEmail: { fontSize: 13, color: COLORS.textSub },
  memberBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: COLORS.amberDim, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, marginTop: 4 },
  memberText: { fontSize: 11, color: COLORS.amber, fontWeight: '600' },

  // ── Tarjeta de nivel ─────────────────────────────────────────────────────────
  levelCard: { marginHorizontal: 16, marginTop: 16, padding: 18, gap: 12, ...NEOM.float },
  levelTop: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  levelIconWrap: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  levelName: { fontSize: 22, fontWeight: '800', color: COLORS.text },
  levelPts: { fontSize: 14, color: COLORS.textSub, marginTop: 2 },
  levelBarBg: { height: 8, backgroundColor: COLORS.bg3, borderRadius: 4, overflow: 'hidden' },
  levelBarFill: { height: 8, borderRadius: 4 },
  levelHint: { fontSize: 12, color: COLORS.textMuted },
  levelRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  levelChip: { flexDirection: 'row', alignItems: 'center', gap: 4, ...NEOM.chip, paddingHorizontal: 10, paddingVertical: 5 },
  levelChipTxt: { fontSize: 11, color: COLORS.textSub, fontWeight: '600' },

  // ── Grid de estadísticas ─────────────────────────────────────────────────────
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 16, paddingTop: 16 },
  statCard: { width: '47%', ...NEOM.card, padding: 14, alignItems: 'center', gap: 6 },
  statIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  statVal: { fontSize: 20, fontWeight: '800' },
  statLbl: { fontSize: 11, color: COLORS.textMuted, textAlign: 'center' },

  // ── Secciones ────────────────────────────────────────────────────────────────
  section: { paddingHorizontal: 16, paddingTop: 20 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 12 },
  versionNote: { fontSize: 12, color: COLORS.textMuted, marginTop: 6 },

  // ── Moneda y apariencia ──────────────────────────────────────────────────────
  currencyRow: { flexDirection: 'row', gap: 10 },
  currencyBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, ...NEOM.card, padding: 14 },
  currencyBtnOn: { backgroundColor: COLORS.purpleDim },
  currencySym: { fontSize: 18, fontWeight: '800', color: COLORS.textSub },
  currencySymOn: { color: COLORS.purple },
  currencyName: { flex: 1, fontSize: 13, color: COLORS.textSub },
  currencyNameOn: { color: COLORS.text, fontWeight: '600' },
  currencyPill: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 12, ...NEOM.chip },
  currencyPillOn: { backgroundColor: COLORS.purpleDim },
  currencyTxt: { fontSize: 13, color: COLORS.textSub },
  currencyTxtOn: { color: COLORS.purple, fontWeight: '700' },

  // ── Menú de configuración ─────────────────────────────────────────────────────
  groupCard: { ...NEOM.card, paddingHorizontal: 14, paddingVertical: 4 },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, borderBottomWidth: 1, borderColor: COLORS.border + '44' },
  menuIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { flex: 1, fontSize: 14, color: COLORS.text, fontWeight: '500' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, backgroundColor: COLORS.redDim, borderRadius: 14 },
  logoutText: { fontSize: 15, color: COLORS.red, fontWeight: '600' },

  // ── Versión y changelog ───────────────────────────────────────────────────────
  versionRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12 },
  versionBadge: { backgroundColor: COLORS.purpleDim, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  versionBadgeText: { color: COLORS.purple, fontSize: 14, fontWeight: '800' },
  versionSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 1 },
  appInfo: { alignItems: 'center', paddingTop: 24, gap: 4 },
  appInfoText: { fontSize: 12, color: COLORS.textMuted },
  clBackdrop: { flex: 1, backgroundColor: '#00000077', justifyContent: 'flex-end' },
  clSheet: { backgroundColor: COLORS.bg2, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 20, paddingBottom: 32 },
  clHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  clTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  clVersion: { marginBottom: 18 },
  clVer: { fontSize: 15, fontWeight: '700', color: COLORS.purple, marginBottom: 8 },
  clDate: { fontSize: 12, color: COLORS.textMuted, fontWeight: '400' },
  clItem: { flexDirection: 'row', gap: 8, paddingVertical: 3 },
  clBullet: { color: COLORS.green, fontSize: 14 },
  clText: { flex: 1, fontSize: 13, color: COLORS.text, lineHeight: 19 },
});
