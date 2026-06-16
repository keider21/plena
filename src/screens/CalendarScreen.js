import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval,
  addMonths, subMonths, addWeeks, subWeeks, addDays, subDays, isSameMonth, isToday, getYear,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { useStore } from '../store/useStore';
import { COLORS } from '../utils/theme';
import { buildTimeline, getFreeBlocks, toMin, toTime, minutesToLabel } from '../utils/timeOrganizer';

const VIEWS = ['Día', 'Semana', 'Mes', 'Año'];
const PALETTE = ['#7C3AED', '#10B981', '#0EA5E9', '#F59E0B', '#EC4899', '#6366F1', '#EF4444'];
const WD_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export default function CalendarScreen({ navigation }) {
  const { calendar, planning, addEvent, deleteEvent, toggleEvent, addObjective, toggleObjective, deleteObjective } = useStore();
  const { events, objectives } = calendar;
  const schedule = planning.schedule;

  const [view, setView] = useState('Mes');
  const [cursor, setCursor] = useState(new Date());
  const [selected, setSelected] = useState(new Date());
  const [objInput, setObjInput] = useState('');

  const [modal, setModal] = useState({ open: false, title: '', hasTime: false, time: '08:00', color: PALETTE[0] });

  const dstr = (d) => format(d, 'yyyy-MM-dd');
  const eventsForDay = (d) => events.filter((e) => e.date === dstr(d)).sort((a, b) => (a.time || '99').localeCompare(b.time || '99'));
  const objectivesFor = (period, key) => objectives.filter((o) => o.period === period && o.key === key);

  const openAdd = () => setModal({ open: true, title: '', hasTime: false, time: '08:00', color: PALETTE[0] });
  const saveEvent = async () => {
    if (!modal.title.trim()) return;
    await addEvent({ date: dstr(selected), title: modal.title.trim(), time: modal.hasTime ? modal.time : null, color: modal.color });
    setModal({ ...modal, open: false });
  };

  const addObj = async (period, key) => {
    if (!objInput.trim()) return;
    await addObjective({ period, key, title: objInput.trim() });
    setObjInput('');
  };

  // ── navegación de periodo ──
  const prev = () => setCursor((c) => (view === 'Semana' ? subWeeks(c, 1) : view === 'Año' ? subMonths(c, 12) : view === 'Día' ? subDays(c, 1) : subMonths(c, 1)));
  const next = () => setCursor((c) => (view === 'Semana' ? addWeeks(c, 1) : view === 'Año' ? addMonths(c, 12) : view === 'Día' ? addDays(c, 1) : addMonths(c, 1)));
  const goToday = () => { setCursor(new Date()); setSelected(new Date()); };

  // En vista Día, el cursor manda sobre la fecha seleccionada
  const dayDate = view === 'Día' ? cursor : selected;

  const periodTitle = () => {
    if (view === 'Día') return cap(format(dayDate, "EEEE d 'de' MMMM", { locale: es }));
    if (view === 'Semana') {
      const ws = startOfWeek(cursor, { weekStartsOn: 1 });
      const we = endOfWeek(cursor, { weekStartsOn: 1 });
      return `${format(ws, 'd MMM', { locale: es })} – ${format(we, 'd MMM', { locale: es })}`;
    }
    if (view === 'Año') return String(getYear(cursor));
    return cap(format(cursor, 'MMMM yyyy', { locale: es }));
  };

  return (
    <View style={styles.bg}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Calendario</Text>
        <TouchableOpacity onPress={goToday} style={styles.todayBtn}>
          <Text style={styles.todayText}>Hoy</Text>
        </TouchableOpacity>
      </View>

      {/* Selector de vista */}
      <View style={styles.viewSwitch}>
        {VIEWS.map((v) => (
          <TouchableOpacity key={v} onPress={() => setView(v)} style={[styles.viewTab, view === v && styles.viewTabOn]}>
            <Text style={[styles.viewTabText, view === v && styles.viewTabTextOn]}>{v}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Navegación de periodo */}
      <View style={styles.periodNav}>
        <TouchableOpacity onPress={prev} style={styles.iconBtn}><Ionicons name="chevron-back" size={20} color={COLORS.purpleLight} /></TouchableOpacity>
        <Text style={styles.periodTitle}>{periodTitle()}</Text>
        <TouchableOpacity onPress={next} style={styles.iconBtn}><Ionicons name="chevron-forward" size={20} color={COLORS.purpleLight} /></TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {view === 'Mes' && <MonthView {...{ cursor, events, dstr, setSelected, setView }} />}
        {view === 'Semana' && <WeekView {...{ cursor, schedule, eventsForDay, setSelected, setView, toggleEvent }} />}
        {view === 'Día' && <DayView {...{ dayDate, schedule, planning, eventsForDay, toggleEvent, deleteEvent, openAdd, setSelected }} />}
        {view === 'Año' && <YearView {...{ cursor, events, objectives, setCursor, setView }} />}

        {/* Objetivos del periodo (mes / año) */}
        {(view === 'Mes' || view === 'Año') && (
          <View style={styles.objSection}>
            <Text style={styles.objTitle}>
              {view === 'Mes' ? '🎯 Objetivos del mes' : '🏆 Metas del año'}
            </Text>
            {(() => {
              const period = view === 'Mes' ? 'month' : 'year';
              const key = view === 'Mes' ? format(cursor, 'yyyy-MM') : String(getYear(cursor));
              const list = objectivesFor(period, key);
              return (
                <>
                  {list.length === 0 && <Text style={styles.emptyHint}>Aún no agregas objetivos para este periodo.</Text>}
                  {list.map((o) => (
                    <View key={o.id} style={styles.objRow}>
                      <TouchableOpacity onPress={() => toggleObjective(o.id)} style={styles.check}>
                        <Ionicons name={o.done ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={o.done ? COLORS.green : COLORS.textMuted} />
                      </TouchableOpacity>
                      <Text style={[styles.objText, o.done && styles.objDone]}>{o.title}</Text>
                      <TouchableOpacity onPress={() => deleteObjective(o.id)} style={styles.iconBtn}>
                        <Ionicons name="trash-outline" size={16} color={COLORS.red} />
                      </TouchableOpacity>
                    </View>
                  ))}
                  <View style={styles.objAddRow}>
                    <TextInput
                      placeholder={view === 'Mes' ? 'Nuevo objetivo del mes...' : 'Nueva meta del año...'}
                      placeholderTextColor={COLORS.textMuted}
                      style={styles.objInput}
                      value={objInput}
                      onChangeText={setObjInput}
                      onSubmitEditing={() => addObj(period, key)}
                      returnKeyType="done"
                    />
                    <TouchableOpacity style={styles.objAddBtn} onPress={() => addObj(period, key)}>
                      <Ionicons name="add" size={22} color="#fff" />
                    </TouchableOpacity>
                  </View>
                </>
              );
            })()}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* FAB agregar evento */}
      <TouchableOpacity style={styles.fab} onPress={openAdd} activeOpacity={0.85}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Modal nuevo evento */}
      <Modal visible={modal.open} transparent animationType="slide" onRequestClose={() => setModal({ ...modal, open: false })}>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <View style={styles.sheetHead}>
              <Text style={styles.sheetTitle}>Nuevo evento</Text>
              <TouchableOpacity onPress={() => setModal({ ...modal, open: false })}>
                <Ionicons name="close" size={24} color={COLORS.textSub} />
              </TouchableOpacity>
            </View>
            <Text style={styles.sheetDate}>{cap(format(selected, "EEEE d 'de' MMMM", { locale: es }))}</Text>

            <TextInput
              placeholder="¿Qué vas a hacer?"
              placeholderTextColor={COLORS.textMuted}
              style={styles.modalInput}
              value={modal.title}
              onChangeText={(v) => setModal((m) => ({ ...m, title: v }))}
              autoFocus
            />

            <View style={styles.timeToggleRow}>
              <Text style={styles.modalLabel}>Hora específica</Text>
              <TouchableOpacity
                onPress={() => setModal((m) => ({ ...m, hasTime: !m.hasTime }))}
                style={[styles.toggle, modal.hasTime && styles.toggleOn]}
              >
                <View style={[styles.knob, modal.hasTime && styles.knobOn]} />
              </TouchableOpacity>
            </View>

            {modal.hasTime && (
              <View style={styles.timeChips}>
                {['06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '21:00'].map((t) => (
                  <TouchableOpacity
                    key={t}
                    onPress={() => setModal((m) => ({ ...m, time: t }))}
                    style={[styles.tChip, modal.time === t && styles.tChipOn]}
                  >
                    <Text style={[styles.tChipText, modal.time === t && styles.tChipTextOn]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Text style={[styles.modalLabel, { marginTop: 16, marginBottom: 8 }]}>Color</Text>
            <View style={styles.colorRow}>
              {PALETTE.map((c) => (
                <TouchableOpacity
                  key={c}
                  onPress={() => setModal((m) => ({ ...m, color: c }))}
                  style={[styles.colorDot, { backgroundColor: c }, modal.color === c && styles.colorDotOn]}
                />
              ))}
            </View>

            <TouchableOpacity style={styles.saveBtn} onPress={saveEvent} activeOpacity={0.85}>
              <Text style={styles.saveText}>Agregar evento</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─────────────────────────── VISTAS ───────────────────────────
function MonthView({ cursor, events, dstr, setSelected, setView }) {
  const monthStart = startOfMonth(cursor);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  return (
    <View>
      <View style={styles.weekHeader}>
        {WD_LABELS.map((w, i) => <Text key={i} style={styles.weekHeaderText}>{w}</Text>)}
      </View>
      <View style={styles.monthGrid}>
        {days.map((d) => {
          const inMonth = isSameMonth(d, cursor);
          const today = isToday(d);
          const hasEvents = events.some((e) => e.date === dstr(d));
          return (
            <TouchableOpacity
              key={d.toISOString()}
              style={styles.dayCell}
              onPress={() => { setSelected(d); setView('Día'); }}
            >
              <View style={[styles.dayNumWrap, today && styles.dayToday]}>
                <Text style={[styles.dayNum, !inMonth && styles.dayDim, today && styles.dayNumToday]}>
                  {format(d, 'd')}
                </Text>
              </View>
              {hasEvents && <View style={styles.eventDot} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function WeekView({ cursor, schedule, eventsForDay, setSelected, setView, toggleEvent }) {
  const ws = startOfWeek(cursor, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: ws, end: endOfWeek(cursor, { weekStartsOn: 1 }) });
  return (
    <View style={{ gap: 10 }}>
      {days.map((d) => {
        const evs = eventsForDay(d);
        const free = schedule ? getFreeBlocks(schedule, d.getDay()).totalFree : 0;
        return (
          <View key={d.toISOString()} style={[styles.weekDayCard, isToday(d) && styles.weekDayToday]}>
            <TouchableOpacity onPress={() => { setSelected(d); setView('Día'); }} style={styles.weekDayHead}>
              <Text style={styles.weekDayName}>{cap(format(d, 'EEEE d', { locale: es }))}</Text>
              {schedule && <Text style={styles.weekFree}>{minutesToLabel(free)} libre</Text>}
            </TouchableOpacity>
            {evs.length === 0 ? (
              <Text style={styles.weekEmpty}>Sin eventos</Text>
            ) : (
              evs.map((e) => (
                <TouchableOpacity key={e.id} onPress={() => toggleEvent(e.id)} style={styles.weekEvent}>
                  <View style={[styles.evColor, { backgroundColor: e.color }]} />
                  {e.time && <Text style={styles.evTime}>{e.time}</Text>}
                  <Text style={[styles.evTitle, e.done && styles.objDone]}>{e.title}</Text>
                </TouchableOpacity>
              ))
            )}
          </View>
        );
      })}
    </View>
  );
}

function DayView({ dayDate, schedule, planning, eventsForDay, toggleEvent, deleteEvent }) {
  const evs = eventsForDay(dayDate);
  const untimed = evs.filter((e) => !e.time);
  const timed = evs.filter((e) => e.time).map((e) => ({ ...e, start: toMin(e.time), kind: 'event' }));
  const routine = schedule
    ? buildTimeline(schedule, dayDate.getDay(), planning.activities).map((b) => ({ ...b, kind: 'routine' }))
    : [];
  const timeline = [...routine, ...timed].sort((a, b) => a.start - b.start);

  return (
    <View>
      {untimed.length > 0 && (
        <View style={styles.daySection}>
          <Text style={styles.daySectionTitle}>📌 Sin hora</Text>
          {untimed.map((e) => (
            <View key={e.id} style={styles.dayEventRow}>
              <TouchableOpacity onPress={() => toggleEvent(e.id)} style={styles.check}>
                <Ionicons name={e.done ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={e.done ? COLORS.green : e.color} />
              </TouchableOpacity>
              <Text style={[styles.evTitle, { flex: 1 }, e.done && styles.objDone]}>{e.title}</Text>
              <TouchableOpacity onPress={() => deleteEvent(e.id)} style={styles.iconBtn}>
                <Ionicons name="trash-outline" size={16} color={COLORS.red} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      <View style={styles.daySection}>
        <Text style={styles.daySectionTitle}>🕒 Tu día por horas</Text>
        {timeline.length === 0 ? (
          <Text style={styles.emptyHint}>No hay nada programado. Agrega un evento con el botón +.</Text>
        ) : (
          timeline.map((b, i) => (
            <View key={i} style={styles.tlRow}>
              <Text style={styles.tlTime}>{toTime(b.start)}</Text>
              <View style={[styles.tlDot, { backgroundColor: b.color }]} />
              <View style={[styles.tlCard, b.kind === 'routine' && styles.tlRoutine, { borderLeftColor: b.color }]}>
                {b.icon && <Ionicons name={b.icon} size={15} color={b.color} />}
                <Text style={[styles.tlLabel, b.done && styles.objDone]}>{b.label || b.title}</Text>
                {b.kind === 'routine' ? (
                  <Text style={styles.tlTag}>rutina</Text>
                ) : (
                  <View style={{ flexDirection: 'row', gap: 4 }}>
                    <TouchableOpacity onPress={() => toggleEvent(b.id)}>
                      <Ionicons name={b.done ? 'checkmark-circle' : 'ellipse-outline'} size={20} color={b.done ? COLORS.green : COLORS.textMuted} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => deleteEvent(b.id)}>
                      <Ionicons name="trash-outline" size={16} color={COLORS.red} />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          ))
        )}
      </View>
    </View>
  );
}

function YearView({ cursor, events, objectives, setCursor, setView }) {
  const year = getYear(cursor);
  const months = Array.from({ length: 12 }, (_, i) => new Date(year, i, 1));
  return (
    <View style={styles.yearGrid}>
      {months.map((m) => {
        const mk = format(m, 'yyyy-MM');
        const count = events.filter((e) => e.date.startsWith(mk)).length
          + objectives.filter((o) => o.period === 'month' && o.key === mk).length;
        return (
          <TouchableOpacity
            key={mk}
            style={styles.monthCard}
            onPress={() => { setCursor(m); setView('Mes'); }}
          >
            <Text style={styles.monthCardName}>{cap(format(m, 'MMM', { locale: es }))}</Text>
            {count > 0 && <View style={styles.monthBadge}><Text style={styles.monthBadgeText}>{count}</Text></View>}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: COLORS.bg },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingTop: 52, paddingBottom: 12, backgroundColor: COLORS.bg2,
  },
  iconBtn: { padding: 6 },
  topTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  todayBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: COLORS.purpleDim },
  todayText: { color: COLORS.purpleLight, fontSize: 13, fontWeight: '600' },
  viewSwitch: { flexDirection: 'row', backgroundColor: COLORS.bg2, paddingHorizontal: 12, paddingBottom: 10, gap: 6 },
  viewTab: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center', backgroundColor: COLORS.bg3 },
  viewTabOn: { backgroundColor: COLORS.purple },
  viewTabText: { fontSize: 13, color: COLORS.textSub, fontWeight: '600' },
  viewTabTextOn: { color: '#fff' },
  periodNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  periodTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  container: { paddingHorizontal: 16, paddingBottom: 20 },

  weekHeader: { flexDirection: 'row', marginBottom: 8 },
  weekHeaderText: { flex: 1, textAlign: 'center', fontSize: 12, color: COLORS.textMuted, fontWeight: '600' },
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', gap: 3 },
  dayNumWrap: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  dayToday: { backgroundColor: COLORS.purple },
  dayNum: { fontSize: 14, color: COLORS.text, fontWeight: '500' },
  dayNumToday: { color: '#fff', fontWeight: '700' },
  dayDim: { color: COLORS.textMuted },
  eventDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: COLORS.purpleLight },

  weekDayCard: { backgroundColor: COLORS.card, borderRadius: 14, padding: 14, borderWidth: 0.5, borderColor: COLORS.cardBorder },
  weekDayToday: { borderColor: COLORS.purple },
  weekDayHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  weekDayName: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  weekFree: { fontSize: 11, color: COLORS.green, fontWeight: '600' },
  weekEmpty: { fontSize: 12, color: COLORS.textMuted },
  weekEvent: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 5 },
  evColor: { width: 4, height: 16, borderRadius: 2 },
  evTime: { fontSize: 12, color: COLORS.textSub, fontWeight: '600', width: 42 },
  evTitle: { fontSize: 13, color: COLORS.text },

  daySection: { backgroundColor: COLORS.card, borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 0.5, borderColor: COLORS.cardBorder },
  daySectionTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginBottom: 10 },
  dayEventRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  tlRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tlTime: { width: 42, fontSize: 11, color: COLORS.textMuted, fontWeight: '600' },
  tlDot: { width: 8, height: 8, borderRadius: 4 },
  tlCard: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.bg3,
    borderRadius: 10, padding: 10, marginVertical: 3, borderLeftWidth: 3,
  },
  tlRoutine: { opacity: 0.72, backgroundColor: COLORS.bg2 },
  tlLabel: { flex: 1, fontSize: 13, color: COLORS.text, fontWeight: '500' },
  tlTag: { fontSize: 10, color: COLORS.textMuted, fontStyle: 'italic' },

  yearGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  monthCard: {
    width: '30.5%', aspectRatio: 1.4, backgroundColor: COLORS.card, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: COLORS.cardBorder,
  },
  monthCardName: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  monthBadge: { marginTop: 6, backgroundColor: COLORS.purple, borderRadius: 10, minWidth: 20, paddingHorizontal: 6, paddingVertical: 1, alignItems: 'center' },
  monthBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  objSection: { backgroundColor: COLORS.card, borderRadius: 14, padding: 14, marginTop: 16, borderWidth: 0.5, borderColor: COLORS.cardBorder },
  objTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 10 },
  emptyHint: { fontSize: 13, color: COLORS.textMuted, lineHeight: 19 },
  objRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  check: { padding: 2 },
  objText: { flex: 1, fontSize: 14, color: COLORS.text },
  objDone: { textDecorationLine: 'line-through', color: COLORS.textMuted },
  objAddRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  objInput: {
    flex: 1, backgroundColor: COLORS.bg3, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
    color: COLORS.text, fontSize: 14, borderWidth: 0.5, borderColor: COLORS.cardBorder,
  },
  objAddBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: COLORS.purple, alignItems: 'center', justifyContent: 'center' },

  fab: {
    position: 'absolute', right: 20, bottom: 28, width: 56, height: 56, borderRadius: 28,
    backgroundColor: COLORS.purple, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#7C3AED', shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 8,
  },

  backdrop: { flex: 1, backgroundColor: '#000000AA', justifyContent: 'flex-end' },
  sheet: { backgroundColor: COLORS.bg2, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 32 },
  sheetHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sheetTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  sheetDate: { fontSize: 13, color: COLORS.purpleLight, marginTop: 4, marginBottom: 14 },
  modalInput: {
    backgroundColor: COLORS.card, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    color: COLORS.text, fontSize: 15, borderWidth: 0.5, borderColor: COLORS.cardBorder,
  },
  modalLabel: { fontSize: 14, color: COLORS.text, fontWeight: '500' },
  timeToggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 },
  toggle: { width: 46, height: 28, borderRadius: 14, backgroundColor: COLORS.bg3, padding: 3, justifyContent: 'center' },
  toggleOn: { backgroundColor: COLORS.purple },
  knob: { width: 22, height: 22, borderRadius: 11, backgroundColor: COLORS.textMuted },
  knobOn: { backgroundColor: '#fff', alignSelf: 'flex-end' },
  timeChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  tChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 9, backgroundColor: COLORS.card, borderWidth: 0.5, borderColor: COLORS.cardBorder },
  tChipOn: { backgroundColor: COLORS.purpleDim, borderColor: COLORS.purple },
  tChipText: { fontSize: 13, color: COLORS.textSub },
  tChipTextOn: { color: COLORS.purpleLight, fontWeight: '600' },
  colorRow: { flexDirection: 'row', gap: 12 },
  colorDot: { width: 32, height: 32, borderRadius: 16 },
  colorDotOn: { borderWidth: 3, borderColor: '#fff' },
  saveBtn: { backgroundColor: COLORS.purple, borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 22 },
  saveText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
