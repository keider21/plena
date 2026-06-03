import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Switch
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { format, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { useStore } from '../store/useStore';
import { COLORS, CAT_COLORS } from '../utils/theme';
import { scheduleHabitReminder, cancelHabitReminder, sendTestNotification } from '../utils/notifications';

const today = () => format(new Date(), 'yyyy-MM-dd');

function MiniChart({ data, color }) {
  const max = 1;
  const bars = data.slice(-14);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 28 }}>
      {bars.map((d, i) => (
        <View key={i} style={[styles.miniBar, {
          backgroundColor: d.value === 1 ? color : d.status === 'missed' ? COLORS.red + '55' : COLORS.bg3,
          height: d.value === 1 ? 28 : d.status === 'missed' ? 10 : 4,
        }]} />
      ))}
    </View>
  );
}

function HabitCard({ habit, onLog, onToggleReminder, logs }) {
  const [expanded, setExpanded] = useState(false);
  const { getHabitStreak, getHabitCompletionRate, getHabitChartData } = useStore();
  const todayStatus = logs[habit.id]?.[today()];
  const streak = getHabitStreak(habit.id);
  const rate7 = getHabitCompletionRate(habit.id, 7);
  const rate30 = getHabitCompletionRate(habit.id, 30);
  const chartData = getHabitChartData(habit.id, 14);

  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = format(subDays(new Date(), 6 - i), 'yyyy-MM-dd');
    const s = logs[habit.id]?.[d];
    return { date: d, status: s };
  });

  return (
    <View style={[styles.habitCard, { borderLeftWidth: 3, borderLeftColor: habit.color }]}>
      <TouchableOpacity onPress={() => setExpanded(!expanded)} activeOpacity={0.8}>
        <View style={styles.habitTop}>
          <View style={[styles.hIcon, { backgroundColor: habit.color + '22' }]}>
            <Ionicons name={habit.icon + '-outline'} size={20} color={habit.color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.hName}>{habit.name}</Text>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 2 }}>
              <View style={[styles.catBadge, { backgroundColor: (CAT_COLORS[habit.category] || COLORS.purple) + '22' }]}>
                <Text style={[styles.catText, { color: CAT_COLORS[habit.category] || COLORS.purple }]}>{habit.category}</Text>
              </View>
              {streak > 0 && (
                <View style={styles.streakBadge}>
                  <Ionicons name="flame" size={11} color={COLORS.amber} />
                  <Text style={styles.streakText}>{streak}d</Text>
                </View>
              )}
            </View>
          </View>
          <View style={styles.hActions}>
            <TouchableOpacity
              onPress={() => onLog(habit.id, 'done')}
              style={[styles.logBtn, todayStatus === 'done' && { backgroundColor: COLORS.green }]}
            >
              <Ionicons name="checkmark" size={16} color={todayStatus === 'done' ? '#fff' : COLORS.green} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => onLog(habit.id, 'missed')}
              style={[styles.logBtn, todayStatus === 'missed' && { backgroundColor: COLORS.red }]}
            >
              <Ionicons name="close" size={16} color={todayStatus === 'missed' ? '#fff' : COLORS.red} />
            </TouchableOpacity>
            <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={COLORS.textMuted} style={{ marginLeft: 4 }} />
          </View>
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.expandedArea}>
          <View style={styles.statsRow}>
            <View style={styles.miniStat}>
              <Text style={[styles.miniStatVal, { color: COLORS.purpleLight }]}>{rate7}%</Text>
              <Text style={styles.miniStatLbl}>7 días</Text>
            </View>
            <View style={styles.miniStat}>
              <Text style={[styles.miniStatVal, { color: habit.color }]}>{rate30}%</Text>
              <Text style={styles.miniStatLbl}>30 días</Text>
            </View>
            <View style={styles.miniStat}>
              <Text style={[styles.miniStatVal, { color: COLORS.amber }]}>{streak}</Text>
              <Text style={styles.miniStatLbl}>Racha</Text>
            </View>
          </View>

          <Text style={styles.chartLabel}>Últimas 14 días</Text>
          <MiniChart data={chartData} color={habit.color} />

          <Text style={styles.chartLabel}>Esta semana</Text>
          <View style={styles.weekDots}>
            {last7.map((d, i) => {
              const dayName = format(subDays(new Date(), 6 - i), 'EEE', { locale: es });
              return (
                <View key={i} style={{ alignItems: 'center', gap: 4 }}>
                  <View style={[styles.weekDot,
                    d.status === 'done' && { backgroundColor: COLORS.green },
                    d.status === 'missed' && { backgroundColor: COLORS.red },
                    !d.status && { backgroundColor: COLORS.bg3 }
                  ]} />
                  <Text style={styles.weekDotLabel}>{dayName.charAt(0).toUpperCase()}</Text>
                </View>
              );
            })}
          </View>

          <View style={styles.reminderRow}>
            <Ionicons name="alarm-outline" size={16} color={COLORS.textSub} />
            <Text style={styles.reminderText}>Recordatorio: {habit.reminder}</Text>
            <TouchableOpacity
              onPress={() => onToggleReminder(habit)}
              style={styles.testBtn}
            >
              <Text style={styles.testBtnText}>Probar</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

