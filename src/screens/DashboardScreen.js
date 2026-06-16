import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useStore } from '../store/useStore';
import { categoryColor } from '../utils/finance';
import { COLORS, NEOM, CAT_COLORS } from '../utils/theme';
import { formatMoney } from '../utils/currency';
import { goalProgress, catOf } from '../utils/goals';
import { registerForPushNotifications, reschedulePlan } from '../utils/notifications';
import { useStore as useStoreStatic } from '../store/useStore';

const QUOTES = [
  '"Piensa como, habla como, actúa como, viste como."',
  '"La disciplina es elegir entre lo que quieres ahora y lo que quieres más."',
  '"El éxito no es un accidente. Es trabajo duro, perseverancia y aprendizaje."',
  '"Cada día que trabajas en tus hábitos te acercas más a tu mejor versión."',
  '"Tu familia es tu mayor motivación y tu mayor legado."',
];

export default function DashboardScreen({ navigation }) {
  const { currentUser, habits, habitLogs, goals, settings, getTodayStats, getWeeklyScore, getMonthlyStats, finance: storeFinance, getHabitStreak, logHabit } = useStore();
  const cur = settings.currency;
  const stats = getTodayStats();
  const weekly = getWeeklyScore();
  const finance = getMonthlyStats();
  const today = format(new Date(), 'yyyy-MM-dd');
  const quote = QUOTES[new Date().getDay() % QUOTES.length];
  const dayName = format(new Date(), "EEEE d 'de' MMMM", { locale: es });
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches';

  useEffect(() => {
    registerForPushNotifications();

    // Auto-reprogramar alarmas al abrir la app (cubre reinstalación, reinicio del
    // teléfono y cambios manuales hechos mientras la app estaba cerrada).
    const tryReschedule = () => {
      const { planning, habits } = useStoreStatic.getState();
      if (!planning?.schedule || !planning?.activities?.length) return false;
      reschedulePlan(planning, habits).catch(() => {});
      return true;
    };
    // Intento inmediato; si los datos aún no cargaron, reintenta en 2 s
    if (!tryReschedule()) {
      const t = setTimeout(tryReschedule, 2000);
      return () => clearTimeout(t);
    }
  }, []);

  const activeHabits = habits.filter(h => h.active).slice(0, 4);
  const topGoals = goals.slice(0, 3);
  const weekDays = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
  const overallPct = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;

  const avgWeekly = weekly.length > 0 ? Math.round(weekly.reduce((a, b) => a + b, 0) / weekly.length) : 0;
  const maxWeekBar = 80;

  const [quickMenu, setQuickMenu] = useState(false);
  const [search, setSearch] = useState('');
  const allTxs = (storeFinance && Array.isArray(storeFinance.transactions)) ? storeFinance.transactions : [];
  const recentTxs = allTxs.filter((t) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (t.note || '').toLowerCase().includes(q) || (t.category || '').toLowerCase().includes(q) || (t.type || '').toLowerCase().includes(q);
  }).slice(0, 8);
  const QUICK = [
    { q: 'gasto', label: 'Agregar gasto', icon: 'arrow-up-circle-outline', color: COLORS.red },
    { q: 'ingreso', label: 'Agregar ingreso', icon: 'arrow-down-circle-outline', color: COLORS.green },
    { q: 'transferencia', label: 'Transferencia', icon: 'swap-horizontal-outline', color: COLORS.blue },
    { q: 'pago', label: 'Pago de tarjeta', icon: 'card-outline', color: COLORS.purpleLight },
    { q: 'movement', label: 'Movimiento financiero', icon: 'cash-outline', color: COLORS.amber },
  ];
  const goFinance = (q) => { setQuickMenu(false); navigation.navigate('Finanzas', { quickAdd: q }); };

  const realBalance = (storeFinance?.accounts || []).filter(a => !a.linkedTo).reduce((s, a) => s + (a.balance || 0), 0);

  return (
    <View style={{ flex: 1 }}>
    <ScrollView style={styles.bg} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

      <View style={styles.hero}>
        <View style={styles.heroTop}>
          <View>
            <Text style={styles.heroGreeting}>{greeting},</Text>
            <Text style={styles.heroName}>{currentUser?.name?.split(' ')[0]} 👊</Text>
            <Text style={styles.heroDate}>{dayName}</Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('Profile')} style={styles.avatarBtn}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{currentUser?.name?.charAt(0).toUpperCase()}</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.quoteBox}>
          <Ionicons name="flash" size={14} color={COLORS.purple} style={{ marginRight: 6 }} />
          <Text style={styles.quoteText}>{quote}</Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statBubble}>
            <Text style={[styles.statNum, { color: COLORS.green }]}>{stats.done}</Text>
            <Text style={styles.statLbl}>Hechos</Text>
          </View>
          <View style={styles.statDivider} />
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
            <Text style={[styles.statNum, { color: COLORS.purple }]}>{overallPct}%</Text>
            <Text style={styles.statLbl}>Hoy</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity activeOpacity={0.9} onPress={() => navigation.navigate('Finanzas')} style={styles.balanceCard}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={styles.balanceLbl}>Saldo de cuentas</Text>
          <View style={[styles.balanceTrend, { backgroundColor: (realBalance >= 0 ? COLORS.greenDim : COLORS.redDim) }]}>
            <Ionicons name={realBalance >= 0 ? 'trending-up' : 'trending-down'} size={16} color={realBalance >= 0 ? COLORS.green : COLORS.red} />
          </View>
        </View>
        <Text style={[styles.balanceVal, { color: realBalance >= 0 ? COLORS.green : COLORS.red }]}
          numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.4}>
          {realBalance >= 0 ? '+' : ''}{formatMoney(realBalance, cur)}
        </Text>
        <View style={{ flexDirection: 'row', gap: 16, marginTop: 10 }}>
          <View style={styles.balanceSubChip}>
            <Text style={[styles.balanceSubAmt, { color: COLORS.green }]}>↑ {formatMoney(finance.ingresos, cur)}</Text>
            <Text style={styles.balanceSubLbl}>ingresos mes</Text>
          </View>
          <View style={styles.balanceSubChip}>
            <Text style={[styles.balanceSubAmt, { color: COLORS.red }]}>↓ {formatMoney(finance.gastos, cur)}</Text>
            <Text style={styles.balanceSubLbl}>gastos mes</Text>
          </View>
        </View>
      </TouchableOpacity>

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
          const streak = (typeof getHabitStreak === 'function') ? getHabitStreak(h.id) : 0;
          const toggleHabit = async () => {
            try { Haptics.selectionAsync(); } catch {}
            const next = status === 'done' ? null : 'done';
            try { await logHabit(h.id, next); } catch {}
            try { Haptics.impactAsync(next ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light); } catch {}
          };
          return (
            <TouchableOpacity key={h.id} onPress={toggleHabit} onLongPress={() => navigation.navigate('Habitos')} style={styles.habitRow}>
              <View style={[styles.habitIcon, { backgroundColor: h.color + '22' }]}>
                <Ionicons name={h.icon + '-outline'} size={18} color={h.color} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.habitName} numberOfLines={1}>{h.name}</Text>
                  {streak >= 2 && <View style={styles.streakChip}><Ionicons name="flame" size={11} color="#F59E0B" /><Text style={styles.streakText}>{streak}</Text></View>}
                </View>
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
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Últimos movimientos</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Finanzas')}>
            <Text style={styles.sectionLink}>Ver todos</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={16} color={COLORS.textMuted} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Buscar movimiento o categoría…"
            placeholderTextColor={COLORS.textMuted}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
        </View>
        {recentTxs.length === 0 ? (
          <Text style={styles.emptyHint}>
            {search ? `Sin movimientos con “${search}”.` : 'Aún no registras movimientos.'}
          </Text>
        ) : (
          <View style={styles.txList}>
            {recentTxs.map((t) => {
              const sign = t.type === 'ingreso' ? '+' : t.type === 'gasto' || t.type === 'pago' ? '-' : '↔';
              const col = t.type === 'ingreso' ? COLORS.green : t.type === 'gasto' || t.type === 'pago' ? COLORS.red : COLORS.blue;
              const ic = t.type === 'ingreso' ? 'arrow-down-circle-outline' : t.type === 'gasto' ? 'arrow-up-circle-outline' : t.type === 'pago' ? 'card-outline' : 'swap-horizontal-outline';
              return (
                <View key={t.id} style={styles.txRow}>
                  <Ionicons name={ic} size={18} color={col} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.txTitle} numberOfLines={1}>{t.note || t.category || t.type}</Text>
                    <Text style={styles.txSub}>{t.category || t.type} · {t.date}</Text>
                  </View>
                  <Text style={[styles.txAmt, { color: col }]}>{sign}{formatMoney(t.amount, cur)}</Text>
                </View>
              );
            })}
          </View>
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>En qué se fue tu plata</Text>
          <Text style={styles.sectionLink}>{finance.gastos > 0 ? formatMoney(finance.gastos, cur) : ''}</Text>
        </View>
        {(() => {
          const txs = (storeFinance && Array.isArray(storeFinance.transactions)) ? storeFinance.transactions : [];
          const month = format(new Date(), 'yyyy-MM');
          const gastosMes = txs.filter((t) => (t.date || '').startsWith(month) && t.type === 'gasto');
          const totalGastos = gastosMes.reduce((a, t) => a + (t.amount || 0), 0);
          const byCat = {};
          for (const t of gastosMes) {
            const k = t.category || 'Otros';
            byCat[k] = (byCat[k] || 0) + (t.amount || 0);
          }
          const top = Object.entries(byCat).sort((a, b) => b[1] - a[1]).slice(0, 5);
          if (top.length === 0) {
            return <Text style={styles.emptyHint}>Aún no registras gastos este mes.</Text>;
          }
          return (
            <View style={styles.catReportCard}>
              {top.map(([cat, amt], i) => {
                const pct = totalGastos > 0 ? Math.round((amt / totalGastos) * 100) : 0;
                const col = categoryColor ? categoryColor(cat) : COLORS.purpleLight;
                return (
                  <View key={cat} style={styles.catRow}>
                    <View style={styles.catHead}>
                      <View style={[styles.catDot, { backgroundColor: col }]} />
                      <Text style={styles.catName} numberOfLines={1}>{cat}</Text>
                      <Text style={[styles.catPct, { color: col }]}>{pct}%</Text>
                      <Text style={styles.catAmt}>{formatMoney(amt, cur)}</Text>
                    </View>
                    <View style={styles.catBarBg}>
                      <View style={[styles.catBarFill, { width: pct + '%', backgroundColor: col }]} />
                    </View>
                  </View>
                );
              })}
            </View>
          );
        })()}
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

  // ── Hero header (neumorphismo claro) ──────────────────────────────────────
  hero: {
    padding: 24, paddingTop: 52,
    backgroundColor: COLORS.bg,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
    marginBottom: 4,
  },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  heroGreeting: { fontSize: 13, color: COLORS.textSub, fontWeight: '500' },
  heroName: { fontSize: 26, fontWeight: '800', color: COLORS.text, marginVertical: 2 },
  heroDate: { fontSize: 12, color: COLORS.textMuted },
  avatarBtn: {},
  avatar: {
    width: 46, height: 46, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    ...NEOM.chip,
    backgroundColor: COLORS.purple,
  },
  avatarText: { fontSize: 19, fontWeight: '700', color: '#fff' },
  quoteBox: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: COLORS.purpleDim,
    borderRadius: 12, padding: 10, marginBottom: 20,
  },
  quoteText: { flex: 1, fontSize: 12, color: COLORS.purple, lineHeight: 18, fontStyle: 'italic' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  statBubble: { alignItems: 'center', paddingVertical: 4 },
  statNum: { fontSize: 24, fontWeight: '800' },
  statLbl: { fontSize: 11, color: COLORS.textSub, marginTop: 3, fontWeight: '600' },
  statDivider: { width: 1, height: 36, backgroundColor: COLORS.border },

  // ── Tarjeta de balance (float neumorfismo) ─────────────────────────────────
  balanceCard: {
    margin: 14, marginBottom: 0, padding: 20,
    ...NEOM.float,
    borderWidth: 1, borderColor: COLORS.border,
  },
  balanceLbl: { fontSize: 11, color: COLORS.textSub, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },
  balanceTrend: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  balanceVal: { fontSize: 36, fontWeight: '800', marginTop: 6, letterSpacing: -1 },
  balanceSubChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, backgroundColor: COLORS.bg3 },
  balanceSubAmt: { fontSize: 13, fontWeight: '700' },
  balanceSubLbl: { fontSize: 11, color: COLORS.textSub, fontWeight: '600' },

  // ── Secciones ───────────────────────────────────────────────────────────────
  section: { paddingHorizontal: 16, paddingTop: 20 },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text },
  sectionLink: { fontSize: 13, color: COLORS.purple, fontWeight: '700' },

  // ── Hábitos ─────────────────────────────────────────────────────────────────
  habitRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 11, paddingHorizontal: 14,
    marginBottom: 8, ...NEOM.card,
  },
  habitIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  habitName: { fontSize: 14, color: COLORS.text, fontWeight: '500' },
  habitCat: { fontSize: 11, marginTop: 1 },
  statusDot: { width: 12, height: 12, borderRadius: 6 },
  streakChip: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    backgroundColor: COLORS.amberDim, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8,
  },
  streakText: { fontSize: 10, fontWeight: '800', color: COLORS.amber },

  // ── Gráfica semanal ──────────────────────────────────────────────────────────
  weekChart: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
    padding: 14, ...NEOM.card,
  },
  weekCol: { alignItems: 'center', flex: 1 },
  weekBarWrap: { height: 80, justifyContent: 'flex-end', marginBottom: 6 },
  weekBar: { width: 22, borderRadius: 6 },
  weekDay: { fontSize: 11, color: COLORS.textSub, marginBottom: 2 },
  weekPct: { fontSize: 10, fontWeight: '600' },

  // ── Metas ────────────────────────────────────────────────────────────────────
  goalRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, borderBottomWidth: 1, borderColor: COLORS.border },
  goalIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  goalName: { fontSize: 13, color: COLORS.text, fontWeight: '500' },
  goalPct: { fontSize: 13, fontWeight: '700' },
  goalBarBg: { height: 5, backgroundColor: COLORS.bg3, borderRadius: 4, overflow: 'hidden' },
  goalBarFill: { height: 5, borderRadius: 4 },

  // ── Buscador ─────────────────────────────────────────────────────────────────
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    ...NEOM.pressed, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10,
  },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.text, paddingVertical: 0 },
  emptyHint: { fontSize: 13, color: COLORS.textMuted, fontStyle: 'italic', paddingVertical: 12, textAlign: 'center' },

  // ── Movimientos recientes ────────────────────────────────────────────────────
  txList: { gap: 6 },
  txRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 11, paddingHorizontal: 14,
    ...NEOM.card,
  },
  txTitle: { fontSize: 14, color: COLORS.text, fontWeight: '600' },
  txSub: { fontSize: 11, color: COLORS.textSub, marginTop: 1 },
  txAmt: { fontSize: 15, fontWeight: '800' },

  // ── Reporte de categorías ─────────────────────────────────────────────────────
  catReportCard: { ...NEOM.card, padding: 16, gap: 12 },
  catRow: { gap: 5 },
  catHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  catDot: { width: 8, height: 8, borderRadius: 4 },
  catName: { flex: 1, fontSize: 13, color: COLORS.text, fontWeight: '500' },
  catPct: { fontSize: 12, fontWeight: '700' },
  catAmt: { fontSize: 12, color: COLORS.textMuted, minWidth: 70, textAlign: 'right' },
  catBarBg: { height: 6, backgroundColor: COLORS.bg3, borderRadius: 4, overflow: 'hidden' },
  catBarFill: { height: 6, borderRadius: 4 },

  // ── FAB y quick-menu ─────────────────────────────────────────────────────────
  fab: {
    position: 'absolute', right: 20, bottom: 22, width: 56, height: 56, borderRadius: 28,
    backgroundColor: COLORS.purple, alignItems: 'center', justifyContent: 'center',
    shadowColor: COLORS.purple, shadowOpacity: 0.45, shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 }, elevation: 10,
  },
  qBackdrop: { flex: 1, backgroundColor: '#00000077', justifyContent: 'flex-end' },
  qSheet: {
    backgroundColor: COLORS.bg2, borderTopLeftRadius: 26, borderTopRightRadius: 26,
    padding: 16, paddingBottom: 34,
    shadowColor: '#AEAAC8', shadowOpacity: 0.3, shadowRadius: 20,
    shadowOffset: { width: 0, height: -6 }, elevation: 12,
  },
  qTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, padding: 12 },
  qItem: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 13, paddingHorizontal: 12 },
  qIcon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  qLabel: { flex: 1, fontSize: 15, color: COLORS.text, fontWeight: '500' },

  // ── Legacy (no se usan, mantenemos compatibilidad) ────────────────────────────
  finGrid: { flexDirection: 'row', gap: 8 },
  finCard: { flex: 1, ...NEOM.card, padding: 12, borderLeftWidth: 3 },
  finLabel: { fontSize: 11, color: COLORS.textSub, marginBottom: 4 },
  finVal: { fontSize: 16, fontWeight: '700' },
});
