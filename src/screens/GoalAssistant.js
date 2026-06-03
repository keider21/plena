import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store/useStore';
import { COLORS } from '../utils/theme';
import { buildQuestions, applyAnswers, newGoal } from '../utils/goals';

export default function GoalAssistant({ navigation, route }) {
  const title = route.params?.title || 'Mi meta';
  const { addGoal } = useStore();
  const questions = useMemo(() => buildQuestions(title), [title]);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});

  const current = questions[step];
  const isLast = step === questions.length - 1;
  const progress = ((step + 1) / questions.length) * 100;
  const value = answers[current.id] || '';

  const setVal = (v) => setAnswers((a) => ({ ...a, [current.id]: v }));

  const finish = async () => {
    const goal = applyAnswers(newGoal({ title }), questions, answers);
    const saved = await addGoal(goal);
    navigation.replace('GoalDetail', { id: saved.id });
  };

  const next = () => { if (isLast) finish(); else setStep(step + 1); };

  return (
    <LinearGradient colors={['#0A0A0F', '#0D0D1A', '#12102A']} style={styles.bg}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Ionicons name="close" size={24} color={COLORS.textSub} />
        </TouchableOpacity>
        <Text style={styles.topTitle} numberOfLines={1}>{title}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.assistantBadge}>
          <Ionicons name="sparkles" size={14} color={COLORS.purpleLight} />
          <Text style={styles.assistantText}>Asistente · paso {step + 1} de {questions.length}</Text>
        </View>
        <View style={styles.progressBg}><View style={[styles.progressFill, { width: `${progress}%` }]} /></View>

        <Text style={styles.question}>{current.q}</Text>

        <TextInput
          placeholder={current.ph}
          placeholderTextColor={COLORS.textMuted}
          style={[styles.input, current.multi && styles.inputMulti]}
          value={value}
          onChangeText={setVal}
          multiline={!!current.multi}
          autoFocus
        />
        {current.multi && <Text style={styles.tip}>Escribe uno por línea — cada línea será un item.</Text>}

        <View style={styles.navRow}>
          {step > 0 && (
            <TouchableOpacity onPress={() => setStep(step - 1)} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={18} color={COLORS.textSub} />
              <Text style={styles.backText}>Atrás</Text>
            </TouchableOpacity>
          )}
          <View style={{ flex: 1 }} />
          {!value.trim() && !isLast && (
            <TouchableOpacity onPress={() => setStep(step + 1)} style={styles.skipBtn}>
              <Text style={styles.skipText}>Omitir</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={next} activeOpacity={0.85} style={styles.nextBtnWrap}>
            <LinearGradient colors={['#7C3AED', '#6D28D9']} style={styles.nextBtn}>
              <Text style={styles.nextBtnText}>{isLast ? 'Crear meta' : 'Siguiente'}</Text>
              <Ionicons name={isLast ? 'checkmark' : 'arrow-forward'} size={18} color="#fff" style={{ marginLeft: 8 }} />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingTop: 52, paddingBottom: 10 },
  iconBtn: { padding: 4 },
  topTitle: { flex: 1, textAlign: 'center', fontSize: 15, fontWeight: '700', color: COLORS.text },
  container: { padding: 24 },
  assistantBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  assistantText: { fontSize: 12, color: COLORS.purpleLight, fontWeight: '600' },
  progressBg: { height: 4, backgroundColor: COLORS.bg3, borderRadius: 4, overflow: 'hidden', marginBottom: 28 },
  progressFill: { height: 4, backgroundColor: COLORS.purple, borderRadius: 4 },
  question: { fontSize: 22, fontWeight: '700', color: COLORS.text, lineHeight: 30, marginBottom: 20 },
  input: {
    backgroundColor: COLORS.card, borderRadius: 14, padding: 16, color: COLORS.text, fontSize: 16,
    borderWidth: 0.5, borderColor: COLORS.cardBorder,
  },
  inputMulti: { minHeight: 120, textAlignVertical: 'top' },
  tip: { fontSize: 12, color: COLORS.textMuted, marginTop: 8 },
  navRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 32 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 12, paddingRight: 8 },
  backText: { color: COLORS.textSub, fontSize: 14 },
  skipBtn: { paddingVertical: 12, paddingHorizontal: 12 },
  skipText: { color: COLORS.textSub, fontSize: 14, fontWeight: '600' },
  nextBtnWrap: {},
  nextBtn: { borderRadius: 14, paddingVertical: 14, paddingHorizontal: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  nextBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
