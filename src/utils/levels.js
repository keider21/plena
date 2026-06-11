// Sistema de niveles y puntos de Vida Plena.
// Los puntos se calculan en base a los datos del store (hábitos, finanzas, plan).
import { format, subDays, differenceInDays } from 'date-fns';

export const LEVELS = [
  { name: 'Bronce', min: 0, max: 99, icon: 'medal-outline', color: '#CD7F32' },
  { name: 'Plata', min: 100, max: 249, icon: 'medal-outline', color: '#C0C0C0' },
  { name: 'Oro', min: 250, max: 499, icon: 'trophy-outline', color: '#FFD700' },
  { name: 'Platino', min: 500, max: 999, icon: 'diamond-outline', color: '#7DD3FC' },
  { name: 'Diamante', min: 1000, max: 1999, icon: 'diamond', color: '#22D3EE' },
  { name: 'Leyenda', min: 2000, max: 3999, icon: 'trophy', color: '#F472B6' },
  { name: 'Maestro', min: 4000, max: Infinity, icon: 'ribbon', color: '#A78BFA' },
];

export function levelFor(points) {
  const p = Math.max(0, points || 0);
  return LEVELS.find((l) => p >= l.min && p <= l.max) || LEVELS[0];
}

export function nextLevel(points) {
  const p = Math.max(0, points || 0);
  return LEVELS.find((l) => p < l.min) || null; // null = tope
}

export function progressToNext(points) {
  const p = Math.max(0, points || 0);
  const nxt = nextLevel(p);
  const cur = levelFor(p);
  if (!nxt) return { pct: 100, remaining: 0, current: cur, next: null };
  const span = nxt.min - cur.min;
  const into = p - cur.min;
  const pct = Math.min(100, Math.max(0, Math.round((into / span) * 100)));
  const remaining = nxt.min - p;
  return { pct, remaining, current: cur, next: nxt };
}

// ─── Cálculo de puntos a partir del store ───────────────────
export function computePoints(store) {
  const today = new Date();
  const todayKey = format(today, 'yyyy-MM-dd');
  const weekAgo = subDays(today, 7);
  const weekAgoKey = format(weekAgo, 'yyyy-MM-dd');

  const habits = (store.habits || []).filter((h) => h.active);
  const habitLogs = store.habitLogs || {};
  const txs = store.finance?.transactions || [];

  // --- Hábitos hoy ---
  let habitDone = 0;
  let habitMissed = 0;
  let habitPending = 0;
  let streakBonus = 0;
  for (const h of habits) {
    const s = habitLogs[h.id]?.[todayKey];
    if (s === 'done') habitDone++;
    else if (s === 'missed') habitMissed++;
    else habitPending++;

    const streak = (store.getHabitStreak && store.getHabitStreak(h.id)) || 0;
    if (streak >= 3) streakBonus += Math.min(streak, 30); // tope 30 pts por hábito
  }
  const habitPts = habitDone * 5 + streakBonus - habitMissed * 3;

  // --- Finanzas hoy (últimos 7 días sumados, con tope) ---
  const recent = txs.filter((t) => (t.date || '') >= weekAgoKey);
  const txToday = txs.filter((t) => t.date === todayKey);
  const txPtsRaw = txToday.length * 3;
  const txPts = Math.min(txPtsRaw, 30); // tope diario 30 pts

  // Pagos (tarjeta/deuda/préstamo) en los últimos 7 días
  const recentPayments = recent.filter((t) => t.type === 'pago' || t.category === 'Deudas').length;
  const paymentPts = Math.min(recentPayments * 15, 60);

  // Castigo por inactividad (sin movimientos en 7+ días)
  const lastTx = txs.length > 0 ? txs[0].date : null;
  let inactivityPts = 0;
  if (!lastTx) {
    inactivityPts = -10; // nunca registró
  } else {
    const lastDate = new Date(lastTx);
    const diff = differenceInDays(today, lastDate);
    if (diff >= 7) inactivityPts = -10;
    else if (diff >= 3) inactivityPts = -3;
  }

  // --- Plan (bloques completados hoy) ---
  const dayPlans = store.planning?.dayPlans || {};
  const todayBlocks = dayPlans[todayKey] || [];
  const completedBlocks = todayBlocks.filter((b) => b.status === 'done' || b.completed).length;
  const planTotal = todayBlocks.length;
  let planPts = 0;
  if (planTotal > 0) {
    planPts = completedBlocks * 8;
    const ratio = completedBlocks / planTotal;
    if (ratio < 0.5) planPts -= 5; // castigo si hiciste menos de la mitad
  }

  const total =
    habitPts +
    txPts +
    paymentPts +
    planPts +
    inactivityPts;

  return {
    total: Math.max(0, Math.round(total)),
    breakdown: {
      habits: { done: habitDone, missed: habitMissed, pending: habitPending, points: habitPts },
      transactions: { count: txToday.length, points: txPts, payments: recentPayments, paymentPts },
      plan: { completed: completedBlocks, total: planTotal, points: planPts },
      inactivity: { daysSince: lastTx ? differenceInDays(today, new Date(lastTx)) : null, points: inactivityPts },
    },
  };
}
