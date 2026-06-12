import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useStore } from '../store/useStore';
import { categoryColor } from '../utils/finance';
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

  useEffect(() => { registerForPushNotifications(); }, []);

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

  return (
    <View style={{ flex: 1 }}>
    <ScrollView style={styles.bg} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

      <TouchableOpacity activeOpacity={0.85} onPress={() => navigation.navigate('Finanzas')} style={{ margin: 12, marginBottom: 0, borderRadius: 18, overflow: 'hidden' }}>
        <LinearGradient colors={finance.balance >= 0 ? ['#065F46', '#022C22'] : ['#7F1D1D', '#450A0A']} style={styles.balanceCard}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={styles.balanceLbl}>Balance del mes</Text>
            <Ionicons name={finance.balance >= 0 ? 'trending-up' : 'trending-down'} size={20} color="#fff" />
          </View>
          <Text style={[styles.balanceVal, { color: finance.balance >= 0 ? '#6EE7B7' : '#FCA5A5' }]}>
            {finance.balance >= 0 ? '+' : ''}{formatMoney(finance.balance, cur)}
          </Text>
          <View style={{ flexDirection: 'row', gap: 16, marginTop: 8 }}>
            <Text style={styles.balanceSub}><Text style={{ color: '#6EE7B7' }}>↑ {formatMoney(finance.ingresos, cur)}</Text> ingresos</Text>
            <Text style={styles.balanceSub}><Text style={{ color: '#FCA5A5' }}>↓ {formatMoney(finance.gastos, cur)}</Text> gastos</Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>

      <LinearGradient colors={['#1A0A3E', '#0D0D1A']} style={styles.hero}>
        <View style={styles.heroTop}>
          <View>
            <Text style={styles.heroGreeting}>{greeting},</Text>
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
  streakChip: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: '#F59E0B22', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  streakText: { fontSize: 10, fontWeight: '800', color: '#F59E0B' },
  balanceCard: { padding: 18 },
  balanceLbl: { fontSize: 12, color: '#ffffffaa', fontWeight: '600', letterSpacing: 0.5 },
  balanceVal: { fontSize: 34, fontWeight: '800', marginTop: 4, letterSpacing: -0.5 },
  balanceSub: { fontSize: 12, color: '#ffffffcc', fontWeight: '500' },
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
  catReportCard: { backgroundColor: COLORS.card, borderRadius: 14, padding: 14, borderWidth: 0.5, borderColor: COLORS.cardBorder, gap: 10 },
  catRow: { gap: 4 },
  catHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  catDot: { width: 8, height: 8, borderRadius: 4 },
  catName: { flex: 1, fontSize: 13, color: COLORS.text, fontWeight: '500' },
  catPct: { fontSize: 12, fontWeight: '700' },
  catAmt: { fontSize: 12, color: COLORS.textMuted, minWidth: 70, textAlign: 'right' },
  catBarBg: { height: 6, backgroundColor: COLORS.bg3, borderRadius: 4, overflow: 'hidden' },
  catBarFill: { height: 6, borderRadius: 4 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.card, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 0.5, borderColor: COLORS.cardBorder, marginBottom: 10 },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.text, paddingVertical: 0 },
  emptyHint: { fontSize: 13, color: COLORS.textMuted, fontStyle: 'italic', paddingVertical: 12, textAlign: 'center' },
  txList: { gap: 4 },
  txRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 0.5, borderColor: COLORS.border },
  txTitle: { fontSize: 13, color: COLORS.text, fontWeight: '500' },
  txSub: { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },
  txAmt: { fontSize: 14, fontWeight: '700' },
});
