import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { format, subDays } from 'date-fns';
import { useStore } from '../store/useStore';
import { COLORS } from '../utils/theme';
import EmptyState from '../components/EmptyState';
import LineChart from '../components/LineChart';
import {
  WEEKDAYS, buildDayTable, suggestPlacements, toTime, toMin, minutesToLabel,
} from '../utils/timeOrganizer';

const fmtClock = (sec) => {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m >= 60) { const h = Math.floor(m / 60); return `${h}h ${m % 60}m`; }
  return `${m}:${String(s).padStart(2, '0')}`;
};

const statusLabel = (e) => {
  if (!e) return '';
  if (e.status === 'rejected') return 'Rechazada ✕';
  if (e.status === 'done') return 'Cumplida ✓ 100%';
  return `Cumpliste ${e.pct}%`;
};

export default function PlanningScreen({ navigation }) {
  const { planning, logActivity } = useStore();
  const schedule = planning.schedule;
  const activities = planning.activities || [];
  const log = planning.log || {};
  const todayN = new Date().getDay();
  const [day, setDay] = useState(todayN);
  const [tick, setTick] = useState(0);
  const [session, setSession] = useState(null);
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const i = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(i);
  }, []);
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 700, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const todayStr = format(new Date(), 'yyyy-MM-dd');

  // auto-completar cuando termina el bloque de una actividad aceptada
  useEffect(() => {
    if (!session) return;
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
    const cmp = session.blockEnd > 1440 ? nowMin + 1440 : nowMin;
    if (cmp >= session.blockEnd) {
      logActivity(todayStr, session.activityId, { status: 'done', pct: 100 });
      setSession(null);
    }
  }, [tick, session]);

  if (!schedule) {
    return (
      <ScrollView style={styles.bg} contentContainerStyle={{ flexGrow: 1 }}>
        <LinearGradient colors={['#1A0A3E', '#0D0D1A']} style={styles.hero}>
          <Text style={styles.heroTitle}>Planificación de vida</Text>
          <Text style={styles.heroSub}>Tu día, semana, mes y año — organizados.</Text>
        </LinearGradient>
        <EmptyState
          icon="calendar-outline"
          title="Aún no configuras tu día"
          subtitle="Cuéntame tus horarios (despertar, trabajo, comidas...) y armaré tu día y dónde encajar tus actividades."
          actionLabel="Configurar mi día"
          onAction={() => navigation.navigate('PlanningWizard')}
        />
        <TouchableOpacity style={styles.calLink} onPress={() => navigation.navigate('Calendar')}>
          <Ionicons name="calendar-number-outline" size={18} color={COLORS.purpleLight} />
          <Text style={styles.calLinkText}>Abrir calendario</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  const isToday = day === todayN;
  const dayLog = isToday ? (log[todayStr] || {}) : {};
  const table = buildDayTable(schedule, day, activities);
  const placements = suggestPlacements(schedule, day, activities);
  const notPlaced = placements.filter((p) => !p.placed);

  // hora actual
  const nowD = new Date();
  const nowMin = nowD.getHours() * 60 + nowD.getMinutes() + nowD.getSeconds() / 60;
  const remainOf = (seg) => {
    for (const base of [nowMin, nowMin + 1440]) {
      if (base >= seg.start && base < seg.end) return Math.max(0, Math.round((seg.end - base) * 60));
    }
    return null;
  };
  let currentSeg = null, currentRemain = null;
  if (isToday) {
    for (const s of table.segments) { const r = remainOf(s); if (r != null) { currentSeg = s; currentRemain = r; break; } }
  }

  // cumplimiento de hoy
  const todayScheduled = suggestPlacements(schedule, todayN, activities).filter((p) => p.placed);
  const todayPcts = todayScheduled.map((p) => (log[todayStr]?.[p.activityId]?.pct ?? 0));
  const compliance = todayPcts.length ? Math.round(todayPcts.reduce((a, b) => a + b, 0) / todayPcts.length) : 0;

  // datos de la gráfica (últimos 7 días por actividad)
  const days7 = [];
  for (let i = 6; i >= 0; i--) {
    const d = subDays(new Date(), i);
    days7.push({ str: format(d, 'yyyy-MM-dd'), short: WEEKDAYS.find((w) => w.n === d.getDay())?.short });
  }
  const enabledActs = activities.filter((a) => a.enabled);
  const series = enabledActs.map((a) => ({ label: a.name, color: a.color, data: days7.map((d) => log[d.str]?.[a.id]?.pct ?? 0) }));

  // sueño
  const sleepDur = ((toMin(schedule.wakeTime) - toMin(schedule.sleepTime)) + 1440) % 1440;

  const accept = (seg) => setSession({ activityId: seg.activityId, startMs: Date.now(), blockEnd: seg.end, durMin: Math.max(1, seg.end - seg.start) });
  const reject = (id) => logActivity(todayStr, id, { status: 'rejected', pct: 0 });
  const stop = () => {
    const elapsedMin = (Date.now() - session.startMs) / 60000;
    const pct = Math.max(0, Math.min(100, Math.round((elapsedMin / session.durMin) * 100)));
    logActivity(todayStr, session.activityId, { status: 'partial', pct });
    setSession(null);
  };

  const segColor = (type, base) =>
    type === 'hole' ? COLORS.red : (base || COLORS.purple);

  return (
    <ScrollView style={styles.bg} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <LinearGradient colors={['#1A0A3E', '#0D0D1A']} style={styles.hero}>
        <View style={styles.heroTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>Mi plan</Text>
            <Text style={styles.heroSub}>Cumplimiento de hoy: {compliance}%</Text>
            {table.holesCount > 0 && (
              <Text style={styles.heroHoles}>⚠ {table.holesCount} hueco{table.holesCount > 1 ? 's' : ''} ({table.holesMin} min)</Text>
            )}
          </View>
          <TouchableOpacity style={styles.editBtn} onPress={() => navigation.navigate('PlanningWizard')}>
            <Ionicons name="create-outline" size={18} color={COLORS.purpleLight} />
            <Text style={styles.editText}>Editar</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Selector de día */}
      <View style={styles.daySelector}>
        {WEEKDAYS.map((d) => {
          const sel = d.n === day;
          return (
            <TouchableOpacity key={d.n} onPress={() => setDay(d.n)} style={[styles.dayBtn, sel && styles.dayBtnOn]}>
              <Text style={[styles.dayBtnText, sel && styles.dayBtnTextOn]}>{d.short}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* AVISO AHORA (grande) */}
      {isToday && currentSeg && (
        <View style={styles.nowCard}>
          <Animated.View pointerEvents="none" style={[styles.nowGlow, { opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.75] }) }]} />
          <Text style={styles.nowLabel}>● AHORA</Text>
          <Text style={styles.nowName}>{currentSeg.label}</Text>
          <Text style={styles.nowTimer}>⏱ faltan {fmtClock(currentRemain)}</Text>

          {currentSeg.type === 'activity' ? (
            session?.activityId === currentSeg.activityId ? (
              <View style={styles.nowBtns}>
                <View style={styles.runChip}>
                  <Text style={styles.runChipText}>▶ En curso · {fmtClock(Math.floor((Date.now() - session.startMs) / 1000))}</Text>
                </View>
                <TouchableOpacity style={[styles.nowBtn, { backgroundColor: COLORS.amber }]} onPress={stop}>
                  <Ionicons name="stop" size={16} color="#fff" />
                  <Text style={styles.nowBtnText}>Detener</Text>
                </TouchableOpacity>
              </View>
            ) : dayLog[currentSeg.activityId] ? (
              <Text style={styles.nowStatus}>{statusLabel(dayLog[currentSeg.activityId])}</Text>
            ) : (
              <>
                <Text style={styles.nowAsk}>¿Vas a hacer esta actividad ahora?</Text>
                <View style={styles.nowBtns}>
                  <TouchableOpacity style={[styles.nowBtn, { backgroundColor: COLORS.green }]} onPress={() => accept(currentSeg)}>
                    <Ionicons name="checkmark" size={18} color="#fff" />
                    <Text style={styles.nowBtnText}>Aceptar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.nowBtn, { backgroundColor: COLORS.red }]} onPress={() => reject(currentSeg.activityId)}>
                    <Ionicons name="close" size={18} color="#fff" />
                    <Text style={styles.nowBtnText}>Rechazar</Text>
                  </TouchableOpacity>
                </View>
              </>
            )
          ) : (
            <Text style={styles.nowStatus}>{currentSeg.type === 'hole' ? 'Tienes un hueco — ¿qué puedes adelantar?' : 'Bloque fijo en curso'}</Text>
          )}
        </View>
      )}

      {/* TABLA del día */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📋 Tu día ({WEEKDAYS.find((d) => d.n === day)?.label})</Text>
        <View style={styles.table}>
          {table.segments.map((s, i) => {
            const logE = isToday && s.type === 'activity' ? dayLog[s.activityId] : null;
            const rejected = logE?.status === 'rejected';
            const type = rejected ? 'hole' : s.type;
            const label = rejected ? 'Hueco (rechazado)' : s.label;
            const rem = isToday ? remainOf(s) : null;
            const isCur = rem != null;
            return (
              <View key={i} style={[styles.tRow, type === 'hole' && styles.tRowHole, isCur && styles.tRowCurrent]}>
                {isCur && (
                  <Animated.View pointerEvents="none" style={[styles.curGlow, { opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.2, 0.7] }) }]} />
                )}
                <Text style={styles.tTime}>{toTime(s.start)}</Text>
                <View style={[styles.tBar, { backgroundColor: segColor(type, s.color) }]} />
                <View style={styles.tBody}>
                  <Text style={[styles.tLabel, type === 'hole' && { color: COLORS.red, fontWeight: '700' }]}>{label}</Text>
                  <Text style={styles.tRange}>{toTime(s.start)}–{toTime(s.end)}</Text>
                </View>
                {isCur ? (
                  <View style={styles.nowChip}><Text style={styles.nowChipText}>⏱ {fmtClock(rem)}</Text></View>
                ) : logE && logE.status !== 'rejected' ? (
                  <View style={styles.doneChip}><Ionicons name="checkmark" size={12} color={COLORS.green} /><Text style={styles.doneChipText}>{logE.pct}%</Text></View>
                ) : (
                  <Text style={[styles.tDur, type === 'hole' && { color: COLORS.red }]}>{minutesToLabel(s.duration)}</Text>
                )}
              </View>
            );
          })}
          {/* Dormir */}
          <View style={[styles.tRow, { backgroundColor: COLORS.bg2 }]}>
            <Text style={styles.tTime}>{schedule.sleepTime}</Text>
            <View style={[styles.tBar, { backgroundColor: COLORS.indigo }]} />
            <View style={styles.tBody}>
              <Text style={styles.tLabel}>😴 Dormir</Text>
              <Text style={styles.tRange}>{schedule.sleepTime}–{schedule.wakeTime}</Text>
            </View>
            <Text style={styles.tDur}>{minutesToLabel(sleepDur)}</Text>
          </View>
        </View>
        <Text style={styles.legendInline}>
          🔴 Hueco · 🟡 Ocupado · 🟣 Actividad · 🔵 Dormir
        </Text>
      </View>

      {/* GRÁFICA de avance */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📈 Tu avance (últimos 7 días)</Text>
        {series.length === 0 ? (
          <Text style={styles.hint}>Activa actividades en "Editar" y empieza a cumplirlas para ver tu avance aquí.</Text>
        ) : (
          <View style={styles.card}>
            <LineChart series={series} labels={days7.map((d) => d.short)} />
          </View>
        )}
      </View>

      {/* Estado de hoy por actividad */}
      {enabledActs.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>✅ Hoy</Text>
          {enabledActs.map((a) => {
            const e = dayLog[a.id];
            const txt = e ? statusLabel(e) : 'Pendiente';
            const col = !e ? COLORS.textMuted : e.status === 'rejected' ? COLORS.red : e.status === 'done' ? COLORS.green : COLORS.amber;
            return (
              <View key={a.id} style={styles.todayRow}>
                <View style={[styles.sIcon, { backgroundColor: a.color + '22' }]}><Ionicons name={a.icon} size={15} color={a.color} /></View>
                <Text style={styles.todayName}>{a.name}</Text>
                <Text style={[styles.todayStatus, { color: col }]}>{txt}</Text>
              </View>
            );
          })}
        </View>
      )}

      {/* Actividades sin espacio */}
      {notPlaced.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚠ Sin espacio en tu día</Text>
          {notPlaced.map((p) => (
            <View key={p.activityId} style={styles.todayRow}>
              <View style={[styles.sIcon, { backgroundColor: COLORS.redDim }]}><Ionicons name={p.icon} size={15} color={COLORS.red} /></View>
              <Text style={styles.todayName}>{p.name}</Text>
              <Text style={[styles.todayStatus, { color: COLORS.red }]}>No cabe</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.section}>
        <TouchableOpacity style={styles.calBtn} onPress={() => navigation.navigate('Calendar')} activeOpacity={0.85}>
          <Ionicons name="calendar-number-outline" size={20} color="#fff" />
          <Text style={styles.calBtnText}>Abrir calendario</Text>
          <Ionicons name="chevron-forward" size={18} color="#ffffffaa" />
        </TouchableOpacity>
      </View>

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: COLORS.bg },
  container: { paddingBottom: 20 },
  hero: { padding: 24, paddingTop: 56, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  heroTitle: { fontSize: 24, fontWeight: '800', color: COLORS.text },
  heroSub: { fontSize: 13, color: COLORS.purpleLight, marginTop: 4 },
  heroHoles: { fontSize: 12, color: COLORS.red, marginTop: 4, fontWeight: '600' },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.purpleDim + 'aa', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  editText: { color: COLORS.purpleLight, fontSize: 13, fontWeight: '600' },
  daySelector: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 16 },
  dayBtn: { flex: 1, marginHorizontal: 3, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.card, borderWidth: 0.5, borderColor: COLORS.cardBorder },
  dayBtnOn: { backgroundColor: COLORS.purple, borderColor: COLORS.purple },
  dayBtnText: { fontSize: 13, fontWeight: '700', color: COLORS.textSub },
  dayBtnTextOn: { color: '#fff' },

  nowCard: {
    margin: 16, marginBottom: 0, backgroundColor: COLORS.bg3, borderRadius: 18, padding: 18,
    borderWidth: 1.5, borderColor: COLORS.purpleLight, overflow: 'hidden',
  },
  nowGlow: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: COLORS.purple + '22' },
  nowLabel: { fontSize: 12, fontWeight: '800', color: COLORS.purpleLight, letterSpacing: 1 },
  nowName: { fontSize: 24, fontWeight: '800', color: COLORS.text, marginTop: 4 },
  nowTimer: { fontSize: 20, fontWeight: '700', color: COLORS.purpleLight, marginTop: 2 },
  nowAsk: { fontSize: 13, color: COLORS.textSub, marginTop: 12 },
  nowStatus: { fontSize: 15, color: COLORS.text, fontWeight: '600', marginTop: 12 },
  nowBtns: { flexDirection: 'row', gap: 10, marginTop: 12, alignItems: 'center', flexWrap: 'wrap' },
  nowBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, flex: 1, minWidth: 120, paddingVertical: 13, borderRadius: 12 },
  nowBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  runChip: { flex: 1, backgroundColor: COLORS.greenDim, paddingVertical: 12, paddingHorizontal: 12, borderRadius: 12 },
  runChipText: { color: COLORS.green, fontSize: 13, fontWeight: '700' },

  section: { paddingHorizontal: 16, paddingTop: 22 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 12 },
  hint: { fontSize: 13, color: COLORS.textMuted, lineHeight: 19 },
  card: { backgroundColor: COLORS.card, borderRadius: 14, padding: 12, borderWidth: 0.5, borderColor: COLORS.cardBorder },
  table: { backgroundColor: COLORS.card, borderRadius: 14, padding: 6, borderWidth: 0.5, borderColor: COLORS.cardBorder },
  tRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, paddingHorizontal: 8, borderRadius: 8 },
  tRowHole: { backgroundColor: COLORS.redDim + '44' },
  tRowCurrent: { borderWidth: 1.5, borderColor: COLORS.purpleLight },
  curGlow: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 8, borderWidth: 2, borderColor: COLORS.purpleLight, backgroundColor: COLORS.purple + '22' },
  tTime: { width: 42, fontSize: 11, color: COLORS.textMuted, fontWeight: '600' },
  tBar: { width: 4, alignSelf: 'stretch', borderRadius: 2, minHeight: 22 },
  tBody: { flex: 1 },
  tLabel: { fontSize: 13, color: COLORS.text, fontWeight: '500' },
  tRange: { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },
  tDur: { fontSize: 11, color: COLORS.textSub, fontWeight: '600' },
  nowChip: { backgroundColor: COLORS.purple, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  nowChipText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  doneChip: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: COLORS.greenDim, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 4 },
  doneChipText: { color: COLORS.green, fontSize: 11, fontWeight: '700' },
  legendInline: { fontSize: 11, color: COLORS.textSub, marginTop: 10, textAlign: 'center' },

  todayRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 0.5, borderColor: COLORS.border },
  sIcon: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  todayName: { flex: 1, fontSize: 14, color: COLORS.text, fontWeight: '500' },
  todayStatus: { fontSize: 12, fontWeight: '700' },

  calBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: COLORS.purple, borderRadius: 14, paddingVertical: 15, paddingHorizontal: 16 },
  calBtnText: { flex: 1, color: '#fff', fontSize: 15, fontWeight: '700' },
  calLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4, paddingVertical: 12 },
  calLinkText: { color: COLORS.purpleLight, fontSize: 14, fontWeight: '600' },
});
