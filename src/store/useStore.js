import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format, subDays } from 'date-fns';
import { formatMoney } from '../utils/currency';
import { loanPending, OCCUPATIONS, CATEGORIES, findRootAccId } from '../utils/finance';
import { syncToFirebase, syncFromFirebase, auth } from '../utils/firebase';
import { supabase } from '../utils/supabase';
import { cloudSyncUp, cloudSyncDownAll, cloudCurrentUserId } from '../utils/cloud';

const today = () => format(new Date(), 'yyyy-MM-dd');

// Bloques de datos del usuario que se respaldan en la nube (Supabase)
const CLOUD_KEYS = ['habits', 'habitLogs', 'goals', 'planning', 'finance', 'calendar', 'areas', 'settings', 'userProfile', 'aiConversations'];

// Traduce errores de Supabase Auth a español legible
function traduceAuthError(msg = '') {
  const m = (msg || '').toLowerCase();
  if (m.includes('already registered') || m.includes('already been registered')) return 'Ese correo ya está registrado. Inicia sesión.';
  if (m.includes('password') && m.includes('6')) return 'La contraseña debe tener al menos 6 caracteres.';
  if (m.includes('invalid login')) return 'Correo o contraseña incorrectos.';
  if (m.includes('email') && (m.includes('valid') || m.includes('invalid'))) return 'Correo no válido.';
  if (m.includes('confirm')) return 'Revisa tu correo para confirmar la cuenta.';
  return msg || 'Error de autenticación';
}

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
  currency: 'PEN',
  secondaryCurrency: 'USD',
  themeMode: 'dark',
  aiName: null,
  customHabitCategories: [],
  customGastoCategories: [],    // categorías de gasto extra ['Streaming', ...]
  customIngresoCategories: [],  // categorías de ingreso extra ['Taxi', 'Arriendo', ...]
  customSubcategories: {},           // sub-categorías gasto: { 'Transporte': ['Combustible', 'Taxi'] }
  customIngresoSubcategories: {},    // sub-categorías ingreso: { 'Negocio': ['Taxi', 'Uber'] }
  hiddenModules: [],                 // tabs ocultos: ['Plan', 'Habitos', ...]
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
  finance: { accounts: [], cards: [], loans: [], debts: [], transactions: [], gastosFijos: [], receivables: [], pendingFromNotifs: [] },
  areas: [], // árbol: [{ id, name, parentId, color, icon, linkedGoalId, linkedHabitId }]
  aiConversations: [],

  // UI
  loading: false,

  // ─── AUTH (Supabase + fallback local sin conexión) ───────
  _persistUser: async (user) => {
    set({ currentUser: user });
    await AsyncStorage.setItem('currentUser', JSON.stringify(user));
  },
  // Tras autenticar: si la nube tiene datos, restaura; si está vacía, sube los
  // locales (migración la primera vez). Nunca bloquea el login si falla.
  _postAuthSync: async () => {
    try {
      const { data } = await cloudSyncDownAll();
      const hasCloud = data && Object.keys(data).length > 0;
      if (hasCloud) await get().restoreFromCloud();
      else await get().syncAllToCloud();
    } catch (e) { /* no bloquear por fallo de sync */ }
  },

  register: async (name, email, password) => {
    // 1) Supabase (respaldo real en la nube)
    try {
      const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name } } });
      if (!error && data?.session && data?.user) {
        await get()._persistUser({ id: data.user.id, name, email, createdAt: today() });
        await get()._postAuthSync();
        return { success: true };
      }
      if (!error && data?.user && !data?.session) {
        return { error: 'Revisa tu correo para confirmar la cuenta y luego inicia sesión.' };
      }
      if (error && !/network request failed|fetch|timeout/i.test(error.message || '')) {
        return { error: traduceAuthError(error.message) };
      }
      // error de red → fallback local abajo
    } catch (e) { /* offline → local */ }

    // 2) Fallback local (sin conexión): no bloquear al usuario
    const { users } = get();
    if (users.find(u => u.email === email)) return { error: 'El correo ya existe' };
    const user = { id: Date.now().toString(), name, email, passwordHash: btoa(email + ':' + password), createdAt: today() };
    const updated = [...users, user];
    set({ users: updated });
    await AsyncStorage.setItem('users', JSON.stringify(updated));
    await get()._persistUser(user);
    return { success: true };
  },

  login: async (email, password) => {
    // 1) Supabase
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (!error && data?.session && data?.user) {
        const name = data.user.user_metadata?.name || get().users.find(u => u.email === email)?.name || email.split('@')[0];
        await get()._persistUser({ id: data.user.id, name, email, createdAt: today() });
        await get()._postAuthSync();
        return { success: true };
      }
      if (error && /network request failed|fetch|timeout/i.test(error.message || '')) {
        // offline → fallback local
      } else if (error) {
        // Credenciales rechazadas por Supabase. ¿Cuenta local antigua? → migrarla.
        const local = get().users.find(u => u.email === email && u.passwordHash === btoa(email + ':' + password));
        if (local) {
          const { data: su, error: se } = await supabase.auth.signUp({ email, password, options: { data: { name: local.name } } });
          if (!se && su?.session && su?.user) {
            await get()._persistUser({ ...local, id: su.user.id });
            await get()._postAuthSync();
            return { success: true };
          }
          await get()._persistUser(local); // no se pudo migrar → al menos entrar
          return { success: true };
        }
        return { error: 'Correo o contraseña incorrectos' };
      }
    } catch (e) { /* offline → local */ }

    // 2) Fallback local
    const local = get().users.find(u => u.email === email && u.passwordHash === btoa(email + ':' + password));
    if (!local) return { error: 'Correo o contraseña incorrectos' };
    await get()._persistUser(local);
    return { success: true };
  },

  logout: async () => {
    try { await supabase.auth.signOut(); } catch (e) {}
    set({ currentUser: null });
    await AsyncStorage.removeItem('currentUser');
  },

  deleteAllData: async () => {
    try {
      // 1) Borrar de Supabase
      const id = await cloudCurrentUserId();
      if (id) {
        await Promise.all(CLOUD_KEYS.map(k =>
          supabase.from('user_data').delete().eq('user_id', id).eq('key', k).catch(() => {})
        ));
      }
    } catch (e) { console.log('[deleteAllData] error en Supabase:', e.message); }

    try {
      // 2) Borrar de Firebase (si hay sesión Google activa)
      const fbUser = auth.currentUser;
      if (fbUser?.uid) {
        await Promise.all(CLOUD_KEYS.map(k =>
          syncToFirebase(fbUser.uid, k, null).catch(() => {})
        ));
      }
    } catch (e) { console.log('[deleteAllData] error en Firebase:', e.message); }

    // 3) Limpiar AsyncStorage
    await Promise.all(CLOUD_KEYS.map(k => AsyncStorage.removeItem(k)));
    await AsyncStorage.removeItem('currentUser');
    await AsyncStorage.removeItem('onboardingDone');
    await AsyncStorage.removeItem('users');

    // 4) Resetear store a estado inicial
    set({
      currentUser: null,
      onboardingDone: false,
      users: [],
      habits: [],
      habitLogs: {},
      goals: [],
      planning: { schedule: null, activities: [], log: {}, dayPlans: {} },
      finance: { accounts: [], cards: [], loans: [], debts: [], transactions: [], gastosFijos: [], receivables: [], payments: [], pendingFromNotifs: [] },
      calendar: [],
      areas: [],
      settings: { currency: 'PEN', themeMode: 'dark', hiddenModules: [] },
      userProfile: {},
      aiConversations: [],
    });

    return { success: true };
  },

  // ─── PERSISTENCE ─────────────────────────────────────────
  loadFromStorage: async () => {
    try {
      const [
        usersRaw, userRaw, logsRaw, habitsRaw, goalsRaw, finRaw,
        profileRaw, onbRaw, settingsRaw, planningRaw, calendarRaw, financeRaw, areasRaw, aiConvRaw,
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
        AsyncStorage.getItem('aiConversations'),
      ]);
      const emptyFinance = { accounts: [], cards: [], loans: [], debts: [], transactions: [], gastosFijos: [], receivables: [], pendingFromNotifs: [] };
      const savedPlanning = planningRaw ? JSON.parse(planningRaw) : null;

      let parsedFinance = financeRaw ? { ...emptyFinance, ...JSON.parse(financeRaw) } : emptyFinance;

      // Migración y auto-reparación de saldos al cargar
      if (parsedFinance.accounts.length > 0) {
        const accounts = [...parsedFinance.accounts];

        // 1. Asegurar que todas las cuentas tengan un initialBalance (migración de datos viejos)
        accounts.forEach(a => {
          if (a.initialBalance === undefined) a.initialBalance = a.balance || 0;
        });

    // 2. Sincronizar hijos con padres recursivos
        accounts.forEach(a => {
      const rootId = findRootAccId(accounts, a.id);
      if (rootId !== a.id) {
        const root = accounts.find(r => r.id === rootId);
        if (root) a.balance = root.balance;
          }
        });
        parsedFinance.accounts = accounts;

        // 3. También tarjetas de débito
        parsedFinance.cards = (parsedFinance.cards || []).map(c => {
          if (c.initialBalance === undefined) c.initialBalance = c.balance || 0;
          if (c.kind === 'debito' && c.linkedTo) {
            const rootId = findRootAccId(accounts, c.linkedTo); const parent = accounts.find(p => p.id === rootId);
            if (parent) return { ...c, balance: parent.balance };
          }
          return c;
        });
      }

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
        finance: parsedFinance,
        areas: areasRaw ? JSON.parse(areasRaw) : [],
        aiConversations: aiConvRaw ? JSON.parse(aiConvRaw) : [],
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

  // ─── PENDING NOTIFS ──────────────────────────────────
  addPendingNotif: async (notif) => {
    const f = get().finance;
    const pending = [...(f.pendingFromNotifs || []), { id: Date.now().toString(), ...notif }];
    await get()._saveFinance({ ...f, pendingFromNotifs: pending });
  },
  dismissPendingNotif: async (id) => {
    const f = get().finance;
    const pending = (f.pendingFromNotifs || []).filter(n => n.id !== id);
    await get()._saveFinance({ ...f, pendingFromNotifs: pending });
  },

  // Reconciliación: reconstruye saldos desde cero basándose en transacciones
  reconcileAccounts: async () => {
    const f = get().finance;
    // Ordenar cronológicamente para reconstruir la historia
    const txs = [...(f.transactions || [])].sort((a, b) => {
      const da = (a.date || '0000-00-00') + (a.time || '00:00');
      const db = (b.date || '0000-00-00') + (b.time || '00:00');
      return da.localeCompare(db);
    });

    // Resetear saldos al valor inicial. Si no existe initialBalance (cuentas viejas),
    // asumimos que el saldo actual es el correcto para empezar la cuenta.
    let accounts = f.accounts.map(a => ({ ...a, balance: a.initialBalance ?? a.balance ?? 0 }));
    let cards = f.cards.map(c => ({ ...c, used: 0, balance: c.initialBalance ?? c.balance ?? 0 }));

    const getRootId = (accId, cardId) => {
      let finalAccId = accId;
      if (!finalAccId && cardId) {
        const card = f.cards.find(x => x.id === cardId);
        if (card?.kind === 'debito' && card?.linkedTo) finalAccId = card.linkedTo;
      }
      return findRootAccId(f.accounts, finalAccId);
    };

    for (const t of txs) {
      const amt = t.amount || 0;
      const rootId = getRootId(t.accountId, t.cardId);
      const toRootId = getRootId(t.toAccountId);

      // Aplicar a cuentas
      accounts = accounts.map(a => {
        let newBal = a.balance;
        if (rootId && a.id === rootId) {
          if (t.type === 'ingreso') newBal += amt;
          else if (t.type === 'gasto' || t.type === 'transferencia' || t.type === 'pago') newBal -= amt;
        }
        if (t.type === 'transferencia' && rootId === toRootId) return { ...a, balance: newBal };
        if (t.type === 'transferencia' && toRootId && a.id === toRootId) {
          newBal += amt;
        }
        return { ...a, balance: newBal };
      });

      // Aplicar a tarjetas
      if (t.cardId) {
        cards = cards.map(c => {
          if (c.id !== t.cardId) return c;
          if (t.type === 'pago') return { ...c, used: Math.max(0, (c.used || 0) - amt) };
          if (c.kind === 'debito') return c; // balance viene de cuenta
          return { ...c, used: (c.used || 0) + amt };
        });
      }
    }

    // Sincronizar todo el cluster (hijos a padres recursivos)
    accounts = accounts.map(a => {
      const rootId = findRootAccId(accounts, a.id);
      if (rootId === a.id) return a;
      const root = accounts.find(r => r.id === rootId);
      return root ? { ...a, balance: root.balance } : a;
    });
    cards = cards.map(c => {
      if (!c.linkedTo || c.kind !== 'debito') return c;
      const rootId = findRootAccId(accounts, c.linkedTo);
      const root = accounts.find(r => r.id === rootId);
      return root ? { ...c, balance: root.balance } : c;
    });

    await get()._saveFinance({ ...f, accounts, cards });
    return { success: true };
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
    const prevOccupation = get().userProfile?.occupation;
    set({ userProfile: profile, onboardingDone: true });
    await AsyncStorage.setItem('userProfile', JSON.stringify(profile));
    await AsyncStorage.setItem('onboardingDone', 'true');
    const uid = auth?.currentUser?.uid;
    if (uid) syncToFirebase(uid, 'userProfile', profile).catch(() => {});
    // Auto-agregar categorías de ingreso sugeridas para la profesión elegida
    if (profile.occupation && profile.occupation !== prevOccupation) {
      const occ = OCCUPATIONS.find(o => o.key === profile.occupation);
      if (occ?.suggestedCategories?.length) {
        const s = get().settings;
        const existing = s.customIngresoCategories || [];
        const toAdd = occ.suggestedCategories.filter(c => !CATEGORIES.ingreso.includes(c) && !existing.includes(c));
        if (toAdd.length > 0) {
          await get().setSetting('customIngresoCategories', [...existing, ...toAdd]);
        }
      }
    }
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
    const uid = auth?.currentUser?.uid;
    if (uid) cloudSyncUp('finance', finance).catch(() => {});
  },
  _fid: () => Date.now().toString() + Math.random().toString(36).slice(2, 6),

  addAccount: async (acc) => {
    const f = get().finance;
    const a = { id: get()._fid(), balance: 0, initialBalance: acc.balance || 0, currency: get().settings.currency, ...acc };
    let accounts = [...f.accounts, a];
    // Si se crea vinculada, heredar saldo de la raíz
    if (a.linkedTo) {
      const rootId = findRootAccId(accounts, a.linkedTo);
      const root = accounts.find(r => r.id === rootId);
      if (root) a.balance = root.balance;
    }
    await get()._saveFinance({ ...f, accounts });
  },
  updateAccount: async (id, patch) => {
    const f = get().finance;
    let accounts = f.accounts.map(a => a.id === id ? { ...a, ...patch } : a);
    if (patch.balance != null) {
      const edited = accounts.find(a => a.id === id);
      const rootId = findRootAccId(accounts, id);
      const newBalance = edited.balance;
      // Sincronizar TODO el cluster recursivo
      accounts = accounts.map(a => findRootAccId(accounts, a.id) === rootId ? { ...a, balance: newBalance } : a);
    } else {
      accounts = accounts.map(a => {
        const rootId = findRootAccId(accounts, a.id);
        if (rootId === a.id) return a;
        const root = accounts.find(r => r.id === rootId);
        return root ? { ...a, balance: root.balance } : a;
      });
    }
    const cards = f.cards.map(c => {
      if (!c.linkedTo || c.kind !== 'debito') return c;
      const rootId = findRootAccId(accounts, c.linkedTo);
      const root = accounts.find(r => r.id === rootId);
      return root ? { ...c, balance: root.balance } : c;
    });
    await get()._saveFinance({ ...f, accounts, cards });
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
    const acc = tx.accountId ? f.accounts.find(a => a.id === tx.accountId) : null;
    const card = tx.cardId ? f.cards.find(c => c.id === tx.cardId) : null;
    const t = {
      id: get()._fid(),
      date: today(),
      currency: acc?.currency || card?.currency || get().settings.currency,
      ...tx
    };
    const amt = t.amount || 0;

    // ── Transferencia: resolver la raíz de cada grupo vinculado y validar ──
    // Las cuentas con linkedTo comparten saldo con su "padre" (root). Operar
    // sobre la raíz evita que el espejo de vinculadas borre el movimiento.
    let transferOriginRoot = null, transferDestRoot = null;
    if (t.type === 'transferencia') {
      transferOriginRoot = findRootAccId(f.accounts, t.accountId);
      transferDestRoot = findRootAccId(f.accounts, t.toAccountId);
      if (!transferOriginRoot || !transferDestRoot) return { error: 'Cuenta de transferencia no encontrada.' };
      if (transferOriginRoot === transferDestRoot) {
        return { error: 'Esas cuentas comparten el mismo saldo (están vinculadas). Transferir entre ellas no movería dinero.' };
      }
    }

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

    // Si la tarjeta débito está vinculada a una cuenta, aplicar el cambio en esa cuenta
    const txCard = t.cardId ? f.cards.find(c => c.id === t.cardId) : null;
    const debitLinkedAccId = (txCard?.kind === 'debito' && txCard?.linkedTo) ? txCard.linkedTo : null;

    // Identificar cuenta(s) a afectar y sus raíces para mantener sincronía
    const targetAccId = t.accountId || debitLinkedAccId;
    const targetRootId = findRootAccId(f.accounts, targetAccId);

    let accounts = f.accounts.map(a => {
      if (t.type === 'transferencia') {
        if (a.id === transferOriginRoot) return { ...a, balance: (a.balance || 0) - amt };
        if (a.id === transferDestRoot) return { ...a, balance: (a.balance || 0) + amt };
        return a;
      }
      // Si el movimiento es un pago de tarjeta, también se resta de la cuenta de origen
      if (t.type === 'pago') {
        if (a.id === targetRootId) return { ...a, balance: (a.balance || 0) - amt };
        return a;
      }
      // Actualizamos siempre la RAÍZ del grupo vinculado
      if (targetRootId && a.id === targetRootId) {
        return { ...a, balance: (a.balance || 0) + (t.type === 'ingreso' ? amt : -amt) };
      }
      return a;
    });

    // Sincronizar todas las hijas con su padre recursivo
    accounts = accounts.map(a => {
      const rootId = findRootAccId(accounts, a.id);
      if (rootId === a.id) return a;
      const root = accounts.find(r => r.id === rootId);
      return root ? { ...a, balance: root.balance } : a;
    });

    let cards = t.cardId
      ? f.cards.map(c => {
          if (c.id !== t.cardId) return c;
          if (t.type === 'pago') return { ...c, used: Math.max(0, (c.used || 0) - amt) };
          if (c.kind === 'debito') {
            if (c.linkedTo) return c; // balance viene de la cuenta vinculada
            return { ...c, balance: (c.balance || 0) - amt };
          }
          return { ...c, used: (c.used || 0) + amt };
        })
      : f.cards;
    // Tarjetas débito vinculadas espejo la cuenta
    cards = cards.map(c => {
      if (!c.linkedTo || c.kind !== 'debito') return c;
      const rootId = findRootAccId(accounts, c.linkedTo); const parent = accounts.find(p => p.id === rootId);
      return parent ? { ...c, balance: parent.balance } : c;
    });
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
    const txCard = t.cardId ? f.cards.find(c => c.id === t.cardId) : null;
    const debitLinkedAccId = (txCard?.kind === 'debito' && txCard?.linkedTo) ? txCard.linkedTo : null;
    const delOriginRoot = t.type === 'transferencia' ? findRootAccId(f.accounts, t.accountId) : null;
    const delDestRoot = t.type === 'transferencia' ? findRootAccId(f.accounts, t.toAccountId) : null;

    const targetAccId = t.accountId || debitLinkedAccId;
    const targetRootId = findRootAccId(f.accounts, targetAccId);

    let accounts = f.accounts.map(a => {
      if (t.type === 'transferencia') {
        if (a.id === delOriginRoot) return { ...a, balance: (a.balance || 0) + amt };
        if (a.id === delDestRoot) return { ...a, balance: (a.balance || 0) - amt };
        return a;
      }
      if (targetRootId && a.id === targetRootId) {
        return { ...a, balance: (a.balance || 0) + (t.type === 'ingreso' ? -amt : amt) };
      }
      return a;
    });
    accounts = accounts.map(a => {
      const rootId = findRootAccId(accounts, a.id);
      if (rootId === a.id) return a;
      const root = accounts.find(r => r.id === rootId);
      return root ? { ...a, balance: root.balance } : a;
    });
    let cards = t.cardId
      ? f.cards.map(c => {
          if (c.id !== t.cardId) return c;
          if (t.type === 'pago') return { ...c, used: (c.used || 0) + amt };
          if (c.kind === 'debito') {
            if (c.linkedTo) return c;
            return { ...c, balance: (c.balance || 0) + amt };
          }
          return { ...c, used: Math.max(0, (c.used || 0) - amt) };
        })
      : f.cards;
    cards = cards.map(c => {
      if (!c.linkedTo || c.kind !== 'debito') return c;
      const rootId = findRootAccId(accounts, c.linkedTo); const parent = accounts.find(p => p.id === rootId);
      return parent ? { ...c, balance: parent.balance } : c;
    });
    await get()._saveFinance({ ...f, accounts, cards, transactions: f.transactions.filter(x => x.id !== id) });
  },

  updateTransaction: async (id, patch) => {
    const f = get().finance;
    const old = f.transactions.find((x) => x.id === id);
    if (!old) return { error: 'Movimiento no encontrado' };
    const oldAmt = old.amount || 0;
    const newAmt = patch.amount != null ? (patch.amount || 0) : oldAmt;
    const newType = patch.type !== undefined ? patch.type : old.type;
    const newAccountId = patch.accountId !== undefined ? patch.accountId : old.accountId;
    const newToAccountId = patch.toAccountId !== undefined ? patch.toAccountId : old.toAccountId;
    const newCardId = patch.cardId !== undefined ? patch.cardId : old.cardId;

    const getAccountRoot = (accId, cardId) => {
      let finalAccId = accId;
      if (!finalAccId && cardId) {
        const card = f.cards.find(c => c.id === cardId);
        if (card?.kind === 'debito' && card?.linkedTo) finalAccId = card.linkedTo;
      }
      return findRootAccId(f.accounts, finalAccId);
    };

    const oldRootId = getAccountRoot(old.accountId, old.cardId);
    const oldToRootId = getAccountRoot(old.toAccountId);
    const newRootId = getAccountRoot(newAccountId, newCardId);
    const newToRootId = getAccountRoot(newToAccountId);

    // Revert old effects on accounts (always using roots)
    let accounts = f.accounts.map(a => {
      if (oldRootId && a.id === oldRootId) return { ...a, balance: (a.balance || 0) + (old.type === 'ingreso' ? -oldAmt : oldAmt) };
      if (old.type === 'transferencia' && oldToRootId && a.id === oldToRootId) return { ...a, balance: (a.balance || 0) - oldAmt };
      return a;
    });
    // Revert old effects on cards
    let cards = old.cardId
      ? f.cards.map(c => {
          if (c.id !== old.cardId) return c;
          if (old.type === 'pago') return { ...c, used: (c.used || 0) + oldAmt };
          if (c.kind === 'debito') {
            if (c.linkedTo) return c;
            return { ...c, balance: (c.balance || 0) + oldAmt };
          }
          return { ...c, used: Math.max(0, (c.used || 0) - oldAmt) };
        })
      : f.cards;
    // Apply new effects on accounts (always using roots)
    accounts = accounts.map(a => {
      if (newRootId && a.id === newRootId) return { ...a, balance: (a.balance || 0) + (newType === 'ingreso' ? newAmt : -newAmt) };
      if (newType === 'transferencia' && newToRootId && a.id === newToRootId) return { ...a, balance: (a.balance || 0) + newAmt };
      return a;
    });
    // Apply new effects on cards
    if (newCardId) {
      cards = cards.map(c => {
        if (c.id !== newCardId) return c;
        if (newType === 'pago') return { ...c, used: Math.max(0, (c.used || 0) - newAmt) };
        if (c.kind === 'debito') {
          if (c.linkedTo) return c;
          return { ...c, balance: (c.balance || 0) - newAmt };
        }
        return { ...c, used: (c.used || 0) + newAmt };
      });
    }
    // Sync linked accounts and cards
    accounts = accounts.map(a => {
      const rootId = findRootAccId(accounts, a.id);
      if (rootId === a.id) return a;
      const root = accounts.find(r => r.id === rootId);
      return root ? { ...a, balance: root.balance } : a;
    });
    cards = cards.map(c => {
      if (!c.linkedTo || c.kind !== 'debito') return c;
      const rootId = findRootAccId(accounts, c.linkedTo); const parent = accounts.find(p => p.id === rootId);
      return parent ? { ...c, balance: parent.balance } : c;
    });
    const transactions = f.transactions.map(t => t.id === id ? { ...old, ...patch, id, amount: newAmt } : t);
    await get()._saveFinance({ ...f, accounts, cards, transactions });
    return { success: true };
  },

  addCard: async (card) => {
    const f = get().finance;
    await get()._saveFinance({ ...f, cards: [...f.cards, { id: get()._fid(), initialBalance: card.balance || 0, currency: get().settings.currency, ...card }] });
  },
  updateCard: async (id, patch) => {
    const f = get().finance;
    const cards = f.cards.map(c => {
      if (c.id !== id) return c;
      const updated = { ...c, ...patch };
      // Tarjeta débito vinculada: el balance siempre viene de la cuenta padre
      if (updated.kind === 'debito' && updated.linkedTo) {
        const parent = f.accounts.find(a => a.id === updated.linkedTo);
        if (parent) updated.balance = parent.balance;
      }
      return updated;
    });
    await get()._saveFinance({ ...f, cards });
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

  addReceivable: async (r) => {
    const f = get().finance;
    const item = { id: get()._fid(), paid: 0, currency: get().settings.currency, createdAt: today(), ...r };
    await get()._saveFinance({ ...f, receivables: [...(f.receivables || []), item] });
  },
  updateReceivable: async (id, patch) => {
    const f = get().finance;
    await get()._saveFinance({ ...f, receivables: (f.receivables || []).map(r => r.id === id ? { ...r, ...patch } : r) });
  },
  deleteReceivable: async (id) => {
    const f = get().finance;
    await get()._saveFinance({ ...f, receivables: (f.receivables || []).filter(r => r.id !== id) });
  },
  collectReceivable: async (id, amount, accountId) => {
    const f = get().finance;
    const r = (f.receivables || []).find((x) => x.id === id);
    if (!r || amount <= 0) return { error: 'Monto inválido' };
    if (accountId) {
      await get().addTransaction({ type: 'ingreso', accountId, amount, category: 'Otros', note: `Cobro: ${r.debtor || r.name || ''}`.trim() });
    }
    await get().updateReceivable(id, { paid: (r.paid || 0) + amount });
    await get()._addPaymentHistory({ kind: 'receivable', refId: id, label: r.debtor || r.name || 'Cobro', amount, accountId });
    return { success: true };
  },

  addGastoFijo: async (gf) => {
    const f = get().finance;
    const item = { id: get()._fid(), currency: get().settings.currency, active: true, ...gf };
    await get()._saveFinance({ ...f, gastosFijos: [...(f.gastosFijos || []), item] });
  },
  updateGastoFijo: async (id, patch) => {
    const f = get().finance;
    await get()._saveFinance({ ...f, gastosFijos: (f.gastosFijos || []).map(g => g.id === id ? { ...g, ...patch } : g) });
  },
  deleteGastoFijo: async (id) => {
    const f = get().finance;
    await get()._saveFinance({ ...f, gastosFijos: (f.gastosFijos || []).filter(g => g.id !== id) });
  },

  // ─── CATEGORÍAS PERSONALIZADAS ────────────────────────
  addIngresoCategory: async (name) => {
    const s = get().settings;
    const current = s.customIngresoCategories || [];
    if (current.includes(name)) return;
    await get().setSetting('customIngresoCategories', [...current, name]);
  },
  deleteIngresoCategory: async (name) => {
    const s = get().settings;
    const cats = (s.customIngresoCategories || []).filter(c => c !== name);
    const subs = { ...(s.customIngresoSubcategories || {}) };
    delete subs[name];
    const updated = { ...s, customIngresoCategories: cats, customIngresoSubcategories: subs };
    set({ settings: updated });
    await AsyncStorage.setItem('settings', JSON.stringify(updated));
  },

  addIngresoSubcategory: async (parent, name) => {
    const s = get().settings;
    const subs = { ...(s.customIngresoSubcategories || {}) };
    const existing = subs[parent] || [];
    if (existing.includes(name)) return;
    subs[parent] = [...existing, name];
    await get().setSetting('customIngresoSubcategories', subs);
  },
  deleteIngresoSubcategory: async (parent, name) => {
    const s = get().settings;
    const subs = { ...(s.customIngresoSubcategories || {}) };
    if (subs[parent]) {
      subs[parent] = subs[parent].filter(n => n !== name);
      if (subs[parent].length === 0) delete subs[parent];
    }
    await get().setSetting('customIngresoSubcategories', subs);
  },

  addGastoCategory: async (name) => {
    const s = get().settings;
    const current = s.customGastoCategories || [];
    if (current.includes(name)) return;
    await get().setSetting('customGastoCategories', [...current, name]);
  },
  deleteGastoCategory: async (name) => {
    const s = get().settings;
    const cats = (s.customGastoCategories || []).filter(c => c !== name);
    const subs = { ...(s.customSubcategories || {}) };
    delete subs[name];
    const updated = { ...s, customGastoCategories: cats, customSubcategories: subs };
    set({ settings: updated });
    await AsyncStorage.setItem('settings', JSON.stringify(updated));
  },
  addSubcategory: async (parent, name) => {
    const s = get().settings;
    const subs = { ...(s.customSubcategories || {}) };
    const existing = subs[parent] || [];
    if (existing.includes(name)) return;
    subs[parent] = [...existing, name];
    await get().setSetting('customSubcategories', subs);
  },
  deleteSubcategory: async (parent, name) => {
    const s = get().settings;
    const subs = { ...(s.customSubcategories || {}) };
    if (subs[parent]) {
      subs[parent] = subs[parent].filter(n => n !== name);
      if (subs[parent].length === 0) delete subs[parent];
    }
    await get().setSetting('customSubcategories', subs);
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
  deletePayment: async (paymentId) => {
    const f = get().finance;
    const payment = (f.payments || []).find((p) => p.id === paymentId);
    if (!payment) return;
    const amt = payment.amount || 0;
    let updates = { ...f, payments: (f.payments || []).filter((p) => p.id !== paymentId) };
    if (payment.kind === 'debt') {
      updates.debts = (f.debts || []).map((d) =>
        d.id === payment.refId ? { ...d, paid: Math.max(0, (d.paid || 0) - amt) } : d
      );
    } else if (payment.kind === 'loan') {
      updates.loans = (f.loans || []).map((l) => {
        if (l.id !== payment.refId) return l;
        const pend = l.pending != null ? l.pending : loanPending(l);
        const totalC = l.installmentsTotal || 0;
        const paidC = l.installmentsPaid || 0;
        return { ...l, pending: pend + amt, installmentsPaid: totalC > 0 ? Math.max(0, paidC - 1) : paidC };
      });
    }
    await get()._saveFinance(updates);
  },

  updatePayment: async (paymentId, patch) => {
    const f = get().finance;
    const old = (f.payments || []).find((p) => p.id === paymentId);
    if (!old) return;
    const oldAmt = old.amount || 0;
    const newAmt = patch.amount != null ? (patch.amount || 0) : oldAmt;
    const delta = newAmt - oldAmt;
    let updates = { ...f, payments: (f.payments || []).map((p) => p.id === paymentId ? { ...p, ...patch } : p) };
    if (delta !== 0) {
      if (old.kind === 'debt') {
        updates.debts = (f.debts || []).map((d) => d.id === old.refId ? { ...d, paid: Math.max(0, (d.paid || 0) + delta) } : d);
      } else if (old.kind === 'loan') {
        updates.loans = (f.loans || []).map((l) => {
          if (l.id !== old.refId) return l;
          const pend = l.pending != null ? l.pending : loanPending(l);
          return { ...l, pending: Math.max(0, pend - delta) };
        });
      } else if (old.kind === 'receivable') {
        updates.receivables = (f.receivables || []).map((r) => r.id === old.refId ? { ...r, paid: Math.max(0, (r.paid || 0) + delta) } : r);
      }
    }
    await get()._saveFinance(updates);
  },

  updateSettings: async (patch) => {
    const settings = { ...get().settings, ...patch };
    set({ settings });
    await AsyncStorage.setItem('settings', JSON.stringify(settings));
  },

  saveAiConversation: async (entry) => {
    const list = [...(get().aiConversations || []), { date: today(), rating: null, ...entry }];
    set({ aiConversations: list });
    await AsyncStorage.setItem('aiConversations', JSON.stringify(list));
  },

  rateAiConversation: async (id, rating) => {
    const list = (get().aiConversations || []).map(c => c.id === id ? { ...c, rating } : c);
    set({ aiConversations: list });
    await AsyncStorage.setItem('aiConversations', JSON.stringify(list));
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

  // ─── SUPABASE SYNC (nube actual) ─────────────────────────
  // Sube todos los bloques del usuario a Supabase (gated por sesión).
  syncAllToCloud: async () => {
    try {
      const id = await cloudCurrentUserId();
      if (!id) return { error: 'sin sesión' };
      const s = get();
      await Promise.all(CLOUD_KEYS.map((k) => cloudSyncUp(k, s[k])));
      return { error: null };
    } catch (e) { return { error: e.message }; }
  },
  // Descarga todos los bloques desde Supabase y los PERSISTE en disco (clave: que
  // sobrevivan al reinicio en frío, no solo en memoria).
  restoreFromCloud: async () => {
    try {
      const { data, error } = await cloudSyncDownAll();
      if (error || !data) return { error };
      const updates = {};
      for (const k of CLOUD_KEYS) if (data[k] != null) updates[k] = data[k];
      await Promise.all(Object.entries(updates).map(([k, v]) => AsyncStorage.setItem(k, JSON.stringify(v))));
      if (updates.userProfile && Object.keys(updates.userProfile).length > 0) {
        updates.onboardingDone = true;
        await AsyncStorage.setItem('onboardingDone', 'true');
      }
      set(updates);
      return { error: null };
    } catch (e) { return { error: e.message }; }
  },

  // ─── FIREBASE SYNC (legado, en desuso tras migrar a Supabase) ──
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
      // Si hay perfil guardado, marcar onboarding como completado
      if (updates.userProfile && Object.keys(updates.userProfile).length > 0) {
        updates.onboardingDone = true;
        await AsyncStorage.setItem('onboardingDone', 'true');
        await AsyncStorage.setItem('userProfile', JSON.stringify(updates.userProfile));
      }
      if (updates.finance) await AsyncStorage.setItem('finance', JSON.stringify(updates.finance));
      if (updates.settings) await AsyncStorage.setItem('settings', JSON.stringify(updates.settings));
      set(updates);
      return { error: null };
    } catch (e) {
      return { error: e.message };
    }
  },
}));
