// Modelo financiero completo: cuentas, tarjetas, préstamos, deudas, movimientos.
import {
  parseISO, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  startOfQuarter, endOfQuarter, startOfYear, endOfYear,
} from 'date-fns';

export const ACCOUNT_TYPES = [
  { key: 'yape', label: 'Yape', icon: 'phone-portrait-outline', color: '#7C3AED' },
  { key: 'plin', label: 'Plin', icon: 'phone-portrait-outline', color: '#0EA5E9' },
  { key: 'bcp', label: 'BCP', icon: 'business-outline', color: '#F59E0B' },
  { key: 'interbank', label: 'Interbank', icon: 'business-outline', color: '#10B981' },
  { key: 'bbva', label: 'BBVA', icon: 'business-outline', color: '#0EA5E9' },
  { key: 'scotiabank', label: 'Scotiabank', icon: 'business-outline', color: '#EF4444' },
  { key: 'efectivo', label: 'Efectivo', icon: 'cash-outline', color: '#10B981' },
  { key: 'otro', label: 'Otra', icon: 'wallet-outline', color: '#6366F1' },
];
export const accountType = (k) => ACCOUNT_TYPES.find((t) => t.key === k) || ACCOUNT_TYPES[7];

export const LOAN_TYPES = [
  { key: 'banco', label: 'Banco', icon: 'business-outline', color: '#F59E0B' },
  { key: 'familiar', label: 'Familiar', icon: 'people-outline', color: '#EC4899' },
  { key: 'empresa', label: 'Empresa', icon: 'briefcase-outline', color: '#7C3AED' },
  { key: 'prestamista', label: 'Prestamista', icon: 'person-outline', color: '#EF4444' },
];
export const loanType = (k) => LOAN_TYPES.find((t) => t.key === k) || LOAN_TYPES[0];

export const DEBT_PRIORITIES = [
  { key: 'alta', label: 'Alta', color: '#EF4444' },
  { key: 'media', label: 'Media', color: '#F59E0B' },
  { key: 'baja', label: 'Baja', color: '#10B981' },
];
export const debtPriority = (k) => DEBT_PRIORITIES.find((p) => p.key === k) || DEBT_PRIORITIES[1];

export const TX_TYPES = [
  { key: 'ingreso', label: 'Ingreso', icon: 'arrow-down-circle-outline', color: '#10B981' },
  { key: 'gasto', label: 'Gasto', icon: 'arrow-up-circle-outline', color: '#EF4444' },
  { key: 'transferencia', label: 'Transferencia', icon: 'swap-horizontal-outline', color: '#0EA5E9' },
  { key: 'pago', label: 'Pago tarjeta', icon: 'card-outline', color: '#A78BFA' },
];

export const CATEGORIES = {
  ingreso: ['Sueldo', 'Negocio', 'Freelance', 'Venta', 'Regalo', 'Otros'],
  gasto: ['Alimentación', 'Transporte', 'Vivienda', 'Servicios', 'Salud', 'Educación', 'Entretenimiento', 'Ropa', 'Deudas', 'Otros'],
};

export const CARD_KINDS = [
  { key: 'credito', label: 'Tarjeta de crédito', icon: 'card-outline' },
  { key: 'debito', label: 'Tarjeta de débito', icon: 'card' },
];
export const cardKind = (k) => CARD_KINDS.find((x) => x.key === k) || CARD_KINDS[0];

// Encontrar el ID "representante" de un grupo de cuentas vinculadas.
// Maneja ciclos (A->B, B->A) devolviendo siempre el mismo ID para todos los miembros.
export const findRootAccId = (accounts, id) => {
  if (!id || !Array.isArray(accounts)) return id || null;
  const visited = new Set();
  const path = [];
  let currId = id;

  // Obtener la cuenta inicial para asegurar que solo vinculamos la misma moneda
  const initialAcc = accounts.find(a => a.id === id);
  if (!initialAcc) return id;

  while (currId && !visited.has(currId)) {
    visited.add(currId);
    path.push(currId);
    const acc = accounts.find(a => a.id === currId);
    // Verificamos que la cuenta vinculada exista y tenga LA MISMA MONEDA
    if (!acc || !acc.linkedTo || acc.linkedTo === currId) break;
    const parent = accounts.find(p => p.id === acc.linkedTo);
    if (!parent || parent.currency !== initialAcc.currency) break;
    currId = acc.linkedTo;
  }

  return path.sort()[0];
};

