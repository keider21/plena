import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store/useStore';
import { COLORS } from '../utils/theme';
import { formatMoney } from '../utils/currency';
import { ACCOUNT_TYPES, accountType, CARD_KINDS, LOAN_TYPES, loanType, DEBT_PRIORITIES, OCCUPATIONS } from '../utils/finance';

const num = (v) => { const n = parseFloat(String(v ?? '').replace(',', '.')); return isNaN(n) ? 0 : n; };
const ACC0 = { type: 'bcp', name: '', balance: '' };
const CARD0 = { kind: 'credito', bank: '', amount: '' };
const LOAN0 = { lender: '', type: 'banco', amount: '', date: '', monthly: '', interest: '', pending: '' };
const DEBT0 = { creditor: '', concept: '', date: '', amount: '', pending: '', priority: 'media', notes: '' };
const TOTAL = 5;

export default function OnboardingScreen() {
  const { saveProfile, currentUser, settings, addAccount, addCard, addLoan, addDebt } = useStore();
  const cur = settings.currency;
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const [occupation, setOccupation] = useState('');
  const [accounts, setAccounts] = useState([]);
  const [cards, setCards] = useState([]);
  const [loans, setLoans] = useState([]);
  const [debts, setDebts] = useState([]);
  const [accD, setAccD] = useState(ACC0);
  const [cardD, setCardD] = useState(CARD0);
  const [loanD, setLoanD] = useState(LOAN0);
  const [debtD, setDebtD] = useState(DEBT0);

  // builders (puros) — evitan perder lo escrito al finalizar
  const buildAcc = () => ({ type: accD.type, name: accD.name.trim() || accountType(accD.type).label, balance: num(accD.balance) });
  const buildCard = () => ({ kind: cardD.kind, bank: cardD.bank.trim() || 'Tarjeta', amount: num(cardD.amount) });
  const buildLoan = () => ({ name: loanD.lender.trim() || 'Préstamo', lenderType: loanD.type, amount: num(loanD.amount), pending: loanD.pending !== '' ? num(loanD.pending) : num(loanD.amount), installment: num(loanD.monthly), interest: num(loanD.interest), startDate: loanD.date });
  const buildDebt = () => ({ creditor: debtD.creditor.trim() || 'Deuda', concept: debtD.concept.trim(), startDate: debtD.date, amount: num(debtD.amount), paid: debtD.pending !== '' ? Math.max(0, num(debtD.amount) - num(debtD.pending)) : 0, priority: debtD.priority, notes: debtD.notes.trim() });

  const accHas = () => !!(accD.name.trim() || String(accD.balance).trim());
  const cardHas = () => !!(cardD.bank.trim() || String(cardD.amount).trim());
  const loanHas = () => !!(loanD.lender.trim() || String(loanD.amount).trim() || String(loanD.pending).trim());
  const debtHas = () => !!(debtD.creditor.trim() || String(debtD.amount).trim() || String(debtD.pending).trim());

  const addAcc = () => { setAccounts((a) => [...a, buildAcc()]); setAccD(ACC0); };
  const addCardD = () => { if (!cardHas()) return; setCards((c) => [...c, buildCard()]); setCardD(CARD0); };
  const addLoanD = () => { if (!loanHas()) return; setLoans((l) => [...l, buildLoan()]); setLoanD(LOAN0); };
  const addDebtD = () => { if (!debtHas()) return; setDebts((d) => [...d, buildDebt()]); setDebtD(DEBT0); };

  const stepHas = () => (step === 1 ? accHas() : step === 2 ? cardHas() : step === 3 ? loanHas() : step === 4 ? debtHas() : false);
  const commitStep = () => { if (step === 1) addAcc(); else if (step === 2) addCardD(); else if (step === 3) addLoanD(); else if (step === 4) addDebtD(); };
  const clearStep = () => { if (step === 1) setAccD(ACC0); else if (step === 2) setCardD(CARD0); else if (step === 3) setLoanD(LOAN0); else if (step === 4) setDebtD(DEBT0); };

  const advance = () => { if (step < TOTAL - 1) setStep(step + 1); else finish(); };
  const goNext = () => {
    if (step >= 1 && step <= 3 && stepHas()) {
      Alert.alert('Tienes datos sin agregar', '¿Deseas agregarlos antes de continuar?', [
        { text: 'Seguir sin agregar', onPress: () => { clearStep(); advance(); } },
        { text: 'Agregar y seguir', onPress: () => { commitStep(); advance(); } },
        { text: 'Cancelar', style: 'cancel' },
      ]);
      return;
    }
    advance();
  };

  const finish = async () => {
    setSaving(true);
    // incluir cualquier borrador no agregado para no perder datos
    const allAcc = accHas() ? [...accounts, buildAcc()] : accounts;
    const allCards = cardHas() ? [...cards, buildCard()] : cards;
    const allLoans = loanHas() ? [...loans, buildLoan()] : loans;
    const allDebts = debtHas() ? [...debts, buildDebt()] : debts;
    try {
      for (const a of allAcc) await addAccount({ name: a.name, type: a.type, balance: a.balance });
      for (const c of allCards) {
        if (c.kind === 'debito') await addCard({ kind: 'debito', bank: c.bank, balance: c.amount });
        else await addCard({ kind: 'credito', bank: c.bank, limit: c.amount, used: 0 });
      }
      for (const l of allLoans) await addLoan(l);
      for (const d of allDebts) await addDebt(d);
    } catch (e) { /* noop */ }
    await saveProfile({ userId: currentUser?.id, occupation, setupDone: true });
  };

  const progress = ((step + 1) / TOTAL) * 100;

  return (
    <LinearGradient colors={['#0A0A0F', '#0D0D1A', '#12102A']} style={styles.bg}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.greeting}>Hola, {currentUser?.name?.split(' ')[0] || ''} 👋</Text>
          <Text style={styles.stepLabel}>Paso {step + 1} de {TOTAL}</Text>
          <View style={styles.progressBg}><View style={[styles.progressFill, { width: `${progress}%` }]} /></View>
        </View>

        {/* PASO 0 — Bienvenida + profesión */}
        {step === 0 && (
          <View>
            <Text style={styles.title}>Configuremos tus finanzas</Text>
            <Text style={styles.subtitle}>En 1 minuto registramos tus cuentas, tarjetas, préstamos y deudas. Puedes omitir lo que quieras. Esto solo aparece una vez.</Text>
            <Text style={styles.lbl}>¿A qué te dedicas?</Text>
            <View style={styles.chips}>
              {OCCUPATIONS.map((o) => {
                const sel = occupation === o.key;
                return (
                  <TouchableOpacity key={o.key} onPress={() => setOccupation(o.key)} style={[styles.chip, sel && { backgroundColor: COLORS.purpleDim, borderColor: COLORS.purple }]}>
                    <Text style={[styles.chipText, sel && { color: COLORS.purpleLight, fontWeight: '700' }]}>{o.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={styles.help}>Esto crea una categoría de ingreso propia (ej. "Ingresos por taxi") para estadísticas más reales.</Text>
          </View>
        )}

        {/* PASO 1 — Cuentas */}
        {step === 1 && (
          <View>
            <Text style={styles.title}>Tus cuentas y saldos</Text>
            <Text style={styles.subtitle}>Elige el tipo, ponle saldo y agrégala con +. Puedes añadir varias.</Text>
            <Text style={styles.lbl}>Tipo</Text>
            <View style={styles.chips}>
              {ACCOUNT_TYPES.map((t) => {
                const sel = accD.type === t.key;
                return (
                  <TouchableOpacity key={t.key} onPress={() => setAccD((d) => ({ ...d, type: t.key }))} style={[styles.chip, sel && { backgroundColor: t.color + '22', borderColor: t.color }]}>
                    <Ionicons name={t.icon} size={14} color={sel ? t.color : COLORS.textSub} />
                    <Text style={[styles.chipText, sel && { color: t.color, fontWeight: '700' }]}>{t.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={styles.formRow}>
              <TextInput style={[styles.input, { flex: 1.4 }]} value={accD.name} onChangeText={(v) => setAccD((d) => ({ ...d, name: v }))} placeholder="Nombre (opcional)" placeholderTextColor={COLORS.textMuted} />
              <TextInput style={[styles.input, { flex: 1 }]} value={accD.balance} onChangeText={(v) => setAccD((d) => ({ ...d, balance: v }))} keyboardType="numeric" placeholder="Saldo" placeholderTextColor={COLORS.textMuted} />
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
            <Text style={styles.subtitle}>Crédito o débito. Añade varias u omite.</Text>
            <Text style={styles.lbl}>Tipo</Text>
            <View style={styles.chips}>
              {CARD_KINDS.map((k) => {
                const sel = cardD.kind === k.key;
                return (
                  <TouchableOpacity key={k.key} onPress={() => setCardD((d) => ({ ...d, kind: k.key }))} style={[styles.chip, sel && { backgroundColor: COLORS.purpleDim, borderColor: COLORS.purple }]}>
                    <Ionicons name={k.icon} size={14} color={sel ? COLORS.purpleLight : COLORS.textSub} />
                    <Text style={[styles.chipText, sel && { color: COLORS.purpleLight, fontWeight: '700' }]}>{k.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={styles.formRow}>
              <TextInput style={[styles.input, { flex: 1.4 }]} value={cardD.bank} onChangeText={(v) => setCardD((d) => ({ ...d, bank: v }))} placeholder="Banco / nombre" placeholderTextColor={COLORS.textMuted} />
              <TextInput style={[styles.input, { flex: 1 }]} value={cardD.amount} onChangeText={(v) => setCardD((d) => ({ ...d, amount: v }))} keyboardType="numeric" placeholder={cardD.kind === 'debito' ? 'Saldo' : 'Línea'} placeholderTextColor={COLORS.textMuted} />
              <TouchableOpacity style={styles.addBtn} onPress={addCardD}><Ionicons name="add" size={22} color="#fff" /></TouchableOpacity>
            </View>
            {cards.map((c, i) => (
              <ItemRow key={i} icon={c.kind === 'debito' ? 'card' : 'card-outline'} color={COLORS.purpleLight} title={`${c.bank} · ${c.kind === 'debito' ? 'Débito' : 'Crédito'}`} sub={`${c.kind === 'debito' ? 'Saldo' : 'Línea'} ${formatMoney(c.amount, cur)}`} onDel={() => setCards((arr) => arr.filter((_, j) => j !== i))} />
            ))}
          </View>
        )}

        {/* PASO 3 — Préstamos */}
        {step === 3 && (
          <View>
            <Text style={styles.title}>Tus préstamos</Text>
            <Text style={styles.subtitle}>Dinero que te prestaron. Omite si no tienes.</Text>
            <Text style={styles.lbl}>¿Quién te prestó?</Text>
            <View style={styles.chips}>
              {LOAN_TYPES.map((t) => {
                const sel = loanD.type === t.key;
                return (
                  <TouchableOpacity key={t.key} onPress={() => setLoanD((d) => ({ ...d, type: t.key }))} style={[styles.chip, sel && { backgroundColor: t.color + '22', borderColor: t.color }]}>
                    <Text style={[styles.chipText, sel && { color: t.color, fontWeight: '700' }]}>{t.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TextInput style={styles.inputFull} value={loanD.lender} onChangeText={(v) => setLoanD((d) => ({ ...d, lender: v }))} placeholder="Entidad o persona (ej. BCP, mi tío)" placeholderTextColor={COLORS.textMuted} />
            <View style={styles.formRow}>
              <TextInput style={[styles.input, { flex: 1 }]} value={loanD.amount} onChangeText={(v) => setLoanD((d) => ({ ...d, amount: v }))} keyboardType="numeric" placeholder="Monto inicial" placeholderTextColor={COLORS.textMuted} />
              <TextInput style={[styles.input, { flex: 1 }]} value={loanD.pending} onChangeText={(v) => setLoanD((d) => ({ ...d, pending: v }))} keyboardType="numeric" placeholder="Saldo pendiente" placeholderTextColor={COLORS.textMuted} />
            </View>
            <View style={styles.formRow}>
              <TextInput style={[styles.input, { flex: 1 }]} value={loanD.monthly} onChangeText={(v) => setLoanD((d) => ({ ...d, monthly: v }))} keyboardType="numeric" placeholder="Cuota mensual (opc)" placeholderTextColor={COLORS.textMuted} />
              <TextInput style={[styles.input, { flex: 1 }]} value={loanD.interest} onChangeText={(v) => setLoanD((d) => ({ ...d, interest: v }))} keyboardType="numeric" placeholder="Interés % (opc)" placeholderTextColor={COLORS.textMuted} />
            </View>
            <View style={styles.formRow}>
              <TextInput style={[styles.input, { flex: 1.4 }]} value={loanD.date} onChangeText={(v) => setLoanD((d) => ({ ...d, date: v }))} placeholder="Fecha (ej. Mar 2026)" placeholderTextColor={COLORS.textMuted} />
              <TouchableOpacity style={styles.addBtn} onPress={addLoanD}><Ionicons name="add" size={22} color="#fff" /></TouchableOpacity>
            </View>
            {loans.map((l, i) => (
              <ItemRow key={i} icon={loanType(l.lenderType).icon} color={loanType(l.lenderType).color} title={l.name} sub={`Pendiente ${formatMoney(l.pending, cur)}`} onDel={() => setLoans((arr) => arr.filter((_, j) => j !== i))} />
            ))}
          </View>
        )}

        {/* PASO 4 — Deudas */}
        {step === 4 && (
          <View>
            <Text style={styles.title}>Tus deudas</Text>
            <Text style={styles.subtitle}>Lo que debes (tarjetas, personales...). Omite si no tienes.</Text>
            <TextInput style={styles.inputFull} value={debtD.creditor} onChangeText={(v) => setDebtD((d) => ({ ...d, creditor: v }))} placeholder="¿A quién le debes?" placeholderTextColor={COLORS.textMuted} />
            <TextInput style={styles.inputFull} value={debtD.concept} onChangeText={(v) => setDebtD((d) => ({ ...d, concept: v }))} placeholder="¿Para qué fue la deuda?" placeholderTextColor={COLORS.textMuted} />
            <View style={styles.formRow}>
              <TextInput style={[styles.input, { flex: 1 }]} value={debtD.amount} onChangeText={(v) => setDebtD((d) => ({ ...d, amount: v }))} keyboardType="numeric" placeholder="Monto inicial" placeholderTextColor={COLORS.textMuted} />
              <TextInput style={[styles.input, { flex: 1 }]} value={debtD.pending} onChangeText={(v) => setDebtD((d) => ({ ...d, pending: v }))} keyboardType="numeric" placeholder="Saldo pendiente" placeholderTextColor={COLORS.textMuted} />
            </View>
            <TextInput style={styles.inputFull} value={debtD.date} onChangeText={(v) => setDebtD((d) => ({ ...d, date: v }))} placeholder="Fecha de inicio (ej. Ene 2026)" placeholderTextColor={COLORS.textMuted} />
            <Text style={styles.lbl}>Prioridad</Text>
            <View style={styles.chips}>
              {DEBT_PRIORITIES.map((p) => {
                const sel = debtD.priority === p.key;
                return (
                  <TouchableOpacity key={p.key} onPress={() => setDebtD((d) => ({ ...d, priority: p.key }))} style={[styles.chip, sel && { backgroundColor: p.color + '22', borderColor: p.color }]}>
                    <Text style={[styles.chipText, sel && { color: p.color, fontWeight: '700' }]}>{p.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={styles.formRow}>
              <TextInput style={[styles.input, { flex: 1.4 }]} value={debtD.notes} onChangeText={(v) => setDebtD((d) => ({ ...d, notes: v }))} placeholder="Observaciones (opc)" placeholderTextColor={COLORS.textMuted} />
              <TouchableOpacity style={styles.addBtn} onPress={addDebtD}><Ionicons name="add" size={22} color="#fff" /></TouchableOpacity>
            </View>
            {debts.map((d, i) => (
              <ItemRow key={i} icon="trending-down-outline" color={COLORS.red} title={`${d.creditor}${d.concept ? ' · ' + d.concept : ''}`} sub={`Pendiente ${formatMoney(d.amount - d.paid, cur)}`} onDel={() => setDebts((arr) => arr.filter((_, j) => j !== i))} />
            ))}
          </View>
        )}

        <View style={styles.navRow}>
          {step > 0 && (
            <TouchableOpacity onPress={() => setStep(step - 1)} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={20} color={COLORS.textSub} /><Text style={styles.backText}>Atrás</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={goNext} activeOpacity={0.85} style={[styles.nextBtnWrap, saving && { opacity: 0.5 }]} disabled={saving}>
            <LinearGradient colors={['#7C3AED', '#6D28D9']} style={styles.nextBtn}>
              <Text style={styles.nextBtnText}>{step === 0 ? 'Empezar' : step < TOTAL - 1 ? 'Siguiente' : (saving ? 'Guardando...' : 'Finalizar')}</Text>
              <Ionicons name={step < TOTAL - 1 ? 'arrow-forward' : 'checkmark-circle'} size={18} color="#fff" style={{ marginLeft: 8 }} />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {step > 0 && step < TOTAL - 1 && (
          <TouchableOpacity onPress={() => { clearStep(); setStep(step + 1); }} style={styles.skip}><Text style={styles.skipText}>Omitir este paso</Text></TouchableOpacity>
        )}

        <View style={{ height: 30 }} />
      </ScrollView>
    </LinearGradient>
  );
}

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
  help: { fontSize: 12, color: COLORS.textMuted, lineHeight: 18, marginTop: 4 },
  lbl: { fontSize: 12, color: COLORS.textSub, fontWeight: '600', marginBottom: 8, marginTop: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.card, borderWidth: 0.5, borderColor: COLORS.cardBorder },
  chipText: { fontSize: 13, color: COLORS.textSub },
  formRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  input: { backgroundColor: COLORS.card, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, color: COLORS.text, fontSize: 14, borderWidth: 0.5, borderColor: COLORS.cardBorder },
  inputFull: { backgroundColor: COLORS.card, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, color: COLORS.text, fontSize: 14, borderWidth: 0.5, borderColor: COLORS.cardBorder, marginBottom: 10 },
  addBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: COLORS.purple, alignItems: 'center', justifyContent: 'center' },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: COLORS.bg3, borderRadius: 12, padding: 10, marginBottom: 8 },
  wIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
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
