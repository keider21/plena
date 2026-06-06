import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store/useStore';
import { COLORS } from '../utils/theme';
import { formatMoney } from '../utils/currency';
import { ACCOUNT_TYPES, accountType, CARD_KINDS, DEBT_PRIORITIES } from '../utils/finance';

const num = (v) => { const n = parseFloat(String(v ?? '').replace(',', '.')); return isNaN(n) ? 0 : n; };
const DEBT_KINDS = ['Préstamo', 'Tarjeta', 'Personal'];

export default function OnboardingScreen() {
  const { saveProfile, currentUser, settings, addAccount, addCard, addDebt } = useStore();
  const cur = settings.currency;
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const [accounts, setAccounts] = useState([]);
  const [cards, setCards] = useState([]);
  const [debts, setDebts] = useState([]);
  const [accDraft, setAccDraft] = useState({ type: 'bcp', name: '', balance: '' });
  const [cardDraft, setCardDraft] = useState({ kind: 'credito', bank: '', amount: '' });
  const [debtDraft, setDebtDraft] = useState({ type: 'Préstamo', creditor: '', amount: '', priority: 'media' });

  const addAcc = () => {
    const t = accountType(accDraft.type);
    setAccounts((a) => [...a, { type: accDraft.type, name: accDraft.name.trim() || t.label, balance: num(accDraft.balance) }]);
    setAccDraft({ type: 'bcp', name: '', balance: '' });
  };
  const addCardD = () => {
    if (!cardDraft.bank.trim()) return;
    setCards((c) => [...c, { kind: cardDraft.kind, bank: cardDraft.bank.trim(), amount: num(cardDraft.amount) }]);
    setCardDraft({ kind: 'credito', bank: '', amount: '' });
  };
  const addDebtD = () => {
    if (!debtDraft.creditor.trim()) return;
    setDebts((d) => [...d, { type: debtDraft.type, creditor: debtDraft.creditor.trim(), amount: num(debtDraft.amount), priority: debtDraft.priority }]);
    setDebtDraft({ type: 'Préstamo', creditor: '', amount: '', priority: 'media' });
  };

  const finish = async () => {
    setSaving(true);
    try {
      for (const a of accounts) await addAccount({ name: a.name, type: a.type, balance: a.balance });
      for (const c of cards) {
        if (c.kind === 'debito') await addCard({ kind: 'debito', bank: c.bank, balance: c.amount });
        else await addCard({ kind: 'credito', bank: c.bank, limit: c.amount, used: 0 });
      }
      for (const d of debts) await addDebt({ creditor: d.creditor, amount: d.amount, priority: d.priority, concept: d.type });
      await saveProfile({ userId: currentUser?.id, setupDone: true });
    } catch (e) {
      await saveProfile({ userId: currentUser?.id, setupDone: true });
    }
  };

  const total = 4;
  const progress = ((step + 1) / total) * 100;

  return (
    <LinearGradient colors={['#0A0A0F', '#0D0D1A', '#12102A']} style={styles.bg}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.greeting}>Hola, {currentUser?.name?.split(' ')[0] || ''} 👋</Text>
          <Text style={styles.stepLabel}>Paso {step + 1} de {total}</Text>
          <View style={styles.progressBg}><View style={[styles.progressFill, { width: `${progress}%` }]} /></View>
        </View>

        {/* PASO 0 — Bienvenida */}
        {step === 0 && (
          <View>
            <Text style={styles.title}>Configuremos tus finanzas</Text>
            <Text style={styles.subtitle}>En 1 minuto registramos tus cuentas, tarjetas y deudas con sus saldos. Puedes omitir lo que quieras y agregarlo después. Esto solo aparece una vez.</Text>
            <View style={styles.welcomeCard}>
              <Row icon="wallet-outline" color={COLORS.green} text="Cuentas (BCP, Yape, efectivo...) con su saldo" />
              <Row icon="card-outline" color={COLORS.purpleLight} text="Tarjetas de crédito o débito" />
              <Row icon="trending-down-outline" color={COLORS.red} text="Deudas y préstamos" />
            </View>
          </View>
        )}

        {/* PASO 1 — Cuentas */}
        {step === 1 && (
          <View>
            <Text style={styles.title}>Tus cuentas y saldos</Text>
            <Text style={styles.subtitle}>Elige el tipo, ponle saldo y agrégala. Puedes añadir varias.</Text>

            <Text style={styles.lbl}>Tipo</Text>
            <View style={styles.chips}>
              {ACCOUNT_TYPES.map((t) => {
                const sel = accDraft.type === t.key;
                return (
                  <TouchableOpacity key={t.key} onPress={() => setAccDraft((d) => ({ ...d, type: t.key }))} style={[styles.chip, sel && { backgroundColor: t.color + '22', borderColor: t.color }]}>
                    <Ionicons name={t.icon} size={14} color={sel ? t.color : COLORS.textSub} />
                    <Text style={[styles.chipText, sel && { color: t.color, fontWeight: '700' }]}>{t.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={styles.formRow}>
              <TextInput style={[styles.input, { flex: 1.4 }]} value={accDraft.name} onChangeText={(v) => setAccDraft((d) => ({ ...d, name: v }))} placeholder="Nombre (opcional)" placeholderTextColor={COLORS.textMuted} />
              <TextInput style={[styles.input, { flex: 1 }]} value={accDraft.balance} onChangeText={(v) => setAccDraft((d) => ({ ...d, balance: v }))} keyboardType="numeric" placeholder="Saldo" placeholderTextColor={COLORS.textMuted} />
              <TouchableOpacity style={styles.addBtn} onPress={addAcc}><Ionicons name="add" size={22} color="#fff" /></TouchableOpacity>
            </View>

            {accounts.map((a, i) => (
              <ItemRow key={i} icon={accountType(a.type).icon} color={accountType(a.type).color} title={a.name} sub={formatMoney(a.balance, cur)} onDel={() => setAccounts((arr) => arr.filter((_, j) => j !== i))} />
            ))}
          </View>
        )}

        {/* PASO 2 — Tarjetas */}
        {step === 2 && (
          <View>
            <Text style={styles.title}>Tus tarjetas</Text>
            <Text style={styles.subtitle}>Crédito o débito. Puedes añadir varias u omitir.</Text>

            <Text style={styles.lbl}>Tipo</Text>
            <View style={styles.chips}>
              {CARD_KINDS.map((k) => {
                const sel = cardDraft.kind === k.key;
                return (
                  <TouchableOpacity key={k.key} onPress={() => setCardDraft((d) => ({ ...d, kind: k.key }))} style={[styles.chip, sel && { backgroundColor: COLORS.purpleDim, borderColor: COLORS.purple }]}>
                    <Ionicons name={k.icon} size={14} color={sel ? COLORS.purpleLight : COLORS.textSub} />
                    <Text style={[styles.chipText, sel && { color: COLORS.purpleLight, fontWeight: '700' }]}>{k.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={styles.formRow}>
              <TextInput style={[styles.input, { flex: 1.4 }]} value={cardDraft.bank} onChangeText={(v) => setCardDraft((d) => ({ ...d, bank: v }))} placeholder="Banco / nombre" placeholderTextColor={COLORS.textMuted} />
              <TextInput style={[styles.input, { flex: 1 }]} value={cardDraft.amount} onChangeText={(v) => setCardDraft((d) => ({ ...d, amount: v }))} keyboardType="numeric" placeholder={cardDraft.kind === 'debito' ? 'Saldo' : 'Línea'} placeholderTextColor={COLORS.textMuted} />
              <TouchableOpacity style={styles.addBtn} onPress={addCardD}><Ionicons name="add" size={22} color="#fff" /></TouchableOpacity>
            </View>

            {cards.map((c, i) => (
              <ItemRow key={i} icon={c.kind === 'debito' ? 'card' : 'card-outline'} color={COLORS.purpleLight} title={`${c.bank} · ${c.kind === 'debito' ? 'Débito' : 'Crédito'}`} sub={`${c.kind === 'debito' ? 'Saldo' : 'Línea'} ${formatMoney(c.amount, cur)}`} onDel={() => setCards((arr) => arr.filter((_, j) => j !== i))} />
            ))}
          </View>
        )}

        {/* PASO 3 — Deudas */}
        {step === 3 && (
          <View>
            <Text style={styles.title}>Tus deudas</Text>
            <Text style={styles.subtitle}>Préstamos, tarjetas o deudas personales. Omite si no tienes.</Text>

            <Text style={styles.lbl}>Tipo</Text>
            <View style={styles.chips}>
              {DEBT_KINDS.map((k) => {
                const sel = debtDraft.type === k;
                return (
                  <TouchableOpacity key={k} onPress={() => setDebtDraft((d) => ({ ...d, type: k }))} style={[styles.chip, sel && { backgroundColor: COLORS.redDim, borderColor: COLORS.red }]}>
                    <Text style={[styles.chipText, sel && { color: COLORS.red, fontWeight: '700' }]}>{k}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={styles.formRow}>
              <TextInput style={[styles.input, { flex: 1.4 }]} value={debtDraft.creditor} onChangeText={(v) => setDebtDraft((d) => ({ ...d, creditor: v }))} placeholder="¿A quién le debes?" placeholderTextColor={COLORS.textMuted} />
              <TextInput style={[styles.input, { flex: 1 }]} value={debtDraft.amount} onChangeText={(v) => setDebtDraft((d) => ({ ...d, amount: v }))} keyboardType="numeric" placeholder="Monto" placeholderTextColor={COLORS.textMuted} />
              <TouchableOpacity style={styles.addBtn} onPress={addDebtD}><Ionicons name="add" size={22} color="#fff" /></TouchableOpacity>
            </View>
            <View style={styles.chips}>
              {DEBT_PRIORITIES.map((p) => {
                const sel = debtDraft.priority === p.key;
                return (
                  <TouchableOpacity key={p.key} onPress={() => setDebtDraft((d) => ({ ...d, priority: p.key }))} style={[styles.chip, sel && { backgroundColor: p.color + '22', borderColor: p.color }]}>
                    <Text style={[styles.chipText, sel && { color: p.color, fontWeight: '700' }]}>Prioridad {p.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {debts.map((d, i) => (
              <ItemRow key={i} icon="trending-down-outline" color={COLORS.red} title={`${d.creditor} · ${d.type}`} sub={formatMoney(d.amount, cur)} onDel={() => setDebts((arr) => arr.filter((_, j) => j !== i))} />
            ))}
          </View>
        )}

        <View style={styles.navRow}>
          {step > 0 && (
            <TouchableOpacity onPress={() => setStep(step - 1)} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={20} color={COLORS.textSub} /><Text style={styles.backText}>Atrás</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => (step < total - 1 ? setStep(step + 1) : finish())} activeOpacity={0.85} style={[styles.nextBtnWrap, saving && { opacity: 0.5 }]} disabled={saving}>
            <LinearGradient colors={['#7C3AED', '#6D28D9']} style={styles.nextBtn}>
              <Text style={styles.nextBtnText}>{step === 0 ? 'Empezar' : step < total - 1 ? 'Siguiente' : (saving ? 'Guardando...' : 'Finalizar')}</Text>
              <Ionicons name={step < total - 1 ? 'arrow-forward' : 'checkmark-circle'} size={18} color="#fff" style={{ marginLeft: 8 }} />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {step > 0 && step < total - 1 && (
          <TouchableOpacity onPress={() => setStep(step + 1)} style={styles.skip}><Text style={styles.skipText}>Omitir este paso</Text></TouchableOpacity>
        )}

        <View style={{ height: 30 }} />
      </ScrollView>
    </LinearGradient>
  );
}

const Row = ({ icon, color, text }) => (
  <View style={styles.wRow}><View style={[styles.wIcon, { backgroundColor: color + '22' }]}><Ionicons name={icon} size={18} color={color} /></View><Text style={styles.wText}>{text}</Text></View>
);
const ItemRow = ({ icon, color, title, sub, onDel }) => (
  <View style={styles.itemRow}>
    <View style={[styles.wIcon, { backgroundColor: color + '22' }]}><Ionicons name={icon} size={16} color={color} /></View>
    <View style={{ flex: 1 }}><Text style={styles.itemTitle}>{title}</Text><Text style={styles.itemSub}>{sub}</Text></View>
    <TouchableOpacity onPress={onDel} style={{ padding: 6 }}><Ionicons name="trash-outline" size={18} color={COLORS.red} /></TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  bg: { flex: 1 },
  container: { padding: 24, paddingTop: 56, paddingBottom: 40 },
  header: { marginBottom: 24 },
  greeting: { fontSize: 15, color: COLORS.textSub, marginBottom: 8 },
  stepLabel: { fontSize: 12, color: COLORS.textMuted, marginBottom: 10 },
  progressBg: { height: 4, backgroundColor: COLORS.bg3, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: 4, backgroundColor: COLORS.purple, borderRadius: 4 },
  title: { fontSize: 22, fontWeight: '800', color: COLORS.text, marginBottom: 8 },
  subtitle: { fontSize: 14, color: COLORS.textSub, lineHeight: 20, marginBottom: 20 },
  welcomeCard: { backgroundColor: COLORS.card, borderRadius: 16, padding: 16, gap: 14, borderWidth: 0.5, borderColor: COLORS.cardBorder },
  wRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  wIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  wText: { flex: 1, fontSize: 14, color: COLORS.text },
  lbl: { fontSize: 12, color: COLORS.textSub, fontWeight: '600', marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.card, borderWidth: 0.5, borderColor: COLORS.cardBorder },
  chipText: { fontSize: 13, color: COLORS.textSub },
  formRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  input: { backgroundColor: COLORS.card, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, color: COLORS.text, fontSize: 14, borderWidth: 0.5, borderColor: COLORS.cardBorder },
  addBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: COLORS.purple, alignItems: 'center', justifyContent: 'center' },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: COLORS.bg3, borderRadius: 12, padding: 10, marginBottom: 8 },
  itemTitle: { fontSize: 14, color: COLORS.text, fontWeight: '600' },
  itemSub: { fontSize: 12, color: COLORS.textSub, marginTop: 1 },
  navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 18 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 14 },
  backText: { color: COLORS.textSub, fontSize: 14 },
  nextBtnWrap: { flex: 1 },
  nextBtn: { borderRadius: 14, paddingVertical: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  nextBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  skip: { alignItems: 'center', paddingVertical: 12 },
  skipText: { color: COLORS.textMuted, fontSize: 13 },
});
