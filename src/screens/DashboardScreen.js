import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useStore } from '../store/useStore';
import { COLORS, CAT_COLORS } from '../utils/theme';
import { formatMoney } from '../utils/currency';
import { goalProgress, catOf } from '../utils/goals';
import { registerForPushNotifications } from '../utils/notifications';

const QUOTES = [
  '"Piensa como, habla como, actúa como, viste como."',
  '"La disciplina es elegir entre lo que quieres ahora y lo que quieres más."',
  '"El éxito no es un accidente. Es trabajo duro, perseverancia y aprendizaje."',
  '"Cada día que trabajas en tus hábitos te acercas más a tu mejor versión."',
  '"Tu familia es tu mayor motivación y tu mayor legado."',
];

export default function DashboardScreen({ navigation }) {
  const { currentUser, habits, habitLogs, goals, settings, getTodayStats, getWeeklyScore, getMonthlyStats } = useStore();
  const cur = settings.currency;
  const stats = getTodayStats();
  const weekly = getWeeklyScore();
  const finance = getMonthlyStats();
  const today = format(new Date(), 'yyyy-MM-dd');
  const quote = QUOTES[new Date().getDay() % QUOTES.length];
  const dayName = format(new Date(), "EEEE d 'de' MMMM", { locale: es });

  useEffect(() => { registerForPushNotifications(); }, []);

  const activeHabits = habits.filter(h => h.active).slice(0, 4);
  const topGoals = goals.slice(0, 3);
  const weekDays = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
  const overallPct = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;

  const avgWeekly = weekly.length > 0 ? Math.round(weekly.reduce((a, b) => a + b, 0) / weekly.length) : 0;
  const maxWeekBar = 80;

  const [quickMenu, setQuickMenu] = useState(false);
  const QUICK = [
    { q: 'gasto', label: 'Agregar gasto', icon: 'arrow-up-circle-outline', color: COLORS.red },
    { q: 'ingreso', label: 'Agregar ingreso', icon: 'arrow-down-circle-outline', color: COLORS.green },
    { q: 'transferencia', label: 'Transferencia', icon: 'swap-horizontal-outline', color: COLORS.blue },
    { q: 'pago', label: 'Pago de tarjeta', icon: 'card-outline', color: COLORS.purpleLight },
    { q: 'movement', label: 'Movimiento financiero', icon: 'cash-outline', color: COLORS.amber },
  ];
  const goFinance = (q) => { setQuickMenu(false); navigation.navigate('Finanzas', { quickAdd: q }); };

  return (
    <View style={{ flex: 1 }}>
    <ScrollView style={styles.bg} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

      <LinearGradient colors={['#1A0A3E', '#0D0D1A']} style={styles.hero}>
        <View style={styles.heroTop}>
          <View>
            <Text style={styles.heroGreeting}>Buenos días,</Text>
            <Text style={styles.heroName}>{currentUser?.name?.split(' ')[0]} 👊</Text>
            <Text style={styles.heroDate}>{dayName}</Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('Profile')} style={styles.avatarBtn}>
            <LinearGradient colors={['#7C3AED', '#6D28D9']} style={styles.avatar}>
              <Text style={styles.avatarText}>{currentUser?.name?.charAt(0).toUpperCase()}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <View style={styles.quoteBox}>
          <Ionicons name="flash" size={14} color={COLORS.purpleLight} style={{ marginRight: 6 }} />
          <Text style={styles.quoteText}>{quote}</Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statBubble}>
            <Text style={[styles.statNum, { color: COLORS.green }]}>{stats.done}</Text>
            <Text style={styles.statLbl}>Hechos</Text>
          </View>
          <View style={[styles.statDivider]} />
          <View style={styles.statBubble}>
            <Text style={[styles.statNum, { color: COLORS.red }]}>{stats.missed}</Text>
            <Text style={styles.statLbl}>Perdidos</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBubble}>
            <Text style={[styles.statNum, { color: COLORS.amber }]}>{stats.pending}</Text>
            <Text style={styles.statLbl}>Pendientes</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBubble}>
            <Text style={[styles.statNum, { color: COLORS.purpleLight }]}>{overallPct}%</Text>
            <Text style={styles.statLbl}>Hoy</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.section}>
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Hábitos de hoy</Text>
          <View style={{ flexDirection: 'row', gap: 14 }}>
            <TouchableOpacity onPress={() => navigation.navigate('HabitsOnboarding')}>
              <Text style={[styles.sectionLink, { color: COLORS.green }]}>+ Wizard</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('Habitos')}>
              <Text style={styles.sectionLink}>Ver todos</Text>
            </TouchableOpacity>
          </View>
        </View>
        {activeHabits.map(h => {
          const status = habitLogs[h.id]?.[today];
          return (
            <TouchableOpacity key={h.id} onPress={() => navigation.navigate('Habitos')} style={styles.habitRow}>
              <View style={[styles.habitIcon, { backgroundColor: h.color + '22' }]}>
                <Ionicons name={h.icon + '-outline'} size={18} color={h.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.habitName}>{h.name}</Text>
                <Text style={[styles.habitCat, { color: CAT_COLORS[h.category] }]}>{h.category}</Text>
              </View>
              <View style={[styles.statusDot,
                status === 'done' && { backgroundColor: COLORS.green },
                status === 'missed' && { backgroundColor: COLORS.red },
                !status && { backgroundColor: COLORS.textMuted + '44', borderWidth: 1, borderColor: COLORS.textMuted }
              ]} />
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Semana actual</Text>
          <Text style={styles.sectionLink}>{avgWeekly}% promedio</Text>
        </View>
        <View style={styles.weekChart}>
          {weekly.map((pct, i) => (
            <View key={i} style={styles.weekCol}>
              <View style={styles.weekBarWrap}>
                <View style={[styles.weekBar, {
                  height: Math.max(4, (pct / 100) * maxWeekBar),
                  backgroundColor: pct >= 80 ? COLORS.green : pct >= 50 ? COLORS.amber : pct > 0 ? COLORS.red : COLORS.bg3,
                }]} />
              </View>
              <Text style={styles.weekDay}>{weekDays[i]}</Text>
              <Text style={[styles.weekPct, { color: pct >= 80 ? COLORS.green : pct >= 50 ? COLORS.amber : COLORS.textMuted }]}>
                {pct}%
              </Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Metas en progreso</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Metas')}>
            <Text style={styles.sectionLink}>Ver todas</Text>
          </TouchableOpacity>
        </View>
        {topGoals.map(g => {
          const cat = catOf(g.category);
          const pct = goalProgress(g);
          return (
            <View key={g.id} style={styles.goalRow}>
              <View style={[styles.goalIcon, { backgroundColor: cat.color + '22' }]}>
                <Ionicons name={cat.icon} size={16} color={cat.color} />
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={styles.goalName}>{g.title}</Text>
                  <Text style={[styles.goalPct, { color: cat.color }]}>{pct === null ? '—' : pct + '%'}</Text>
                </View>
                <View style={styles.goalBarBg}>
                  <View style={[styles.goalBarFill, { width: `${pct || 0}%`, backgroundColor: cat.color }]} />
                </View>
              </View>
            </View>
          );
        })}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Finanzas del mes</Text>
        <View style={styles.finGrid}>
          <View style={[styles.finCard, { borderLeftColor: COLORS.green }]}>
            <Text style={styles.finLabel}>Ingresos</Text>
            <Text style={[styles.finVal, { color: COLORS.green }]}>{formatMoney(finance.ingresos, cur)}</Text>
          </View>
          <View style={[styles.finCard, { borderLeftColor: COLORS.red }]}>
            <Text style={styles.finLabel}>Gastos</Text>
            <Text style={[styles.finVal, { color: COLORS.red }]}>{formatMoney(finance.gastos, cur)}</Text>
          </View>
          <View style={[styles.finCard, { borderLeftColor: COLORS.purpleLight }]}>
            <Text style={styles.finLabel}>Balance</Text>
            <Text style={[styles.finVal, { color: finance.balance >= 0 ? COLORS.green : COLORS.red }]}>
              {finance.balance >= 0 ? '+' : ''}{formatMoney(finance.balance, cur)}
            </Text>
          </View>
        </View>
      </View>

      <View style={{ height: 90 }} />
    </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={() => setQuickMenu(true)} activeOpacity={0.85}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <Modal visible={quickMenu} transparent animationType="fade" onRequestClose={() => setQuickMenu(false)}>
        <TouchableOpacity style={styles.qBackdrop} activeOpacity={1} onPress={() => setQuickMenu(false)}>
          <View style={styles.qSheet}>
            <Text style={styles.qTitle}>Registrar movimiento</Text>
            {QUICK.map((o) => (
              <TouchableOpacity key={o.q} style={styles.qItem} onPress={() => goFinance(o.q)}>
                <View style={[styles.qIcon, { backgroundColor: o.color + '22' }]}><Ionicons name={o.icon} size={20} color={o.color} /></View>
                <Text style={styles.qLabel}>{o.label}</Text>
                <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: COLORS.bg },
  container: { paddingBottom: 20 },
  hero: { padding: 24, paddingTop: 56, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, marginBottom: 8 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  heroGreeting: { fontSize: 14, color: COLORS.textSub },
  heroName: { fontSize: 26, fontWeight: '800', color: COLORS.text, marginVertical: 2 },
  heroDate: { fontSize: 12, color: COLORS.textMuted },
  avatarBtn: {},
  avatar: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontWeight: '700', color: '#fff' },
  quoteBox: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: COLORS.purpleDim + '88', borderRadius: 10, padding: 10, marginBottom: 20 },
  quoteText: { flex: 1, fontSize: 12, color: COLORS.purpleLight, lineHeight: 18, fontStyle: 'italic' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  statBubble: { alignItems: 'center' },
  statNum: { fontSize: 22, fontWeight: '800' },
  statLbl: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  statDivider: { width: 0.5, height: 36, backgroundColor: COLORS.border },
  section: { paddingHorizontal: 16, paddingTop: 20 },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  sectionLink: { fontSize: 13, color: COLORS.purpleLight },
  habitRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 0.5, borderColor: COLORS.border },
  habitIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  habitName: { fontSize: 14, color: COLORS.text, fontWeight: '500' },
  habitCat: { fontSize: 11, marginTop: 1 },
  statusDot: { width: 12, height: 12, borderRadius: 6 },
  weekChart: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', padding: 12, backgroundColor: COLORS.card, borderRadius: 16, borderWidth: 0.5, borderColor: COLORS.cardBorder },
  weekCol: { alignItems: 'center', flex: 1 },
  weekBarWrap: { height: 80, justifyContent: 'flex-end', marginBottom: 6 },
  weekBar: { width: 22, borderRadius: 6 },
  weekDay: { fontSize: 11, color: COLORS.textSub, marginBottom: 2 },
  weekPct: { fontSize: 10, fontWeight: '600' },
  goalRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, borderBottomWidth: 0.5, borderColor: COLORS.border },
  goalIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  goalName: { fontSize: 13, color: COLORS.text, fontWeight: '500' },
  goalPct: { fontSize: 13, fontWeight: '700' },
  goalBarBg: { height: 4, backgroundColor: COLORS.bg3, borderRadius: 4, overflow: 'hidden' },
  goalBarFill: { height: 4, borderRadius: 4 },
  finGrid: { flexDirection: 'row', gap: 8 },
  finCard: { flex: 1, backgroundColor: COLORS.card, borderRadius: 12, padding: 12, borderWidth: 0.5, borderColor: COLORS.cardBorder, borderLeftWidth: 3 },
  finLabel: { fontSize: 11, color: COLORS.textSub, marginBottom: 4 },
  finVal: { fontSize: 16, fontWeight: '700' },
  fab: {
    position: 'absolute', right: 20, bottom: 22, width: 56, height: 56, borderRadius: 28,
    backgroundColor: COLORS.purple, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#7C3AED', shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 8,
  },
  qBackdrop: { flex: 1, backgroundColor: '#000000AA', justifyContent: 'flex-end' },
  qSheet: { backgroundColor: COLORS.bg2, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 16, paddingBottom: 32 },
  qTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, padding: 12 },
  qItem: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 13, paddingHorizontal: 12 },
  qIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  qLabel: { flex: 1, fontSize: 15, color: COLORS.text, fontWeight: '500' },
});
