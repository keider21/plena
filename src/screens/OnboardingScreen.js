import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store/useStore';
import { COLORS } from '../utils/theme';

const STEPS = [
  {
    id: 'objetivo',
    title: '¿Cuál es tu objetivo principal?',
    subtitle: 'Esto personalizará toda tu experiencia',
    type: 'single',
    options: [
      { value: 'familia', label: 'Construir una familia sólida', icon: 'heart', color: '#EC4899' },
      { value: 'empresa', label: 'Lanzar o crecer mi empresa', icon: 'briefcase', color: '#F59E0B' },
      { value: 'finanzas', label: 'Libertad financiera', icon: 'trending-up', color: '#10B981' },
      { value: 'habitos', label: 'Mejorar mis hábitos y salud', icon: 'fitness', color: '#7C3AED' },
      { value: 'todo', label: 'Todo lo anterior', icon: 'star', color: '#0EA5E9' },
    ],
  },
  {
    id: 'prioridades',
    title: '¿Qué áreas quieres trabajar?',
    subtitle: 'Selecciona todas las que apliquen',
    type: 'multi',
    options: [
      { value: 'salud', label: 'Salud y ejercicio', icon: 'barbell', color: '#10B981' },
      { value: 'mente', label: 'Aprendizaje y mente', icon: 'book', color: '#0EA5E9' },
      { value: 'familia', label: 'Familia y pareja', icon: 'heart', color: '#EC4899' },
      { value: 'empresa', label: 'Empresa y trabajo', icon: 'briefcase', color: '#F59E0B' },
      { value: 'finanzas', label: 'Finanzas y ahorro', icon: 'wallet', color: '#7C3AED' },
      { value: 'espiritu', label: 'Espiritualidad y paz', icon: 'moon', color: '#6366F1' },
    ],
  },
  {
    id: 'nivel',
    title: '¿Cómo describes tu disciplina actual?',
    subtitle: 'Sé honesto, esto nos ayuda a calibrar tu plan',
    type: 'single',
    options: [
      { value: 'inicio', label: 'Apenas empezando', icon: 'seedling', color: '#10B981' },
      { value: 'medio', label: 'Tengo algunos hábitos', icon: 'leaf', color: '#0EA5E9' },
      { value: 'avanzado', label: 'Soy bastante disciplinado', icon: 'flash', color: '#F59E0B' },
      { value: 'experto', label: 'Busco el siguiente nivel', icon: 'rocket', color: '#7C3AED' },
    ],
  },
  {
    id: 'horario',
    title: '¿Cuándo prefieres tus recordatorios?',
    subtitle: 'Elegiremos los mejores horarios para ti',
    type: 'single',
    options: [
      { value: 'manana', label: 'Mañanero (5am - 9am)', icon: 'sunny', color: '#F59E0B' },
      { value: 'dia', label: 'Diurno (9am - 5pm)', icon: 'partly-sunny', color: '#0EA5E9' },
      { value: 'tarde', label: 'Vespertino (5pm - 9pm)', icon: 'moon', color: '#7C3AED' },
      { value: 'mixto', label: 'Distribuido en el día', icon: 'time', color: '#10B981' },
    ],
  },
  {
    id: 'nombre_meta',
    title: '¿Cuál es tu meta más importante ahora?',
    subtitle: 'La que más sientes que define este momento',
    type: 'text',
    placeholder: 'Ej: Lanzar mi empresa antes de diciembre',
  },
];

