import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Switch, Modal, TextInput
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { format, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { useStore } from '../store/useStore';
import { COLORS, CAT_COLORS } from '../utils/theme';
import { scheduleHabitReminder, cancelHabitReminder, sendTestNotification } from '../utils/notifications';
import * as Haptics from 'expo-haptics';

const today = () => format(new Date(), 'yyyy-MM-dd');

const SUGGESTIONS = [
  // Salud
  { name: 'Caminar 30 min', icon: 'walk', color: '#10B981', category: 'salud' },
  { name: 'Ejercicio', icon: 'barbell', color: '#EF4444', category: 'salud' },
  { name: 'Beber agua (2L)', icon: 'water', color: '#0EA5E9', category: 'salud' },
  { name: 'Dormir temprano', icon: 'moon', color: '#7C3AED', category: 'salud' },
  { name: 'Estiramientos', icon: 'body', color: '#F97316', category: 'salud' },
  { name: 'Comer 5 frutas/verduras', icon: 'nutrition', color: '#10B981', category: 'salud' },
  // Mente
  { name: 'Leer 20 min', icon: 'book', color: '#6366F1', category: 'mente' },
  { name: 'Meditar 10 min', icon: 'leaf', color: '#A78BFA', category: 'mente' },
  { name: 'Escribir diario', icon: 'create', color: '#EC4899', category: 'mente' },
  { name: 'Aprender algo nuevo', icon: 'school', color: '#F59E0B', category: 'mente' },
  { name: 'Sin redes 1h', icon: 'phone-portrait-outline', color: '#EF4444', category: 'mente' },
  // Familia
  { name: 'Llamar a un ser querido', icon: 'call', color: '#EC4899', category: 'familia' },
  { name: 'Tiempo con mis hijos', icon: 'people', color: '#F472B6', category: 'familia' },
  { name: 'Cena en familia', icon: 'restaurant', color: '#FB7185', category: 'familia' },
  // Empresa / Negocio
  { name: 'Revisar el carro', icon: 'car-sport', color: '#F59E0B', category: 'empresa' },
  { name: 'Hacer taxi más temprano', icon: 'car', color: '#0EA5E9', category: 'empresa' },
  { name: 'Publicar contenido', icon: 'megaphone', color: '#7C3AED', category: 'empresa' },
  { name: 'Revisar ganancias del día', icon: 'trending-up', color: '#10B981', category: 'empresa' },
  { name: 'Atender un cliente', icon: 'briefcase', color: '#6366F1', category: 'empresa' },
  // Finanzas
  { name: 'Revisar gastos del día', icon: 'wallet', color: '#14B8A6', category: 'finanzas' },
  { name: 'Ahorrar S/10', icon: 'cash', color: '#10B981', category: 'finanzas' },
  { name: 'Actualizar presupuesto', icon: 'calculator', color: '#0EA5E9', category: 'finanzas' },
];

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
  const { habits, habitLogs, logHabit, saveHabits, addHabit } = useStore();
  const [filter, setFilter] = useState('todos');
  const [addModal, setAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const cats = ['todos', 'salud', 'mente', 'finanzas', 'familia', 'empresa'];

  const addSuggestion = async (s) => {
    if (habits.some((h) => h.name.toLowerCase() === s.name.toLowerCase())) { Alert.alert('Ya lo tienes', `"${s.name}" ya está en tus hábitos.`); return; }
    await addHabit({ ...s, reminder: '08:00' });
    setAddModal(false);
  };
  const addCustom = async () => {
    const n = newName.trim();
    if (!n) return;
    await addHabit({ name: n, icon: 'star', color: COLORS.purple, category: filter === 'todos' ? 'salud' : filter, reminder: '08:00' });
    setNewName('');
    setAddModal(false);
  };

  const filtered = habits.filter(h => filter === 'todos' || h.category === filter);

  const handleLog = (habitId, status) => {
    const habit = habits.find(h => h.id === habitId);
    if (!habit) return;
    Haptics.impactAsync(status === 'done' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light).catch(() => {});
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
    <View style={{ flex: 1 }}>
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

      {habits.length === 0 && (
        <Text style={styles.emptyHint}>Aún no tienes hábitos. Toca el + para agregar uno.</Text>
      )}

      <View style={{ height: 90 }} />
    </ScrollView>

    <TouchableOpacity style={styles.fab} onPress={() => setAddModal(true)} activeOpacity={0.85}>
      <Ionicons name="add" size={28} color="#fff" />
    </TouchableOpacity>

    <Modal visible={addModal} transparent animationType="slide" onRequestClose={() => setAddModal(false)}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.sheetHead}>
            <Text style={styles.sheetTitle}>Nuevo hábito</Text>
            <TouchableOpacity onPress={() => setAddModal(false)}><Ionicons name="close" size={24} color={COLORS.textSub} /></TouchableOpacity>
          </View>
          <Text style={styles.sheetSub}>Sugerencias rápidas:</Text>
          <View style={styles.suggWrap}>
            {SUGGESTIONS.map((s) => (
              <TouchableOpacity key={s.name} style={[styles.suggChip, { borderColor: s.color }]} onPress={() => addSuggestion(s)}>
                <Ionicons name={s.icon + '-outline'} size={16} color={s.color} />
                <Text style={styles.suggText}>{s.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.sheetSub}>O crea uno personalizado:</Text>
          <View style={styles.addRow}>
            <TextInput style={styles.addInput} value={newName} onChangeText={setNewName} placeholder="Ej. Escribir diario" placeholderTextColor={COLORS.textMuted} onSubmitEditing={addCustom} returnKeyType="done" />
            <TouchableOpacity style={styles.addBtn} onPress={addCustom}><Ionicons name="add" size={22} color="#fff" /></TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
    </View>
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
  emptyHint: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', paddingHorizontal: 32, marginTop: 20, lineHeight: 19 },
  fab: { position: 'absolute', right: 20, bottom: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.purple, alignItems: 'center', justifyContent: 'center', shadowColor: '#7C3AED', shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 8 },
  backdrop: { flex: 1, backgroundColor: '#000000AA', justifyContent: 'flex-end' },
  sheet: { backgroundColor: COLORS.bg2, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 32 },
  sheetHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sheetTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  sheetSub: { fontSize: 13, color: COLORS.textSub, marginTop: 12, marginBottom: 8 },
  suggWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  suggChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 20, backgroundColor: COLORS.card, borderWidth: 1 },
  suggText: { fontSize: 13, color: COLORS.text, fontWeight: '500' },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  addInput: { flex: 1, backgroundColor: COLORS.card, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, color: COLORS.text, fontSize: 15, borderWidth: 0.5, borderColor: COLORS.cardBorder },
  addBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: COLORS.purple, alignItems: 'center', justifyContent: 'center' },
});
