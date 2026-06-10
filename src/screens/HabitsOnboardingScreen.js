import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, TextInput, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useStore } from '../store/useStore';
import { COLORS } from '../utils/theme';
import { formatMoney } from '../utils/currency';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import EmptyState from '../components/EmptyState';

const AREAS = [
  { key: 'salud', label: 'Salud', icon: 'heart', color: '#EF4444' },
  { key: 'mente', label: 'Mente', icon: 'book', color: '#A78BFA' },
  { key: 'familia', label: 'Familia', icon: 'people', color: '#EC4899' },
  { key: 'empresa', label: 'Empresa', icon: 'briefcase', color: '#7C3AED' },
  { key: 'finanzas', label: 'Finanzas', icon: 'wallet', color: '#14B8A6' },
];

const TIME_OPTIONS = [
  { key: '10', label: '10 min', mins: 10 },
  { key: '30', label: '30 min', mins: 30 },
  { key: '60', label: '1 hora', mins: 60 },
  { key: '120', label: '2+ horas', mins: 120 },
];

// Sugerencias por área y tiempo disponible
const SUGGESTIONS = {
  salud: [
    { name: 'Caminar 30 min', icon: 'walk-outline', color: '#10B981', time: 30 },
    { name: 'Ejercicio', icon: 'barbell-outline', color: '#EF4444', time: 45 },
    { name: 'Beber agua (2L)', icon: 'water-outline', color: '#0EA5E9', time: 0 },
    { name: 'Dormir temprano', icon: 'moon-outline', color: '#7C3AED', time: 0 },
  ],
  mente: [
    { name: 'Leer 20 min', icon: 'book-outline', color: '#6366F1', time: 20 },
    { name: 'Meditar 10 min', icon: 'leaf-outline', color: '#A78BFA', time: 10 },
    { name: 'Escribir diario', icon: 'create-outline', color: '#EC4899', time: 15 },
    { name: 'Aprender algo nuevo', icon: 'school-outline', color: '#F59E0B', time: 30 },
  ],
  familia: [
    { name: 'Llamar a un ser querido', icon: 'call-outline', color: '#EC4899', time: 10 },
    { name: 'Tiempo con mis hijos', icon: 'people-outline', color: '#F472B6', time: 60 },
    { name: 'Cena en familia', icon: 'restaurant-outline', color: '#FB7185', time: 60 },
  ],
  empresa: [
    { name: 'Revisar el carro', icon: 'car-sport-outline', color: '#F59E0B', time: 15 },
    { name: 'Hacer taxi más temprano', icon: 'car-outline', color: '#0EA5E9', time: 0 },
    { name: 'Publicar contenido', icon: 'megaphone-outline', color: '#7C3AED', time: 30 },
    { name: 'Revisar ganancias del día', icon: 'trending-up-outline', color: '#10B981', time: 10 },
  ],
  finanzas: [
    { name: 'Revisar gastos del día', icon: 'wallet-outline', color: '#14B8A6', time: 10 },
    { name: 'Ahorrar S/10', icon: 'cash-outline', color: '#10B981', time: 0 },
    { name: 'Actualizar presupuesto', icon: 'calculator-outline', color: '#0EA5E9', time: 15 },
  ],
};

const STEP_COUNT = 3;

