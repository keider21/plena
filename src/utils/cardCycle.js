// Lógica del ciclo de una tarjeta de crédito para aprovechar el período sin intereses.
// Idea: comprar justo DESPUÉS del cierre da el máximo de días sin intereses;
// comprar cerca del cierre da muy pocos. Y conviene pagar antes de la fecha límite.
import { differenceInCalendarDays, getDaysInMonth } from 'date-fns';

const atDay = (y, m, day) => {
  const dim = getDaysInMonth(new Date(y, m, 1));
  return new Date(y, m, Math.min(day, dim));
};
const strip = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };

export function nextCutoff(from, cutoffDay) {
  const f = strip(from);
  let c = strip(atDay(f.getFullYear(), f.getMonth(), cutoffDay));
  if (c < f) c = strip(atDay(f.getFullYear(), f.getMonth() + 1, cutoffDay));
  return c;
}
export function prevCutoff(from, cutoffDay) {
  const f = strip(from);
  let c = strip(atDay(f.getFullYear(), f.getMonth(), cutoffDay));
  if (c > f) c = strip(atDay(f.getFullYear(), f.getMonth() - 1, cutoffDay));
  return c;
}
// Fecha de pago que corresponde a un cierre dado (siempre después del cierre)
export function payAfter(cutoffDate, payDay) {
  let p = strip(atDay(cutoffDate.getFullYear(), cutoffDate.getMonth(), payDay));
  if (p <= cutoffDate) p = strip(atDay(cutoffDate.getFullYear(), cutoffDate.getMonth() + 1, payDay));
  return p;
}
export function nextPay(from, payDay) {
  const f = strip(from);
  let p = strip(atDay(f.getFullYear(), f.getMonth(), payDay));
  if (p < f) p = strip(atDay(f.getFullYear(), f.getMonth() + 1, payDay));
  return p;
}

// Info de un día: qué tan bueno es comprar ese día + marcas de corte/pago.
export function dayInfo(date, card) {
  const cutoffDay = card.cutoffDay;
  const payDay = card.payDay;
  const d = strip(date);
  const nc = nextCutoff(d, cutoffDay);
  const pc = prevCutoff(d, cutoffDay);
  const cycleLen = Math.max(1, differenceInCalendarDays(nc, pc));
  const daysUntil = differenceInCalendarDays(nc, d); // días hasta el próximo cierre
  const ratio = daysUntil / cycleLen;               // más alto = más días de gracia = mejor
  const level = ratio >= 0.6 ? 'green' : ratio >= 0.3 ? 'yellow' : 'red';
  const dimD = getDaysInMonth(d);
  const isCorte = d.getDate() === Math.min(cutoffDay, dimD);
  const isPago = payDay ? d.getDate() === Math.min(payDay, dimD) : false;
  const freeDays = payDay ? differenceInCalendarDays(payAfter(nc, payDay), d) : 0;
  return { level, daysUntil, ratio, isCorte, isPago, freeDays };
}

export function recommendation(card, ref = new Date()) {
  const info = dayInfo(ref, card);
  if (info.level === 'green') {
    return { color: 'green', title: '✅ Buen momento para comprar', text: `Si compras hoy tendrías ~${info.freeDays} días sin intereses (pagas en la fecha de pago del próximo ciclo).` };
  }
  if (info.level === 'yellow') {
    return { color: 'yellow', title: '🟡 Momento intermedio', text: `Tendrías ~${info.freeDays} días sin intereses. Si puedes esperar, compra justo después del cierre para ganar más días.` };
  }
  return { color: 'red', title: '🔴 Evita comprar ahora', text: `El cierre es en ${info.daysUntil} día${info.daysUntil === 1 ? '' : 's'} y la compra se pagaría muy pronto. Conviene esperar al día después del cierre.` };
}
