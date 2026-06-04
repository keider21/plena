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

// Color único y consistente por categoría (para todos los gráficos)
const CAT_COLOR_MAP = {
  'Alimentación': '#10B981', 'Transporte': '#0EA5E9', 'Vivienda': '#7C3AED', 'Servicios': '#6366F1',
  'Salud': '#EF4444', 'Educación': '#F59E0B', 'Entretenimiento': '#EC4899', 'Ropa': '#14B8A6',
  'Deudas': '#F97316', 'Otros': '#8B8AA8',
  'Sueldo': '#10B981', 'Negocio': '#7C3AED', 'Freelance': '#0EA5E9', 'Venta': '#F59E0B', 'Regalo': '#EC4899',
};
const CAT_PALETTE = ['#7C3AED', '#10B981', '#0EA5E9', '#F59E0B', '#EC4899', '#6366F1', '#14B8A6', '#EF4444', '#F97316', '#A78BFA'];
export function categoryColor(name) {
  if (CAT_COLOR_MAP[name]) return CAT_COLOR_MAP[name];
  let h = 0;
  const s = name || '';
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return CAT_PALETTE[h % CAT_PALETTE.length];
}

export const PERIODS = [
  { key: 'dia', label: 'Día' },
  { key: 'semana', label: 'Semana' },
  { key: 'mes', label: 'Mes' },
  { key: 'trimestre', label: 'Trim.' },
  { key: 'anio', label: 'Año' },
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

export function financeStats(transactions, period, ref = new Date()) {
  const [s, e] = periodRange(period, ref);
  const inRange = (transactions || []).filter((t) => {
    try { const d = parseISO(t.date); return d >= s && d <= e; } catch { return false; }
  });
  const ingresos = inRange.filter((t) => t.type === 'ingreso').reduce((a, t) => a + t.amount, 0);
  const gastos = inRange.filter((t) => t.type === 'gasto').reduce((a, t) => a + t.amount, 0);
  const byCategory = {};
  inRange.filter((t) => t.type === 'gasto').forEach((t) => {
    const c = t.category || 'Otros';
    byCategory[c] = (byCategory[c] || 0) + t.amount;
  });
  return { ingresos, gastos, balance: ingresos - gastos, ahorro: Math.max(0, ingresos - gastos), byCategory, count: inRange.length };
}

export function loanPending(loan) {
  const remaining = Math.max(0, (loan.installmentsTotal || 0) - (loan.installmentsPaid || 0));
  return remaining * (loan.installment || 0);
}

export function netWorth(finance) {
  const accounts = (finance.accounts || []).reduce((a, x) => a + (x.balance || 0), 0);
  const debitBal = (finance.cards || []).filter((c) => c.kind === 'debito').reduce((a, c) => a + (c.balance || 0), 0);
  const creditUsed = (finance.cards || []).filter((c) => c.kind !== 'debito').reduce((a, c) => a + (c.used || 0), 0);
  const debts = (finance.debts || []).reduce((a, x) => a + Math.max(0, (x.amount || 0) - (x.paid || 0)), 0);
  const loans = (finance.loans || []).reduce((a, x) => a + loanPending(x), 0);
  return accounts + debitBal - creditUsed - debts - loans;
}
