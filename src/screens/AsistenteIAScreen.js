import React, { useState, useRef, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { format, subMonths, startOfMonth, endOfMonth, subDays, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { useStore } from '../store/useStore';
import { COLORS } from '../utils/theme';
import { formatMoney } from '../utils/currency';
import { goalProgress } from '../utils/goals';

const EXAMPLES = [
  '¿Cuánto gasté este mes?',
  '¿Cómo van mis hábitos?',
  '¿Cuánto me falta para pagar la tarjeta?',
  'Dame un consejo para hoy',
  '¿Cuánto ahorré vs el mes pasado?',
];

const WELCOME = {
  from: 'ia',
  text: 'Hola 👋 Soy tu asistente. Puedo responder sobre tus finanzas, hábitos, metas y darte sugerencias. Probá preguntarme algo o tocá un ejemplo abajo.',
};

const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

// Detecta intención del usuario y devuelve respuesta + acciones
function buildAnswer(input, store) {
  const q = norm(input);
  const cur = store.settings?.currency || 'PEN';
  const txs = store.finance?.transactions || [];
  const habits = (store.habits || []).filter((h) => h.active);
  const habitLogs = store.habitLogs || {};
  const goals = store.goals || [];
  const today = new Date();
  const month = format(today, 'yyyy-MM');
  const lastMonth = format(subMonths(today, 1), 'yyyy-MM');
  const monthName = format(today, "LLLL", { locale: es });
  const lastMonthName = format(subMonths(today, 1), "LLLL", { locale: es });

  // Matchers
  if (/(cuanto.*(gaste|gasto)|gastos? del mes)/.test(q)) {
    const monthTxs = txs.filter((t) => (t.date || '').startsWith(month) && t.type === 'gasto');
    const total = monthTxs.reduce((a, t) => a + (t.amount || 0), 0);
    const byCat = {};
    for (const t of monthTxs) {
      const k = t.category || 'Otros';
      byCat[k] = (byCat[k] || 0) + (t.amount || 0);
    }
    const top = Object.entries(byCat).sort((a, b) => b[1] - a[1]).slice(0, 3);
    return {
      text: `En ${monthName} llevás ${formatMoney(total, cur)} en gastos. Tu top 3 de categorías:\n${top.map(([c, a], i) => `${i + 1}. ${c}: ${formatMoney(a, cur)}`).join('\n') || '— sin gastos aún —'}`,
    };
  }

  if (/(cuanto.*(ingrese|ingreso|ingrese|entre)|ingresos? del mes)/.test(q)) {
    const monthTxs = txs.filter((t) => (t.date || '').startsWith(month) && t.type === 'ingreso');
    const total = monthTxs.reduce((a, t) => a + (t.amount || 0), 0);
    return { text: `En ${monthName} recibiste ${formatMoney(total, cur)} en ingresos. ${total > 0 ? '¡Bien! 👏' : 'Aún no registrás ingresos este mes.'}` };
  }

  if (/(balance|cuanto.*(tengo|sobra))/i.test(q)) {
    const monthTxs = txs.filter((t) => (t.date || '').startsWith(month));
    const ingresos = monthTxs.filter((t) => t.type === 'ingreso').reduce((a, t) => a + (t.amount || 0), 0);
    const gastos = monthTxs.filter((t) => t.type === 'gasto').reduce((a, t) => a + (t.amount || 0), 0);
    const bal = ingresos - gastos;
    return { text: `Tu balance de ${monthName}: ${bal >= 0 ? '+' : ''}${formatMoney(bal, cur)} (ingresos ${formatMoney(ingresos, cur)}, gastos ${formatMoney(gastos, cur)}).` };
  }

  if (/(cuanto.*ahorr|ahorr[eo]|mes pasado)/.test(q)) {
    const curStart = startOfMonth(today);
    const curEnd = endOfMonth(today);
    const lastStart = startOfMonth(subMonths(today, 1));
    const lastEnd = endOfMonth(subMonths(today, 1));
    const sum = (start, end) => txs.filter((t) => {
      const d = t.date;
      if (!d) return false;
      return d >= format(start, 'yyyy-MM-dd') && d <= format(end, 'yyyy-MM-dd');
    }).reduce((acc, t) => {
      if (t.type === 'ingreso') return acc + (t.amount || 0);
      if (t.type === 'gasto') return acc - (t.amount || 0);
      return acc;
    }, 0);
    const curSav = sum(curStart, curEnd);
    const lastSav = sum(lastStart, lastEnd);
    const diff = curSav - lastSav;
    const arrow = diff >= 0 ? '↑' : '↓';
    return { text: `Este mes llevás ${formatMoney(curSav, cur)}. El mes pasado fue ${formatMoney(lastSav, cur)}. ${arrow} ${diff >= 0 ? 'mejor' : 'peor'} por ${formatMoney(Math.abs(diff), cur)}.` };
  }

  if (/(tarjeta|cuanto.*(debo|falta).*pagar|credito)/.test(q)) {
    const cards = store.finance?.cards || [];
    const credit = cards.filter((c) => c.kind !== 'debito');
    if (credit.length === 0) return { text: 'No tenés tarjetas de crédito registradas. Agregá una en Finanzas.' };
    const lines = credit.map((c) => `• ${c.bank}: debes ${formatMoney(c.used || 0, c.currency || cur)} de ${formatMoney(c.limit, c.currency || cur)}`);
    return { text: `Tus tarjetas de crédito:\n${lines.join('\n')}` };
  }

  if (/(habito|como van|como voy|streak|racha)/.test(q)) {
    if (habits.length === 0) return { text: 'No tenés hábitos activos. Andá a Hábitos y creá algunos, o usá el Wizard.' };
    const lines = habits.slice(0, 5).map((h) => {
      const streak = (store.getHabitStreak && store.getHabitStreak(h.id)) || 0;
      const today_status = habitLogs[h.id]?.[format(today, 'yyyy-MM-dd')];
      const today_label = today_status === 'done' ? '✅ hoy' : today_status === 'missed' ? '❌ hoy' : '⏳ hoy';
      return `• ${h.name}: ${streak}🔥 racha, ${today_label}`;
    });
    return { text: `Tus hábitos:\n${lines.join('\n')}` };
  }

  if (/(meta|objetivo|progress)/.test(q)) {
    if (goals.length === 0) return { text: 'No tenés metas todavía. Andá a Metas y creá una.' };
    const lines = goals.slice(0, 4).map((g) => {
      const pct = goalProgress(g);
      return `• ${g.title}: ${pct === null ? '—' : pct + '%'}`;
    });
    return { text: `Tus metas:\n${lines.join('\n')}` };
  }

  if (/(consejo|sugerencia|que hago|recomend|que deberia)/.test(q)) {
    const tips = [];
    const monthGastos = txs.filter((t) => (t.date || '').startsWith(month) && t.type === 'gasto');
    if (monthGastos.length === 0) tips.push('💸 Este mes no registrás gastos. Anotá todo lo que salga, así sabés en qué se va tu plata.');
    const weakHabit = habits.find((h) => {
      const today_s = habitLogs[h.id]?.[format(today, 'yyyy-MM-dd')];
      return today_s === 'missed';
    });
    if (weakHabit) tips.push(`💪 El hábito "${weakHabit.name}" se te escapó hoy. Si tenés un momento, marcalo tarde o anotalo igual.`);
    const cards = store.finance?.cards || [];
    const hotCard = cards.find((c) => c.kind !== 'debito' && c.limit > 0 && ((c.used || 0) / c.limit) >= 0.8);
    if (hotCard) tips.push(`⚠️ Tu tarjeta ${hotCard.bank} está al ${Math.round(((hotCard.used || 0) / hotCard.limit) * 100)}%. Si podés, no la uses este mes.`);
    const goalLow = goals.find((g) => { const p = goalProgress(g); return p !== null && p < 50; });
    if (goalLow) tips.push(`🎯 Tu meta "${goalLow.title}" está al ${goalProgress(goalLow)}%. Un pasito más hoy.`);
    if (tips.length === 0) tips.push('✨ Todo va bien. Mantenete así, un día a la vez.');
    return { text: tips.join('\n\n') };
  }

  if (/(hola|buenos|buenas|hi|hello|que tal)/.test(q)) {
    const hour = today.getHours();
    const g = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches';
    return { text: `${g} 👋 ¿En qué te ayudo?` };
  }

  if (/(gracias|thanks|thx)/.test(q)) {
    return { text: 'De nada 🪶. Acá estoy para lo que necesites.' };
  }

  if (/(que puedes|que sabes|help|ayuda)/.test(q)) {
    return { text: 'Puedo responder sobre:\n• Tus gastos / ingresos del mes\n• Balance y ahorro\n• Tarjetas de crédito (cuánto debés)\n• Hábitos y rachas\n• Metas y progreso\n• Consejos personalizados\n\nProbá los ejemplos de abajo 👇' };
  }

  // Default
  return {
    text: 'Mmm, no entendí esa pregunta 🤔. Probá con algo como "¿cuánto gasté?", "¿cómo van mis hábitos?" o "dame un consejo". Toca los ejemplos de abajo para inspirarte.',
  };
}

export default function AsistenteIAScreen() {
  const store = useStore();
  const cur = store.settings?.currency || 'PEN';
  const [messages, setMessages] = useState([WELCOME]);
  const [text, setText] = useState('');
  const scrollRef = useRef(null);

  const send = (msg) => {
    const t = (msg ?? text).trim();
    if (!t) return;
    Haptics.selectionAsync().catch(() => {});
    const userMsg = { from: 'user', text: t };
    const answer = buildAnswer(t, store);
    const iaMsg = { from: 'ia', text: answer.text };
    setMessages((m) => [...m, userMsg, iaMsg]);
    setText('');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const voice = () => Alert.alert('Voz en desarrollo', 'El dictado por voz necesita un módulo nativo. Lo activaremos con un development build más adelante.');

  return (
    <View style={styles.bg}>
      <LinearGradient colors={['#1A0A3E', '#0D0D1A']} style={styles.hero}>
        <View style={styles.heroRow}>
          <View style={styles.heroIcon}><Ionicons name="sparkles" size={20} color="#fff" /></View>
          <View>
            <Text style={styles.heroTitle}>Asistente IA</Text>
            <Text style={styles.heroSub}>Tu copiloto dentro de Vida Plena</Text>
          </View>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={styles.chat} showsVerticalScrollIndicator={false}>
          {messages.map((m, i) => (
            <View key={i} style={[styles.bubble, m.from === 'user' ? styles.bubbleUser : styles.bubbleIA]}>
              <Text style={[styles.bubbleText, m.from === 'user' && { color: '#fff' }]}>{m.text}</Text>
            </View>
          ))}

          {messages.length <= 1 && (
            <View style={styles.examples}>
              <Text style={styles.examplesTitle}>Probá con:</Text>
              {EXAMPLES.map((ex) => (
                <TouchableOpacity key={ex} style={styles.exChip} onPress={() => send(ex)}>
                  <Ionicons name="arrow-up-circle-outline" size={16} color={COLORS.purpleLight} />
                  <Text style={styles.exText}>{ex}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>

        <View style={styles.inputBar}>
          <TouchableOpacity style={styles.micBtn} onPress={voice}><Ionicons name="mic-outline" size={22} color={COLORS.purpleLight} /></TouchableOpacity>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="Preguntame algo…"
            placeholderTextColor={COLORS.textMuted}
            onSubmitEditing={() => send()}
            returnKeyType="send"
            multiline
          />
          <TouchableOpacity style={styles.sendBtn} onPress={() => send()}><Ionicons name="send" size={18} color="#fff" /></TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: COLORS.bg },
  hero: { padding: 20, paddingTop: 54, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  heroIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: COLORS.purple, alignItems: 'center', justifyContent: 'center' },
  heroTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  heroSub: { fontSize: 12, color: COLORS.purpleLight, marginTop: 2 },
  chat: { padding: 16, gap: 10, paddingBottom: 20 },
  bubble: { maxWidth: '85%', borderRadius: 16, padding: 12 },
  bubbleIA: { backgroundColor: COLORS.card, alignSelf: 'flex-start', borderWidth: 0.5, borderColor: COLORS.cardBorder },
  bubbleUser: { backgroundColor: COLORS.purple, alignSelf: 'flex-end' },
  bubbleText: { fontSize: 14, color: COLORS.text, lineHeight: 20 },
  examples: { marginTop: 16, gap: 8 },
  examplesTitle: { fontSize: 12, color: COLORS.textSub, marginBottom: 2 },
  exChip: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.bg2, borderRadius: 12, padding: 12, borderWidth: 0.5, borderColor: COLORS.cardBorder },
  exText: { flex: 1, fontSize: 13, color: COLORS.textSub },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: COLORS.bg2, borderTopWidth: 0.5, borderTopColor: COLORS.cardBorder },
  micBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: COLORS.card, alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: COLORS.cardBorder },
  input: { flex: 1, maxHeight: 110, backgroundColor: COLORS.card, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, color: COLORS.text, fontSize: 15, borderWidth: 0.5, borderColor: COLORS.cardBorder },
  sendBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: COLORS.purple, alignItems: 'center', justifyContent: 'center' },
});
