import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format, subDays } from 'date-fns';
import { formatMoney } from '../utils/currency';
import { loanPending } from '../utils/finance';
import { syncToFirebase, syncFromFirebase } from '../utils/firebase';

const today = () => format(new Date(), 'yyyy-MM-dd');

const generateLast30Days = () => {
  const days = {};
  for (let i = 29; i >= 0; i--) {
    days[format(subDays(new Date(), i), 'yyyy-MM-dd')] = null;
  }
  return days;
};

// REGLA: todo arranca vacío. El usuario crea sus propios datos.
const DEFAULT_HABITS = [];
const DEFAULT_GOALS = [];

const DEFAULT_SETTINGS = {
  currency: 'PEN',          // moneda principal: Soles
  secondaryCurrency: 'USD', // moneda secundaria: Dólares
  themeMode: 'dark',        // 'dark' | 'light'
  customHabitCategories: [], // categorías de hábitos personalizadas
};

// Actividades sugeridas para encajar en el día (el usuario elige y edita)
export const SUGGESTED_ACTIVITIES = [
  { id: 'ingles', name: 'Inglés', icon: 'language-outline', color: '#0EA5E9', minutesPerDay: 30, preferred: 'noche', enabled: false },
  { id: 'ejercicio', name: 'Ejercicio', icon: 'barbell-outline', color: '#10B981', minutesPerDay: 45, preferred: 'manana', enabled: false },
  { id: 'familia', name: 'Familia', icon: 'heart-outline', color: '#EC4899', minutesPerDay: 60, preferred: 'noche', enabled: false },
  { id: 'negocio', name: 'Desarrollo de negocio', icon: 'briefcase-outline', color: '#7C3AED', minutesPerDay: 60, preferred: 'tarde', enabled: false },
  { id: 'contenido', name: 'Creación de contenido', icon: 'videocam-outline', color: '#F59E0B', minutesPerDay: 30, preferred: 'tarde', enabled: false },
  { id: 'finanzas', name: 'Finanzas', icon: 'wallet-outline', color: '#14B8A6', minutesPerDay: 20, preferred: 'noche', enabled: false },
  { id: 'lectura', name: 'Lectura', icon: 'book-outline', color: '#6366F1', minutesPerDay: 30, preferred: 'noche', enabled: false },
  { id: 'meditacion', name: 'Meditación', icon: 'moon-outline', color: '#A78BFA', minutesPerDay: 15, preferred: 'manana', enabled: false },
];

const DEFAULT_PLANNING = {
  schedule: null,        // se llena con el asistente (PLANTILLA recurrente)
  activities: SUGGESTED_ACTIVITIES,
  log: {},               // { 'yyyy-MM-dd': { activityId: { status, pct, name, color } } }
  dayPlans: {},          // { 'yyyy-MM-dd': [ {id, activityId, name, icon, color, start, end} ] } instancias por día
};