export default function HabitsOnboardingScreen({ navigation }) {
  const { addHabit, saveHabits, habits } = useStore();
  const [step, setStep] = useState(0);
  const [area, setArea] = useState(null);
  const [time, setTime] = useState(null);
  const [selected, setSelected] = useState([]);

  const tap = () => Haptics.selectionAsync().catch(() => {});

  const toggleHabit = (s) => {
    tap();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setSelected((arr) => arr.includes(s.name) ? arr.filter((x) => x !== s.name) : [...arr, s.name]);
  };

  const advance = () => { tap(); if (step < STEP_COUNT - 1) setStep(step + 1); else finish(); };
  const back = () => { tap(); if (step > 0) setStep(step - 1); else navigation.goBack(); };

  const finish = async () => {
    tap();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    // Crear los hábitos seleccionados
    const pool = SUGGESTIONS[area] || [];
    for (const name of selected) {
      const s = pool.find((x) => x.name === name);
      if (s) await addHabit({ name: s.name, icon: s.icon.replace('-outline', ''), color: s.color, category: area, reminder: '08:00' });
    }
    navigation.goBack();
  };

  const progress = ((step + 1) / STEP_COUNT) * 100;
  const pool = SUGGESTIONS[area] || [];

  return (
    <LinearGradient colors={['#0A0A0F', '#0D0D1A', '#12102A']} style={styles.bg}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <TouchableOpacity onPress={back} style={styles.backBtn}><Ionicons name="arrow-back" size={20} color={COLORS.textSub} /><Text style={styles.backText}>Atrás</Text></TouchableOpacity>
          <Text style={styles.stepLabel}>Paso {step + 1} de {STEP_COUNT}</Text>
          <View style={styles.progressBg}><View style={[styles.progressFill, { width: `${progress}%` }]} /></View>
        </View>

        {step === 0 && (
          <View>
            <Text style={styles.title}>¿Qué querés mejorar primero?</Text>
            <Text style={styles.subtitle}>Elegí el área donde querés enfocarte. Después podés sumar más.</Text>
            <View style={styles.areaGrid}>
              {AREAS.map((a) => {
                const sel = area === a.key;
                return (
                  <TouchableOpacity key={a.key} onPress={() => { tap(); setArea(a.key); }} style={[styles.areaCard, sel && { backgroundColor: a.color + '22', borderColor: a.color }]}>
                    <Ionicons name={a.icon} size={32} color={sel ? a.color : COLORS.textSub} />
                    <Text style={[styles.areaLabel, sel && { color: a.color, fontWeight: '700' }]}>{a.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {step === 1 && (
          <View>
            <Text style={styles.title}>¿Cuánto tiempo al día le podés dedicar?</Text>
            <Text style={styles.subtitle}>Sé honesto. 10 minutos bien hechos valen más que 2 horas frustradas.</Text>
            <View style={styles.timeGrid}>
              {TIME_OPTIONS.map((t) => {
                const sel = time === t.key;
                return (
                  <TouchableOpacity key={t.key} onPress={() => { tap(); setTime(t.key); }} style={[styles.timeCard, sel && styles.timeCardOn]}>
                    <Text style={[styles.timeText, sel && { color: '#fff', fontWeight: '700' }]}>{t.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {step === 2 && area && (
          <View>
            <Text style={styles.title}>Elegí hasta 3 hábitos para empezar</Text>
            <Text style={styles.subtitle}>Podés sumar más, cambiar o borrar cuando quieras.</Text>
            <View style={styles.suggList}>
              {pool.map((s) => {
                const sel = selected.includes(s.name);
                return (
                  <TouchableOpacity key={s.name} onPress={() => toggleHabit(s)} style={[styles.suggRow, sel && styles.suggRowOn]}>
                    <View style={[styles.suggIcon, { backgroundColor: s.color + '22' }]}><Ionicons name={s.icon} size={20} color={s.color} /></View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.suggName}>{s.name}</Text>
                      <Text style={styles.suggTime}>{s.time > 0 ? `${s.time} min/día` : 'Sin horario fijo'}</Text>
                    </View>
                    {sel ? <Ionicons name="checkmark-circle" size={24} color={COLORS.green} /> : <Ionicons name="add-circle-outline" size={24} color={COLORS.textMuted} />}
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={styles.selCount}>{selected.length} seleccionado{selected.length !== 1 ? 's' : ''}</Text>
          </View>
        )}

        <TouchableOpacity onPress={advance} disabled={(step === 0 && !area) || (step === 1 && !time) || (step === 2 && selected.length === 0)} style={({ pressed }) => [styles.nextBtn, ((step === 0 && !area) || (step === 1 && !time) || (step === 2 && selected.length === 0)) && { opacity: 0.4 }]}>
          <LinearGradient colors={['#7C3AED', '#6D28D9']} style={styles.nextBtnBg}>
            <Text style={styles.nextBtnText}>{step < STEP_COUNT - 1 ? 'Siguiente' : `Crear ${selected.length} hábito${selected.length !== 1 ? 's' : ''}`}</Text>
            <Ionicons name={step < STEP_COUNT - 1 ? 'arrow-forward' : 'checkmark-circle'} size={18} color="#fff" style={{ marginLeft: 8 }} />
          </LinearGradient>
        </TouchableOpacity>

        {step === 0 && <TouchableOpacity onPress={() => navigation.goBack()} style={styles.skip}><Text style={styles.skipText}>Omitir por ahora</Text></TouchableOpacity>}

        <View style={{ height: 30 }} />
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  container: { padding: 24, paddingTop: 56, paddingBottom: 40 },
  header: { marginBottom: 24 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 8, marginLeft: -8, marginBottom: 12 },
  backText: { color: COLORS.textSub, fontSize: 14 },
  stepLabel: { fontSize: 12, color: COLORS.textMuted, marginBottom: 10 },
  progressBg: { height: 4, backgroundColor: COLORS.bg3, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: 4, backgroundColor: COLORS.purple, borderRadius: 4 },
  title: { fontSize: 22, fontWeight: '800', color: COLORS.text, marginBottom: 8 },
  subtitle: { fontSize: 14, color: COLORS.textSub, lineHeight: 20, marginBottom: 20 },
  areaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' },
  areaCard: { width: '47%', backgroundColor: COLORS.card, borderRadius: 16, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: COLORS.cardBorder, marginBottom: 8 },
  areaLabel: { fontSize: 14, color: COLORS.textSub, marginTop: 8 },
  timeGrid: { gap: 12 },
  timeCard: { backgroundColor: COLORS.card, borderRadius: 14, padding: 18, alignItems: 'center', borderWidth: 1, borderColor: COLORS.cardBorder },
  timeCardOn: { backgroundColor: COLORS.purple, borderColor: COLORS.purple },
  timeText: { fontSize: 16, color: COLORS.text, fontWeight: '600' },
  suggList: { gap: 8 },
  suggRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.card, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: COLORS.cardBorder },
  suggRowOn: { borderColor: COLORS.green, backgroundColor: COLORS.greenDim },
  suggIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  suggName: { fontSize: 15, color: COLORS.text, fontWeight: '600' },
  suggTime: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  selCount: { textAlign: 'center', fontSize: 13, color: COLORS.purpleLight, fontWeight: '700', marginTop: 16 },
  nextBtn: { borderRadius: 14, marginTop: 24 },
  nextBtnBg: { paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 14 },
  nextBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  skip: { alignItems: 'center', paddingVertical: 12, marginTop: 8 },
  skipText: { color: COLORS.textMuted, fontSize: 13 },
});