// Color único y consistente por categoría
const CAT_COLOR_MAP = {
  'Alimentación': '#10B981', 'Transporte': '#0EA5E9', 'Vivienda': '#7C3AED', 'Servicios': '#6366F1',
  'Salud': '#EF4444', 'Educación': '#F59E0B', 'Entretenimiento': '#EC4899', 'Ropa': '#14B8A6',
  'Deudas': '#F97316', 'Otros': '#8B8AA8',
  'Sueldo': '#10B981', 'Negocio': '#7C3AED', 'Freelance': '#0EA5E9', 'Venta': '#F59E0B', 'Regalo': '#EC4899',
};
const CAT_PALETTE = ['#7C3AED', '#10B981', '#0EA5E9', '#F59E0B', '#EC4899', '#6366F1', '#14B8A6', '#EF4444', '#F97316', '#A78BFA'];
export function categoryColor(name) {
  if (CAT_COLOR_MAP[name]) return CAT_COLOR_MAP[name];
  let h = 0; const s = name || '';
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return CAT_PALETTE[h % CAT_PALETTE.length];
}

export const PERIODS = [
  { key: 'dia', label: 'Día' }, { key: 'semana', label: 'Semana' }, { key: 'mes', label: 'Mes' },
  { key: 'trimestre', label: 'Trim.' }, { key: 'anio', label: 'Año' },
];

export function periodRange(period, ref = new Date()) {
  switch (period) {
    case 'dia': return [startOfDay(ref), endOfDay(ref)];
    case 'semana': return [startOfWeek(ref, { weekStartsOn: 1 }), endOfWeek(ref, { weekStartsOn: 1 })];
    case 'trimestre': return [startOfQuarter(ref), endOfQuarter(ref)];
    case 'anio': return [startOfYear(ref), endOfYear(ref)];
    default: return [startOfMonth(ref), endOfMonth(ref)];
  }
}

export function financeStats(transactions, period, currency = 'PEN', ref = new Date()) {
  const [s, e] = periodRange(period, ref);
  const inRange = (transactions || []).filter((t) => {
    if (t.currency && t.currency !== currency) return false;
    try { const d = parseISO(t.date); return d >= s && d <= e; } catch { return false; }
  });
  const ingresos = inRange.filter((t) => t.type === 'ingreso').reduce((a, t) => a + t.amount, 0);
  const gastos = inRange.filter((t) => t.type === 'gasto').reduce((a, t) => a + t.amount, 0);
  const byCategory = {};
  inRange.filter((t) => t.type === 'gasto').forEach((t) => {
    const c = t.category || 'Otros';
    byCategory[c] = (byCategory[c] || 0) + t.amount;
  });
  const byIncome = {};
  inRange.filter((t) => t.type === 'ingreso').forEach((t) => {
    const c = t.category || 'Otros';
    byIncome[c] = (byIncome[c] || 0) + t.amount;
  });
  return { ingresos, gastos, balance: ingresos - gastos, ahorro: Math.max(0, ingresos - gastos), byCategory, byIncome, count: inRange.length };
}

export function loanPending(loan) {
  if (loan.pending != null) return Math.max(0, loan.pending);
  const remaining = Math.max(0, (loan.installmentsTotal || 0) - (loan.installmentsPaid || 0));
  return remaining * (loan.installment || 0);
}

export function loanBreakdown(loan) {
  const total = loan.amount || 0;
  const installment = loan.installment || 0;
  const installmentsTotal = loan.installmentsTotal || 0;
  const installmentsPaid = loan.installmentsPaid || 0;
  const paidCuotas = installmentsPaid;
  const remainingCuotas = Math.max(0, installmentsTotal - paidCuotas);
  const paid = paidCuotas * installment;
  const pendingCuotas = remainingCuotas * installment;
  const pctPaid = installmentsTotal > 0 ? Math.round((paidCuotas / installmentsTotal) * 100) : 0;
  return {
    total, installment, installmentsTotal, installmentsPaid: paidCuotas,
    remainingCuotas, paid, pendingCuotas, pctPaid,
    pendingManual: loan.pending != null ? loan.pending : null,
  };
}

export function loanTotalCost(loan) {
  const installment = loan.installment || 0;
  const total = loan.installmentsTotal || 0;
  if (installment > 0 && total > 0) {
    const totalCost = installment * total;
    const capital = loan.amount || 0;
    return { totalCost, capital, interestTotal: Math.max(0, totalCost - capital) };
  }
  return null;
}

export const OCCUPATIONS = [
  { key: 'taxista', label: 'Taxista / Conductor', income: 'Negocio', suggestedCategories: ['Taxi', 'Uber', 'InDriver', 'Rappi', 'Cabify', 'Beat'] },
  { key: 'comerciante', label: 'Comerciante', income: 'Negocio', suggestedCategories: ['Ventas', 'Comisiones', 'Delivery', 'Por mayor'] },
  { key: 'empleado', label: 'Empleado', income: 'Sueldo', suggestedCategories: ['Bonos', 'Horas extra', 'Gratificación', 'CTS'] },
  { key: 'independiente', label: 'Independiente / Freelance', income: 'Freelance', suggestedCategories: ['Proyectos', 'Consultoría', 'Diseño', 'Programación', 'Marketing'] },
  { key: 'estudiante', label: 'Estudiante', income: 'Otros', suggestedCategories: ['Mesada', 'Beca', 'Tutorías', 'Trabajo part-time'] },
  { key: 'otro', label: 'Otro', income: 'Otros', suggestedCategories: [] },
];
export const occupationIncome = (key) => (OCCUPATIONS.find((o) => o.key === key) || {}).income || null;
export function incomeCategories(occupationKey, settings) {
  const inc = occupationIncome(occupationKey);
  const base = inc && !CATEGORIES.ingreso.includes(inc) ? [inc, ...CATEGORIES.ingreso] : [...CATEGORIES.ingreso];
  const custom = (settings && settings.customIngresoCategories) || [];
  const result = [...base];
  for (const c of custom) { if (!result.includes(c)) result.push(c); }
  return result;
}