export const useStore = create((set, get) => ({
  // Auth
  currentUser: null,
  users: [],

  // User data (todo vacío al inicio)
  habits: DEFAULT_HABITS,
  habitLogs: {},
  goals: DEFAULT_GOALS,
  finances: [],
  onboardingDone: false,
  userProfile: {},

  // Ajustes + planificación
  settings: DEFAULT_SETTINGS,
  planning: DEFAULT_PLANNING,
  calendar: { events: [], objectives: [] },
  finance: { accounts: [], cards: [], loans: [], debts: [], transactions: [] },
  areas: [], // árbol: [{ id, name, parentId, color, icon, linkedGoalId, linkedHabitId }]

  // UI
  loading: false,

  // ─── AUTH ────────────────────────────────────────────────
  register: async (name, email, password) => {
    const { users } = get();
    if (users.find(u => u.email === email)) return { error: 'El correo ya existe' };
    const hashedPwd = btoa(email + ':' + password); // simple hash con base64
    const user = { id: Date.now().toString(), name, email, passwordHash: hashedPwd, createdAt: today() };
    const updated = [...users, user];
    set({ users: updated, currentUser: user });
    await AsyncStorage.setItem('users', JSON.stringify(updated));
    await AsyncStorage.setItem('currentUser', JSON.stringify(user));
    return { success: true };
  },

  login: async (email, password) => {
    const { users } = get();
    const hashedPwd = btoa(email + ':' + password);
    const user = users.find(u => u.email === email && u.passwordHash === hashedPwd);
    if (!user) return { error: 'Correo o contraseña incorrectos' };
    set({ currentUser: user });
    await AsyncStorage.setItem('currentUser', JSON.stringify(user));
    return { success: true };
  },

  logout: async () => {
    set({ currentUser: null, onboardingDone: false });
    await AsyncStorage.removeItem('currentUser');
  },

  // ─── PERSISTENCE ─────────────────────────────────────────
  loadFromStorage: async () => {
    try {
      const [
        usersRaw, userRaw, logsRaw, habitsRaw, goalsRaw, finRaw,
        profileRaw, onbRaw, settingsRaw, planningRaw, calendarRaw, financeRaw, areasRaw,
      ] = await Promise.all([
        AsyncStorage.getItem('users'),
        AsyncStorage.getItem('currentUser'),
        AsyncStorage.getItem('habitLogs'),
        AsyncStorage.getItem('habits'),
        AsyncStorage.getItem('goals'),
        AsyncStorage.getItem('finances'),
        AsyncStorage.getItem('userProfile'),
        AsyncStorage.getItem('onboardingDone'),
        AsyncStorage.getItem('settings'),
        AsyncStorage.getItem('planning'),
        AsyncStorage.getItem('calendar'),
        AsyncStorage.getItem('finance'),
        AsyncStorage.getItem('areas'),
      ]);
      const emptyFinance = { accounts: [], cards: [], loans: [], debts: [], transactions: [] };
      const savedPlanning = planningRaw ? JSON.parse(planningRaw) : null;
      set({
        users: usersRaw ? JSON.parse(usersRaw) : [],
        currentUser: userRaw ? JSON.parse(userRaw) : null,
        habitLogs: logsRaw ? JSON.parse(logsRaw) : {},
        habits: habitsRaw ? JSON.parse(habitsRaw) : DEFAULT_HABITS,
        goals: goalsRaw ? JSON.parse(goalsRaw) : DEFAULT_GOALS,
        finances: finRaw ? JSON.parse(finRaw) : [],
        userProfile: profileRaw ? JSON.parse(profileRaw) : {},
        onboardingDone: onbRaw === 'true',
        settings: settingsRaw ? { ...DEFAULT_SETTINGS, ...JSON.parse(settingsRaw) } : DEFAULT_SETTINGS,
        planning: savedPlanning
          ? { schedule: savedPlanning.schedule || null, activities: savedPlanning.activities || SUGGESTED_ACTIVITIES, log: savedPlanning.log || {}, dayPlans: savedPlanning.dayPlans || {} }
          : DEFAULT_PLANNING,
        calendar: calendarRaw
          ? { events: JSON.parse(calendarRaw).events || [], objectives: JSON.parse(calendarRaw).objectives || [] }
          : { events: [], objectives: [] },
        finance: financeRaw ? { ...emptyFinance, ...JSON.parse(financeRaw) } : emptyFinance,
        areas: areasRaw ? JSON.parse(areasRaw) : [],
      });
    } catch (e) { console.log('Storage error', e); }
  },

  // ─── SETTINGS ────────────────────────────────────────────
  setCurrency: async (code) => {
    if (!['PEN', 'USD'].includes(code)) return { error: 'Moneda no válida' };
    const settings = { ...get().settings, currency: code };
    set({ settings });
    await AsyncStorage.setItem('settings', JSON.stringify(settings));
  },

  // ─── PLANNING ────────────────────────────────────────────
  savePlanning: async (planning) => {
    const merged = { ...get().planning, ...planning };
    set({ planning: merged });
    await AsyncStorage.setItem('planning', JSON.stringify(merged));
  },

  // Guarda las instancias (actividades concretas) de un día específico
  saveDayPlan: async (dateStr, instances) => {
    const planning = get().planning;
    const dayPlans = { ...(planning.dayPlans || {}), [dateStr]: instances };
    const merged = { ...planning, dayPlans };
    set({ planning: merged });
    await AsyncStorage.setItem('planning', JSON.stringify(merged));
  },

  // Registra el cumplimiento de una actividad en un día
  logActivity: async (dateStr, activityId, data) => {
    const planning = get().planning;
    // Guardamos nombre/color en el registro para que el historial quede congelado
    // aunque luego se edite o borre la actividad.
    const act = (planning.activities || []).find((a) => a.id === activityId);
    const entry = { ...data };
    if (act) { if (!entry.name) entry.name = act.name; if (!entry.color) entry.color = act.color; }
    const log = { ...(planning.log || {}) };
    log[dateStr] = { ...(log[dateStr] || {}), [activityId]: entry };
    const merged = { ...planning, log };
    set({ planning: merged });
    await AsyncStorage.setItem('planning', JSON.stringify(merged));
  },

  clearActivityLog: async (dateStr, activityId) => {
    const planning = get().planning;
    const log = { ...(planning.log || {}) };
    if (log[dateStr]) { const d = { ...log[dateStr] }; delete d[activityId]; log[dateStr] = d; }
    const merged = { ...planning, log };
    set({ planning: merged });
    await AsyncStorage.setItem('planning', JSON.stringify(merged));
  },

  savePlanningSchedule: async (schedule) => {
    const planning = { ...get().planning, schedule };
    set({ planning });
    await AsyncStorage.setItem('planning', JSON.stringify(planning));
  },

  savePlanningActivities: async (activities) => {
    const planning = { ...get().planning, activities };
    set({ planning });
    await AsyncStorage.setItem('planning', JSON.stringify(planning));
  },

  // ─── CALENDAR ────────────────────────────────────────────
  _saveCalendar: async (calendar) => {
    set({ calendar });
    await AsyncStorage.setItem('calendar', JSON.stringify(calendar));
  },

  addEvent: async (event) => {
    const cal = get().calendar;
    const id = Date.now().toString() + Math.random().toString(36).slice(2, 6);
    const calendar = { ...cal, events: [...cal.events, { id, done: false, ...event }] };
    await get()._saveCalendar(calendar);
  },

  updateEvent: async (id, patch) => {
    const cal = get().calendar;
    const calendar = { ...cal, events: cal.events.map(e => e.id === id ? { ...e, ...patch } : e) };
    await get()._saveCalendar(calendar);
  },

  deleteEvent: async (id) => {
    const cal = get().calendar;
    const calendar = { ...cal, events: cal.events.filter(e => e.id !== id) };
    await get()._saveCalendar(calendar);
  },

  toggleEvent: async (id) => {
    const cal = get().calendar;
    const calendar = { ...cal, events: cal.events.map(e => e.id === id ? { ...e, done: !e.done } : e) };
    await get()._saveCalendar(calendar);
  },

  addObjective: async ({ period, key, title }) => {
    const cal = get().calendar;
    const id = Date.now().toString() + Math.random().toString(36).slice(2, 6);
    const calendar = { ...cal, objectives: [...cal.objectives, { id, period, key, title, done: false }] };
    await get()._saveCalendar(calendar);
  },

  toggleObjective: async (id) => {
    const cal = get().calendar;
    const calendar = { ...cal, objectives: cal.objectives.map(o => o.id === id ? { ...o, done: !o.done } : o) };
    await get()._saveCalendar(calendar);
  },

  deleteObjective: async (id) => {
    const cal = get().calendar;
    const calendar = { ...cal, objectives: cal.objectives.filter(o => o.id !== id) };
    await get()._saveCalendar(calendar);
  },

  // ─── HABITS / GOALS / PROFILE (persistencia) ─────────────
  saveHabits: async (habits) => {
    set({ habits });
    await AsyncStorage.setItem('habits', JSON.stringify(habits));
  },

  saveGoals: async (goals) => {
    set({ goals });
    await AsyncStorage.setItem('goals', JSON.stringify(goals));
  },

  saveProfile: async (profile) => {
    set({ userProfile: profile, onboardingDone: true });
    await AsyncStorage.setItem('userProfile', JSON.stringify(profile));
    await AsyncStorage.setItem('onboardingDone', 'true');
  },

  // ─── SETTINGS (genérico) ─────────────────────────────
  setSetting: async (key, value) => {
    const s = get().settings || {};
    const updated = { ...s, [key]: value };
    set({ settings: updated });
    await AsyncStorage.setItem('settings', JSON.stringify(updated));
  },

  // ─── HABITS ──────────────────────────────────────────────
  logHabit: async (habitId, status, date) => {
    const { habitLogs } = get();
    const d = date || today();
    const updated = {
      ...habitLogs,
      [habitId]: { ...(habitLogs[habitId] || generateLast30Days()), [d]: status },
    };
    set({ habitLogs: updated });
    await AsyncStorage.setItem('habitLogs', JSON.stringify(updated));
  },

  getHabitStreak: (habitId) => {
    const { habitLogs } = get();
    const logs = habitLogs[habitId] || {};
    let streak = 0;
    let i = 0;
    while (true) {
      const d = format(subDays(new Date(), i), 'yyyy-MM-dd');
      if (logs[d] === 'done') { streak++; i++; }
      else break;
    }
    return streak;
  },

  getHabitCompletionRate: (habitId, days = 7) => {
    const { habitLogs } = get();
    const logs = habitLogs[habitId] || {};
    let done = 0, total = 0;
    for (let i = 0; i < days; i++) {
      const d = format(subDays(new Date(), i), 'yyyy-MM-dd');
      if (logs[d] !== null && logs[d] !== undefined) total++;
      if (logs[d] === 'done') done++;
    }
    return total === 0 ? 0 : Math.round((done / total) * 100);
  },

  getHabitChartData: (habitId, days = 14) => {
    const { habitLogs } = get();
    const logs = habitLogs[habitId] || {};
    const data = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = format(subDays(new Date(), i), 'yyyy-MM-dd');
      data.push({ date: d, value: logs[d] === 'done' ? 1 : 0, status: logs[d] });
    }
    return data;
  },

  getTodayStats: () => {
    const { habits, habitLogs } = get();
    const d = today();
    const active = habits.filter(h => h.active);
    const done = active.filter(h => habitLogs[h.id]?.[d] === 'done').length;
    const missed = active.filter(h => habitLogs[h.id]?.[d] === 'missed').length;
    return { total: active.length, done, missed, pending: active.length - done - missed };
  },

  getWeeklyScore: () => {
    const { habits, habitLogs } = get();
    const active = habits.filter(h => h.active);
    let scores = [];
    for (let i = 6; i >= 0; i--) {
      const d = format(subDays(new Date(), i), 'yyyy-MM-dd');
      const done = active.filter(h => habitLogs[h.id]?.[d] === 'done').length;
      scores.push(active.length > 0 ? Math.round((done / active.length) * 100) : 0);
    }
    return scores;
  },

  // ─── FINANCES ────────────────────────────────────────────
  addFinance: async (entry) => {
    const { finances } = get();
    const updated = [{ ...entry, id: Date.now().toString(), date: today() }, ...finances];
    set({ finances: updated });
    await AsyncStorage.setItem('finances', JSON.stringify(updated));
  },

  deleteFinance: async (id) => {
    const { finances } = get();
    const updated = finances.filter(f => f.id !== id);
    set({ finances: updated });
    await AsyncStorage.setItem('finances', JSON.stringify(updated));
  },

  getMonthlyStats: () => {
    const txs = get().finance.transactions || [];
    const month = format(new Date(), 'yyyy-MM');
    const monthly = txs.filter(t => (t.date || '').startsWith(month));
    const ingresos = monthly.filter(t => t.type === 'ingreso').reduce((a, t) => a + t.amount, 0);
    const gastos = monthly.filter(t => t.type === 'gasto').reduce((a, t) => a + t.amount, 0);
    return { ingresos, gastos, balance: ingresos - gastos, ahorro: Math.max(0, ingresos - gastos) };
  },

  updateGoalProgress: async (goalId, newCurrent) => {
    const { goals } = get();
    const updated = goals.map(g => g.id === goalId ? { ...g, current: newCurrent } : g);
    set({ goals: updated });
    await AsyncStorage.setItem('goals', JSON.stringify(updated));
  },

  // ─── METAS (modelo con contexto) ─────────────────────────
  addGoal: async (goal) => {
    const id = goal.id || (Date.now().toString() + Math.random().toString(36).slice(2, 6));
    const g = { createdAt: today(), ...goal, id };
    const goals = [g, ...get().goals];
    set({ goals });
    await AsyncStorage.setItem('goals', JSON.stringify(goals));
    return g;
  },

  updateGoal: async (id, patch) => {
    const goals = get().goals.map(g => g.id === id ? { ...g, ...patch } : g);
    set({ goals });
    await AsyncStorage.setItem('goals', JSON.stringify(goals));
  },

  deleteGoal: async (id) => {
    const goals = get().goals.filter(g => g.id !== id);
    set({ goals });
    await AsyncStorage.setItem('goals', JSON.stringify(goals));
  },

  // ─── FINANZAS (cuentas, tarjetas, préstamos, deudas) ─────
  _saveFinance: async (finance) => {
    set({ finance });
    await AsyncStorage.setItem('finance', JSON.stringify(finance));
  },
  _fid: () => Date.now().toString() + Math.random().toString(36).slice(2, 6),

  addAccount: async (acc) => {
    const f = get().finance;
    const a = { id: get()._fid(), balance: 0, currency: get().settings.currency, ...acc };
    await get()._saveFinance({ ...f, accounts: [...f.accounts, a] });
  },
  updateAccount: async (id, patch) => {
    const f = get().finance;
    await get()._saveFinance({ ...f, accounts: f.accounts.map(a => a.id === id ? { ...a, ...patch } : a) });
  },
  deleteAccount: async (id) => {
    const f = get().finance;
    await get()._saveFinance({
      ...f,
      accounts: f.accounts.filter(a => a.id !== id),
      transactions: f.transactions.filter(t => t.accountId !== id && t.toAccountId !== id),
    });
  },

  addTransaction: async (tx) => {
    const f = get().finance;
    const t = { id: get()._fid(), date: today(), ...tx };
    const amt = t.amount || 0;

    // ── Validación de saldo: nunca permitir negativos imposibles ──
    if (t.type !== 'ingreso') {
      let available = null; let label = ''; let cur = get().settings.currency;
      if (t.cardId && t.type === 'gasto') {
        const c = f.cards.find((x) => x.id === t.cardId);
        if (c) {
          cur = c.currency || cur;
          if (c.kind === 'debito') { available = c.balance || 0; label = c.bank; }
          else { available = (c.limit || 0) - (c.used || 0); label = `crédito de ${c.bank}`; }
        }
      } else if (t.accountId) {
        const a = f.accounts.find((x) => x.id === t.accountId);
        if (a) { available = a.balance || 0; label = a.name; cur = a.currency || cur; }
      }
      if (available != null && amt - available > 0.005) {
        return { error: `Saldo insuficiente en ${label}. Disponible: ${formatMoney(available, cur)}.` };
      }
    }

    const accounts = f.accounts.map(a => {
      if (a.id === t.accountId) {
        // ingreso suma; gasto/transferencia/pago restan de la cuenta origen
        return { ...a, balance: (a.balance || 0) + (t.type === 'ingreso' ? amt : -amt) };
      }
      if (t.type === 'transferencia' && a.id === t.toAccountId) {
        return { ...a, balance: (a.balance || 0) + amt };
      }
      return a;
    });
    const cards = t.cardId
      ? f.cards.map(c => {
          if (c.id !== t.cardId) return c;
          if (t.type === 'pago') return { ...c, used: Math.max(0, (c.used || 0) - amt) };       // pago a tarjeta
          if (c.kind === 'debito') return { ...c, balance: (c.balance || 0) - amt };              // gasto con débito
          return { ...c, used: (c.used || 0) + amt };                                             // gasto con crédito
        })
      : f.cards;
    // Historial de pagos a tarjeta
    if (t.type === 'pago' && t.cardId) {
      const c = f.cards.find((x) => x.id === t.cardId);
      const list = [...(f.payments || []), { id: get()._fid(), date: today(), kind: 'card', refId: t.cardId, label: c?.bank || 'Tarjeta', amount: amt, accountId: t.accountId }];
      await get()._saveFinance({ ...f, accounts, cards, transactions: [t, ...f.transactions], payments: list });
      return { success: true };
    }
    await get()._saveFinance({ ...f, accounts, cards, transactions: [t, ...f.transactions] });
    return { success: true };
  },
  deleteTransaction: async (id) => {
    const f = get().finance;
    const t = f.transactions.find(x => x.id === id);
    if (!t) return;
    const amt = t.amount || 0;
    const accounts = f.accounts.map(a => {
      if (a.id === t.accountId) {
        return { ...a, balance: (a.balance || 0) + (t.type === 'ingreso' ? -amt : amt) };
      }
      if (t.type === 'transferencia' && a.id === t.toAccountId) {
        return { ...a, balance: (a.balance || 0) - amt };
      }
      return a;
    });
    const cards = t.cardId
      ? f.cards.map(c => {
          if (c.id !== t.cardId) return c;
          if (t.type === 'pago') return { ...c, used: (c.used || 0) + amt };        // deshacer pago → restaura lo usado
          if (c.kind === 'debito') return { ...c, balance: (c.balance || 0) + amt };
          return { ...c, used: Math.max(0, (c.used || 0) - amt) };                  // deshacer gasto crédito → libera línea
        })
      : f.cards;
    await get()._saveFinance({ ...f, accounts, cards, transactions: f.transactions.filter(x => x.id !== id) });
  },

  addCard: async (card) => {
    const f = get().finance;
    await get()._saveFinance({ ...f, cards: [...f.cards, { id: get()._fid(), currency: get().settings.currency, ...card }] });
  },
  updateCard: async (id, patch) => {
    const f = get().finance;
    await get()._saveFinance({ ...f, cards: f.cards.map(c => c.id === id ? { ...c, ...patch } : c) });
  },
  deleteCard: async (id) => {
    const f = get().finance;
    await get()._saveFinance({ ...f, cards: f.cards.filter(c => c.id !== id) });
  },

  addLoan: async (loan) => {
    const f = get().finance;
    await get()._saveFinance({ ...f, loans: [...f.loans, { id: get()._fid(), currency: get().settings.currency, ...loan }] });
  },
  updateLoan: async (id, patch) => {
    const f = get().finance;
    await get()._saveFinance({ ...f, loans: f.loans.map(l => l.id === id ? { ...l, ...patch } : l) });
  },
  deleteLoan: async (id) => {
    const f = get().finance;
    await get()._saveFinance({ ...f, loans: f.loans.filter(l => l.id !== id) });
  },

  addDebt: async (debt) => {
    const f = get().finance;
    await get()._saveFinance({ ...f, debts: [...f.debts, { id: get()._fid(), paid: 0, currency: get().settings.currency, ...debt }] });
  },
  updateDebt: async (id, patch) => {
    const f = get().finance;
    await get()._saveFinance({ ...f, debts: f.debts.map(d => d.id === id ? { ...d, ...patch } : d) });
  },
  deleteDebt: async (id) => {
    const f = get().finance;
    await get()._saveFinance({ ...f, debts: f.debts.filter(d => d.id !== id) });
  },

  // ─── PAGOS de deudas y préstamos (integrados con cuentas/historial/reportes) ──
  payDebt: async (id, amount, accountId) => {
    const d = get().finance.debts.find((x) => x.id === id);
    if (!d || amount <= 0) return { error: 'Monto inválido' };
    if (accountId) {
      const res = await get().addTransaction({ type: 'gasto', accountId, amount, category: 'Deudas', note: `Pago deuda: ${d.creditor || d.name || ''}`.trim() });
      if (res && res.error) return res;
    }
    await get().updateDebt(id, { paid: (d.paid || 0) + amount });
    await get()._addPaymentHistory({ kind: 'debt', refId: id, label: d.creditor || d.name || 'Deuda', amount, accountId });
    return { success: true };
  },
  payLoan: async (id, amount, accountId) => {
    const l = get().finance.loans.find((x) => x.id === id);
    if (!l || amount <= 0) return { error: 'Monto inválido' };
    if (accountId) {
      const res = await get().addTransaction({ type: 'gasto', accountId, amount, category: 'Deudas', note: `Pago préstamo: ${l.name || ''}`.trim() });
      if (res && res.error) return res;
    }
    const pend = l.pending != null ? l.pending : loanPending(l);
    // Si el préstamo es por cuotas, avanzar el contador de cuotas pagadas
    const totalC = l.installmentsTotal || 0;
    const paidC = l.installmentsPaid || 0;
    const patch = { pending: Math.max(0, pend - amount) };
    if (totalC > 0) patch.installmentsPaid = Math.min(totalC, paidC + 1);
    await get().updateLoan(id, patch);
    await get()._addPaymentHistory({ kind: 'loan', refId: id, label: l.name || 'Préstamo', amount, accountId });
    return { success: true };
  },
  addLoanAmount: async (id, amount, accountId) => {
    const l = get().finance.loans.find((x) => x.id === id);
    if (!l || amount <= 0) return { error: 'Monto inválido' };
    if (accountId) {
      await get().addTransaction({ type: 'ingreso', accountId, amount, category: 'Otros', note: `Préstamo adicional: ${l.name || ''}`.trim() });
    }
    const pend = l.pending != null ? l.pending : loanPending(l);
    await get().updateLoan(id, { pending: pend + amount, amount: (l.amount || 0) + amount });
    return { success: true };
  },

  // ─── Historial de pagos (deudas, préstamos, tarjetas) ────────────
  _addPaymentHistory: async (entry) => {
    const f = get().finance;
    const e = { id: get()._fid(), date: today(), ...entry };
    const list = [...(f.payments || []), e];
    await get()._saveFinance({ ...f, payments: list });
  },
  clearPaymentHistoryFor: async (refId) => {
    const f = get().finance;
    const list = (f.payments || []).filter((p) => p.refId !== refId);
    await get()._saveFinance({ ...f, payments: list });
  },

  // ─── ÁREAS (árbol de vida) ───────────────────────────────
  addArea: async ({ parentId = null, name, color, icon, note }) => {
    const node = {
      id: get()._fid(), name: (name || 'Área').trim(), parentId: parentId || null,
      color: color || '#7C3AED', icon: icon || 'ellipse', note: note || '', createdAt: today(),
    };
    const areas = [...get().areas, node];
    set({ areas });
    await AsyncStorage.setItem('areas', JSON.stringify(areas));
    return node;
  },
  updateArea: async (id, patch) => {
    const areas = get().areas.map(a => a.id === id ? { ...a, ...patch } : a);
    set({ areas });
    await AsyncStorage.setItem('areas', JSON.stringify(areas));
  },
  deleteArea: async (id) => {
    const all = get().areas;
    const toDelete = new Set([id]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const a of all) {
        if (a.parentId && toDelete.has(a.parentId) && !toDelete.has(a.id)) { toDelete.add(a.id); changed = true; }
      }
    }
    const areas = all.filter(a => !toDelete.has(a.id));
    set({ areas });
    await AsyncStorage.setItem('areas', JSON.stringify(areas));
  },

  // Crear un hábito (usado al convertir un nodo del árbol)
  addHabit: async (habit) => {
    const h = { id: get()._fid(), active: true, ...habit };
    const habits = [...get().habits, h];
    set({ habits });
    await AsyncStorage.setItem('habits', JSON.stringify(habits));
    return h;
  },

  // ─── FIREBASE SYNC ───────────────────────
  syncAllToFirebase: async (userId) => {
    if (!userId) return { error: 'No user ID' };
    const state = get();
    try {
      await Promise.all([
        syncToFirebase(userId, 'habits', state.habits),
        syncToFirebase(userId, 'habitLogs', state.habitLogs),
        syncToFirebase(userId, 'goals', state.goals),
        syncToFirebase(userId, 'planning', state.planning),
        syncToFirebase(userId, 'finance', state.finance),
        syncToFirebase(userId, 'calendar', state.calendar),
        syncToFirebase(userId, 'areas', state.areas),
        syncToFirebase(userId, 'settings', state.settings),
        syncToFirebase(userId, 'userProfile', state.userProfile),
      ]);
      return { error: null };
    } catch (e) {
      return { error: e.message };
    }
  },

  syncFromFirebase: async (userId) => {
    if (!userId) return { error: 'No user ID' };
    try {
      const keys = ['habits', 'habitLogs', 'goals', 'planning', 'finance', 'calendar', 'areas', 'settings', 'userProfile'];
      const updates = {};
      for (const key of keys) {
        const { data } = await syncFromFirebase(userId, key);
        if (data) updates[key] = data;
      }
      set(updates);
      return { error: null };
    } catch (e) {
      return { error: e.message };
    }
  },
}));
