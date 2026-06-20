import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, Modal, Alert, Image } from 'react-native';
let ImagePicker = null;
try { ImagePicker = require('expo-image-picker'); } catch (e) { console.warn('[FinanzasScreen] expo-image-picker no disponible:', e.message); }
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useStore } from '../store/useStore';
import { COLORS } from '../utils/theme';
import { formatMoney } from '../utils/currency';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  ACCOUNT_TYPES, accountType, LOAN_TYPES, loanType, DEBT_PRIORITIES, debtPriority,
  TX_TYPES, CATEGORIES, PERIODS, financeStats, netWorth, totalLiquid, findRootAccId, periodRange, loanPending, loanBreakdown, loanTotalCost, categoryColor, CARD_KINDS,
  incomeCategoriesGrouped, userCategoriesGrouped, usageByCategory, sortGroupedByUsage,
} from '../utils/finance';
import { purchasePaymentInfo } from '../utils/cardCycle';
import Dropdown from '../components/Dropdown';
import EmptyState from '../components/EmptyState';
import PieChart from '../components/PieChart';

const fmtDate = (d) => format(d, "d 'de' MMM", { locale: es });

const TABS = [
  { key: 'resumen',      label: 'Resumen',      icon: 'bar-chart-outline',    color: '#7C5CE6' },
  { key: 'gastos_fijos', label: 'Gastos Fijos',  icon: 'repeat-outline',       color: '#F5A623' },
  { key: 'cuentas',      label: 'Cuentas',       icon: 'wallet-outline',       color: '#35C77B' },
  { key: 'tarjetas',     label: 'Tarjetas',      icon: 'card-outline',         color: '#5B9BF5' },
  { key: 'prestamos',    label: 'Préstamos',     icon: 'cash-outline',         color: '#E63959' },
  { key: 'deudas',       label: 'Deudas',        icon: 'alert-circle-outline', color: '#F4607A' },
  { key: 'cobrar',       label: 'Por cobrar',    icon: 'receipt-outline',      color: '#9B84F4' },
];
const FREQ_OPTS = [
  { key: 'diario', label: 'Diario' },
  { key: 'semanal', label: 'Semanal' },
  { key: 'quincenal', label: 'Quincenal' },
  { key: 'mensual', label: 'Mensual' },
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

export default function FinanzasScreen({ navigation, route }) {
  const store = useStore();
  const { settings } = store;
  const rawFinance = store.finance || {};
  const finance = {
    accounts:     rawFinance.accounts     || [],
    cards:        rawFinance.cards        || [],
    loans:        rawFinance.loans        || [],
    debts:        rawFinance.debts        || [],
    transactions: rawFinance.transactions || [],
    gastosFijos:  rawFinance.gastosFijos  || [],
    receivables:  rawFinance.receivables  || [],
    payments:     rawFinance.payments     || [],
  };
  const cur = settings?.currency || 'PEN';
  const [tab, setTab] = useState('resumen');
  const [menuOpen, setMenuOpen] = useState(false);
  const [period, setPeriod] = useState('mes');
  const [modal, setModal] = useState(null); // { type, id? }
  const [f, setF] = useState({});
  const [pay, setPay] = useState(null); // { mode:'debt'|'loan'|'loanAdd'|'receivable', item, amount, accountId }
  const [historyFor, setHistoryFor] = useState(null); // { kind:'debt'|'loan'|'card'|'receivable', refId, label }
  const [editPayment, setEditPayment] = useState(null); // { id, amount:string, date:string }
  const [filterAcc, setFilterAcc] = useState(null); // ID de cuenta para filtrar

  const set = (k, v) => setF((p) => {
    const next = { ...p, [k]: v };
    // Sugerencia automática de categoría al escribir la nota
    if (k === 'note' && typeof v === 'string' && v.length >= 3 && (p.type === 'gasto' || p.type === 'ingreso') && (!p.category || p.category === 'Otros')) {
      const n = v.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const kw = {
        gasto: {
          'alimentacion': ['comida', 'almuerzo', 'cena', 'desayuno', 'pollo', 'pizza', 'restaurant', 'menu', 'snack', 'cafe'],
          'transporte': ['taxi', 'uber', 'beat', 'gasolina', 'combustible', 'pasaje', 'metro', 'bus'],
          'vivienda': ['alquiler', 'renta', 'hipoteca', 'condominio'],
          'servicios': ['luz', 'agua', 'internet', 'cable', 'telefono', 'celular', 'recibo'],
          'salud': ['farmacia', 'medicina', 'doctor', 'consulta', 'analisis', 'remedio'],
          'educacion': ['colegio', 'universidad', 'curso', 'libro', 'matricula'],
          'entretenimiento': ['cine', 'netflix', 'spotify', 'juego', 'concierto'],
          'ropa': ['camisa', 'pantalon', 'zapato', 'ropa', 'polo'],
        },
        ingreso: {
          'sueldo': ['sueldo', 'salario', 'quincena', 'pago', 'nomina'],
          'negocio': ['venta', 'cliente', 'taxi', 'pasajero', 'colectivo'],
          'freelance': ['freelance', 'proyecto', 'diseño', 'consultoria'],
          'regalo': ['regalo', 'donacion', 'prestamo'],
        },
      };
      const m = kw[p.type] || {};
      for (const [cat, words] of Object.entries(m)) {
        if (words.some((w) => n.includes(w))) {
          next.category = cat.charAt(0).toUpperCase() + cat.slice(1);
          break;
        }
      }
    }
    return next;
  });

  const pickImage = async (source) => {
    try {
      let result;
      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') { Alert.alert('Permiso denegado', 'Habilita el acceso a la cámara en ajustes.'); return; }
        result = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.5 });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') { Alert.alert('Permiso denegado', 'Habilita el acceso a la galería en ajustes.'); return; }
        result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.5 });
      }
      if (!result.canceled && result.assets?.[0]) set('receiptImage', result.assets[0].uri);
    } catch (e) { Alert.alert('Error', 'No se pudo abrir la cámara/galería.'); }
  };

  const openPay = (mode, item) => {
    Haptics.selectionAsync().catch(() => {});
    setPay({ mode, item, amount: '', accountId: finance.accounts[0]?.id });
  };
  const savePay = async () => {
    const amt = num(pay.amount);
    if (amt <= 0) { Alert.alert('Monto inválido', 'Ingresa un monto mayor a 0.'); return; }
    // Pago a tarjeta de crédito: el monto NO puede ser mayor a lo que debe (pay.item.used)
    if (pay.mode === 'card') {
      const due = pay.item.used || 0;
      if (amt - due > 0.005) { Alert.alert('Pago excesivo', `Solo debes ${formatMoney(due, pay.item.currency || cur)}. No puedes pagar más.`); return; }
      if (!pay.accountId) { Alert.alert('Elige una cuenta', 'Para registrar el pago necesitás una cuenta de origen.'); return; }
    }
    // Confirmación háptica + visual si el monto es grande (> 100)
    if (amt >= 100) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      return new Promise((resolve) => {
        Alert.alert(
          'Confirmar pago',
          `Vas a registrar un pago de ${formatMoney(amt, pay.item.currency || cur)}${pay.item?.name || pay.item?.bank || pay.item?.creditor ? ` a ${pay.item.name || pay.item.bank || pay.item.creditor}` : ''}.\n\n¿Confirmás?`,
          [
            { text: 'Cancelar', style: 'cancel', onPress: () => resolve() },
            { text: 'Confirmar', style: 'default', onPress: async () => { await doSavePay(amt); resolve(); } },
          ]
        );
      });
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      await doSavePay(amt);
    }
  };
  const doSavePay = async (amt) => {
    let res;
    if (pay.mode === 'card') {
      res = await store.addTransaction({ type: 'pago', accountId: pay.accountId, cardId: pay.item.id, amount: amt, category: null, note: 'Pago a tarjeta' });
    } else if (pay.mode === 'debt') {
      res = await store.payDebt(pay.item.id, amt, pay.accountId);
    } else if (pay.mode === 'loan') {
      res = await store.payLoan(pay.item.id, amt, pay.accountId);
    } else if (pay.mode === 'receivable') {
      res = await store.collectReceivable(pay.item.id, amt, pay.accountId);
    } else {
      res = await store.addLoanAmount(pay.item.id, amt, pay.accountId);
    }
    if (res && res.error) { Alert.alert('No se pudo', res.error); return; }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setPay(null);
  };

  const openModal = (type, item) => {
    if ((type === 'movement') && finance.accounts.length === 0) {
      Alert.alert('Primero crea una cuenta', 'Necesitas al menos una cuenta para registrar movimientos.');
      return;
    }
    const defaults = {
      account: { name: '', type: 'yape', currency: cur, balance: '', linkedTo: null },
      movement: { type: 'gasto', accountId: finance.accounts[0]?.id, toAccountId: finance.accounts[1]?.id, cardId: finance.cards.find((c) => c.kind !== 'debito')?.id, amount: '', category: 'Otros', note: '', date: format(new Date(), 'yyyy-MM-dd'), time: format(new Date(), 'HH:mm'), receiptImage: null },
      card: { kind: 'credito', bank: '', currency: cur, balance: '', limit: '', used: '', cycleStartDay: '', cutoffDay: '', payDay: '', minPayment: '', totalPayment: '', interest: '', linkedTo: null },
      loan: { name: '', lenderType: 'banco', currency: cur, installment: '', installmentsTotal: '', installmentsPaid: '', interest: '', startDate: '', endDate: '', frequency: 'mensual' },
      debt: { name: '', creditor: '', currency: cur, amount: '', paid: '', priority: 'media', dueDate: '' },
      receivable: { name: '', debtor: '', currency: cur, amount: '', paid: '', interest: '', dueDate: '', notes: '' },
      gastoFijo: { name: '', amount: '', currency: cur, category: 'Vivienda', period: 'mensual', dayOfMonth: '1', accountId: finance.accounts[0]?.id || null, note: '', active: true },
    };
    setF(item ? { ...item, balance: item.balance ?? '', amount: item.amount ?? '' } : defaults[type]);
    setModal({ type, id: item?.id });
  };
  const close = () => { setModal(null); setF({}); };

  // Abrir el modal de movimiento desde el botón rápido de Inicio
  useEffect(() => {
    const q = route?.params?.quickAdd;
    if (!q) return;
    const { amount, note } = route.params;
    navigation.setParams({ quickAdd: undefined, amount: undefined, note: undefined });
    if (finance.accounts.length === 0) {
      Alert.alert('Primero crea una cuenta', 'Necesitas al menos una cuenta para registrar movimientos.');
      return;
    }
    setTab('resumen');
    openModal('movement');
    setF((prev) => ({
      ...prev,
      type: q === 'movement' ? 'gasto' : q,
      amount: amount ? String(amount) : prev.amount,
      note: note || prev.note
    }));
  }, [route?.params?.quickAdd]);

  const save = async () => {
    const id = modal.id;
    if (modal.type === 'account') {
      const p = { name: f.name?.trim() || accountType(f.type).label, type: f.type, currency: f.currency, balance: num(f.balance), linkedTo: f.linkedTo || null };
      id ? await store.updateAccount(id, p) : await store.addAccount(p);
    } else if (modal.type === 'movement') {
      if (num(f.amount) <= 0) return;
      let res;
      if (id) {
        // Editing existing transaction
        const isCard = f.type === 'gasto' && finance.cards.some((c) => c.id === f.accountId);
        res = await store.updateTransaction(id, {
          type: f.type,
          accountId: isCard ? undefined : f.accountId,
          cardId: isCard ? f.accountId : (f.cardId || undefined),
          toAccountId: f.type === 'transferencia' ? f.toAccountId : undefined,
          amount: num(f.amount),
          category: (f.type === 'ingreso' || f.type === 'gasto') ? f.category : null,
          note: f.note?.trim() || '',
          date: f.date || format(new Date(), 'yyyy-MM-dd'),
          time: f.time || format(new Date(), 'HH:mm'),
          receiptImage: f.receiptImage || null,
        });
      } else if (f.type === 'pago') {
        if (!f.accountId || !f.cardId) return;
        res = await store.addTransaction({ type: 'pago', accountId: f.accountId, cardId: f.cardId, amount: num(f.amount), category: null, note: f.note?.trim() || '', date: f.date || format(new Date(), 'yyyy-MM-dd'), time: f.time || format(new Date(), 'HH:mm') });
      } else {
        const isCard = f.type === 'gasto' && finance.cards.some((c) => c.id === f.accountId);
        res = await store.addTransaction({
          type: f.type,
          accountId: isCard ? undefined : f.accountId,
          cardId: isCard ? f.accountId : undefined,
          toAccountId: f.type === 'transferencia' ? f.toAccountId : undefined,
          amount: num(f.amount),
          category: (f.type === 'ingreso' || f.type === 'gasto') ? f.category : null,
          note: f.note?.trim() || '',
          date: f.date || format(new Date(), 'yyyy-MM-dd'),
          time: f.time || format(new Date(), 'HH:mm'),
          receiptImage: f.receiptImage || null,
        });
      }
      if (res && res.error) { Alert.alert('No se pudo registrar', res.error); return; }
    } else if (modal.type === 'card') {
      const p = { kind: f.kind || 'credito', bank: f.bank?.trim() || 'Tarjeta', currency: f.currency, balance: num(f.balance), limit: num(f.limit), used: num(f.used), cycleStartDay: num(f.cycleStartDay), cutoffDay: num(f.cutoffDay), payDay: num(f.payDay), minPayment: num(f.minPayment), totalPayment: num(f.totalPayment), interest: num(f.interest), linkedTo: f.linkedTo || null };
      id ? await store.updateCard(id, p) : await store.addCard(p);
    } else if (modal.type === 'loan') {
      const p = { name: f.name?.trim() || 'Préstamo', lenderType: f.lenderType, currency: f.currency, installment: num(f.installment), installmentsTotal: num(f.installmentsTotal), installmentsPaid: num(f.installmentsPaid), interest: num(f.interest), startDate: f.startDate, endDate: f.endDate, frequency: f.frequency || 'mensual' };
      id ? await store.updateLoan(id, p) : await store.addLoan(p);
    } else if (modal.type === 'receivable') {
      const p = { name: f.name?.trim() || 'Cuenta por cobrar', debtor: f.debtor?.trim() || '', currency: f.currency, amount: num(f.amount), paid: num(f.paid), interest: num(f.interest), dueDate: f.dueDate, notes: f.notes?.trim() || '' };
      id ? await store.updateReceivable(id, p) : await store.addReceivable(p);
    } else if (modal.type === 'debt') {
      const p = { name: f.name?.trim() || 'Deuda', creditor: f.creditor?.trim() || '', currency: f.currency, amount: num(f.amount), paid: num(f.paid), priority: f.priority, dueDate: f.dueDate };
      id ? await store.updateDebt(id, p) : await store.addDebt(p);
    } else if (modal.type === 'gastoFijo') {
      const p = { name: f.name?.trim() || 'Gasto fijo', amount: num(f.amount), currency: f.currency, category: f.category, period: f.period || 'mensual', dayOfMonth: num(f.dayOfMonth) || 1, accountId: f.accountId || null, note: f.note?.trim() || '', active: f.active !== false };
      id ? await store.updateGastoFijo(id, p) : await store.addGastoFijo(p);
    }
    close();
  };

  const confirmDel = (label, fn) => Alert.alert('Eliminar', `¿Eliminar ${label}?`, [{ text: 'Cancelar' }, { text: 'Eliminar', style: 'destructive', onPress: fn }]);

  const onDeleteCurrent = () => {
    const fns = { account: store.deleteAccount, card: store.deleteCard, loan: store.deleteLoan, debt: store.deleteDebt, gastoFijo: store.deleteGastoFijo, receivable: store.deleteReceivable, movement: store.deleteTransaction };
    const fn = fns[modal.type];
    if (!fn) return;
    confirmDel('este registro', async () => { await fn(modal.id); close(); });
  };

  const stats = financeStats(finance.transactions, period, cur);
  const fabType = { resumen: 'movement', gastos_fijos: 'gastoFijo', cuentas: 'account', tarjetas: 'card', prestamos: 'loan', deudas: 'debt', cobrar: 'receivable' }[tab];
  const activeTab = TABS.find(t => t.key === tab) || TABS[0];
  const gastoUsage = useMemo(() => usageByCategory(finance.transactions, 'gasto'), [finance.transactions]);
  const ingresoUsage = useMemo(() => usageByCategory(finance.transactions, 'ingreso'), [finance.transactions]);
  const gastoCats = useMemo(() => sortGroupedByUsage(userCategoriesGrouped(settings), gastoUsage), [settings, gastoUsage]);
  const ingresoCats = useMemo(() => sortGroupedByUsage(incomeCategoriesGrouped(store.userProfile?.occupation, settings), ingresoUsage), [settings, ingresoUsage, store.userProfile?.occupation]);

  return (
    <View style={styles.bg}>
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>Finanzas</Text>
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
          <Text style={styles.heroSub}>Saldo actual ({cur}): {formatMoney(totalLiquid(finance, cur), cur)}</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.navBar} onPress={() => setMenuOpen(true)} activeOpacity={0.85}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={[styles.navIcon, { backgroundColor: activeTab.color + '22' }]}>
            <Ionicons name={activeTab.icon} size={18} color={activeTab.color} />
          </View>
          <Text style={styles.navTitle}>{activeTab.label}</Text>
        </View>
        <View style={styles.navMenuBtn}>
          <Ionicons name="grid-outline" size={20} color={COLORS.purple} />
        </View>
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {tab === 'resumen' && (
          <Resumen
            finance={finance} cur={cur} period={period} setPeriod={setPeriod} stats={stats}
            onDelTx={(id) => store.deleteTransaction(id)} onEditTx={(t) => openModal('movement', t)}
            filterAcc={filterAcc} setFilterAcc={setFilterAcc}
          />
        )}
        {tab === 'gastos_fijos' && (
          <GastosFijos finance={finance} cur={cur} onEdit={(g) => openModal('gastoFijo', g)} onDel={(g) => confirmDel(`"${g.name}"`, () => store.deleteGastoFijo(g.id))} onAdd={() => openModal('gastoFijo')} settings={settings} />
        )}
        {tab === 'cuentas' && (
          <Cuentas finance={finance} cur={cur} onAdd={() => openModal('account')} onMove={() => openModal('movement')}
            onEdit={(a) => openModal('account', a)} onDel={(a) => confirmDel(`la cuenta "${a.name}"`, () => store.deleteAccount(a.id))} />
        )}
        {tab === 'tarjetas' && (
          <Tarjetas finance={finance} onEdit={(c) => openModal('card', c)} onDel={(c) => confirmDel(`la tarjeta "${c.bank}"`, () => store.deleteCard(c.id))} onAdd={() => openModal('card')} onCalendar={(c) => navigation.navigate('CardCalendar', { id: c.id })} onPay={(c) => openPay('card', c)} onHistory={(c) => setHistoryFor({ kind: 'card', refId: c.id, label: c.bank, currency: c.currency })} />
        )}
        {tab === 'prestamos' && (
          <Prestamos finance={finance} onEdit={(l) => openModal('loan', l)} onDel={(l) => confirmDel(`el préstamo "${l.name}"`, () => store.deleteLoan(l.id))} onAdd={() => openModal('loan')} onPay={(l) => openPay('loan', l)} onAddMore={(l) => openPay('loanAdd', l)} onHistory={(l) => setHistoryFor({ kind: 'loan', refId: l.id, label: l.name, currency: l.currency })} />
        )}
        {tab === 'deudas' && (
          <Deudas finance={finance} onEdit={(d) => openModal('debt', d)} onDel={(d) => confirmDel(`la deuda "${d.name || d.creditor}"`, () => store.deleteDebt(d.id))} onAdd={() => openModal('debt')} onPay={(d) => openPay('debt', d)} onHistory={(d) => setHistoryFor({ kind: 'debt', refId: d.id, label: d.creditor || d.name, currency: d.currency })} />
        )}
        {tab === 'cobrar' && (
          <CuentasCobrar finance={finance} onEdit={(r) => openModal('receivable', r)} onDel={(r) => confirmDel(`"${r.name || r.debtor}"`, () => store.deleteReceivable(r.id))} onAdd={() => openModal('receivable')} onCollect={(r) => openPay('receivable', r)} onHistory={(r) => setHistoryFor({ kind: 'receivable', refId: r.id, label: r.debtor || r.name, currency: r.currency })} />
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
                  {!f.linkedTo ? (
                    <Field label="Saldo inicial (lo que tienes ahora)"><TextInput style={styles.input} value={String(f.balance)} onChangeText={(v) => set('balance', v)} keyboardType="numeric" placeholder="0.00" placeholderTextColor={COLORS.textMuted} /></Field>
                  ) : (
                    <Field label="Saldo inicial">
                      <View style={[styles.payNote, { borderColor: COLORS.green + '66', padding: 10 }]}>
                        <Text style={{ fontSize: 13, color: COLORS.textSub }}>Saldo automático desde <Text style={{ fontWeight: '700', color: COLORS.text }}>{finance.accounts.find(a => a.id === findRootAccId(finance.accounts, f.linkedTo))?.name || 'cuenta vinculada'}</Text></Text>
                      </View>
                    </Field>
                  )}
                  {finance.accounts.filter(a => a.id !== modal?.id).length > 0 && (
                    <Field label="Vinculada a (opcional)">
                      <View style={[styles.payNote, { borderColor: COLORS.blue + '66', padding: 8, marginBottom: 0 }]}>
                        <Text style={{ fontSize: 11, color: COLORS.textSub, marginBottom: 8 }}>Si Yape usa el saldo de BCP, vincula Yape a BCP para no contar doble en el patrimonio.</Text>
                        <Chips
                          options={[{ key: null, label: 'Sin vincular' }, ...finance.accounts.filter(a => a.id !== modal?.id).map(a => ({ key: a.id, label: a.name }))]}
                          value={f.linkedTo ?? null}
                          onChange={(v) => set('linkedTo', v)}
                        />
                      </View>
                    </Field>
                  )}
                </>
              )}
              {modal?.type === 'movement' && (
                <>
                  <Field label="Tipo"><Dropdown options={TX_TYPES} value={f.type} onChange={(v) => set('type', v)} /></Field>
                  <Field label={f.type === 'transferencia' ? 'Desde' : f.type === 'pago' ? 'Pagar desde' : f.type === 'gasto' ? 'Pagar con' : 'Cuenta'}>
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
                  {f.type === 'pago' && (
                    <Field label="Tarjeta a pagar">
                      <Dropdown options={finance.cards.filter((c) => c.kind !== 'debito').map((c) => ({ key: c.id, label: c.bank }))} value={f.cardId} onChange={(v) => set('cardId', v)} placeholder="Elige tarjeta de crédito" />
                    </Field>
                  )}
                  <Field label="Monto"><TextInput style={styles.input} value={String(f.amount)} onChangeText={(v) => set('amount', v)} keyboardType="numeric" placeholder="0.00" placeholderTextColor={COLORS.textMuted} /></Field>
                  {(() => {
                    const selCard = finance.cards.find((c) => c.id === f.accountId);
                    if (f.type !== 'gasto' || !selCard || selCard.kind === 'debito') return null;
                    const info = purchasePaymentInfo(selCard);
                    if (!info) return <Text style={styles.payNoteMuted}>Configura corte y pago de esta tarjeta para ver cuándo pagarás.</Text>;
                    const col = info.level === 'green' ? COLORS.green : info.level === 'yellow' ? COLORS.amber : COLORS.red;
                    return (
                      <View style={[styles.payNote, { borderColor: col + '88' }]}>
                        <Text style={[styles.payNoteText, { color: col }]}>💳 Pagarás esta compra el {fmtDate(info.payDate)} ({info.daysAway} días)</Text>
                      </View>
                    );
                  })()}
                  {(f.type === 'ingreso' || f.type === 'gasto') && (
                    <Field label="Categoría">
                      <Dropdown options={f.type === 'ingreso' ? ingresoCats : gastoCats} value={f.category} onChange={(v) => set('category', v)} />
                    </Field>
                  )}
                  <Field label="Nota (opcional)"><TextInput style={styles.input} value={f.note} onChangeText={(v) => set('note', v)} placeholder="Detalle..." placeholderTextColor={COLORS.textMuted} /></Field>
                  <Row>
                    <Half label="Fecha">
                      <TextInput style={styles.input} value={f.date} onChangeText={(v) => set('date', v)} placeholder="yyyy-mm-dd" placeholderTextColor={COLORS.textMuted} />
                    </Half>
                    <Half label="Hora">
                      <TextInput style={styles.input} value={f.time} onChangeText={(v) => set('time', v)} placeholder="HH:MM" placeholderTextColor={COLORS.textMuted} keyboardType="numbers-and-punctuation" />
                    </Half>
                  </Row>
                  <Field label="Foto de boleta (opcional)">
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <TouchableOpacity style={styles.photoBtn} onPress={() => pickImage('camera')}>
                        <Ionicons name="camera-outline" size={18} color={COLORS.purpleLight} />
                        <Text style={styles.photoBtnText}>Cámara</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.photoBtn} onPress={() => pickImage('library')}>
                        <Ionicons name="image-outline" size={18} color={COLORS.purpleLight} />
                        <Text style={styles.photoBtnText}>Galería</Text>
                      </TouchableOpacity>
                    </View>
                    {f.receiptImage ? (
                      <View style={{ marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <Image source={{ uri: f.receiptImage }} style={{ width: 64, height: 64, borderRadius: 8 }} />
                        <TouchableOpacity onPress={() => set('receiptImage', null)}>
                          <Text style={{ color: COLORS.red, fontSize: 13 }}>Eliminar foto</Text>
                        </TouchableOpacity>
                      </View>
                    ) : null}
                  </Field>
                </>
              )}
              {modal?.type === 'card' && (
                <>
                  <Field label="Tipo de tarjeta"><Dropdown options={CARD_KINDS} value={f.kind} onChange={(v) => set('kind', v)} /></Field>
                  <Field label="Banco / nombre"><TextInput style={styles.input} value={f.bank} onChangeText={(v) => set('bank', v)} placeholder="Ej. BCP Visa" placeholderTextColor={COLORS.textMuted} /></Field>
                  <Field label="Moneda"><Chips options={CUR_OPTS} value={f.currency} onChange={(v) => set('currency', v)} /></Field>
                  {f.kind !== 'debito' && (
                    <>
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
                        <Half label="Interés (% TEA)"><TextInput style={styles.input} value={String(f.interest)} onChangeText={(v) => set('interest', v)} keyboardType="numeric" placeholder="Ej. 60" placeholderTextColor={COLORS.textMuted} /></Half>
                      </Row>
                      <Row>
                        <Half label="Pago mínimo"><TextInput style={styles.input} value={String(f.minPayment)} onChangeText={(v) => set('minPayment', v)} keyboardType="numeric" placeholder="0" placeholderTextColor={COLORS.textMuted} /></Half>
                        <Half label="Pago total"><TextInput style={styles.input} value={String(f.totalPayment)} onChangeText={(v) => set('totalPayment', v)} keyboardType="numeric" placeholder="0" placeholderTextColor={COLORS.textMuted} /></Half>
                      </Row>
                    </>
                  )}
                  {f.kind === 'debito' && (
                    <>
                      {!f.linkedTo ? (
                        <Field label="Saldo actual"><TextInput style={styles.input} value={String(f.balance)} onChangeText={(v) => set('balance', v)} keyboardType="numeric" placeholder="0.00" placeholderTextColor={COLORS.textMuted} /></Field>
                      ) : (
                        <Field label="Saldo actual">
                          <View style={[styles.payNote, { borderColor: COLORS.green + '66', padding: 10 }]}>
                            <Text style={{ fontSize: 13, color: COLORS.textSub }}>Saldo automático desde <Text style={{ fontWeight: '700', color: COLORS.text }}>{finance.accounts.find(a => a.id === f.linkedTo)?.name || 'cuenta vinculada'}</Text>: <Text style={{ fontWeight: '700', color: COLORS.green }}>{formatMoney(finance.accounts.find(a => a.id === f.linkedTo)?.balance || 0, f.currency)}</Text></Text>
                          </View>
                        </Field>
                      )}
                      {finance.accounts.length > 0 && (
                        <Field label="Vincular a cuenta (opcional)">
                          <View style={[styles.payNote, { borderColor: COLORS.blue + '66', padding: 8, marginBottom: 0 }]}>
                            <Text style={{ fontSize: 11, color: COLORS.textSub, marginBottom: 8 }}>Si esta tarjeta débito es de una cuenta (ej. BCP débito → cuenta BCP), vincula para que compartan el saldo.</Text>
                            <Chips
                              options={[{ key: null, label: 'Sin vincular' }, ...finance.accounts.map(a => ({ key: a.id, label: a.name }))]}
                              value={f.linkedTo ?? null}
                              onChange={(v) => set('linkedTo', v)}
                            />
                          </View>
                        </Field>
                      )}
                    </>
                  )}
                </>
              )}
              {modal?.type === 'loan' && (
                <>
                  <Field label="Nombre"><TextInput style={styles.input} value={f.name} onChangeText={(v) => set('name', v)} placeholder="Ej. Préstamo auto" placeholderTextColor={COLORS.textMuted} /></Field>
                  <Field label="Tipo de prestamista"><Chips options={LOAN_TYPES} value={f.lenderType} onChange={(v) => set('lenderType', v)} /></Field>
                  <Field label="Moneda"><Chips options={CUR_OPTS} value={f.currency} onChange={(v) => set('currency', v)} /></Field>
                  <Field label="Frecuencia de cuotas"><Chips options={FREQ_OPTS} value={f.frequency || 'mensual'} onChange={(v) => set('frequency', v)} /></Field>
                  <Row>
                    <Half label="Cuota"><TextInput style={styles.input} value={String(f.installment)} onChangeText={(v) => set('installment', v)} keyboardType="numeric" placeholder="0" placeholderTextColor={COLORS.textMuted} /></Half>
                    <Half label="Interés (% TEA)"><TextInput style={styles.input} value={String(f.interest)} onChangeText={(v) => set('interest', v)} keyboardType="numeric" placeholder="0" placeholderTextColor={COLORS.textMuted} /></Half>
                  </Row>
                  <Row>
                    <Half label="Cuotas totales"><TextInput style={styles.input} value={String(f.installmentsTotal)} onChangeText={(v) => set('installmentsTotal', v)} keyboardType="numeric" placeholder="Ej. 36" placeholderTextColor={COLORS.textMuted} /></Half>
                    <Half label="Cuotas pagadas"><TextInput style={styles.input} value={String(f.installmentsPaid)} onChangeText={(v) => set('installmentsPaid', v)} keyboardType="numeric" placeholder="0" placeholderTextColor={COLORS.textMuted} /></Half>
                  </Row>
                  {(() => {
                    const inst = num(f.installment); const tot = num(f.installmentsTotal); const cap = num(f.amount || (inst * tot));
                    if (inst > 0 && tot > 0) {
                      const totalCost = inst * tot;
                      const intTotal = Math.max(0, totalCost - cap);
                      return (
                        <View style={[styles.payNote, { borderColor: COLORS.amber + '88', marginBottom: 8 }]}>
                          <Text style={[styles.payNoteText, { color: COLORS.amber }]}>
                            Costo total: {inst * tot} · Interés aprox: {intTotal.toFixed(0)}{f.interest ? ` · TEA: ${f.interest}%` : ''}
                          </Text>
                        </View>
                      );
                    }
                    return null;
                  })()}
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
              {modal?.type === 'receivable' && (
                <>
                  <Field label="Descripción"><TextInput style={styles.input} value={f.name} onChangeText={(v) => set('name', v)} placeholder="Ej. Préstamo a Juan" placeholderTextColor={COLORS.textMuted} /></Field>
                  <Field label="Deudor (¿quién te debe?)"><TextInput style={styles.input} value={f.debtor} onChangeText={(v) => set('debtor', v)} placeholder="Nombre completo" placeholderTextColor={COLORS.textMuted} /></Field>
                  <Field label="Moneda"><Chips options={CUR_OPTS} value={f.currency} onChange={(v) => set('currency', v)} /></Field>
                  <Row>
                    <Half label="Monto prestado"><TextInput style={styles.input} value={String(f.amount)} onChangeText={(v) => set('amount', v)} keyboardType="numeric" placeholder="0" placeholderTextColor={COLORS.textMuted} /></Half>
                    <Half label="Ya cobrado"><TextInput style={styles.input} value={String(f.paid)} onChangeText={(v) => set('paid', v)} keyboardType="numeric" placeholder="0" placeholderTextColor={COLORS.textMuted} /></Half>
                  </Row>
                  <Row>
                    <Half label="Interés (% anual)"><TextInput style={styles.input} value={String(f.interest)} onChangeText={(v) => set('interest', v)} keyboardType="numeric" placeholder="0" placeholderTextColor={COLORS.textMuted} /></Half>
                    <Half label="Fecha límite"><TextInput style={styles.input} value={f.dueDate} onChangeText={(v) => set('dueDate', v)} placeholder="Ej. 30/06/2026" placeholderTextColor={COLORS.textMuted} /></Half>
                  </Row>
                  <Field label="Notas (opcional)"><TextInput style={styles.input} value={f.notes} onChangeText={(v) => set('notes', v)} placeholder="Contexto, acuerdo..." placeholderTextColor={COLORS.textMuted} /></Field>
                </>
              )}
              {modal?.type === 'gastoFijo' && (
                <>
                  <Field label="Nombre"><TextInput style={styles.input} value={f.name} onChangeText={(v) => set('name', v)} placeholder="Ej. Alquiler, Netflix, Luz..." placeholderTextColor={COLORS.textMuted} /></Field>
                  <Field label="Moneda"><Chips options={CUR_OPTS} value={f.currency} onChange={(v) => set('currency', v)} /></Field>
                  <Field label="Monto"><TextInput style={styles.input} value={String(f.amount)} onChangeText={(v) => set('amount', v)} keyboardType="numeric" placeholder="0.00" placeholderTextColor={COLORS.textMuted} /></Field>
                  <Field label="Categoría">
                    <Dropdown options={gastoCats} value={f.category} onChange={(v) => set('category', v)} />
                  </Field>
                  <Field label="Frecuencia">
                    <Chips options={[{ key: 'mensual', label: 'Mensual' }, { key: 'semanal', label: 'Semanal' }, { key: 'anual', label: 'Anual' }]} value={f.period} onChange={(v) => set('period', v)} />
                  </Field>
                  <Field label="Día de vencimiento">
                    <TextInput style={styles.input} value={String(f.dayOfMonth)} onChangeText={(v) => set('dayOfMonth', v)} keyboardType="numeric" placeholder="Ej. 5 (día del mes)" placeholderTextColor={COLORS.textMuted} />
                  </Field>
                  {finance.accounts.length > 0 && (
                    <Field label="Cuenta de débito (opcional)">
                      <Chips options={[{ key: null, label: 'Sin cuenta' }, ...finance.accounts.map((a) => ({ key: a.id, label: a.name }))]} value={f.accountId} onChange={(v) => set('accountId', v)} />
                    </Field>
                  )}
                  <Field label="Nota (opcional)"><TextInput style={styles.input} value={f.note} onChangeText={(v) => set('note', v)} placeholder="Descripción..." placeholderTextColor={COLORS.textMuted} /></Field>
                </>
              )}
            </ScrollView>
            <TouchableOpacity style={styles.saveBtn} onPress={save} activeOpacity={0.85}>
              <Text style={styles.saveText}>{modal?.id ? 'Guardar cambios' : 'Agregar'}</Text>
            </TouchableOpacity>
            {modal?.id && (
              <TouchableOpacity style={styles.delModalBtn} onPress={onDeleteCurrent} activeOpacity={0.85}>
                <Ionicons name="trash-outline" size={18} color={COLORS.red} />
                <Text style={styles.delModalText}>Eliminar</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

      {/* Modal de pago de deuda / préstamo */}
      <Modal visible={!!pay} transparent animationType="slide" onRequestClose={() => setPay(null)}>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <View style={styles.sheetHead}>
              <Text style={styles.sheetTitle}>{pay?.mode === 'loanAdd' ? 'Solicitar monto adicional' : pay?.mode === 'card' ? `Pagar: ${pay?.item?.bank || 'Tarjeta'}` : pay?.mode === 'receivable' ? 'Registrar cobro' : 'Registrar pago'}</Text>
              <TouchableOpacity onPress={() => setPay(null)}><Ionicons name="close" size={24} color={COLORS.textSub} /></TouchableOpacity>
            </View>
            {pay && (
              <>
                <Text style={[styles.fLabel, { marginBottom: 12 }]}>{pay.item.name || pay.item.creditor || pay.item.bank || ''}</Text>
                {pay.mode === 'card' && (
                  <View style={[styles.payNote, { borderColor: COLORS.purple + '88', marginBottom: 14 }]}>
                    <Text style={[styles.payNoteText, { color: COLORS.purpleLight }]}>
                      Debes {formatMoney(pay.item.used || 0, pay.item.currency)} · Disponible para pagar: {formatMoney(pay.item.used || 0, pay.item.currency)}
                    </Text>
                  </View>
                )}
                <Field label="Monto"><TextInput style={styles.input} value={pay.amount} onChangeText={(v) => setPay((p) => ({ ...p, amount: v }))} keyboardType="numeric" placeholder="0.00" placeholderTextColor={COLORS.textMuted} autoFocus /></Field>
                <Field label={pay.mode === 'loanAdd' ? 'Recibir en cuenta (opcional)' : 'Pagar desde (opcional)'}>
                  <Chips options={[{ key: null, label: 'Sin cuenta' }, ...finance.accounts.map((a) => ({ key: a.id, label: a.name }))]} value={pay.accountId} onChange={(v) => setPay((p) => ({ ...p, accountId: v }))} />
                </Field>
                <Text style={styles.payHint}>{pay.mode === 'loanAdd' ? 'Aumenta el saldo del préstamo. Si eliges cuenta, ese dinero se suma ahí.' : pay.mode === 'card' ? 'Descuenta del saldo de la tarjeta y de la cuenta elegida. Aparece como gasto en tu historial.' : pay.mode === 'receivable' ? 'Registra un cobro parcial o total. Si eliges cuenta, el monto se suma como ingreso.' : 'Baja el saldo pendiente. Si eliges cuenta, se descuenta de ahí y aparece en tus gastos (categoría Deudas).'}</Text>
                <TouchableOpacity style={styles.saveBtn} onPress={savePay} activeOpacity={0.85}><Text style={styles.saveText}>{pay.mode === 'loanAdd' ? 'Agregar monto' : pay.mode === 'receivable' ? 'Registrar cobro' : 'Registrar pago'}</Text></TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Modal: historial de pagos */}
      <Modal visible={!!historyFor} transparent animationType="slide" onRequestClose={() => setHistoryFor(null)}>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <View style={styles.sheetHead}>
              <Text style={styles.sheetTitle}>{historyFor?.kind === 'receivable' ? 'Cobros' : 'Pagos'} · {historyFor?.label || ''}</Text>
              <TouchableOpacity onPress={() => setHistoryFor(null)}><Ionicons name="close" size={24} color={COLORS.textSub} /></TouchableOpacity>
            </View>
            {historyFor && (() => {
              const list = (finance.payments || []).filter((p) => p.kind === historyFor.kind && p.refId === historyFor.refId).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
              const accName = (id) => id ? (finance.accounts.find((a) => a.id === id)?.name || '—') : 'Sin cuenta';
              const total = list.reduce((s, p) => s + (p.amount || 0), 0);
              const isReceivable = historyFor.kind === 'receivable';
              const kindLabel = historyFor.kind === 'card' ? 'tarjeta' : historyFor.kind === 'loan' ? 'préstamo' : historyFor.kind === 'receivable' ? 'cuenta por cobrar' : 'deuda';
              if (list.length === 0) {
                return (
                  <View style={{ alignItems: 'center', padding: 28 }}>
                    <Ionicons name="time-outline" size={40} color={COLORS.textMuted} />
                    <Text style={[styles.hint, { textAlign: 'center', marginTop: 10 }]}>Aún no hay {isReceivable ? 'cobros' : 'pagos'} registrados para este {kindLabel}.</Text>
                  </View>
                );
              }
              return (
                <>
                  <View style={[styles.payNote, { borderColor: (isReceivable ? COLORS.green : COLORS.green) + '88', marginBottom: 12 }]}>
                    <Text style={[styles.payNoteText, { color: COLORS.green }]}>Total {isReceivable ? 'cobrado' : 'pagado'}: {formatMoney(total, historyFor.currency)} · {list.length} registro{list.length > 1 ? 's' : ''}</Text>
                  </View>
                  <ScrollView style={{ maxHeight: 340 }} showsVerticalScrollIndicator={false}>
                    {list.map((p) => (
                      <View key={p.id} style={styles.histRow}>
                        <Ionicons name="checkmark-circle" size={18} color={COLORS.green} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.histAmt}>{formatMoney(p.amount, historyFor.currency)}</Text>
                          <Text style={styles.histSub}>{isReceivable ? 'A cuenta:' : 'Desde:'} {accName(p.accountId)}</Text>
                        </View>
                        <Text style={styles.histDate}>{p.date}</Text>
                        <TouchableOpacity
                          onPress={() => setEditPayment({ id: p.id, amount: String(p.amount), date: p.date || '' })}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          style={{ marginRight: 8 }}
                        >
                          <Ionicons name="pencil-outline" size={16} color={COLORS.purpleLight} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => Alert.alert(`Eliminar ${isReceivable ? 'cobro' : 'pago'}`, `¿Eliminar este ${isReceivable ? 'cobro' : 'pago'} de ${formatMoney(p.amount, historyFor.currency)}? Se revertirá el monto.`, [
                            { text: 'Cancelar' },
                            { text: 'Eliminar', style: 'destructive', onPress: async () => { await store.deletePayment(p.id); } }
                          ])}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Ionicons name="trash-outline" size={16} color={COLORS.red} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </ScrollView>
                </>
              );
            })()}
          </View>
        </View>
      </Modal>

      {/* Modal: menú de secciones */}
      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setMenuOpen(false)}>
          <View style={styles.tabGrid} onStartShouldSetResponder={() => true}>
            <View style={styles.sheetHead}>
              <Text style={styles.sheetTitle}>Secciones</Text>
              <TouchableOpacity onPress={() => setMenuOpen(false)}><Ionicons name="close" size={24} color={COLORS.textSub} /></TouchableOpacity>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              {TABS.map((t) => {
                const isActive = tab === t.key;
                return (
                  <TouchableOpacity
                    key={t.key}
                    style={[styles.tabTile, isActive && { borderColor: t.color, borderWidth: 2 }]}
                    onPress={() => { setTab(t.key); setMenuOpen(false); }}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.tabTileIcon, { backgroundColor: t.color + '22' }]}>
                      <Ionicons name={t.icon} size={22} color={t.color} />
                    </View>
                    <Text style={[styles.tabTileLabel, isActive && { color: t.color, fontWeight: '700' }]}>{t.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal: editar pago/cobro */}
      <Modal visible={!!editPayment} transparent animationType="fade" onRequestClose={() => setEditPayment(null)}>
        <View style={styles.backdrop}>
          <View style={[styles.sheet, { paddingBottom: 20 }]}>
            <View style={styles.sheetHead}>
              <Text style={styles.sheetTitle}>Editar registro</Text>
              <TouchableOpacity onPress={() => setEditPayment(null)}><Ionicons name="close" size={24} color={COLORS.textSub} /></TouchableOpacity>
            </View>
            {editPayment && (
              <>
                <Field label="Monto">
                  <TextInput style={styles.input} value={editPayment.amount} onChangeText={(v) => setEditPayment((p) => ({ ...p, amount: v }))} keyboardType="numeric" placeholder="0.00" placeholderTextColor={COLORS.textMuted} autoFocus />
                </Field>
                <Field label="Fecha (yyyy-mm-dd)">
                  <TextInput style={styles.input} value={editPayment.date} onChangeText={(v) => setEditPayment((p) => ({ ...p, date: v }))} placeholder="2026-06-14" placeholderTextColor={COLORS.textMuted} />
                </Field>
                <TouchableOpacity style={styles.saveBtn} onPress={async () => {
                  const amt = num(editPayment.amount);
                  if (amt <= 0) { Alert.alert('Monto inválido', 'Ingresa un monto mayor a 0.'); return; }
                  await store.updatePayment(editPayment.id, { amount: amt, date: editPayment.date });
                  setEditPayment(null);
                }} activeOpacity={0.85}>
                  <Text style={styles.saveText}>Guardar cambios</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function titleFor(modal) {
  const base = { account: 'Cuenta', movement: 'Movimiento', card: 'Tarjeta de crédito', loan: 'Préstamo', debt: 'Deuda', gastoFijo: 'Gasto fijo recurrente', receivable: 'Cuenta por cobrar' }[modal.type];
  return modal.id && modal.type === 'movement' ? 'Editar movimiento' : base;
}
const Row = ({ children }) => <View style={{ flexDirection: 'row', gap: 12 }}>{children}</View>;
const Half = ({ label, children }) => <View style={{ flex: 1, marginBottom: 14 }}><Text style={styles.fLabel}>{label}</Text>{children}</View>;

// ───────────── SECCIONES ─────────────
function Resumen({ finance, cur, period, setPeriod, stats, onDelTx, onEditTx, filterAcc, setFilterAcc }) {
  const [chartMode, setChartMode] = useState('gasto');
  const cats = Object.entries(stats.byCategory).sort((a, b) => b[1] - a[1]);
  const incCats = Object.entries(stats.byIncome || {}).sort((a, b) => b[1] - a[1]);
  const maxCat = cats.length ? cats[0][1] : 1;
  const accName = (id) => finance.accounts.find((a) => a.id === id)?.name || '—';
  const srcName = (t) => (t.cardId ? '💳 ' + (finance.cards.find((c) => c.id === t.cardId)?.bank || 'Tarjeta') : accName(t.accountId));
  const [search, setSearch] = useState('');
  const liquid = totalLiquid(finance);

  // Filter transactions by period when no search term, show all when searching
  const [s, e] = periodRange(period);
  const recent = finance.transactions.filter((t) => {
    // Primero filtrar por cuenta si hay filtro activo
    if (filterAcc) {
      if (t.accountId !== filterAcc && t.toAccountId !== filterAcc && t.cardId !== filterAcc) return false;
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      return (t.note || '').toLowerCase().includes(q) || (t.category || '').toLowerCase().includes(q) || srcName(t).toLowerCase().includes(q);
    }
    try { const d = parseISO(t.date); return d >= s && d <= e; } catch { return false; }
  });

  return (
    <View>
      {/* Saldo consolidado */}
      <View style={[styles.totalCard, { marginBottom: 12 }]}>
        <Text style={styles.statLbl}>Saldo actual en cuentas</Text>
        <Text style={[styles.totalVal, { color: liquid >= 0 ? COLORS.green : COLORS.red }]}>{liquid >= 0 ? '+' : ''}{formatMoney(liquid, cur)}</Text>
      </View>

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

      <Text style={styles.secTitle}>Filtrar por cuenta</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
        <TouchableOpacity onPress={() => setFilterAcc(null)} style={[styles.chip, !filterAcc && styles.chipOn]}>
          <Text style={[styles.chipText, !filterAcc && styles.chipTextOn]}>Todas</Text>
        </TouchableOpacity>
        {finance.accounts.map(a => (
          <TouchableOpacity key={a.id} onPress={() => setFilterAcc(a.id)} style={[styles.chip, filterAcc === a.id && styles.chipOn]}>
            <Text style={[styles.chipText, filterAcc === a.id && styles.chipTextOn]}>{a.name}</Text>
          </TouchableOpacity>
        ))}
        {finance.cards.map(c => (
          <TouchableOpacity key={c.id} onPress={() => setFilterAcc(c.id)} style={[styles.chip, filterAcc === c.id && styles.chipOn]}>
            <Text style={[styles.chipText, filterAcc === c.id && styles.chipTextOn]}>💳 {c.bank}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, marginBottom: 6 }}>
        <Text style={styles.secTitle}>Por categoría</Text>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {[{ k: 'gasto', label: 'Gastos', color: COLORS.red }, { k: 'ingreso', label: 'Ingresos', color: COLORS.green }].map(({ k, label, color }) => (
            <TouchableOpacity key={k} onPress={() => setChartMode(k)} style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, backgroundColor: chartMode === k ? color + '22' : COLORS.card, borderWidth: 0.5, borderColor: chartMode === k ? color : COLORS.cardBorder }}>
              <Text style={{ fontSize: 12, color: chartMode === k ? color : COLORS.textMuted, fontWeight: '600' }}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      {(() => {
        const isInc = chartMode === 'ingreso';
        const data = isInc ? incCats : cats;
        const total = isInc ? stats.ingresos : stats.gastos;
        const color = isInc ? COLORS.green : COLORS.red;
        if (data.length === 0) return <Text style={styles.hint}>{isInc ? 'Sin ingresos' : 'Sin gastos'} en este periodo.</Text>;
        return (
          <View style={[styles.card, { flexDirection: 'row', alignItems: 'center', gap: 16, flexWrap: 'wrap' }]}>
            <PieChart
              data={data.slice(0, 6).map(([c, v]) => ({ key: c, value: v, color: categoryColor(c) }))}
              size={140} thickness={24}
              centerLabel={isInc ? 'Ingresos' : 'Gastos'}
              centerValue={formatMoney(total, cur)}
            />
            <View style={{ flex: 1, minWidth: 140, gap: 6 }}>
              {data.slice(0, 6).map(([c, v]) => (
                <View key={c} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: categoryColor(c) }} />
                  <Text style={{ flex: 1, fontSize: 12, color: COLORS.text }} numberOfLines={1}>{c}</Text>
                  <Text style={{ fontSize: 11, color: COLORS.textSub, fontWeight: '600' }}>{total > 0 ? Math.round((v / total) * 100) : 0}%</Text>
                </View>
              ))}
            </View>
          </View>
        );
      })()}

      <Text style={styles.secTitle}>Últimos movimientos</Text>
      <View style={styles.searchBox}>
        <Ionicons name="search-outline" size={16} color={COLORS.textMuted} />
        <TextInput style={styles.searchInput} value={search} onChangeText={setSearch} placeholder="Buscar movimiento, categoría o cuenta…" placeholderTextColor={COLORS.textMuted} />
        {search.length > 0 && <TouchableOpacity onPress={() => setSearch('')}><Ionicons name="close-circle" size={18} color={COLORS.textMuted} /></TouchableOpacity>}
      </View>
      {recent.length === 0 ? (
        <Text style={styles.hint}>{search.trim() ? `Sin resultados para "${search}".` : 'Sin movimientos en este periodo. Cambia el filtro o usa el botón +.'}</Text>
      ) : (
        <View style={styles.card}>
          {recent.map((t) => {
            const tt = TX_TYPES.find((x) => x.key === t.type);
            const sign = t.type === 'ingreso' ? '+' : t.type === 'gasto' ? '-' : '';
            return (
              <View key={t.id} style={styles.txRow}>
                <Ionicons name={tt.icon} size={20} color={tt.color} />
                {t.receiptImage ? (
                  <Image source={{ uri: t.receiptImage }} style={{ width: 36, height: 36, borderRadius: 6 }} />
                ) : null}
                <View style={{ flex: 1 }}>
                  <Text style={styles.txTitle}>{t.note || t.category || tt.label}</Text>
                  <Text style={styles.txSub}>{srcName(t)}{t.type === 'transferencia' ? ` → ${accName(t.toAccountId)}` : ''} · {t.date}{t.time ? ` ${t.time}` : ''}</Text>
                </View>
                <Text style={[styles.txAmt, { color: tt.color }]}>{sign}{formatMoney(t.amount, cur)}</Text>
                <TouchableOpacity onPress={() => onEditTx(t)} style={{ padding: 4 }}><Ionicons name="pencil-outline" size={15} color={COLORS.textMuted} /></TouchableOpacity>
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
  // Patrimonio real usando la utilidad centralizada (evita errores de cálculo manual)
  const total = totalLiquid(finance, cur);
  if (finance.accounts.length === 0) {
    return <EmptyState icon="wallet-outline" title="Sin cuentas" subtitle="Agrega tus cuentas (Yape, Plin, BCP, efectivo...) para llevar tus saldos." actionLabel="Agregar cuenta" onAction={onAdd} />;
  }
  const accName = (id) => finance.accounts.find(a => a.id === id)?.name || '';
  return (
    <View>
      <View style={styles.totalCard}><Text style={styles.statLbl}>Total en cuentas ({cur})</Text><Text style={styles.totalVal}>{formatMoney(total, cur)}</Text></View>
      <TouchableOpacity style={styles.outlineBtn} onPress={onMove}><Ionicons name="swap-vertical-outline" size={18} color={COLORS.purpleLight} /><Text style={styles.outlineBtnText}>Registrar movimiento</Text></TouchableOpacity>
      {finance.accounts.map((a) => {
        const t = accountType(a.type);
        const parentName = a.linkedTo ? accName(a.linkedTo) : null;
        return (
          <TouchableOpacity key={a.id} style={[styles.listCard, a.linkedTo && { borderLeftWidth: 3, borderLeftColor: COLORS.blue }]} onPress={() => onEdit(a)} onLongPress={() => onDel(a)} activeOpacity={0.8}>
            <View style={[styles.listIcon, { backgroundColor: t.color + '22' }]}><Ionicons name={t.icon} size={20} color={t.color} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.listTitle}>{a.name}</Text>
              <Text style={styles.listSub}>{t.label}{parentName ? ` · vinculada a ${parentName}` : ''}</Text>
            </View>
            {a.linkedTo && <View style={[styles.kindBadge, { backgroundColor: COLORS.blueDim }]}><Text style={[styles.kindBadgeText, { color: COLORS.blue }]}>Vinculada</Text></View>}
            {(() => {
              const rootId = findRootAccId(finance.accounts, a.id);
              const displayBal = rootId !== a.id ? (finance.accounts.find(p => p.id === rootId)?.balance ?? a.balance ?? 0) : (a.balance ?? 0);
              return <Text style={[styles.listAmt, { color: displayBal >= 0 ? COLORS.text : COLORS.red }]}>{formatMoney(displayBal, a.currency)}</Text>;
            })()}
          </TouchableOpacity>
        );
      })}
      <Text style={styles.tip}>Toca una cuenta para editar · mantén presionado para eliminar</Text>
    </View>
  );
}

function Tarjetas({ finance, onEdit, onDel, onAdd, onCalendar, onPay, onHistory }) {
  if (finance.cards.length === 0) {
    return <EmptyState icon="card-outline" title="Sin tarjetas" subtitle="Agrega tus tarjetas de crédito para controlar línea, uso, fechas de corte/pago e intereses." actionLabel="Agregar tarjeta" onAction={onAdd} />;
  }
  return (
    <View>
      {finance.cards.map((c) => {
        const avail = Math.max(0, (c.limit || 0) - (c.used || 0));
        const pct = c.limit ? Math.min(100, Math.round((c.used / c.limit) * 100)) : 0;
        const danger = pct >= 70;
        const isCredito = c.kind !== 'debito';
        return (
          <TouchableOpacity key={c.id} style={styles.bigCard} onPress={() => onEdit(c)} onLongPress={() => onDel(c)} activeOpacity={0.85}>
            <View style={styles.bigCardHead}>
              <Ionicons name={isCredito ? 'card' : 'card-outline'} size={20} color={COLORS.purpleLight} />
              <Text style={styles.bigCardTitle}>{c.bank}</Text>
              <View style={styles.kindBadge}><Text style={styles.kindBadgeText}>{isCredito ? 'Crédito' : 'Débito'}</Text></View>
              <Text style={styles.bigCardCur}>{c.currency}</Text>
            </View>
            {isCredito ? (
              <>
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
                  <Mini label="Interés" val={c.interest ? `${c.interest}%` : '—'} />
                </View>
                <TouchableOpacity style={styles.cardCalBtn} onPress={() => onCalendar(c)} activeOpacity={0.8}>
                  <Ionicons name="calendar-outline" size={16} color={COLORS.purpleLight} />
                  <Text style={styles.cardCalText}>Calendario de compras y pagos</Text>
                  <Ionicons name="chevron-forward" size={16} color={COLORS.purpleLight} />
                </TouchableOpacity>
                {c.used > 0 && (
                  <>
                    <TouchableOpacity style={[styles.payBtn, { marginTop: 10 }]} onPress={() => onPay(c)} activeOpacity={0.85}>
                      <Ionicons name="card-outline" size={16} color={COLORS.green} />
                      <Text style={[styles.payBtnText, { color: COLORS.green }]}>Registrar pago a tarjeta</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.payBtn, { marginTop: 6, backgroundColor: 'transparent' }]} onPress={() => onHistory(c)} activeOpacity={0.85}>
                      <Ionicons name="time-outline" size={16} color={COLORS.purpleLight} />
                      <Text style={[styles.payBtnText, { color: COLORS.purpleLight }]}>Ver historial de pagos</Text>
                    </TouchableOpacity>
                  </>
                )}
              </>
            ) : (
              <Text style={styles.debitoNote}>
                {(() => {
                   const rootId = findRootAccId(finance.accounts, c.linkedTo);
                   const bal = rootId ? (finance.accounts.find(a => a.id === rootId)?.balance ?? c.balance ?? 0) : (c.balance ?? 0);
                   const parentName = rootId ? (finance.accounts.find(a => a.id === rootId)?.name || 'cuenta') : null;
                   return `Saldo: ${formatMoney(bal, c.currency)}${parentName ? ` · Vinculada a ${parentName}` : ''}`;
                })()}
              </Text>
            )}
          </TouchableOpacity>
        );
      })}
      <Text style={styles.tip}>Toca para editar · mantén presionado para eliminar</Text>
    </View>
  );
}

function Prestamos({ finance, onEdit, onDel, onAdd, onPay, onAddMore, onHistory }) {
  if (finance.loans.length === 0) {
    return <EmptyState icon="cash-outline" title="Sin préstamos" subtitle="Registra préstamos (banco, familiar...) con su saldo pendiente y registra pagos." actionLabel="Agregar préstamo" onAction={onAdd} />;
  }
  return (
    <View>
      {finance.loans.map((l) => {
        const t = loanType(l.lenderType);
        const br = loanBreakdown(l);
        const isCuotas = (l.installmentsTotal || 0) > 0;
        const pend = loanPending(l);
        const base = l.amount || (l.installment || 0) * (l.installmentsTotal || 0) || pend;
        const pct = base > 0 ? Math.min(100, Math.round(((base - pend) / base) * 100)) : 0;
        const tc = loanTotalCost(l);
        return (
          <View key={l.id} style={styles.bigCard}>
            <TouchableOpacity onPress={() => onEdit(l)} onLongPress={() => onDel(l)} activeOpacity={0.85}>
              <View style={styles.bigCardHead}>
                <Ionicons name={t.icon} size={20} color={t.color} />
                <Text style={styles.bigCardTitle}>{l.name}</Text>
                {l.frequency && l.frequency !== 'mensual' && <View style={styles.kindBadge}><Text style={styles.kindBadgeText}>{l.frequency}</Text></View>}
                <Text style={[styles.bigCardCur, { color: t.color }]}>{t.label}</Text>
              </View>
              {tc && tc.interestTotal > 0 && (
                <View style={[styles.payNote, { borderColor: COLORS.amber + '66', marginBottom: 8, padding: 8 }]}>
                  <Text style={[styles.payNoteText, { color: COLORS.amber, fontSize: 11 }]}>
                    Total a pagar: {formatMoney(tc.totalCost, l.currency)}{tc.interestTotal > 0 ? ` · Interés: ${formatMoney(tc.interestTotal, l.currency)}` : ''}{l.interest ? ` · TEA ${l.interest}%` : ''}
                  </Text>
                </View>
              )}
              <View style={styles.cardUseBg}><View style={[styles.cardUseFill, { width: `${pct}%`, backgroundColor: COLORS.green }]} /></View>
              <View style={styles.cardRow2}>
                <Text style={styles.cardUsed}>Pagado {pct}%</Text>
                <Text style={styles.cardAvail}>Falta {formatMoney(pend, l.currency)}</Text>
              </View>
              {isCuotas ? (
                <>
                  <View style={[styles.loanKpis, { marginTop: 10 }]}>
                    <View style={styles.loanKpi}><Text style={styles.loanKpiLbl}>Cuotas</Text><Text style={styles.loanKpiVal}>{br.installmentsPaid}/{br.installmentsTotal}</Text></View>
                    <View style={styles.loanKpi}><Text style={styles.loanKpiLbl}>Faltan</Text><Text style={[styles.loanKpiVal, { color: COLORS.amber }]}>{br.remainingCuotas} cuotas</Text></View>
                    <View style={styles.loanKpi}><Text style={styles.loanKpiLbl}>Cuota</Text><Text style={styles.loanKpiVal}>{formatMoney(br.installment, l.currency)}</Text></View>
                  </View>
                  <View style={styles.splitBar}>
                    <View style={[styles.splitBarFill, { width: '100%' }]}>
                      <View style={[styles.splitBarPart, { backgroundColor: COLORS.green, flex: br.paid / Math.max(1, br.paid + br.pendingCuotas) }]}>
                        <Text style={styles.splitBarTxt}>CAPITAL {Math.round((br.paid / Math.max(1, br.paid + br.pendingCuotas)) * 100)}%</Text>
                      </View>
                      <View style={[styles.splitBarPart, { backgroundColor: COLORS.red + 'CC', flex: br.pendingCuotas / Math.max(1, br.paid + br.pendingCuotas) }]}>
                        <Text style={[styles.splitBarTxt, { color: '#fff' }]}>PENDIENTE {Math.round((br.pendingCuotas / Math.max(1, br.paid + br.pendingCuotas)) * 100)}%</Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.splitRow}>
                    <View style={styles.splitCell}><Text style={styles.splitLbl}>Pagado</Text><Text style={[styles.splitVal, { color: COLORS.green }]}>{formatMoney(br.paid, l.currency)}</Text></View>
                    <View style={styles.splitCell}><Text style={styles.splitLbl}>Pendiente</Text><Text style={[styles.splitVal, { color: COLORS.red }]}>{formatMoney(br.pendingCuotas, l.currency)}</Text></View>
                  </View>
                </>
              ) : (
                <View style={styles.miniGrid}>
                  <Mini label="Monto" val={l.amount ? formatMoney(l.amount, l.currency) : '—'} />
                  <Mini label="Cuota" val={l.installment ? formatMoney(l.installment, l.currency) : '—'} />
                  <Mini label="Interés" val={l.interest ? `${l.interest}%` : '—'} />
                </View>
              )}
            </TouchableOpacity>
            <View style={styles.payRow}>
              <TouchableOpacity style={styles.payBtn} onPress={() => onPay(l)}><Ionicons name="cash-outline" size={16} color={COLORS.green} /><Text style={[styles.payBtnText, { color: COLORS.green }]}>Registrar pago</Text></TouchableOpacity>
              <TouchableOpacity style={styles.payBtn} onPress={() => onAddMore(l)}><Ionicons name="add-circle-outline" size={16} color={COLORS.amber} /><Text style={[styles.payBtnText, { color: COLORS.amber }]}>Monto adicional</Text></TouchableOpacity>
            </View>
            <TouchableOpacity style={[styles.payBtn, { marginTop: 6, backgroundColor: 'transparent' }]} onPress={() => onHistory(l)} activeOpacity={0.85}>
              <Ionicons name="time-outline" size={16} color={COLORS.purpleLight} />
              <Text style={[styles.payBtnText, { color: COLORS.purpleLight }]}>Ver historial de pagos</Text>
            </TouchableOpacity>
          </View>
        );
      })}
      <Text style={styles.tip}>Toca para editar · mantén presionado para eliminar</Text>
    </View>
  );
}

function Deudas({ finance, onEdit, onDel, onAdd, onPay, onHistory }) {
  if (finance.debts.length === 0) {
    return <EmptyState icon="alert-circle-outline" title="Sin deudas" subtitle="Registra a quién le debes, monto y prioridad, y registra tus pagos." actionLabel="Agregar deuda" onAction={onAdd} />;
  }
  return (
    <View>
      {finance.debts.map((d) => {
        const pr = debtPriority(d.priority);
        const pct = d.amount ? Math.min(100, Math.round(((d.paid || 0) / d.amount) * 100)) : 0;
        const rem = Math.max(0, (d.amount || 0) - (d.paid || 0));
        const sub = d.name && d.creditor ? `A: ${d.creditor}` : '';
        const extra = d.concept ? (sub ? ` · ${d.concept}` : d.concept) : '';
        return (
          <View key={d.id} style={[styles.bigCard, { borderLeftWidth: 4, borderLeftColor: pr.color }]}>
            <TouchableOpacity onPress={() => onEdit(d)} onLongPress={() => onDel(d)} activeOpacity={0.85}>
              <View style={styles.bigCardHead}>
                <Text style={styles.bigCardTitle}>{d.name || d.creditor || 'Deuda'}</Text>
                <View style={[styles.prBadge, { backgroundColor: pr.color + '22' }]}><Text style={[styles.prText, { color: pr.color }]}>{pr.label}</Text></View>
              </View>
              {(sub || extra) ? <Text style={styles.listSub}>{sub}{extra}{d.dueDate ? ` · vence ${d.dueDate}` : ''}</Text> : (d.dueDate ? <Text style={styles.listSub}>Vence {d.dueDate}</Text> : null)}
              <View style={[styles.cardUseBg, { marginTop: 10 }]}><View style={[styles.cardUseFill, { width: `${pct}%`, backgroundColor: pr.color }]} /></View>
              <View style={styles.cardRow2}>
                <Text style={styles.cardUsed}>Pagado {formatMoney(d.paid || 0, d.currency)} ({pct}%)</Text>
                <Text style={[styles.cardAvail, { color: COLORS.red }]}>Falta {formatMoney(rem, d.currency)}</Text>
              </View>
            </TouchableOpacity>
            <View style={styles.payRow}>
              <TouchableOpacity style={styles.payBtn} onPress={() => onPay(d)}><Ionicons name="cash-outline" size={16} color={COLORS.green} /><Text style={[styles.payBtnText, { color: COLORS.green }]}>Registrar pago</Text></TouchableOpacity>
            </View>
            <TouchableOpacity style={[styles.payBtn, { marginTop: 6, backgroundColor: 'transparent' }]} onPress={() => onHistory(d)} activeOpacity={0.85}>
              <Ionicons name="time-outline" size={16} color={COLORS.purpleLight} />
              <Text style={[styles.payBtnText, { color: COLORS.purpleLight }]}>Ver historial de pagos</Text>
            </TouchableOpacity>
          </View>
        );
      })}
      <Text style={styles.tip}>Toca para editar · mantén presionado para eliminar</Text>
    </View>
  );
}

function CuentasCobrar({ finance, onEdit, onDel, onAdd, onCollect, onHistory }) {
  const receivables = finance.receivables || [];
  if (receivables.length === 0) {
    return <EmptyState icon="cash-outline" title="Sin cuentas por cobrar" subtitle="Registra a quién le prestaste dinero, el monto y cuándo vence. Lleva el seguimiento de cobros." actionLabel="Agregar cuenta por cobrar" onAction={onAdd} />;
  }
  const totalPend = receivables.reduce((s, r) => s + Math.max(0, (r.amount || 0) - (r.paid || 0)), 0);
  return (
    <View>
      <View style={styles.totalCard}>
        <Text style={styles.statLbl}>Total por cobrar</Text>
        <Text style={[styles.totalVal, { color: COLORS.green }]}>{formatMoney(totalPend, receivables[0]?.currency || 'PEN')}</Text>
      </View>
      {receivables.map((r) => {
        const pct = r.amount ? Math.min(100, Math.round(((r.paid || 0) / r.amount) * 100)) : 0;
        const rem = Math.max(0, (r.amount || 0) - (r.paid || 0));
        const done = rem <= 0;
        return (
          <View key={r.id} style={[styles.bigCard, { borderLeftWidth: 4, borderLeftColor: done ? COLORS.green : COLORS.blue }]}>
            <TouchableOpacity onPress={() => onEdit(r)} onLongPress={() => onDel(r)} activeOpacity={0.85}>
              <View style={styles.bigCardHead}>
                <Ionicons name="person-outline" size={20} color={done ? COLORS.green : COLORS.blue} />
                <Text style={styles.bigCardTitle}>{r.name || r.debtor || 'Préstamo'}</Text>
                {done && <View style={[styles.kindBadge, { backgroundColor: COLORS.greenDim }]}><Text style={[styles.kindBadgeText, { color: COLORS.green }]}>Cobrado</Text></View>}
                {r.interest > 0 && !done && <View style={styles.kindBadge}><Text style={styles.kindBadgeText}>{r.interest}% int.</Text></View>}
                <Text style={styles.bigCardCur}>{r.currency}</Text>
              </View>
              {r.debtor ? <Text style={styles.listSub}>Deudor: {r.debtor}{r.dueDate ? ` · vence ${r.dueDate}` : ''}</Text> : (r.dueDate ? <Text style={styles.listSub}>Vence {r.dueDate}</Text> : null)}
              <View style={[styles.cardUseBg, { marginTop: 10 }]}><View style={[styles.cardUseFill, { width: `${pct}%`, backgroundColor: COLORS.green }]} /></View>
              <View style={styles.cardRow2}>
                <Text style={styles.cardUsed}>Cobrado {formatMoney(r.paid || 0, r.currency)} ({pct}%)</Text>
                <Text style={[styles.cardAvail, { color: done ? COLORS.green : COLORS.blue }]}>{done ? '¡Completado!' : `Falta ${formatMoney(rem, r.currency)}`}</Text>
              </View>
              {r.notes ? <Text style={[styles.listSub, { marginTop: 6 }]}>{r.notes}</Text> : null}
            </TouchableOpacity>
            {!done && (
              <View style={styles.payRow}>
                <TouchableOpacity style={styles.payBtn} onPress={() => onCollect(r)}>
                  <Ionicons name="cash-outline" size={16} color={COLORS.green} />
                  <Text style={[styles.payBtnText, { color: COLORS.green }]}>Registrar cobro</Text>
                </TouchableOpacity>
              </View>
            )}
            <TouchableOpacity style={[styles.payBtn, { marginTop: 6, backgroundColor: 'transparent' }]} onPress={() => onHistory(r)} activeOpacity={0.85}>
              <Ionicons name="time-outline" size={16} color={COLORS.purpleLight} />
              <Text style={[styles.payBtnText, { color: COLORS.purpleLight }]}>Ver historial de cobros</Text>
            </TouchableOpacity>
          </View>
        );
      })}
      <Text style={styles.tip}>Toca para editar · mantén presionado para eliminar</Text>
    </View>
  );
}

const PERIOD_LABELS = { mensual: 'Mensual', semanal: 'Semanal', anual: 'Anual' };
const PERIOD_MULT = { mensual: 1, semanal: 4.33, anual: 1 / 12 };

function GastosFijos({ finance, cur, onEdit, onDel, onAdd, settings }) {
  const lista = finance.gastosFijos || [];
  const monthlyTotal = lista
    .filter((g) => g.active !== false)
    .reduce((s, g) => s + (g.amount || 0) * (PERIOD_MULT[g.period] || 1), 0);

  if (lista.length === 0) {
    return <EmptyState icon="repeat-outline" title="Sin gastos fijos" subtitle="Registra tus gastos recurrentes: alquiler, servicios, suscripciones, etc." actionLabel="Agregar gasto fijo" onAction={onAdd} />;
  }
  return (
    <View>
      <View style={styles.totalCard}>
        <Text style={styles.statLbl}>Total fijos al mes (estimado)</Text>
        <Text style={[styles.totalVal, { color: COLORS.red }]}>{formatMoney(monthlyTotal, cur)}</Text>
      </View>
      {lista.map((g) => (
        <TouchableOpacity key={g.id} style={[styles.listCard, !g.active && { opacity: 0.62 }]} onPress={() => onEdit(g)} onLongPress={() => onDel(g)} activeOpacity={0.8}>
          <View style={[styles.listIcon, { backgroundColor: categoryColor(g.category) + '22' }]}>
            <Ionicons name="repeat-outline" size={20} color={categoryColor(g.category)} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.listTitle}>{g.name}</Text>
            <Text style={styles.listSub}>{PERIOD_LABELS[g.period] || 'Mensual'} · día {g.dayOfMonth || 1}{g.category ? ` · ${g.category}` : ''}</Text>
          </View>
          <Text style={[styles.listAmt, { color: COLORS.red }]}>{formatMoney(g.amount, g.currency)}</Text>
        </TouchableOpacity>
      ))}
      <Text style={styles.tip}>Toca para editar · mantén presionado para eliminar</Text>
    </View>
  );
}

const Mini = ({ label, val }) => <View style={styles.mini}><Text style={styles.miniLbl}>{label}</Text><Text style={styles.miniVal}>{val}</Text></View>;

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: COLORS.bg },
  hero: { padding: 24, paddingTop: 56, backgroundColor: COLORS.bg, borderBottomWidth: 1, borderBottomColor: COLORS.border, marginBottom: 4 },
  heroTitle: { fontSize: 26, fontWeight: '800', color: COLORS.text },
  heroSub: { fontSize: 13, color: COLORS.purple, marginTop: 4, fontWeight: '600' },
  navBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 16, marginVertical: 10, backgroundColor: COLORS.card, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 0.5, borderColor: COLORS.cardBorder },
  navIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  navTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  navMenuBtn: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.purpleDim },
  tabGrid: { backgroundColor: COLORS.bg2, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 32, marginTop: 'auto' },
  tabTile: { width: '30%', backgroundColor: COLORS.card, borderRadius: 14, padding: 14, alignItems: 'center', gap: 8, borderWidth: 0.5, borderColor: COLORS.cardBorder },
  tabTileIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  tabTileLabel: { fontSize: 12, color: COLORS.textSub, fontWeight: '600', textAlign: 'center' },
  container: { paddingHorizontal: 16, paddingTop: 6 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, backgroundColor: COLORS.card, borderWidth: 0.5, borderColor: COLORS.cardBorder },
  chipOn: { backgroundColor: COLORS.purple, borderColor: COLORS.purple },
  chipText: { fontSize: 13, color: COLORS.textSub },
  chipTextOn: { color: '#fff', fontWeight: '600' },
  statRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  statCard: { flex: 1, backgroundColor: COLORS.card, borderRadius: 14, padding: 14, borderWidth: 0.5, borderColor: COLORS.cardBorder, borderLeftWidth: 4 },
  statLbl: { fontSize: 11, color: COLORS.textSub, fontWeight: '600', letterSpacing: 0.3 },
  statVal: { fontSize: 22, fontWeight: '800', marginTop: 5, letterSpacing: -0.5 },
  balanceCard: { backgroundColor: COLORS.card, borderRadius: 14, padding: 16, borderWidth: 1, marginTop: 10 },
  balanceVal: { fontSize: 30, fontWeight: '800', marginTop: 6, letterSpacing: -1 },
  secTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text, marginTop: 22, marginBottom: 10 },
  hint: { fontSize: 13, color: COLORS.textSub, lineHeight: 19 },
  card: { backgroundColor: COLORS.card, borderRadius: 14, padding: 14, borderWidth: 0.5, borderColor: COLORS.cardBorder },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  catName: { width: 92, fontSize: 12, color: COLORS.textSub },
  catBarBg: { flex: 1, height: 8, backgroundColor: COLORS.bg3, borderRadius: 4, overflow: 'hidden' },
  catBarFill: { height: 8, borderRadius: 4, backgroundColor: COLORS.amber },
  catVal: { fontSize: 12, color: COLORS.text, fontWeight: '600', width: 80, textAlign: 'right' },
  txRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, borderBottomWidth: 0.5, borderColor: COLORS.border },
  txTitle: { fontSize: 14, color: COLORS.text, fontWeight: '600' },
  txSub: { fontSize: 11, color: COLORS.textSub, marginTop: 1 },
  txAmt: { fontSize: 15, fontWeight: '800' },
  totalCard: { backgroundColor: COLORS.card, borderRadius: 14, padding: 16, borderWidth: 0.5, borderColor: COLORS.cardBorder },
  totalVal: { fontSize: 28, fontWeight: '800', color: COLORS.text, marginTop: 5, letterSpacing: -0.5 },
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
  payNote: { borderWidth: 1, borderRadius: 10, padding: 10, marginBottom: 14, backgroundColor: COLORS.bg3 },
  payNoteText: { fontSize: 13, fontWeight: '700' },
  payNoteMuted: { fontSize: 12, color: COLORS.textMuted, marginBottom: 14 },
  kindBadge: { backgroundColor: COLORS.purpleDim, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  kindBadgeText: { color: COLORS.purpleLight, fontSize: 11, fontWeight: '700' },
  debitoNote: { fontSize: 13, color: COLORS.textSub, marginTop: 4 },
  payRow: { flexDirection: 'row', gap: 10, marginTop: 12, paddingTop: 12, borderTopWidth: 0.5, borderTopColor: COLORS.border },
  payBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, flex: 1, paddingVertical: 9, borderRadius: 10, backgroundColor: COLORS.bg3 },
  payBtnText: { fontSize: 13, fontWeight: '700' },
  payHint: { fontSize: 12, color: COLORS.textMuted, lineHeight: 17, marginBottom: 4 },
  // estilos para desglose de préstamos
  loanKpis: { flexDirection: 'row', gap: 8 },
  loanKpi: { flex: 1, backgroundColor: COLORS.bg3, borderRadius: 10, padding: 10, alignItems: 'center' },
  loanKpiLbl: { fontSize: 10, color: COLORS.textMuted, fontWeight: '600' },
  loanKpiVal: { fontSize: 15, color: COLORS.text, fontWeight: '800', marginTop: 2 },
  splitBar: { height: 18, borderRadius: 6, overflow: 'hidden', marginTop: 8 },
  splitBarFill: { flex: 1, flexDirection: 'row' },
  splitBarPart: { height: 18, alignItems: 'center', justifyContent: 'center' },
  splitBarTxt: { color: '#fff', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  splitRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  splitCell: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  splitLbl: { fontSize: 11, color: COLORS.textMuted, fontWeight: '600' },
  splitVal: { fontSize: 13, fontWeight: '800' },
  // estilos para historial de pagos
  histRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 0.5, borderColor: COLORS.border },
  histAmt: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  histSub: { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },
  histDate: { fontSize: 12, color: COLORS.textSub, fontWeight: '600' },
  // estilos para foto de boleta
  photoBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: COLORS.purple + '66', backgroundColor: COLORS.bg3 },
  photoBtnText: { color: COLORS.purpleLight, fontSize: 13, fontWeight: '600' },
  // estilos para búsqueda
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.card, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9, borderWidth: 0.5, borderColor: COLORS.cardBorder, marginBottom: 10 },
  searchInput: { flex: 1, color: COLORS.text, fontSize: 13, paddingVertical: 0 },
});