export function incomeCategoriesGrouped(occupationKey, settings) {
  const flat = incomeCategories(occupationKey, settings);
  const subs = (settings && settings.customIngresoSubcategories) || {};
  const result = [];
  flat.forEach(cat => {
    const catSubs = subs[cat] || [];
    result.push({ key: cat, label: cat, color: categoryColor(cat), hasChildren: catSubs.length > 0 });
    catSubs.forEach(sub => result.push({ key: sub, label: sub, color: categoryColor(cat), isChild: true, parent: cat }));
  });
  return result;
}

export function usageByCategory(transactions, type) {
  const counts = {};
  (transactions || []).filter(t => t.type === type).forEach(t => {
    if (t.category) counts[t.category] = (counts[t.category] || 0) + 1;
  });
  return counts;
}

export function sortGroupedByUsage(grouped, usageCounts) {
  if (!usageCounts || Object.keys(usageCounts).length === 0) return grouped;
  const parents = grouped.filter(o => !o.isChild);
  const childrenOf = {};
  grouped.filter(o => o.isChild).forEach(o => {
    if (!childrenOf[o.parent]) childrenOf[o.parent] = [];
    childrenOf[o.parent].push(o);
  });
  const sorted = [...parents].sort((a, b) => {
    const ua = (usageCounts[a.key] || 0) + (childrenOf[a.key] || []).reduce((s, c) => s + (usageCounts[c.key] || 0), 0);
    const ub = (usageCounts[b.key] || 0) + (childrenOf[b.key] || []).reduce((s, c) => s + (usageCounts[c.key] || 0), 0);
    return ub - ua;
  });
  const result = [];
  sorted.forEach(p => { result.push(p); (childrenOf[p.key] || []).forEach(c => result.push(c)); });
  return result;
}

export function userCategories(settings) {
  const custom = (settings && settings.customGastoCategories) || [];
  const subs = (settings && settings.customSubcategories) || {};
  const all = [...CATEGORIES.gasto, ...custom];
  const result = [];
  all.forEach(cat => {
    result.push(cat); (subs[cat] || []).forEach(sub => result.push(sub));
  });
  return result;
}

export function userCategoriesGrouped(settings) {
  const custom = (settings && settings.customGastoCategories) || [];
  const subs = (settings && settings.customSubcategories) || {};
  const all = [...CATEGORIES.gasto, ...custom];
  const result = [];
  all.forEach(cat => {
    const catSubs = subs[cat] || [];
    result.push({ key: cat, label: cat, color: categoryColor(cat), hasChildren: catSubs.length > 0 });
    catSubs.forEach(sub => result.push({ key: sub, label: sub, color: categoryColor(cat), isChild: true, parent: cat }));
  });
  return result;
}

export function totalLiquid(finance, currency = 'PEN') {
  if (!finance) return 0;
  const accounts = finance.accounts || [];
  const cards = finance.cards || [];
  const rootsCounted = new Set();
  let total = 0;

  accounts.forEach(a => {
    if (a.currency !== currency) return;
    const rootId = findRootAccId(accounts, a.id);
    if (!rootsCounted.has(rootId)) {
      const rootAcc = accounts.find(acc => acc.id === rootId);
      total += (rootAcc?.balance || 0);
      rootsCounted.add(rootId);
    }
  });

  // Tarjetas de débito independientes
  cards.forEach(c => {
    if (c.kind === 'debito' && !c.linkedTo && c.currency === currency) {
      total += (c.balance || 0);
    }
  });

  return total;
}

export function netWorth(finance, currency = 'PEN') {
  const liquid = totalLiquid(finance, currency);
  const creditUsed = (finance.cards || []).filter((c) => c.kind !== 'debito' && c.currency === currency).reduce((a, c) => a + (c.used || 0), 0);
  const debts = (finance.debts || []).filter(x => x.currency === currency).reduce((a, x) => a + Math.max(0, (x.amount || 0) - (x.paid || 0)), 0);
  const loans = (finance.loans || []).filter(x => x.currency === currency).reduce((a, x) => a + loanPending(x), 0);
  return liquid - creditUsed - debts - loans;
}
