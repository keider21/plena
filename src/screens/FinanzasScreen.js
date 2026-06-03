import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, Modal, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store/useStore';
import { COLORS } from '../utils/theme';
import { formatMoney } from '../utils/currency';
import {
  ACCOUNT_TYPES, accountType, LOAN_TYPES, loanType, DEBT_PRIORITIES, debtPriority,
  TX_TYPES, CATEGORIES, PERIODS, financeStats, netWorth, loanPending,
} from '../utils/finance';
import EmptyState from '../components/EmptyState';

const TABS = [
  { key: 'resumen', label: 'Resumen' },
  { key: 'cuentas', label: 'Cuentas' },
  { key: 'tarjetas', label: 'Tarjetas' },
  { key: 'prestamos', label: 'Préstamos' },
  { key: 'deudas', label: 'Deudas' },
];
const CUR_OPTS = [{ key: 'PEN', label: 'S/' }, { key: 'USD', label: '$' }];
const num = (v) => { const n = parseFloat(String(v ?? '').replace(',', '.')); return isNaN(n) ? 0 : n; };

function Chips({ options, value, onChange }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} keyboardShouldPersistTaps="handled">
      {options.map((o) => {
        const val = o.key ?? o;
        const label = o.label ?? o;
        const sel = value === val;
        return (
          <TouchableOpacity key={String(val)} onPress={() => onChange(val)} style={[styles.chip, sel && styles.chipOn]}>
            {o.icon ? <Ionicons name={o.icon} size={14} color={sel ? '#fff' : COLORS.textSub} /> : null}
            <Text style={[styles.chipText, sel && styles.chipTextOn]}>{label}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

function Field({ label, children }) {
  return <View style={{ marginBottom: 14 }}><Text style={styles.fLabel}>{label}</Text>{children}</View>;
}

export default function FinanzasScreen({ navigation }) {
  const store = useStore();
  const { finance, settings } = store;
  const cur = settings.currency;
  const [tab, setTab] = useState('resumen');
  const [period, setPeriod] = useState('mes');
  const [modal, setModal] = useState(null); // { type, id? }
  const [f, setF] = useState({});

  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));

  const openModal = (type, item) => {
    if ((type === 'movement') && finance.accounts.length === 0) {
      Alert.alert('Primero crea una cuenta', 'Necesitas al menos una cuenta para registrar movimientos.');
      return;
    }
    const defaults = {
      account: { name: '', type: 'yape', currency: cur, balance: '' },
      movement: { type: 'gasto', accountId: finance.accounts[0]?.id, toAccountId: finance.accounts[1]?.id, amount: '', category: 'Otros', note: '' },
      card: { bank: '', currency: cur, limit: '', used: '', cycleStartDay: '', cutoffDay: '', payDay: '', minPayment: '', totalPayment: '', interest: '' },
      loan: { name: '', lenderType: 'banco', currency: cur, installment: '', installmentsTotal: '', installmentsPaid: '', interest: '', startDate: '', endDate: '' },
      debt: { name: '', creditor: '', currency: cur, amount: '', paid: '', priority: 'media', dueDate: '' },
    };
    setF(item ? { ...item, balance: item.balance ?? '', amount: item.amount ?? '' } : defaults[type]);
    setModal({ type, id: item?.id });
  };
  const close = () => { setModal(null); setF({}); };

  const save = async () => {
    const id = modal.id;
    if (modal.type === 'account') {
      const p = { name: f.name?.trim() || accountType(f.type).label, type: f.type, currency: f.currency, balance: num(f.balance) };
      id ? await store.updateAccount(id, p) : await store.addAccount(p);
    } else if (modal.type === 'movement') {
      if (num(f.amount) <= 0) return;
      const isCard = f.type === 'gasto' && finance.cards.some((c) => c.id === f.accountId);
      await store.addTransaction({
        type: f.type,
        accountId: isCard ? undefined : f.accountId,
        cardId: isCard ? f.accountId : undefined,
        toAccountId: f.type === 'transferencia' ? f.toAccountId : undefined,
        amount: num(f.amount), category: f.type === 'transferencia' ? null : f.category, note: f.note?.trim() || '',
      });
    } else if (modal.type === 'card') {
      const p = { bank: f.bank?.trim() || 'Tarjeta', currency: f.currency, limit: num(f.limit), used: num(f.used), cycleStartDay: num(f.cycleStartDay), cutoffDay: num(f.cutoffDay), payDay: num(f.payDay), minPayment: num(f.minPayment), totalPayment: num(f.totalPayment), interest: num(f.interest) };
      id ? await store.updateCard(id, p) : await store.addCard(p);
    } else if (modal.type === 'loan') {
      const p = { name: f.name?.trim() || 'Préstamo', lenderType: f.lenderType, currency: f.currency, installment: num(f.installment), installmentsTotal: num(f.installmentsTotal), installmentsPaid: num(f.installmentsPaid), interest: num(f.interest), startDate: f.startDate, endDate: f.endDate };
      id ? await store.updateLoan(id, p) : await store.addLoan(p);
    } else if (modal.type === 'debt') {
      const p = { name: f.name?.trim() || 'Deuda', creditor: f.creditor?.trim() || '', currency: f.currency, amount: num(f.amount), paid: num(f.paid), priority: f.priority, dueDate: f.dueDate };
      id ? await store.updateDebt(id, p) : await store.addDebt(p);
    }
    close();
  };

  const confirmDel = (label, fn) => Alert.alert('Eliminar', `¿Eliminar ${label}?`, [{ text: 'Cancelar' }, { text: 'Eliminar', style: 'destructive', onPress: fn }]);

  const onDeleteCurrent = () => {
    const fns = { account: store.deleteAccount, card: store.deleteCard, loan: store.deleteLoan, debt: store.deleteDebt };
    const fn = fns[modal.type];
    if (!fn) return;
    confirmDel('este registro', async () => { await fn(modal.id); close(); });
  };

  const stats = financeStats(finance.transactions, period);
  const fabType = { resumen: 'movement', cuentas: 'account', tarjetas: 'card', prestamos: 'loan', deudas: 'debt' }[tab];

  return (
    <View style={styles.bg}>
      <LinearGradient colors={['#1A0A3E', '#0D0D1A']} style={styles.hero}>
        <Text style={styles.heroTitle}>Finanzas</Text>
        <Text style={styles.heroSub}>Patrimonio: {formatMoney(netWorth(finance), cur)}</Text>
      </LinearGradient>

      <View style={styles.tabsWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
          {TABS.map((t) => (
            <TouchableOpacity key={t.key} onPress={() => setTab(t.key)} style={[styles.tab, tab === t.key && styles.tabOn]}>
              <Text style={[styles.tabText, tab === t.key && styles.tabTextOn]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {tab === 'resumen' && (
          <Resumen finance={finance} cur={cur} period={period} setPeriod={setPeriod} stats={stats} onDelTx={(id) => store.deleteTransaction(id)} />
        )}
        {tab === 'cuentas' && (
          <Cuentas finance={finance} cur={cur} onAdd={() => openModal('account')} onMove={() => openModal('movement')}
            onEdit={(a) => openModal('account', a)} onDel={(a) => confirmDel(`la cuenta "${a.name}"`, () => store.deleteAccount(a.id))} />
        )}
        {tab === 'tarjetas' && (
          <Tarjetas finance={finance} onEdit={(c) => openModal('card', c)} onDel={(c) => confirmDel(`la tarjeta "${c.bank}"`, () => store.deleteCard(c.id))} onAdd={() => openModal('card')} onCalendar={(c) => navigation.navigate('CardCalendar', { id: c.id })} />
        )}
        {tab === 'prestamos' && (
          <Prestamos finance={finance} onEdit={(l) => openModal('loan', l)} onDel={(l) => confirmDel(`el préstamo "${l.name}"`, () => store.deleteLoan(l.id))} onAdd={() => openModal('loan')} />
        )}
        {tab === 'deudas' && (
          <Deudas finance={finance} onEdit={(d) => openModal('debt', d)} onDel={(d) => confirmDel(`la deuda "${d.name}"`, () => store.deleteDebt(d.id))} onAdd={() => openModal('debt')} />
        )}
        <View style={{ height: 90 }} />
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={() => openModal(fabType)} activeOpacity={0.85}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Modal de formularios */}
      <Modal visible={!!modal} transparent animationType="slide" onRequestClose={close}>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <View style={styles.sheetHead}>
              <Text style={styles.sheetTitle}>{modal && titleFor(modal)}</Text>
              <TouchableOpacity onPress={close}><Ionicons name="close" size={24} color={COLORS.textSub} /></TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 440 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {modal?.type === 'account' && (
                <>
                  <Field label="Nombre"><TextInput style={styles.input} value={f.name} onChangeText={(v) => set('name', v)} placeholder="Ej. Mi BCP" placeholderTextColor={COLORS.textMuted} /></Field>
                  <Field label="Tipo de cuenta"><Chips options={ACCOUNT_TYPES} value={f.type} onChange={(v) => set('type', v)} /></Field>
                  <Field label="Moneda"><Chips options={CUR_OPTS} value={f.currency} onChange={(v) => set('currency', v)} /></Field>
                  <Field label="Saldo actual"><TextInput style={styles.input} value={String(f.balance)} onChangeText={(v) => set('balance', v)} keyboardType="numeric" placeholder="0.00" placeholderTextColor={COLORS.textMuted} /></Field>
                </>
              )}
              {modal?.type === 'movement' && (
                <>
                  <Field label="Tipo"><Chips options={TX_TYPES} value={f.type} onChange={(v) => set('type', v)} /></Field>
                  <Field label={f.type === 'transferencia' ? 'Desde' : (f.type === 'gasto' ? 'Pagar con' : 'Cuenta')}>
                    <Chips
                      options={[
                        ...finance.accounts.map((a) => ({ key: a.id, label: a.name })),
                        ...(f.type === 'gasto' ? finance.cards.map((c) => ({ key: c.id, label: '💳 ' + c.bank })) : []),
                      ]}
                      value={f.accountId}
                      onChange={(v) => set('accountId', v)}
                    />
                  </Field>
                  {f.type === 'transferencia' && (
                    <Field label="Hacia"><Chips options={finance.accounts.map((a) => ({ key: a.id, label: a.name }))} value={f.toAccountId} onChange={(v) => set('toAccountId', v)} /></Field>
                  )}
                  <Field label="Monto"><TextInput style={styles.input} value={String(f.amount)} onChangeText={(v) => set('amount', v)} keyboardType="numeric" placeholder="0.00" placeholderTextColor={COLORS.textMuted} /></Field>
                  {f.type !== 'transferencia' && (
                    <Field label="Categoría"><Chips options={CATEGORIES[f.type] || CATEGORIES.gasto} value={f.category} onChange={(v) => set('category', v)} /></Field>
                  )}
                  <Field label="Nota (opcional)"><TextInput style={styles.input} value={f.note} onChangeText={(v) => set('note', v)} placeholder="Detalle..." placeholderTextColor={COLORS.textMuted} /></Field>
                </>
              )}
              {modal?.type === 'card' && (
                <>
                  <Field label="Banco / nombre"><TextInput style={styles.input} value={f.bank} onChangeText={(v) => set('bank', v)} placeholder="Ej. BCP Visa" placeholderTextColor={COLORS.textMuted} /></Field>
                  <Field label="Moneda"><Chips options={CUR_OPTS} value={f.currency} onChange={(v) => set('currency', v)} /></Field>
                  <Row>
                    <Half label="Línea de crédito"><TextInput style={styles.input} value={String(f.limit)} onChangeText={(v) => set('limit', v)} keyboardType="numeric" placeholder="0" placeholderTextColor={COLORS.textMuted} /></Half>
                    <Half label="Utilizado"><TextInput style={styles.input} value={String(f.used)} onChangeText={(v) => set('used', v)} keyboardType="numeric" placeholder="0" placeholderTextColor={COLORS.textMuted} /></Half>
                  </Row>
                  <Row>
                    <Half label="Inicio de ciclo (día)"><TextInput style={styles.input} value={String(f.cycleStartDay)} onChangeText={(v) => set('cycleStartDay', v)} keyboardType="numeric" placeholder="Ej. 6" placeholderTextColor={COLORS.textMuted} /></Half>
                    <Half label="Día de corte"><TextInput style={styles.input} value={String(f.cutoffDay)} onChangeText={(v) => set('cutoffDay', v)} keyboardType="numeric" placeholder="Ej. 5" placeholderTextColor={COLORS.textMuted} /></Half>
                  </Row>
                  <Row>
                    <Half label="Día de pago"><TextInput style={styles.input} value={String(f.payDay)} onChangeText={(v) => set('payDay', v)} keyboardType="numeric" placeholder="Ej. 22" placeholderTextColor={COLORS.textMuted} /></Half>
                    <Half label=" "><View /></Half>
                  </Row>
                  <Row>
                    <Half label="Pago mínimo"><TextInput style={styles.input} value={String(f.minPayment)} onChangeText={(v) => set('minPayment', v)} keyboardType="numeric" placeholder="0" placeholderTextColor={COLORS.textMuted} /></Half>
                    <Half label="Pago total"><TextInput style={styles.input} value={String(f.totalPayment)} onChangeText={(v) => set('totalPayment', v)} keyboardType="numeric" placeholder="0" placeholderTextColor={COLORS.textMuted} /></Half>
                  </Row>
                  <Field label="Interés (% TEA)"><TextInput style={styles.input} value={String(f.interest)} onChangeText={(v) => set('interest', v)} keyboardType="numeric" placeholder="Ej. 60" placeholderTextColor={COLORS.textMuted} /></Field>
                </>
              )}
              {modal?.type === 'loan' && (
                <>
                  <Field label="Nombre"><TextInput style={styles.input} value={f.name} onChangeText={(v) => set('name', v)} placeholder="Ej. Préstamo auto" placeholderTextColor={COLORS.textMuted} /></Field>
                  <Field label="Tipo de prestamista"><Chips options={LOAN_TYPES} value={f.lenderType} onChange={(v) => set('lenderType', v)} /></Field>
                  <Field label="Moneda"><Chips options={CUR_OPTS} value={f.currency} onChange={(v) => set('currency', v)} /></Field>
                  <Row>
                    <Half label="Cuota"><TextInput style={styles.input} value={String(f.installment)} onChangeText={(v) => set('installment', v)} keyboardType="numeric" placeholder="0" placeholderTextColor={COLORS.textMuted} /></Half>
                    <Half label="Interés (%)"><TextInput style={styles.input} value={String(f.interest)} onChangeText={(v) => set('interest', v)} keyboardType="numeric" placeholder="0" placeholderTextColor={COLORS.textMuted} /></Half>
                  </Row>
                  <Row>
                    <Half label="Cuotas totales"><TextInput style={styles.input} value={String(f.installmentsTotal)} onChangeText={(v) => set('installmentsTotal', v)} keyboardType="numeric" placeholder="Ej. 36" placeholderTextColor={COLORS.textMuted} /></Half>
                    <Half label="Cuotas pagadas"><TextInput style={styles.input} value={String(f.installmentsPaid)} onChangeText={(v) => set('installmentsPaid', v)} keyboardType="numeric" placeholder="0" placeholderTextColor={COLORS.textMuted} /></Half>
                  </Row>
                  <Row>
                    <Half label="Inicio"><TextInput style={styles.input} value={f.startDate} onChangeText={(v) => set('startDate', v)} placeholder="Ej. 01/2026" placeholderTextColor={COLORS.textMuted} /></Half>
                    <Half label="Fin"><TextInput style={styles.input} value={f.endDate} onChangeText={(v) => set('endDate', v)} placeholder="Ej. 12/2028" placeholderTextColor={COLORS.textMuted} /></Half>
                  </Row>
                </>
              )}
              {modal?.type === 'debt' && (
                <>
                  <Field label="Deuda"><TextInput style={styles.input} value={f.name} onChangeText={(v) => set('name', v)} placeholder="Ej. Préstamo a Juan" placeholderTextColor={COLORS.textMuted} /></Field>
                  <Field label="Acreedor"><TextInput style={styles.input} value={f.creditor} onChangeText={(v) => set('creditor', v)} placeholder="¿A quién le debes?" placeholderTextColor={COLORS.textMuted} /></Field>
                  <Field label="Moneda"><Chips options={CUR_OPTS} value={f.currency} onChange={(v) => set('currency', v)} /></Field>
                  <Row>
                    <Half label="Monto total"><TextInput style={styles.input} value={String(f.amount)} onChangeText={(v) => set('amount', v)} keyboardType="numeric" placeholder="0" placeholderTextColor={COLORS.textMuted} /></Half>
                    <Half label="Pagado"><TextInput style={styles.input} value={String(f.paid)} onChangeText={(v) => set('paid', v)} keyboardType="numeric" placeholder="0" placeholderTextColor={COLORS.textMuted} /></Half>
                  </Row>
                  <Field label="Prioridad"><Chips options={DEBT_PRIORITIES} value={f.priority} onChange={(v) => set('priority', v)} /></Field>
                  <Field label="Fecha límite"><TextInput style={styles.input} value={f.dueDate} onChangeText={(v) => set('dueDate', v)} placeholder="Ej. 30/06/2026" placeholderTextColor={COLORS.textMuted} /></Field>
                </>
              )}
            </ScrollView>
            <TouchableOpacity style={styles.saveBtn} onPress={save} activeOpacity={0.85}>
              <Text style={styles.saveText}>{modal?.id ? 'Guardar cambios' : 'Agregar'}</Text>
            </TouchableOpacity>
            {modal?.id && modal.type !== 'movement' && (
              <TouchableOpacity style={styles.delModalBtn} onPress={onDeleteCurrent} activeOpacity={0.85}>
                <Ionicons name="trash-outline" size={18} color={COLORS.red} />
                <Text style={styles.delModalText}>Eliminar</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function titleFor(modal) {
  return { account: 'Cuenta', movement: 'Movimiento', card: 'Tarjeta de crédito', loan: 'Préstamo', debt: 'Deuda' }[modal.type];
}
const Row = ({ children }) => <View style={{ flexDirection: 'row', gap: 12 }}>{children}</View>;
const Half = ({ label, children }) => <View style={{ flex: 1, marginBottom: 14 }}><Text style={styles.fLabel}>{label}</Text>{children}</View>;

// ───────────── SECCIONES ─────────────
function Resumen({ finance, cur, period, setPeriod, stats, onDelTx }) {
  const cats = Object.entries(stats.byCategory).sort((a, b) => b[1] - a[1]);
  const maxCat = cats.length ? cats[0][1] : 1;
  const accName = (id) => finance.accounts.find((a) => a.id === id)?.name || '—';
  const srcName = (t) => (t.cardId ? '💳 ' + (finance.cards.find((c) => c.id === t.cardId)?.bank || 'Tarjeta') : accName(t.accountId));
  const recent = finance.transactions.slice(0, 10);

  return (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
        {PERIODS.map((p) => (
          <TouchableOpacity key={p.key} onPress={() => setPeriod(p.key)} style={[styles.chip, period === p.key && styles.chipOn]}>
            <Text style={[styles.chipText, period === p.key && styles.chipTextOn]}>{p.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.statRow}>
        <View style={[styles.statCard, { borderLeftColor: COLORS.green }]}><Text style={styles.statLbl}>Ingresos</Text><Text style={[styles.statVal, { color: COLORS.green }]}>{formatMoney(stats.ingresos, cur)}</Text></View>
        <View style={[styles.statCard, { borderLeftColor: COLORS.red }]}><Text style={styles.statLbl}>Gastos</Text><Text style={[styles.statVal, { color: COLORS.red }]}>{formatMoney(stats.gastos, cur)}</Text></View>
      </View>
      <View style={[styles.balanceCard, { borderColor: (stats.balance >= 0 ? COLORS.green : COLORS.red) + '55' }]}>
        <Text style={styles.statLbl}>Balance del periodo</Text>
        <Text style={[styles.balanceVal, { color: stats.balance >= 0 ? COLORS.green : COLORS.red }]}>{stats.balance >= 0 ? '+' : ''}{formatMoney(stats.balance, cur)}</Text>
      </View>

      <Text style={styles.secTitle}>Gastos por categoría</Text>
      {cats.length === 0 ? <Text style={styles.hint}>Sin gastos en este periodo.</Text> : (
        <View style={styles.card}>
          {cats.map(([c, v]) => (
            <View key={c} style={styles.catRow}>
              <Text style={styles.catName}>{c}</Text>
              <View style={styles.catBarBg}><View style={[styles.catBarFill, { width: `${Math.round((v / maxCat) * 100)}%` }]} /></View>
              <Text style={styles.catVal}>{formatMoney(v, cur)}</Text>
            </View>
          ))}
        </View>
      )}

      <Text style={styles.secTitle}>Últimos movimientos</Text>
      {recent.length === 0 ? <Text style={styles.hint}>Aún no registras movimientos. Usa el botón +.</Text> : (
        <View style={styles.card}>
          {recent.map((t) => {
            const tt = TX_TYPES.find((x) => x.key === t.type);
            const sign = t.type === 'ingreso' ? '+' : t.type === 'gasto' ? '-' : '';
            return (
              <View key={t.id} style={styles.txRow}>
                <Ionicons name={tt.icon} size={20} color={tt.color} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.txTitle}>{t.note || t.category || tt.label}</Text>
                  <Text style={styles.txSub}>{srcName(t)}{t.type === 'transferencia' ? ` → ${accName(t.toAccountId)}` : ''} · {t.date}</Text>
                </View>
                <Text style={[styles.txAmt, { color: tt.color }]}>{sign}{formatMoney(t.amount, cur)}</Text>
                <TouchableOpacity onPress={() => onDelTx(t.id)} style={{ padding: 4 }}><Ionicons name="close" size={16} color={COLORS.textMuted} /></TouchableOpacity>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

function Cuentas({ finance, cur, onAdd, onMove, onEdit, onDel }) {
  const total = finance.accounts.filter((a) => a.currency === cur).reduce((s, a) => s + (a.balance || 0), 0);
  if (finance.accounts.length === 0) {
    return <EmptyState icon="wallet-outline" title="Sin cuentas" subtitle="Agrega tus cuentas (Yape, Plin, BCP, efectivo...) para llevar tus saldos." actionLabel="Agregar cuenta" onAction={onAdd} />;
  }
  return (
    <View>
      <View style={styles.totalCard}><Text style={styles.statLbl}>Total en cuentas ({cur})</Text><Text style={styles.totalVal}>{formatMoney(total, cur)}</Text></View>
      <TouchableOpacity style={styles.outlineBtn} onPress={onMove}><Ionicons name="swap-vertical-outline" size={18} color={COLORS.purpleLight} /><Text style={styles.outlineBtnText}>Registrar movimiento</Text></TouchableOpacity>
      {finance.accounts.map((a) => {
        const t = accountType(a.type);
        return (
          <TouchableOpacity key={a.id} style={styles.listCard} onPress={() => onEdit(a)} onLongPress={() => onDel(a)} activeOpacity={0.8}>
            <View style={[styles.listIcon, { backgroundColor: t.color + '22' }]}><Ionicons name={t.icon} size={20} color={t.color} /></View>
            <View style={{ flex: 1 }}><Text style={styles.listTitle}>{a.name}</Text><Text style={styles.listSub}>{t.label}</Text></View>
            <Text style={[styles.listAmt, { color: (a.balance || 0) >= 0 ? COLORS.text : COLORS.red }]}>{formatMoney(a.balance, a.currency)}</Text>
          </TouchableOpacity>
        );
      })}
      <Text style={styles.tip}>Toca una cuenta para editar · mantén presionado para eliminar</Text>
    </View>
  );
}

function Tarjetas({ finance, onEdit, onDel, onAdd, onCalendar }) {
  if (finance.cards.length === 0) {
    return <EmptyState icon="card-outline" title="Sin tarjetas" subtitle="Agrega tus tarjetas de crédito para controlar línea, uso, fechas de corte/pago e intereses." actionLabel="Agregar tarjeta" onAction={onAdd} />;
  }
  return (
    <View>
      {finance.cards.map((c) => {
        const avail = Math.max(0, (c.limit || 0) - (c.used || 0));
        const pct = c.limit ? Math.min(100, Math.round((c.used / c.limit) * 100)) : 0;
        const danger = pct >= 70;
        return (
          <TouchableOpacity key={c.id} style={styles.bigCard} onPress={() => onEdit(c)} onLongPress={() => onDel(c)} activeOpacity={0.85}>
            <View style={styles.bigCardHead}>
              <Ionicons name="card" size={20} color={COLORS.purpleLight} />
              <Text style={styles.bigCardTitle}>{c.bank}</Text>
              <Text style={styles.bigCardCur}>{c.currency}</Text>
            </View>
            <View style={styles.cardUseBg}><View style={[styles.cardUseFill, { width: `${pct}%`, backgroundColor: danger ? COLORS.red : COLORS.green }]} /></View>
            <View style={styles.cardRow2}>
              <Text style={styles.cardUsed}>Usado {formatMoney(c.used, c.currency)} ({pct}%)</Text>
              <Text style={styles.cardAvail}>Disp. {formatMoney(avail, c.currency)}</Text>
            </View>
            <View style={styles.miniGrid}>
              <Mini label="Línea" val={formatMoney(c.limit, c.currency)} />
              <Mini label="Inicio ciclo" val={c.cycleStartDay ? `Día ${c.cycleStartDay}` : '—'} />
              <Mini label="Corte" val={c.cutoffDay ? `Día ${c.cutoffDay}` : '—'} />
              <Mini label="Pago" val={c.payDay ? `Día ${c.payDay}` : '—'} />
              <Mini label="Pago mín." val={formatMoney(c.minPayment, c.currency)} />
              <Mini label="Pago total" val={formatMoney(c.totalPayment, c.currency)} />
              <Mini label="Interés" val={c.interest ? `${c.interest}%` : '—'} />
            </View>
            <TouchableOpacity style={styles.cardCalBtn} onPress={() => onCalendar(c)} activeOpacity={0.8}>
              <Ionicons name="calendar-outline" size={16} color={COLORS.purpleLight} />
              <Text style={styles.cardCalText}>Calendario de compras y pagos</Text>
              <Ionicons name="chevron-forward" size={16} color={COLORS.purpleLight} />
            </TouchableOpacity>
          </TouchableOpacity>
        );
      })}
      <Text style={styles.tip}>Toca para editar · mantén presionado para eliminar</Text>
    </View>
  );
}

function Prestamos({ finance, onEdit, onDel, onAdd }) {
  if (finance.loans.length === 0) {
    return <EmptyState icon="cash-outline" title="Sin préstamos" subtitle="Registra préstamos (banco, familiar, empresa...) con cuotas, interés y progreso." actionLabel="Agregar préstamo" onAction={onAdd} />;
  }
  return (
    <View>
      {finance.loans.map((l) => {
        const t = loanType(l.lenderType);
        const total = l.installmentsTotal || 0;
        const paid = l.installmentsPaid || 0;
        const pct = total ? Math.round((paid / total) * 100) : 0;
        return (
          <TouchableOpacity key={l.id} style={styles.bigCard} onPress={() => onEdit(l)} onLongPress={() => onDel(l)} activeOpacity={0.85}>
            <View style={styles.bigCardHead}>
              <Ionicons name={t.icon} size={20} color={t.color} />
              <Text style={styles.bigCardTitle}>{l.name}</Text>
              <Text style={[styles.bigCardCur, { color: t.color }]}>{t.label}</Text>
            </View>
            <View style={styles.cardUseBg}><View style={[styles.cardUseFill, { width: `${pct}%`, backgroundColor: COLORS.green }]} /></View>
            <View style={styles.cardRow2}>
              <Text style={styles.cardUsed}>{paid}/{total} cuotas ({pct}%)</Text>
              <Text style={styles.cardAvail}>Falta {formatMoney(loanPending(l), l.currency)}</Text>
            </View>
            <View style={styles.miniGrid}>
              <Mini label="Cuota" val={formatMoney(l.installment, l.currency)} />
              <Mini label="Interés" val={l.interest ? `${l.interest}%` : '—'} />
              <Mini label="Periodo" val={`${l.startDate || '—'}→${l.endDate || '—'}`} />
            </View>
          </TouchableOpacity>
        );
      })}
      <Text style={styles.tip}>Toca para editar · mantén presionado para eliminar</Text>
    </View>
  );
}

function Deudas({ finance, onEdit, onDel, onAdd }) {
  if (finance.debts.length === 0) {
    return <EmptyState icon="alert-circle-outline" title="Sin deudas" subtitle="Registra a quién le debes, monto, prioridad y fecha límite para no perder el control." actionLabel="Agregar deuda" onAction={onAdd} />;
  }
  return (
    <View>
      {finance.debts.map((d) => {
        const pr = debtPriority(d.priority);
        const pct = d.amount ? Math.min(100, Math.round(((d.paid || 0) / d.amount) * 100)) : 0;
        const rem = Math.max(0, (d.amount || 0) - (d.paid || 0));
        return (
          <TouchableOpacity key={d.id} style={[styles.bigCard, { borderLeftWidth: 4, borderLeftColor: pr.color }]} onPress={() => onEdit(d)} onLongPress={() => onDel(d)} activeOpacity={0.85}>
            <View style={styles.bigCardHead}>
              <Text style={styles.bigCardTitle}>{d.name}</Text>
              <View style={[styles.prBadge, { backgroundColor: pr.color + '22' }]}><Text style={[styles.prText, { color: pr.color }]}>{pr.label}</Text></View>
            </View>
            {d.creditor ? <Text style={styles.listSub}>A: {d.creditor}{d.dueDate ? ` · vence ${d.dueDate}` : ''}</Text> : (d.dueDate ? <Text style={styles.listSub}>Vence {d.dueDate}</Text> : null)}
            <View style={[styles.cardUseBg, { marginTop: 10 }]}><View style={[styles.cardUseFill, { width: `${pct}%`, backgroundColor: pr.color }]} /></View>
            <View style={styles.cardRow2}>
              <Text style={styles.cardUsed}>Pagado {formatMoney(d.paid, d.currency)} ({pct}%)</Text>
              <Text style={[styles.cardAvail, { color: COLORS.red }]}>Falta {formatMoney(rem, d.currency)}</Text>
            </View>
          </TouchableOpacity>
        );
      })}
      <Text style={styles.tip}>Toca para editar/registrar pago · mantén presionado para eliminar</Text>
    </View>
  );
}

const Mini = ({ label, val }) => <View style={styles.mini}><Text style={styles.miniLbl}>{label}</Text><Text style={styles.miniVal}>{val}</Text></View>;

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: COLORS.bg },
  hero: { padding: 24, paddingTop: 56, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  heroTitle: { fontSize: 24, fontWeight: '800', color: COLORS.text },
  heroSub: { fontSize: 13, color: COLORS.purpleLight, marginTop: 4 },
  tabsWrap: { paddingVertical: 12, backgroundColor: COLORS.bg },
  tab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.card, borderWidth: 0.5, borderColor: COLORS.cardBorder },
  tabOn: { backgroundColor: COLORS.purple, borderColor: COLORS.purple },
  tabText: { fontSize: 13, color: COLORS.textSub, fontWeight: '600' },
  tabTextOn: { color: '#fff' },
  container: { paddingHorizontal: 16, paddingTop: 6 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, backgroundColor: COLORS.card, borderWidth: 0.5, borderColor: COLORS.cardBorder },
  chipOn: { backgroundColor: COLORS.purple, borderColor: COLORS.purple },
  chipText: { fontSize: 13, color: COLORS.textSub },
  chipTextOn: { color: '#fff', fontWeight: '600' },
  statRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  statCard: { flex: 1, backgroundColor: COLORS.card, borderRadius: 14, padding: 14, borderWidth: 0.5, borderColor: COLORS.cardBorder, borderLeftWidth: 3 },
  statLbl: { fontSize: 12, color: COLORS.textSub },
  statVal: { fontSize: 17, fontWeight: '800', marginTop: 4 },
  balanceCard: { backgroundColor: COLORS.card, borderRadius: 14, padding: 16, borderWidth: 1, marginTop: 10 },
  balanceVal: { fontSize: 24, fontWeight: '800', marginTop: 4 },
  secTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginTop: 22, marginBottom: 10 },
  hint: { fontSize: 13, color: COLORS.textMuted, lineHeight: 19 },
  card: { backgroundColor: COLORS.card, borderRadius: 14, padding: 14, borderWidth: 0.5, borderColor: COLORS.cardBorder },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  catName: { width: 92, fontSize: 12, color: COLORS.textSub },
  catBarBg: { flex: 1, height: 8, backgroundColor: COLORS.bg3, borderRadius: 4, overflow: 'hidden' },
  catBarFill: { height: 8, borderRadius: 4, backgroundColor: COLORS.amber },
  catVal: { fontSize: 12, color: COLORS.text, fontWeight: '600', width: 80, textAlign: 'right' },
  txRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, borderBottomWidth: 0.5, borderColor: COLORS.border },
  txTitle: { fontSize: 14, color: COLORS.text, fontWeight: '500' },
  txSub: { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },
  txAmt: { fontSize: 14, fontWeight: '700' },
  totalCard: { backgroundColor: COLORS.card, borderRadius: 14, padding: 16, borderWidth: 0.5, borderColor: COLORS.cardBorder },
  totalVal: { fontSize: 24, fontWeight: '800', color: COLORS.text, marginTop: 4 },
  outlineBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: COLORS.purple + '66', marginTop: 12, marginBottom: 4 },
  outlineBtnText: { color: COLORS.purpleLight, fontSize: 14, fontWeight: '600' },
  listCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.card, borderRadius: 14, padding: 14, borderWidth: 0.5, borderColor: COLORS.cardBorder, marginTop: 10 },
  listIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  listTitle: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  listSub: { fontSize: 12, color: COLORS.textSub, marginTop: 2 },
  listAmt: { fontSize: 16, fontWeight: '800' },
  tip: { fontSize: 11, color: COLORS.textMuted, textAlign: 'center', marginTop: 14 },
  bigCard: { backgroundColor: COLORS.card, borderRadius: 16, padding: 16, borderWidth: 0.5, borderColor: COLORS.cardBorder, marginTop: 12 },
  bigCardHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  bigCardTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: COLORS.text },
  bigCardCur: { fontSize: 12, color: COLORS.textSub, fontWeight: '600' },
  cardUseBg: { height: 8, backgroundColor: COLORS.bg3, borderRadius: 4, overflow: 'hidden' },
  cardUseFill: { height: 8, borderRadius: 4 },
  cardRow2: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6, marginBottom: 6 },
  cardUsed: { fontSize: 12, color: COLORS.textSub },
  cardAvail: { fontSize: 12, color: COLORS.green, fontWeight: '600' },
  miniGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 6 },
  mini: { width: '33.3%', paddingVertical: 6 },
  miniLbl: { fontSize: 11, color: COLORS.textMuted },
  miniVal: { fontSize: 13, color: COLORS.text, fontWeight: '600', marginTop: 1 },
  prBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  prText: { fontSize: 11, fontWeight: '700' },
  cardCalBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: 0.5, borderTopColor: COLORS.border },
  cardCalText: { flex: 1, fontSize: 13, color: COLORS.purpleLight, fontWeight: '600' },
  fab: { position: 'absolute', right: 20, bottom: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.purple, alignItems: 'center', justifyContent: 'center', shadowColor: '#7C3AED', shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 8 },
  backdrop: { flex: 1, backgroundColor: '#000000AA', justifyContent: 'flex-end' },
  sheet: { backgroundColor: COLORS.bg2, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 28 },
  sheetHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sheetTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  fLabel: { fontSize: 12, color: COLORS.textSub, fontWeight: '600', marginBottom: 6 },
  input: { backgroundColor: COLORS.card, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: COLORS.text, fontSize: 15, borderWidth: 0.5, borderColor: COLORS.cardBorder },
  saveBtn: { backgroundColor: COLORS.purple, borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 16 },
  saveText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  delModalBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13, borderRadius: 12, borderWidth: 1, borderColor: COLORS.red + '55', marginTop: 10 },
  delModalText: { color: COLORS.red, fontSize: 15, fontWeight: '700' },
});
