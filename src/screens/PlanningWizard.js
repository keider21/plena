import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store/useStore';
import { COLORS } from '../utils/theme';
import { WEEKDAYS, PREFERENCES, placementsByDay } from '../utils/timeOrganizer';
import { rescheduleAll } from '../utils/notifications';
import TimePickerField from '../components/TimePickerField';

const PALETTE = ['#7C3AED', '#10B981', '#0EA5E9', '#F59E0B', '#EC4899', '#6366F1', '#A78BFA'];

const DEFAULT_SCHEDULE = {
  wakeTime: '06:00',
  sleepTime: '23:00',
  work: { enabled: true, start: '08:00', end: '18:00', days: [1, 2, 3, 4, 5] },
  meals: [
    { id: 'desayuno', name: 'Desayuno', start: '07:00', end: '07:30', enabled: true },
    { id: 'almuerzo', name: 'Almuerzo', start: '13:00', end: '14:00', enabled: true },
    { id: 'cena', name: 'Cena', start: '20:00', end: '20:45', enabled: true },
  ],
  familyBlock: { enabled: false, start: '19:00', end: '21:00', days: [1, 2, 3, 4, 5, 6, 0] },
  customBlocks: [],
};

function Toggle({ value, onChange }) {
  return (
    <TouchableOpacity
      onPress={() => onChange(!value)}
      activeOpacity={0.8}
      style={[styles.toggle, value && styles.toggleOn]}
    >
      <View style={[styles.knob, value && styles.knobOn]} />
    </TouchableOpacity>
  );
}