export default function HabitosScreen() {
  const { habits, habitLogs, logHabit, saveHabits } = useStore();
  const [filter, setFilter] = useState('todos');
  const cats = ['todos', 'salud', 'mente', 'finanzas', 'familia', 'empresa'];

  const filtered = habits.filter(h => filter === 'todos' || h.category === filter);

  const handleLog = (habitId, status) => {
    const habit = habits.find(h => h.id === habitId);
    if (!habit) return;
    logHabit(habitId, status);
  };

  const handleToggleReminder = async (habit) => {
    await scheduleHabitReminder(habit.id, habit.name, habit.reminder);
    await sendTestNotification(habit.name);
    Alert.alert('Recordatorio activado', `Recibirás un aviso cada día a las ${habit.reminder}`);
  };

  const toggleActive = (habitId) => {
    const updated = habits.map(h => h.id === habitId ? { ...h, active: !h.active } : h);
    saveHabits(updated);
  };

  const todayDone = habits.filter(h => h.active && habitLogs[h.id]?.[today()] === 'done').length;
  const todayTotal = habits.filter(h => h.active).length;
  const pct = todayTotal > 0 ? Math.round((todayDone / todayTotal) * 100) : 0;

  return (
    <ScrollView style={styles.bg} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

      <LinearGradient colors={['#1A0A3E', '#0D0D1A']} style={styles.header}>
        <Text style={styles.headerTitle}>Hábitos</Text>
        <Text style={styles.headerSub}>{format(new Date(), "EEEE d 'de' MMMM", { locale: es })}</Text>
        <View style={styles.progressWrap}>
          <View style={styles.progressBg}>
            <LinearGradient colors={[COLORS.purple, COLORS.purpleLight]} style={[styles.progressFill, { width: `${pct}%` }]} />
          </View>
          <Text style={styles.progressText}>{todayDone}/{todayTotal} hoy · {pct}%</Text>
        </View>
      </LinearGradient>

      <View style={styles.filterRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
          {cats.map(c => (
            <TouchableOpacity
              key={c}
              onPress={() => setFilter(c)}
              style={[styles.filterChip, filter === c && { backgroundColor: COLORS.purple, borderColor: COLORS.purple }]}
            >
              <Text style={[styles.filterText, filter === c && { color: '#fff' }]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.list}>
        {filtered.map(h => (
          <HabitCard
            key={h.id}
            habit={h}
            logs={habitLogs}
            onLog={handleLog}
            onToggleReminder={handleToggleReminder}
          />
        ))}
      </View>

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: COLORS.bg },
  container: {},
  header: { padding: 20, paddingTop: 56, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, marginBottom: 8 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: COLORS.text },
  headerSub: { fontSize: 13, color: COLORS.textSub, marginTop: 2, marginBottom: 16 },
  progressWrap: { gap: 8 },
  progressBg: { height: 6, backgroundColor: COLORS.bg3, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 4 },
  progressText: { fontSize: 12, color: COLORS.textSub },
  filterRow: { paddingHorizontal: 16, marginBottom: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: COLORS.card, borderWidth: 0.5, borderColor: COLORS.cardBorder },
  filterText: { fontSize: 12, color: COLORS.textSub, textTransform: 'capitalize' },
  list: { paddingHorizontal: 16, gap: 10 },
  habitCard: { backgroundColor: COLORS.card, borderRadius: 14, padding: 14, borderWidth: 0.5, borderColor: COLORS.cardBorder },
  habitTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  hIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  hName: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  catBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  catText: { fontSize: 10, fontWeight: '600' },
  streakBadge: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: COLORS.amberDim, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 20 },
  streakText: { fontSize: 10, color: COLORS.amber, fontWeight: '700' },
  hActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logBtn: { width: 30, height: 30, borderRadius: 10, backgroundColor: COLORS.bg3, alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: COLORS.cardBorder },
  expandedArea: { marginTop: 14, paddingTop: 14, borderTopWidth: 0.5, borderColor: COLORS.border },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  miniStat: { flex: 1, backgroundColor: COLORS.bg3, borderRadius: 10, padding: 10, alignItems: 'center' },
  miniStatVal: { fontSize: 18, fontWeight: '700' },
  miniStatLbl: { fontSize: 10, color: COLORS.textMuted, marginTop: 2 },
  chartLabel: { fontSize: 11, color: COLORS.textMuted, marginBottom: 6 },
  miniBar: { width: 16, borderRadius: 4 },
  weekDots: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  weekDot: { width: 28, height: 28, borderRadius: 8 },
  weekDotLabel: { fontSize: 10, color: COLORS.textMuted },
  reminderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.bg3, padding: 10, borderRadius: 10 },
  reminderText: { flex: 1, fontSize: 12, color: COLORS.textSub },
  testBtn: { backgroundColor: COLORS.purpleDim, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  testBtnText: { fontSize: 11, color: COLORS.purpleLight, fontWeight: '600' },
});
