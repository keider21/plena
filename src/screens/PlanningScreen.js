import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Animated, Modal, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format, subDays, addWeeks, startOfWeek, addDays } from 'date-fns';
import { useStore } from '../store/useStore';
import { COLORS } from '../utils/theme';
import EmptyState from '../components/EmptyState';
import LineChart from '../components/LineChart';
import TimePickerField from '../components/TimePickerField';
import { snooze, reschedulePlan } from '../utils/notifications';
import {
  WEEKDAYS, buildDayTable, buildDayWith, instancesFromTemplate, suggestPlacements, toTime, toMin, minutesToLabel,
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
  const { planning, logActivity, saveDayPlan, clearActivityLog } = useStore();
  const schedule = planning.schedule;
  const activities = planning.activities || [];
  const log = planning.log || {};
  const dayPlans = planning.dayPlans || {};
  const todayN = new Date().getDay();
  const [selDayN, setSelDayN] = useState(todayN);
  const [weekOffset, setWeekOffset] = useState(0);
  const [tick, setTick] = useState(0);
  const [session, setSession] = useState(null);
  const [gap, setGap] = useState(null);
  const [gapName, setGapName] = useState('');
  const [instEdit, setInstEdit] = useState(null);
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
  const weekStart = startOfWeek(addWeeks(new Date(), weekOffset), { weekStartsOn: 1 });
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(weekStart, i);
    return { date: format(d, 'yyyy-MM-dd'), dayN: d.getDay(), short: WEEKDAYS.find(w => w.n === d.getDay())?.short || '', num: format(d, 'd') };
  });
  const selDate = weekDates.find(d => d.dayN === selDayN)?.date || todayStr;

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
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>Planificación de vida</Text>
          <Text style={styles.heroSub}>Tu día, semana, mes y año — organizados.</Text>
        </View>
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

  const isToday = selDate === todayStr;
  const dayLog = log[selDate] || {};

  // Per-day sleep/wake override (stored as { kind: 'sleepOverride', wakeTime, sleepTime } in dayPlans[todayStr])
  const todaySleepOvr = (dayPlans[todayStr] || []).find(it => it.kind === 'sleepOverride');
  const effectiveWakeTime = (isToday && todaySleepOvr) ? todaySleepOvr.wakeTime : schedule.wakeTime;
  const effectiveSleepTime = (isToday && todaySleepOvr) ? todaySleepOvr.sleepTime : schedule.sleepTime;

  // Instancias de HOY (lo que el usuario fijó para hoy) o la plantilla materializada
  const todayInstances = dayPlans[todayStr] || instancesFromTemplate(schedule, todayN, activities, todayStr);
  const ensureToday = () => (dayPlans[todayStr] ? [...dayPlans[todayStr]] : instancesFromTemplate(schedule, todayN, activities, todayStr));

  // Tabla: hoy desde instancias (editable); otros días desde la plantilla (solo lectura)
  const table = isToday ? buildDayWith(schedule, todayN, todayInstances) : buildDayTable(schedule, selDayN, activities);
  const placements = suggestPlacements(schedule, selDayN, activities);
  const notPlaced = isToday ? [] : placements.filter((p) => !p.placed);

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

  // cumplimiento de hoy (según las actividades planificadas hoy)
  const todayActIds = todayInstances.filter(it => it.activityId && it.kind !== 'sleepOverride' && it.kind !== 'fixedOverride').map((it) => it.activityId);
  const todayPcts = todayActIds.map((id) => log[todayStr]?.[id]?.pct ?? 0);
  const compliance = todayPcts.length ? Math.round(todayPcts.reduce((a, b) => a + b, 0) / todayPcts.length) : 0;

  // gráfica (últimos 7 días) — el historial queda congelado
  const days7 = [];
  for (let i = 6; i >= 0; i--) {
    const d = subDays(new Date(), i);
    days7.push({ str: format(d, 'yyyy-MM-dd'), short: WEEKDAYS.find((w) => w.n === d.getDay())?.short });
  }
  const enabledActs = activities.filter((a) => a.enabled);
  const seriesActs = [...enabledActs];
  const haveIds = new Set(seriesActs.map((a) => a.id));
  days7.forEach((d) => Object.keys(log[d.str] || {}).forEach((id) => {
    if (!haveIds.has(id)) {
      haveIds.add(id);
      let meta = null;
      for (const dd of days7) { const e = log[dd.str]?.[id]; if (e && e.name) { meta = e; break; } }
      seriesActs.push({ id, name: meta?.name || 'Actividad', color: meta?.color || COLORS.textMuted });
    }
  }));
  const series = seriesActs.map((a) => ({ label: a.name, color: a.color, data: days7.map((d) => log[d.str]?.[a.id]?.pct ?? 0) }));

  const sleepDur = ((toMin(effectiveWakeTime) - toMin(effectiveSleepTime)) + 1440) % 1440;

  const elapsedSec = session ? (session.accumulatedSec + (session.runningSince ? Math.floor((Date.now() - session.runningSince) / 1000) : 0)) : 0;
  const pctOf = (sec) => (session ? Math.max(0, Math.min(100, Math.round((sec / 60 / session.durMin) * 100))) : 0);

  const accept = (seg) => setSession({ activityId: seg.activityId, blockEnd: seg.end, durMin: Math.max(1, seg.end - seg.start), accumulatedSec: 0, runningSince: Date.now() });
  const reject = (id) => logActivity(todayStr, id, { status: 'rejected', pct: 0 });
  const reactivar = (id) => clearActivityLog(todayStr, id);
  const pause = () => {
    const add = session.runningSince ? Math.floor((Date.now() - session.runningSince) / 1000) : 0;
    const acc = session.accumulatedSec + add;
    logActivity(todayStr, session.activityId, { status: 'partial', pct: pctOf(acc) });
    setSession({ ...session, accumulatedSec: acc, runningSince: null });
  };
  const resume = () => setSession((s) => ({ ...s, runningSince: Date.now() }));
  const finalize = () => {
    logActivity(todayStr, session.activityId, { status: 'partial', pct: pctOf(elapsedSec) });
    setSession(null);
  };
  const posponer = () => snooze(currentSeg?.label || 'Actividad', 'Recordatorio pospuesto', 5);
  const changeActivity = (seg, hasProgress) => {
    if (hasProgress) {
      Alert.alert('Cambiar actividad', 'Esta actividad ya tiene progreso registrado. Si continúas perderás el progreso acumulado. ¿Deseas continuar?', [
        { text: 'Cancelar' },
        { text: 'Continuar', style: 'destructive', onPress: () => { setSession(null); openInstEdit(seg); } },
      ]);
    } else {
      openInstEdit(seg);
    }
  };

  // Reprograma las alarmas nativas usando el estado más reciente del plan
  // (incluye los cambios manuales por día). Se llama tras cada edición.
  const refreshAlarms = () => {
    const { planning: pl, habits: hb } = useStore.getState();
    reschedulePlan(pl, hb).catch(() => {});
  };

  // Llenar hueco → crea una instancia SOLO para hoy (no toca la plantilla → sin duplicados)
  const openGap = (seg) => { setGapName(''); setGap(seg); };
    const fillGap = async (name, color, icon, activityId) => {
    if (!gap || !name || !name.trim()) return;
    const id = 'inst_' + Date.now();
    const inst = { id, activityId: activityId || id, name: name.trim(), icon: icon || 'flash-outline', color: color || COLORS.purple, start: toTime(gap.start), end: toTime(gap.end) };

    // Feedback visual inmediato
    const newInstances = [...ensureToday(), inst];
    await saveDayPlan(todayStr, newInstances);

    refreshAlarms();
    setGap(null);
    setGapName('');
  };

  // Edición de una actividad / hueco / bloque fijo SOLO para hoy
  const openInstEdit = (seg) => {
    if (!isToday) return;
    // Caso 1: actividad creada como instancia (hueco llenado o actividad movida)
    if (seg.type === 'activity' && seg.instanceId) {
      const inst = todayInstances.find((it) => it.id === seg.instanceId);
      if (inst) { setInstEdit({ kind: 'instance', ...inst }); return; }
    }
    // Caso 2: hueco (lo que sea que esté vacío en el día) → lo convertimos en una instancia para hoy
    if (seg.type === 'hole') {
      const id = 'inst_' + Date.now();
      setInstEdit({
        kind: 'instance',
        id,
        activityId: id,
        name: '',
        icon: 'flash-outline',
        color: COLORS.purple,
        start: toTime(seg.start),
        end: toTime(seg.end),
        _seg: seg,
      });
      return;
    }
    // Caso 3: bloque fijo del plan (trabajo, comida, siesta) → guardamos un override solo para hoy
    if (seg.type === 'fixed' || seg.type === 'work' || seg.type === 'meal' || seg.type === 'nap') {
      setInstEdit({
        kind: 'fixedOverride',
        id: 'fov_' + Date.now(),
        label: seg.label,
        icon: seg.icon || 'ellipse',
        color: seg.color || COLORS.purple,
        start: toTime(seg.start),
        end: toTime(seg.end),
        _seg: seg,
        _type: 'fixed',
      });
      return;
    }
    // Caso 4: bloque de sueño → cambia las horas de dormir/despertar solo para hoy
    if (seg.type === 'sleep') {
      setInstEdit({ kind: 'sleepOverride', start: effectiveSleepTime, end: effectiveWakeTime });
      return;
    }
  };
  const saveInstEdit = async () => {
    if (!instEdit) return;
    if (instEdit.kind === 'sleepOverride') {
      const ovr = { kind: 'sleepOverride', sleepTime: instEdit.start, wakeTime: instEdit.end, appliedTo: todayStr };
      const base = dayPlans[todayStr] ?? instancesFromTemplate(schedule, todayN, activities, todayStr);
      await saveDayPlan(todayStr, [...base.filter(x => x.kind !== 'sleepOverride'), ovr]);
      refreshAlarms();
      setInstEdit(null);
      return;
    }
    if (instEdit.kind === 'fixedOverride') {
      // override de un bloque fijo SOLO para hoy
      const ovr = {
        kind: 'fixedOverride',
        id: instEdit.id,
        type: instEdit._type,
        label: instEdit.label?.trim() || 'Bloque',
        icon: instEdit.icon,
        color: instEdit.color,
        start: instEdit.start,
        end: instEdit.end,
        appliedTo: todayStr,
      };
      const arr = (dayPlans[todayStr] || []).filter((x) => !(x.kind === 'fixedOverride' && x.type === ovr.type));
      await saveDayPlan(todayStr, [...arr, ovr]);
    } else {
      // instancia normal (actividad o hueco convertido)
      if (!instEdit.name.trim()) return;
      const current = dayPlans[todayStr] || ensureToday();
      const exists = current.some((it) => it.id === instEdit.id);
      const next = exists
        ? current.map((it) => (it.id === instEdit.id ? { ...it, ...instEdit, name: instEdit.name.trim() } : it))
        : [...current, { id: instEdit.id, activityId: instEdit.activityId || instEdit.id, name: instEdit.name.trim(), icon: instEdit.icon, color: instEdit.color, start: instEdit.start, end: instEdit.end }];
      await saveDayPlan(todayStr, next);
    }
    refreshAlarms();
    setInstEdit(null);
  };
  const deleteInst = async () => {
    if (!instEdit) return;
    if (instEdit.kind === 'sleepOverride') {
      await saveDayPlan(todayStr, (dayPlans[todayStr] || []).filter(x => x.kind !== 'sleepOverride'));
      refreshAlarms();
      setInstEdit(null);
      return;
    }
    if (instEdit.kind === 'fixedOverride') {
      // eliminar el override = volver al bloque original
      const arr = (dayPlans[todayStr] || []).filter((x) => !(x.kind === 'fixedOverride' && x.id === instEdit.id));
      await saveDayPlan(todayStr, arr);
    } else {
      await saveDayPlan(todayStr, ensureToday().filter((it) => it.id !== instEdit.id));
    }
    refreshAlarms();
    setInstEdit(null);
  };

  const segColor = (type, base) => (type === 'hole' ? COLORS.red : (base || COLORS.purple));

  return (
    <ScrollView style={styles.bg} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.hero}>
        <View style={styles.heroTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>Mi plan</Text>
            <Text style={styles.heroSub}>Cumplimiento de hoy: {compliance}%</Text>
            {table.holesCount > 0 && (
              <Text style={styles.heroHoles}>⚠ {table.holesCount} hueco{table.holesCount > 1 ? 's' : ''} ({table.holesMin} min)</Text>
            )}
          </View>
          <TouchableOpacity style={styles.editBtn} onPress={() => navigation.navigate('PlanningWizard')}>
            <Ionicons name="create-outline" size={18} color={COLORS.purple} />
            <Text style={styles.editText}>Editar plan</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.daySelector}>
        <TouchableOpacity onPress={() => setWeekOffset(o => o - 1)} style={styles.weekNavBtn}>
          <Ionicons name="chevron-back" size={18} color={COLORS.textSub} />
        </TouchableOpacity>
        {weekDates.map((d) => {
          const sel = d.dayN === selDayN;
          const isT = d.date === todayStr;
          return (
            <TouchableOpacity key={d.dayN} onPress={() => setSelDayN(d.dayN)} style={[styles.dayBtn, sel && styles.dayBtnOn, isT && !sel && styles.dayBtnToday]}>
              <Text style={[styles.dayBtnText, sel && styles.dayBtnTextOn]}>{d.short}</Text>
              <Text style={[styles.dayBtnNum, sel && styles.dayBtnNumOn]}>{d.num}</Text>
            </TouchableOpacity>
          );
        })}
        <TouchableOpacity onPress={() => setWeekOffset(o => Math.min(0, o + 1))} style={styles.weekNavBtn} disabled={weekOffset >= 0}>
          <Ionicons name="chevron-forward" size={18} color={weekOffset >= 0 ? COLORS.bg3 : COLORS.textSub} />
        </TouchableOpacity>
      </View>

      {isToday && currentSeg && (
        <View style={styles.nowCard}>
          <Animated.View pointerEvents="none" style={[styles.nowGlow, { opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.75] }) }]} />
          <Text style={styles.nowLabel}>● AHORA</Text>
          <Text style={styles.nowName}>{currentSeg.label}</Text>
          <Text style={styles.nowTimer}>⏱ faltan {fmtClock(currentRemain)}</Text>

          {currentSeg.type === 'activity' ? (
            session?.activityId === currentSeg.activityId ? (
              <>
                <Text style={styles.nowStatus}>{session.runningSince ? '▶ En curso' : '⏸ En pausa'} · {fmtClock(elapsedSec)} ({pctOf(elapsedSec)}%)</Text>
                <View style={styles.nowBtns}>
                  {session.runningSince ? (
                    <TouchableOpacity style={[styles.nowBtn, { backgroundColor: COLORS.amber }]} onPress={pause}>
                      <Ionicons name="pause" size={16} color="#fff" /><Text style={styles.nowBtnText}>Detener</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity style={[styles.nowBtn, { backgroundColor: COLORS.green }]} onPress={resume}>
                      <Ionicons name="play" size={16} color="#fff" /><Text style={styles.nowBtnText}>Reanudar</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={[styles.nowBtn, { backgroundColor: COLORS.purple }]} onPress={finalize}>
                    <Ionicons name="checkmark-done" size={16} color="#fff" /><Text style={styles.nowBtnText}>Finalizar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.nowBtn, { backgroundColor: COLORS.bg2 }]} onPress={() => changeActivity(currentSeg, true)}>
                    <Ionicons name="swap-horizontal" size={16} color={COLORS.purpleLight} /><Text style={[styles.nowBtnText, { color: COLORS.purpleLight }]}>Cambiar</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : dayLog[currentSeg.activityId]?.status === 'rejected' ? (
              <View style={styles.nowBtns}>
                <View style={styles.runChip}><Text style={[styles.runChipText, { color: COLORS.red }]}>Rechazada ✕</Text></View>
                <TouchableOpacity style={[styles.nowBtn, { backgroundColor: COLORS.green }]} onPress={() => reactivar(currentSeg.activityId)}>
                  <Ionicons name="refresh" size={16} color="#fff" /><Text style={styles.nowBtnText}>Reactivar</Text>
                </TouchableOpacity>
              </View>
            ) : dayLog[currentSeg.activityId] ? (
              <Text style={styles.nowStatus}>{statusLabel(dayLog[currentSeg.activityId])}</Text>
            ) : (
              <>
                <Text style={styles.nowAsk}>¿Vas a hacer esta actividad ahora?</Text>
                <View style={styles.nowBtns}>
                  <TouchableOpacity style={[styles.nowBtn, { backgroundColor: COLORS.green }]} onPress={() => accept(currentSeg)}>
                    <Ionicons name="checkmark" size={18} color="#fff" /><Text style={styles.nowBtnText}>Aceptar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.nowBtn, { backgroundColor: COLORS.amber }]} onPress={posponer}>
                    <Ionicons name="alarm-outline" size={18} color="#fff" /><Text style={styles.nowBtnText}>Posponer</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.nowBtn, { backgroundColor: COLORS.red }]} onPress={() => reject(currentSeg.activityId)}>
                    <Ionicons name="close" size={18} color="#fff" /><Text style={styles.nowBtnText}>Rechazar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.nowBtn, { backgroundColor: COLORS.bg2 }]} onPress={() => changeActivity(currentSeg, false)}>
                    <Ionicons name="swap-horizontal" size={18} color={COLORS.purpleLight} /><Text style={[styles.nowBtnText, { color: COLORS.purpleLight }]}>Cambiar</Text>
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
        <Text style={styles.sectionTitle}>📋 {isToday ? 'Tu día (Hoy)' : `Plan del ${weekDates.find(d => d.dayN === selDayN)?.num} — ${WEEKDAYS.find(d => d.n === selDayN)?.label}`}</Text>
        <View style={styles.table}>
          {table.segments.map((s, i) => {
            const logE = isToday && s.type === 'activity' ? dayLog[s.activityId] : null;
            const rejected = logE?.status === 'rejected';
            const type = rejected ? 'hole' : s.type;
            const label = rejected ? 'Hueco (rechazado)' : s.label;
            const rem = isToday ? remainOf(s) : null;
            const isCur = rem != null;
            const editable = isToday && (s.type === 'activity' ? !!s.instanceId : (s.type === 'hole' || s.type === 'work' || s.type === 'meal' || s.type === 'nap' || s.type === 'fixed'));
            return (
              <React.Fragment key={i}>
                {isToday && isCur && (
                  <View style={styles.nowLine}>
                    <View style={styles.nowLineDot} />
                    <Text style={styles.nowLineText}>▼ {toTime(Math.round(nowMin) % 1440)}</Text>
                    <View style={styles.nowLineBar} />
                  </View>
                )}
                <TouchableOpacity
                  activeOpacity={editable ? 0.6 : 1}
                  onLongPress={() => openInstEdit(s)}
                  onPress={() => editable ? openInstEdit(s) : null}
                  delayLongPress={300}
                  style={[styles.tRow, type === 'hole' && styles.tRowHole, isCur && styles.tRowCurrent]}
                >
                  {isCur && (<Animated.View pointerEvents="none" style={[styles.curGlow, { opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.2, 0.7] }) }]} />)}
                  <Text style={styles.tTime}>{toTime(s.start)}</Text>
                  <View style={[styles.tBar, { backgroundColor: segColor(type, s.color) }]} />
                  <View style={styles.tBody}>
                    <Text style={[styles.tLabel, type === 'hole' && { color: COLORS.red, fontWeight: '700' }]}>{label}{editable ? ' ✎' : ''}</Text>
                    <Text style={styles.tRange}>{toTime(s.start)}–{toTime(s.end)}</Text>
                  </View>
                  {isCur ? (
                    <View style={styles.nowChip}><Text style={styles.nowChipText}>⏱ {fmtClock(rem)}</Text></View>
                  ) : logE && logE.status !== 'rejected' ? (
                    <View style={styles.doneChip}><Ionicons name="checkmark" size={12} color={COLORS.green} /><Text style={styles.doneChipText}>{logE.pct}%</Text></View>
                  ) : (type === 'hole' && isToday) ? (
                    <TouchableOpacity style={styles.fillBtn} onPress={() => openGap(s)}>
                      <Ionicons name="add" size={14} color={COLORS.purpleLight} /><Text style={styles.fillText}>{minutesToLabel(s.duration)}</Text>
                    </TouchableOpacity>
                  ) : (
                    <Text style={[styles.tDur, type === 'hole' && { color: COLORS.red }]}>{minutesToLabel(s.duration)}</Text>
                  )}
                </TouchableOpacity>
              </React.Fragment>
            );
          })}
          {/* Dormir */}
          <TouchableOpacity
            activeOpacity={isToday ? 0.6 : 1}
            onPress={() => isToday ? openInstEdit({ type: 'sleep' }) : null}
            onLongPress={() => isToday ? openInstEdit({ type: 'sleep' }) : null}
            style={[styles.tRow, { backgroundColor: COLORS.bg2 }]}
          >
            <Text style={styles.tTime}>{effectiveSleepTime}</Text>
            <View style={[styles.tBar, { backgroundColor: COLORS.indigo }]} />
            <View style={styles.tBody}><Text style={styles.tLabel}>😴 Dormir{isToday ? ' ✎' : ''}</Text><Text style={styles.tRange}>{effectiveSleepTime}–{effectiveWakeTime}</Text></View>
            <Text style={styles.tDur}>{minutesToLabel(sleepDur)}</Text>
          </TouchableOpacity>
        </View>
        {table.overlapping?.length > 0 && (
          <View style={styles.overlapWarn}>
            <Ionicons name={'warning-outline'} size={14} color={COLORS.amber} />
            <Text style={styles.overlapWarnText}>
              {table.overlapping.length} bloque{table.overlapping.length > 1 ? 's' : ''} superpuesto{table.overlapping.length > 1 ? 's' : ''}: {table.overlapping.map(o => o.label).join(', ')}
            </Text>
          </View>
        )}
        <Text style={styles.legendInline}>
          {isToday ? 'Toca o mantén presionada una fila para editarla (cambia nombre, hora, color) — los cambios solo aplican a HOY' : 'Vista del plan. Para cambiarlo usa “Editar plan”.'}
        </Text>
      </View>

      {/* Modal: llenar hueco */}
      <Modal visible={!!gap} transparent animationType="slide" onRequestClose={() => setGap(null)}>
        <View style={styles.gapBackdrop}>
          <View style={styles.gapSheet}>
            <View style={styles.gapHead}>
              <Text style={styles.gapTitle}>Llenar hueco {gap ? `${toTime(gap.start)}–${toTime(gap.end)}` : ''}</Text>
              <TouchableOpacity onPress={() => setGap(null)}><Ionicons name="close" size={24} color={COLORS.textSub} /></TouchableOpacity>
            </View>
            <Text style={styles.gapSub}>Usa una de tus actividades:</Text>
            <View style={styles.gapChips}>
              {activities.map((a) => (
                <TouchableOpacity key={a.id} style={[styles.gapChip, { borderColor: a.color }]} onPress={() => fillGap(a.name, a.color, a.icon, a.id)}>
                  <Ionicons name={a.icon} size={14} color={a.color} /><Text style={styles.gapChipText}>{a.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.gapSub}>O escribe una nueva:</Text>
            <View style={styles.gapAddRow}>
              <TextInput style={styles.gapInput} value={gapName} onChangeText={setGapName} placeholder="Ej. Estudiar, llamar a..." placeholder="Nombre de la actividad" placeholderTextColor={COLORS.textMuted} />
              <TouchableOpacity style={styles.gapAddBtn} onPress={() => fillGap(gapName, COLORS.purple)}><Ionicons name="add" size={22} color="#fff" /></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal: editar actividad / horas de sueño (solo hoy) */}
      <Modal visible={!!instEdit} transparent animationType="slide" onRequestClose={() => setInstEdit(null)}>
        <View style={styles.gapBackdrop}>
          <View style={styles.gapSheet}>
            <View style={styles.gapHead}>
              <Text style={styles.gapTitle}>{instEdit?.kind === 'sleepOverride' ? 'Horario de sueño (solo hoy)' : 'Editar (solo hoy)'}</Text>
              <TouchableOpacity onPress={() => setInstEdit(null)}><Ionicons name="close" size={24} color={COLORS.textSub} /></TouchableOpacity>
            </View>
            {instEdit && (
              <>
                {instEdit.kind !== 'sleepOverride' && (
                  <>
                    <Text style={styles.gapSub}>Cambiar actividad:</Text>
                    <View style={styles.gapChips}>
                      {activities.map((a) => {
                        const sel = instEdit.name === a.name;
                        return (
                          <TouchableOpacity key={a.id} style={[styles.gapChip, { borderColor: a.color }, sel && { backgroundColor: a.color + '22' }]} onPress={() => setInstEdit((e) => ({ ...e, name: a.name, icon: a.icon, color: a.color, activityId: a.id }))}>
                            <Ionicons name={a.icon} size={14} color={a.color} /><Text style={styles.gapChipText}>{a.name}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                    <Text style={[styles.gapSub, { marginTop: 12 }]}>Nombre</Text>
                    <TextInput style={styles.gapInput} value={instEdit.name} onChangeText={(v) => setInstEdit((e) => ({ ...e, name: v }))} placeholder="Nombre de la actividad" placeholderTextColor={COLORS.textMuted} />
                  </>
                )}
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                  <View style={{ flex: 1 }}><Text style={styles.gapSub}>{instEdit.kind === 'sleepOverride' ? 'Hora de dormir' : 'Inicio'}</Text><TimePickerField value={instEdit.start} onChange={(v) => setInstEdit((e) => ({ ...e, start: v }))} compact /></View>
                  <View style={{ flex: 1 }}><Text style={styles.gapSub}>{instEdit.kind === 'sleepOverride' ? 'Despertar' : 'Fin'}</Text><TimePickerField value={instEdit.end} onChange={(v) => setInstEdit((e) => ({ ...e, end: v }))} compact /></View>
                </View>
                {instEdit.kind === 'sleepOverride' && (
                  <Text style={[styles.legendInline, { marginTop: 10 }]}>Solo aplica a hoy. El plan base no cambia.</Text>
                )}
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                  <TouchableOpacity style={styles.instDel} onPress={deleteInst}><Ionicons name="trash-outline" size={18} color={COLORS.red} /><Text style={styles.instDelText}>{instEdit.kind === 'sleepOverride' ? 'Restablecer' : 'Eliminar'}</Text></TouchableOpacity>
                  <TouchableOpacity style={styles.instSave} onPress={saveInstEdit}><Text style={styles.instSaveText}>Guardar</Text></TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* GRÁFICA */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📈 Tu avance (últimos 7 días)</Text>
        {series.length === 0 ? (
          <Text style={styles.hint}>Activa actividades en "Editar plan" y empieza a cumplirlas para ver tu avance.</Text>
        ) : series.every(s => s.data.every(v => v === 0)) ? (
          <Text style={styles.hint}>Aún no hay registros en los últimos 7 días. Completa actividades para ver tu avance.</Text>
        ) : (
          <View style={styles.card}><LineChart series={series} labels={days7.map((d) => d.short)} /></View>
        )}
      </View>

      {/* Estado de hoy */}
      {isToday && todayInstances.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>✅ Hoy</Text>
          {todayInstances.map((it) => {
            const e = dayLog[it.activityId];
            const txt = e ? statusLabel(e) : 'Pendiente';
            const col = !e ? COLORS.textMuted : e.status === 'rejected' ? COLORS.red : e.status === 'done' ? COLORS.green : COLORS.amber;
            return (
              <View key={it.id} style={styles.todayRow}>
                <View style={[styles.sIcon, { backgroundColor: it.color + '22' }]}><Ionicons name={it.icon} size={15} color={it.color} /></View>
                <Text style={styles.todayName}>{it.name}</Text>
                <Text style={[styles.todayStatus, { color: col }]}>{txt}</Text>
              </View>
            );
          })}
        </View>
      )}

      {notPlaced.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚠ Sin espacio en este plan</Text>
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
  hero: { padding: 24, paddingTop: 56, backgroundColor: COLORS.bg, borderBottomWidth: 1, borderBottomColor: COLORS.border, marginBottom: 4 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  heroTitle: { fontSize: 24, fontWeight: '800', color: COLORS.text },
  heroSub: { fontSize: 13, color: COLORS.purpleLight, marginTop: 4 },
  heroHoles: { fontSize: 12, color: COLORS.red, marginTop: 4, fontWeight: '600' },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.purpleDim + 'aa', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  editText: { color: COLORS.purpleLight, fontSize: 13, fontWeight: '600' },
  daySelector: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, paddingTop: 16 },
  weekNavBtn: { width: 26, height: 48, alignItems: 'center', justifyContent: 'center' },
  dayBtn: { flex: 1, marginHorizontal: 2, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.card, borderWidth: 0.5, borderColor: COLORS.cardBorder },
  dayBtnToday: { borderColor: COLORS.purple, borderWidth: 1.5 },
  dayBtnOn: { backgroundColor: COLORS.purple, borderColor: COLORS.purple },
  dayBtnText: { fontSize: 11, fontWeight: '700', color: COLORS.textSub },
  dayBtnTextOn: { color: '#fff' },
  dayBtnNum: { fontSize: 10, fontWeight: '600', color: COLORS.textMuted, marginTop: 1 },
  dayBtnNumOn: { color: '#ffffffcc' },
  nowCard: { margin: 16, marginBottom: 0, backgroundColor: COLORS.bg3, borderRadius: 18, padding: 18, borderWidth: 1.5, borderColor: COLORS.purpleLight, overflow: 'hidden' },
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
  fillBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: COLORS.purpleDim, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  fillText: { color: COLORS.purpleLight, fontSize: 11, fontWeight: '700' },
  gapBackdrop: { flex: 1, backgroundColor: '#000000AA', justifyContent: 'flex-end' },
  gapSheet: { backgroundColor: COLORS.bg2, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 32 },
  gapHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  gapTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, flex: 1 },
  gapSub: { fontSize: 13, color: COLORS.textSub, marginTop: 6, marginBottom: 8 },
  gapChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  gapChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.card, borderWidth: 1 },
  gapChipText: { fontSize: 13, color: COLORS.text },
  gapAddRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  gapInput: { flex: 1, backgroundColor: COLORS.card, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: COLORS.text, fontSize: 14, borderWidth: 0.5, borderColor: COLORS.cardBorder },
  gapAddBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: COLORS.purple, alignItems: 'center', justifyContent: 'center' },
  instDel: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 18, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: COLORS.red + '55' },
  instDelText: { color: COLORS.red, fontSize: 14, fontWeight: '700' },
  instSave: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, backgroundColor: COLORS.purple },
  instSaveText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  todayRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 0.5, borderColor: COLORS.border },
  sIcon: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  todayName: { flex: 1, fontSize: 14, color: COLORS.text, fontWeight: '500' },
  todayStatus: { fontSize: 12, fontWeight: '700' },
  calBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: COLORS.purple, borderRadius: 14, paddingVertical: 15, paddingHorizontal: 16 },
  calBtnText: { flex: 1, color: '#fff', fontSize: 15, fontWeight: '700' },
  calLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4, paddingVertical: 12 },
  calLinkText: { color: COLORS.purpleLight, fontSize: 14, fontWeight: '600' },
  nowLine: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8, paddingVertical: 3 },
  nowLineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.purpleLight },
  nowLineText: { fontSize: 11, fontWeight: '800', color: COLORS.purpleLight, letterSpacing: 0.5 },
  nowLineBar: { flex: 1, height: 1.5, backgroundColor: COLORS.purpleLight + '66' },
  overlapWarn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.amber + '22', borderRadius: 8, padding: 8, marginTop: 8 },
  overlapWarnText: { flex: 1, fontSize: 11, color: COLORS.amber, fontWeight: '600' },
});