export default function OnboardingScreen() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const { saveProfile, currentUser } = useStore();

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const select = (value) => {
    if (current.type === 'multi') {
      const prev = answers[current.id] || [];
      const next = prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value];
      setAnswers({ ...answers, [current.id]: next });
    } else {
      setAnswers({ ...answers, [current.id]: value });
    }
  };

  const isSelected = (value) => {
    if (current.type === 'multi') return (answers[current.id] || []).includes(value);
    return answers[current.id] === value;
  };

  const canContinue = () => {
    if (current.type === 'text') return (answers[current.id] || '').length > 2;
    if (current.type === 'multi') return (answers[current.id] || []).length > 0;
    return !!answers[current.id];
  };

  const handleNext = async () => {
    if (!canContinue()) return;
    if (isLast) {
      await saveProfile({ ...answers, userId: currentUser.id });
    } else {
      setStep(step + 1);
    }
  };

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <LinearGradient colors={['#0A0A0F', '#0D0D1A', '#12102A']} style={styles.bg}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        <View style={styles.header}>
          <Text style={styles.greeting}>Hola, {currentUser?.name?.split(' ')[0]} 👋</Text>
          <Text style={styles.stepLabel}>Paso {step + 1} de {STEPS.length}</Text>
          <View style={styles.progressBg}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
        </View>

        <View style={styles.questionArea}>
          <Text style={styles.title}>{current.title}</Text>
          <Text style={styles.subtitle}>{current.subtitle}</Text>
        </View>

        {current.type === 'text' ? (
          <View style={styles.textInputWrap}>
            <TextInput
              placeholder={current.placeholder}
              placeholderTextColor={COLORS.textMuted}
              style={styles.textInput}
              value={answers[current.id] || ''}
              onChangeText={v => setAnswers({ ...answers, [current.id]: v })}
              multiline
            />
          </View>
        ) : (
          <View style={styles.options}>
            {current.options.map(opt => {
              const sel = isSelected(opt.value);
              return (
                <TouchableOpacity
                  key={opt.value}
                  onPress={() => select(opt.value)}
                  activeOpacity={0.7}
                  style={[styles.option, sel && { borderColor: opt.color, backgroundColor: opt.color + '18' }]}
                >
                  <View style={[styles.optIcon, { backgroundColor: opt.color + '22' }]}>
                    <Ionicons name={opt.icon + '-outline'} size={22} color={opt.color} />
                  </View>
                  <Text style={[styles.optLabel, sel && { color: opt.color, fontWeight: '600' }]}>{opt.label}</Text>
                  {sel && <Ionicons name="checkmark-circle" size={20} color={opt.color} />}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <View style={styles.navRow}>
          {step > 0 && (
            <TouchableOpacity onPress={() => setStep(step - 1)} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={20} color={COLORS.textSub} />
              <Text style={styles.backText}>Atrás</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={handleNext}
            activeOpacity={0.8}
            style={[styles.nextBtnWrap, !canContinue() && { opacity: 0.4 }]}
          >
            <LinearGradient colors={['#7C3AED', '#6D28D9']} style={styles.nextBtn}>
              <Text style={styles.nextBtnText}>{isLast ? 'Comenzar' : 'Continuar'}</Text>
              <Ionicons name={isLast ? 'rocket-outline' : 'arrow-forward'} size={18} color="#fff" style={{ marginLeft: 8 }} />
            </LinearGradient>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  container: { padding: 24, paddingTop: 56, paddingBottom: 40 },
  header: { marginBottom: 32 },
  greeting: { fontSize: 15, color: COLORS.textSub, marginBottom: 8 },
  stepLabel: { fontSize: 12, color: COLORS.textMuted, marginBottom: 10 },
  progressBg: { height: 4, backgroundColor: COLORS.bg3, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: 4, backgroundColor: COLORS.purple, borderRadius: 4 },
  questionArea: { marginBottom: 28 },
  title: { fontSize: 22, fontWeight: '700', color: COLORS.text, lineHeight: 30, marginBottom: 8 },
  subtitle: { fontSize: 14, color: COLORS.textSub, lineHeight: 20 },
  options: { gap: 10, marginBottom: 32 },
  option: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: COLORS.card, borderRadius: 14, padding: 14,
    borderWidth: 0.5, borderColor: COLORS.cardBorder,
  },
  optIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  optLabel: { flex: 1, fontSize: 14, color: COLORS.text },
  textInputWrap: {
    backgroundColor: COLORS.card, borderRadius: 14, borderWidth: 0.5,
    borderColor: COLORS.cardBorder, padding: 16, marginBottom: 32, minHeight: 100,
  },
  textInput: { color: COLORS.text, fontSize: 15, lineHeight: 22 },
  navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 14 },
  backText: { color: COLORS.textSub, fontSize: 14 },
  nextBtnWrap: { flex: 1 },
  nextBtn: { borderRadius: 14, paddingVertical: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  nextBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