function DayChips({ days, onToggle }) {
  return (
    <View style={styles.dayRow}>
      {WEEKDAYS.map((d) => {
        const sel = days.includes(d.n);
        return (
          <TouchableOpacity
            key={d.n}
            onPress={() => onToggle(d.n)}
            style={[styles.dayChip, sel && styles.dayChipOn]}
          >
            <Text style={[styles.dayChipText, sel && styles.dayChipTextOn]}>{d.short}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function PlanningWizard({ navigation }) {
  const { planning, savePlanning } = useStore();
  const [schedule, setSchedule] = useState({ ...DEFAULT_SCHEDULE, ...(planning.schedule || {}) });
  const [activities, setActivities] = useState(planning.activities || []);
  const [newActName, setNewActName] = useState('');
  const [blockDraft, setBlockDraft] = useState({ name: '', start: '18:00', end: '20:00', days: [1, 2, 3, 4, 5] });

  const upd = (patch) => setSchedule((s) => ({ ...s, ...patch }));
  const updWork = (patch) => setSchedule((s) => ({ ...s, work: { ...s.work, ...patch } }));
  const updFamily = (patch) => setSchedule((s) => ({ ...s, familyBlock: { ...s.familyBlock, ...patch } }));

  const toggleWorkDay = (n) => {
    const days = schedule.work.days.includes(n)
      ? schedule.work.days.filter((x) => x !== n)
      : [...schedule.work.days, n];
    updWork({ days });
  };
  const toggleFamilyDay = (n) => {
    const days = schedule.familyBlock.days.includes(n)
      ? schedule.familyBlock.days.filter((x) => x !== n)
      : [...schedule.familyBlock.days, n];
    updFamily({ days });
  };

  const updMeal = (id, patch) =>
    setSchedule((s) => ({ ...s, meals: s.meals.map((m) => (m.id === id ? { ...m, ...patch } : m)) }));

  const updActivity = (id, patch) =>
    setActivities((arr) => arr.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  const removeActivity = (id) => setActivities((arr) => arr.filter((a) => a.id !== id));

  const addActivity = () => {
    const name = newActName.trim();
    if (!name) return;
    const act = {
      id: 'custom_' + Date.now(),
      name,
      icon: 'star-outline',
      color: PALETTE[activities.length % PALETTE.length],
      minutesPerDay: 30,
      preferred: 'cualquiera',
      enabled: true,
      custom: true,
    };
    setActivities((arr) => [...arr, act]);
    setNewActName('');
  };

  // Compromisos fijos personalizados
  const toggleBlockDraftDay = (n) =>
    setBlockDraft((d) => ({ ...d, days: d.days.includes(n) ? d.days.filter((x) => x !== n) : [...d.days, n] }));
  const addBlock = () => {
    const name = blockDraft.name.trim();
    if (!name) return;
    const block = {
      id: 'blk_' + Date.now(),
      name,
      start: blockDraft.start,
      end: blockDraft.end,
      days: blockDraft.days,
      icon: 'pin-outline',
      color: '#6366F1',
    };
    setSchedule((s) => ({ ...s, customBlocks: [...(s.customBlocks || []), block] }));
    setBlockDraft({ name: '', start: '18:00', end: '20:00', days: [1, 2, 3, 4, 5] });
  };
  const removeBlock = (id) =>
    setSchedule((s) => ({ ...s, customBlocks: (s.customBlocks || []).filter((b) => b.id !== id) }));

  const handleSave = async () => {
    await savePlanning({ schedule, activities });
    try {
      const habits = useStore.getState().habits;
      await rescheduleAll({ habits, schedule, activities, placementsByDay: placementsByDay(schedule, activities) });
    } catch (e) { /* noop */ }
    navigation.goBack();
  };

  return (
    <View style={styles.bg}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Configura tu día</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Text style={styles.intro}>
          Cuéntame tu rutina base. Con esto calcularé automáticamente tus horas libres y dónde
          puedes encajar cada actividad.
        </Text>

        {/* Despertar / dormir */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🌅 Despertar y dormir</Text>
          <View style={styles.twoCol}>
            <View style={{ flex: 1 }}>
              <Text style={styles.miniLabel}>Despierto</Text>
              <TimePickerField value={schedule.wakeTime} onChange={(v) => upd({ wakeTime: v })} compact />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.miniLabel}>Duermo</Text>
              <TimePickerField value={schedule.sleepTime} onChange={(v) => upd({ sleepTime: v })} compact />
            </View>
          </View>
        </View>

        {/* Trabajo */}
        <View style={styles.card}>
          <View style={styles.cardHead}>
            <Text style={styles.cardTitle}>💼 Trabajo</Text>
            <Toggle value={schedule.work.enabled} onChange={(v) => updWork({ enabled: v })} />
          </View>
          {schedule.work.enabled && (
            <>
              <View style={styles.twoCol}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.miniLabel}>Entrada</Text>
                  <TimePickerField value={schedule.work.start} onChange={(v) => updWork({ start: v })} compact />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.miniLabel}>Salida</Text>
                  <TimePickerField value={schedule.work.end} onChange={(v) => updWork({ end: v })} compact />
                </View>
              </View>
              <Text style={[styles.miniLabel, { marginTop: 12 }]}>Días que trabajas</Text>
              <DayChips days={schedule.work.days} onToggle={toggleWorkDay} />
            </>
          )}
        </View>

        {/* Comidas */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🍽️ Comidas</Text>
          {schedule.meals.map((m) => (
            <View key={m.id} style={styles.mealRow}>
              <Toggle value={m.enabled} onChange={(v) => updMeal(m.id, { enabled: v })} />
              <Text style={styles.mealName}>{m.name}</Text>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <TimePickerField value={m.start} onChange={(v) => updMeal(m.id, { start: v })} compact />
                <TimePickerField value={m.end} onChange={(v) => updMeal(m.id, { end: v })} compact />
              </View>
            </View>
          ))}
        </View>

        {/* Familia */}
        <View style={styles.card}>
          <View style={styles.cardHead}>
            <Text style={styles.cardTitle}>❤️ Tiempo en familia</Text>
            <Toggle value={schedule.familyBlock.enabled} onChange={(v) => updFamily({ enabled: v })} />
          </View>
          {schedule.familyBlock.enabled && (
            <>
              <View style={styles.twoCol}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.miniLabel}>Desde</Text>
                  <TimePickerField value={schedule.familyBlock.start} onChange={(v) => updFamily({ start: v })} compact />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.miniLabel}>Hasta</Text>
                  <TimePickerField value={schedule.familyBlock.end} onChange={(v) => updFamily({ end: v })} compact />
                </View>
              </View>
              <Text style={[styles.miniLabel, { marginTop: 12 }]}>Días</Text>
              <DayChips days={schedule.familyBlock.days} onToggle={toggleFamilyDay} />
            </>
          )}
        </View>

        {/* Compromisos fijos personalizados */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📌 Otros compromisos fijos</Text>
          <Text style={styles.cardSub}>Universidad, gimnasio, cursos... lo que ocurre a una hora fija.</Text>

          {(schedule.customBlocks || []).map((b) => (
            <View key={b.id} style={styles.blockRow}>
              <View style={[styles.actIcon, { backgroundColor: b.color + '22' }]}>
                <Ionicons name={b.icon} size={16} color={b.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.actName}>{b.name}</Text>
                <Text style={styles.blockMeta}>
                  {b.start}–{b.end} · {b.days.map((n) => WEEKDAYS.find((w) => w.n === n)?.short).join(' ')}
                </Text>
              </View>
              <TouchableOpacity onPress={() => removeBlock(b.id)} style={styles.delBtn}>
                <Ionicons name="trash-outline" size={18} color={COLORS.red} />
              </TouchableOpacity>
            </View>
          ))}

          <View style={styles.addBlockForm}>
            <TextInput
              placeholder="Nombre (ej. Universidad)"
              placeholderTextColor={COLORS.textMuted}
              style={styles.input}
              value={blockDraft.name}
              onChangeText={(v) => setBlockDraft((d) => ({ ...d, name: v }))}
            />
            <View style={styles.twoCol}>
              <View style={{ flex: 1 }}>
                <Text style={styles.miniLabel}>Desde</Text>
                <TimePickerField value={blockDraft.start} onChange={(v) => setBlockDraft((d) => ({ ...d, start: v }))} compact />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.miniLabel}>Hasta</Text>
                <TimePickerField value={blockDraft.end} onChange={(v) => setBlockDraft((d) => ({ ...d, end: v }))} compact />
              </View>
            </View>
            <Text style={[styles.miniLabel, { marginTop: 12 }]}>Días</Text>
            <DayChips days={blockDraft.days} onToggle={toggleBlockDraftDay} />
            <TouchableOpacity style={styles.addBtn} onPress={addBlock} activeOpacity={0.8}>
              <Ionicons name="add" size={18} color={COLORS.purpleLight} />
              <Text style={styles.addBtnText}>Agregar compromiso</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Actividades a encajar */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🎯 ¿Qué quieres encajar en tu día?</Text>
          <Text style={styles.cardSub}>Activa las que quieras, ajusta el tiempo, o agrega las tuyas.</Text>
          {activities.map((a) => (
            <View key={a.id} style={[styles.actBox, a.enabled && styles.actBoxOn]}>
              <View style={styles.actTop}>
                <View style={[styles.actIcon, { backgroundColor: a.color + '22' }]}>
                  <Ionicons name={a.icon} size={16} color={a.color} />
                </View>
                <Text style={styles.actName}>{a.name}</Text>
                {a.custom && (
                  <TouchableOpacity onPress={() => removeActivity(a.id)} style={styles.delBtn}>
                    <Ionicons name="trash-outline" size={16} color={COLORS.red} />
                  </TouchableOpacity>
                )}
                <Toggle value={a.enabled} onChange={(v) => updActivity(a.id, { enabled: v })} />
              </View>
              {a.enabled && (
                <View style={styles.actDetails}>
                  <View style={styles.stepperRow}>
                    <Text style={styles.miniLabel}>Tiempo: {a.minutesPerDay} min/día</Text>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TouchableOpacity
                        style={styles.stepBtn}
                        onPress={() => updActivity(a.id, { minutesPerDay: Math.max(5, a.minutesPerDay - 5) })}
                      >
                        <Ionicons name="remove" size={16} color={COLORS.text} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.stepBtn}
                        onPress={() => updActivity(a.id, { minutesPerDay: a.minutesPerDay + 5 })}
                      >
                        <Ionicons name="add" size={16} color={COLORS.text} />
                      </TouchableOpacity>
                    </View>
                  </View>
                  <View style={styles.prefRow}>
                    {PREFERENCES.map((p) => {
                      const sel = a.preferred === p.value;
                      return (
                        <TouchableOpacity
                          key={p.value}
                          onPress={() => updActivity(a.id, { preferred: p.value })}
                          style={[styles.prefChip, sel && styles.prefChipOn]}
                        >
                          <Text style={[styles.prefText, sel && styles.prefTextOn]}>{p.label}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}
            </View>
          ))}

          {/* Agregar actividad propia */}
          <View style={styles.addActRow}>
            <TextInput
              placeholder="Agregar otra actividad..."
              placeholderTextColor={COLORS.textMuted}
              style={[styles.input, { flex: 1, marginBottom: 0 }]}
              value={newActName}
              onChangeText={setNewActName}
              onSubmitEditing={addActivity}
              returnKeyType="done"
            />
            <TouchableOpacity style={styles.addIconBtn} onPress={addActivity} activeOpacity={0.8}>
              <Ionicons name="add" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.85}>
          <Ionicons name="checkmark-circle" size={20} color="#fff" />
          <Text style={styles.saveText}>Guardar y generar mi plan</Text>
        </TouchableOpacity>

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: COLORS.bg },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 14, backgroundColor: COLORS.bg2,
  },
  backBtn: { padding: 2 },
  topTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  container: { padding: 16 },
  intro: { fontSize: 13, color: COLORS.textSub, lineHeight: 19, marginBottom: 16 },
  card: {
    backgroundColor: COLORS.card, borderRadius: 16, padding: 16, marginBottom: 14,
    borderWidth: 0.5, borderColor: COLORS.cardBorder,
  },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  cardSub: { fontSize: 12, color: COLORS.textSub, marginBottom: 12 },
  miniLabel: { fontSize: 12, color: COLORS.textSub, marginBottom: 6 },
  twoCol: { flexDirection: 'row', gap: 12, marginTop: 8 },
  dayRow: { flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' },
  dayChip: {
    width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.bg3, borderWidth: 0.5, borderColor: COLORS.cardBorder,
  },
  dayChipOn: { backgroundColor: COLORS.purple, borderColor: COLORS.purple },
  dayChipText: { fontSize: 13, color: COLORS.textSub, fontWeight: '600' },
  dayChipTextOn: { color: '#fff' },
  mealRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  mealName: { flex: 1, fontSize: 14, color: COLORS.text, fontWeight: '500' },
  toggle: {
    width: 46, height: 28, borderRadius: 14, backgroundColor: COLORS.bg3, padding: 3,
    justifyContent: 'center',
  },
  toggleOn: { backgroundColor: COLORS.purple },
  knob: { width: 22, height: 22, borderRadius: 11, backgroundColor: COLORS.textMuted },
  knobOn: { backgroundColor: '#fff', alignSelf: 'flex-end' },
  blockRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12,
    paddingBottom: 12, borderBottomWidth: 0.5, borderColor: COLORS.border,
  },
  blockMeta: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  delBtn: { padding: 6 },
  addBlockForm: { marginTop: 14, backgroundColor: COLORS.bg3, borderRadius: 12, padding: 12 },
  input: {
    backgroundColor: COLORS.card, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
    color: COLORS.text, fontSize: 14, borderWidth: 0.5, borderColor: COLORS.cardBorder, marginBottom: 10,
  },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 14,
    paddingVertical: 10, borderRadius: 10, backgroundColor: COLORS.purpleDim + '88',
  },
  addBtnText: { color: COLORS.purpleLight, fontSize: 13, fontWeight: '600' },
  actBox: {
    backgroundColor: COLORS.bg3, borderRadius: 12, padding: 12, marginTop: 10,
    borderWidth: 0.5, borderColor: COLORS.cardBorder,
  },
  actBoxOn: { borderColor: COLORS.purple + '66' },
  actTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  actIcon: { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  actName: { flex: 1, fontSize: 14, color: COLORS.text, fontWeight: '500' },
  actDetails: { marginTop: 12, gap: 10 },
  stepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepBtn: {
    width: 32, height: 32, borderRadius: 8, backgroundColor: COLORS.card,
    alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: COLORS.cardBorder,
  },
  prefRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  prefChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: COLORS.card,
    borderWidth: 0.5, borderColor: COLORS.cardBorder,
  },
  prefChipOn: { backgroundColor: COLORS.purpleDim, borderColor: COLORS.purple },
  prefText: { fontSize: 12, color: COLORS.textSub },
  prefTextOn: { color: COLORS.purpleLight, fontWeight: '600' },
  addActRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 },
  addIconBtn: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: COLORS.purple,
    alignItems: 'center', justifyContent: 'center',
  },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.purple, borderRadius: 14, paddingVertical: 16, marginTop: 6,
  },
  saveText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
