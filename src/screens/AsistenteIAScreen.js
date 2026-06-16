import React, { useState, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { useStore } from '../store/useStore';
import { COLORS } from '../utils/theme';
import { formatMoney } from '../utils/currency';
import { goalProgress } from '../utils/goals';
import { APP_VERSION } from '../utils/version';
import { computePoints, levelFor, progressToNext } from '../utils/levels';

const EXAMPLES = [
  '¿Cuánto gasté este mes?',
  '¿Cómo van mis hábitos hoy?',
  '¿Cuánto me falta para pagar la tarjeta?',
  'Dame un consejo para hoy',
  '¿Qué pantallas tiene la app?',
  'Resumen general',
];

const WELCOME = {
  from: 'ia',
  text: `Hola 👋 Soy tu asistente. Conozco toda la app Vida Plena: finanzas, hábitos, metas, áreas, plan, mentalidad y más. Probá preguntarme algo o tocá un ejemplo abajo.`,
};

const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

// ─── HELPERS ────────────────────────────────────────────────
function top3Habits(store) {
  const habits = (store.habits || []).filter((h) => h.active);
  return habits.slice(0, 5).map((h) => {
    const streak = (store.getHabitStreak && store.getHabitStreak(h.id)) || 0;
    const today_s = store.habitLogs?.[h.id]?.[format(new Date(), 'yyyy-MM-dd')];
    const today_label = today_s === 'done' ? '✅' : today_s === 'missed' ? '❌' : '⏳';
    return { name: h.name, streak, today_label };
  });
}

function monthTxStats(store, monthPrefix) {
  const txs = store.finance?.transactions || [];
  const monthTxs = txs.filter((t) => (t.date || '').startsWith(monthPrefix));
  const ingresos = monthTxs.filter((t) => t.type === 'ingreso').reduce((a, t) => a + (t.amount || 0), 0);
  const gastos = monthTxs.filter((t) => t.type === 'gasto').reduce((a, t) => a + (t.amount || 0), 0);
  const pagos = monthTxs.filter((t) => t.type === 'pago').reduce((a, t) => a + (t.amount || 0), 0);
  return { ingresos, gastos, pagos, balance: ingresos - gastos - pagos, count: monthTxs.length };
}

// ─── BUILDER PRINCIPAL ─────────────────────────────────────
function buildAnswer(input, store) {
  const q = norm(input);
  const cur = store.settings?.currency || 'PEN';
  const today = new Date();
  const month = format(today, 'yyyy-MM');
  const lastMonth = format(subMonths(today, 1), 'yyyy-MM');
  const monthName = format(today, "LLLL", { locale: es });
  const lastMonthName = format(subMonths(today, 1), "LLLL", { locale: es });

  // 1) SALUDOS
  if (/\b(hola|buenos|buenas|hi|hello|que tal|hey)\b/.test(q)) {
    const hour = today.getHours();
    const g = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches';
    return { text: `${g} 👋 ¿En qué te ayudo hoy?` };
  }

  if (/\b(gracias|thanks|thx)\b/.test(q)) {
    return { text: 'De nada 🪶. Acá estoy para lo que necesites.' };
  }

  // 2) ¿QUÉ PUEDES HACER / HELP / APP / PANTALLAS / FEATURES
  if (/(que puedes|que sabes|help|ayuda|que hace|que hace esta app|que es vida plena|que tiene|pantallas?|tutorial|como funciona|app)/.test(q)) {
    return {
      text: `📱 **Vida Plena** tiene estas pantallas (abajo en la barra):\n\n` +
        `🏠 **Inicio** — balance del mes, hábitos de hoy, búsqueda de movimientos\n` +
        `📅 **Plan** — tu planificación semanal con bloques (trabajo, estudio, gym…)\n` +
        `🔁 **Hábitos** — crear hábitos, ver rachas 🔥, marcar como hecho\n` +
        `⭐ **Metas** — objetivos a corto/mediano/largo plazo con progreso\n` +
        `🌿 **Áreas** — áreas de vida (salud, carrera, relaciones…) con descripción\n` +
        `💰 **Finanzas** — registrar gastos, ingresos, pagos, tarjetas, deudas, préstamos, presupuestos\n` +
        `✨ **IA** — este chat asistente (yo 🪶)\n` +
        `👤 **Perfil** — moneda, tema oscuro/claro, exportar CSV, cerrar sesión, categorías personalizadas\n\n` +
        `Otras pantallas internas:\n` +
        `🔐 Permisos y notificaciones\n` +
        `🧠 Mentalidad (editor de afirmaciones y reflexiones)\n` +
        `🎯 Asistente de metas (wizard)\n\n` +
        `Preguntame lo que quieras de cualquiera.`,
    };
  }

  // 3) VERSIÓN
  if (/(version|que version|v\d|cual es la version)/.test(q)) {
    return { text: `Estás en la versión **v${APP_VERSION}** de Vida Plena 🪶. Tocá "Perfil" → "Versión" para ver el changelog completo.` };
  }

  // 4) GASTOS DEL MES
  if (/(cuanto.*(gaste|gasto)|gastos? del mes|lo que gaste|lo que llevo gastado)/.test(q)) {
    const txs = store.finance?.transactions || [];
    const monthTxs = txs.filter((t) => (t.date || '').startsWith(month) && t.type === 'gasto');
    const total = monthTxs.reduce((a, t) => a + (t.amount || 0), 0);
    const byCat = {};
    for (const t of monthTxs) {
      const k = t.category || 'Otros';
      byCat[k] = (byCat[k] || 0) + (t.amount || 0);
    }
    const top = Object.entries(byCat).sort((a, b) => b[1] - a[1]).slice(0, 3);
    return {
      text: `En ${monthName} llevás **${formatMoney(total, cur)}** en gastos.\n\n` +
        (top.length > 0
          ? `Top categorías:\n${top.map(([c, a], i) => `${i + 1}. ${c}: ${formatMoney(a, cur)}`).join('\n')}`
          : '— sin gastos registrados aún —'),
    };
  }

  // 5) INGRESOS DEL MES
  if (/(cuanto.*(ingrese|ingreso|entre)|ingresos? del mes)/.test(q)) {
    const stats = monthTxStats(store, month);
    return {
      text: `En ${monthName} recibiste **${formatMoney(stats.ingresos, cur)}** en ingresos. ${stats.ingresos > 0 ? '¡Bien! 👏' : 'Aún no registrás ingresos este mes.'}`,
    };
  }

  // 6) BALANCE
  if (/(balance|cuanto.*(tengo|sobra|queda)|libre|del mes)/i.test(q)) {
    const stats = monthTxStats(store, month);
    const bal = stats.balance;
    return {
      text: `Tu balance de ${monthName}: **${bal >= 0 ? '+' : ''}${formatMoney(bal, cur)}**\n\n` +
        `Ingresos: ${formatMoney(stats.ingresos, cur)}\nGastos: ${formatMoney(stats.gastos, cur)}\nPagos: ${formatMoney(stats.pagos, cur)}\n\n` +
        (bal >= 0 ? 'Vas positivo este mes 💪' : 'Vas en negativo, ojo ⚠️'),
    };
  }

  // 7) AHORRO VS MES PASADO
  if (/(cuanto.*ahorr|ahorr[eo]|mes pasado|comparacion)/.test(q)) {
    const curStart = startOfMonth(today);
    const curEnd = endOfMonth(today);
    const lastStart = startOfMonth(subMonths(today, 1));
    const lastEnd = endOfMonth(subMonths(today, 1));
    const sum = (start, end) =>
      (store.finance?.transactions || []).filter((t) => {
        const d = t.date;
        return d && d >= format(start, 'yyyy-MM-dd') && d <= format(end, 'yyyy-MM-dd');
      }).reduce((acc, t) => {
        if (t.type === 'ingreso') return acc + (t.amount || 0);
        if (t.type === 'gasto' || t.type === 'pago') return acc - (t.amount || 0);
        return acc;
      }, 0);
    const curSav = sum(curStart, curEnd);
    const lastSav = sum(lastStart, lastEnd);
    const diff = curSav - lastSav;
    const arrow = diff >= 0 ? '↑' : '↓';
    return {
      text: `Este mes llevás **${formatMoney(curSav, cur)}** de balance.\n` +
        `El mes pasado fue **${formatMoney(lastSav, cur)}**.\n\n` +
        `${arrow} ${diff >= 0 ? 'mejor' : 'peor'} por **${formatMoney(Math.abs(diff), cur)}** vs ${lastMonthName}.`,
    };
  }

  // 8) TARJETAS / CRÉDITO
  if (/(tarjeta|cuanto.*(debo|falta).*pagar|credito|deuda(s)? tarjeta)/.test(q)) {
    const cards = store.finance?.cards || [];
    const credit = cards.filter((c) => c.kind !== 'debito');
    if (credit.length === 0) return { text: 'No tenés tarjetas de crédito registradas. Agregá una en **Finanzas** → "+" → "Tarjeta de crédito".' };
    const lines = credit.map((c) => {
      const used = c.used || 0;
      const limit = c.limit || 0;
      const pct = limit > 0 ? Math.round((used / limit) * 100) : 0;
      return `• **${c.bank}**: debes ${formatMoney(used, c.currency || cur)} de ${formatMoney(limit, c.currency || cur)} (${pct}%)`;
    });
    return { text: `Tus tarjetas de crédito:\n\n${lines.join('\n')}\n\nTocá una tarjeta en Finanzas para ver el detalle, pagar o ver el historial.` };
  }

  // 9) HÁBITOS
  if (/(habito|como van|como voy|streak|racha|que hice hoy)/.test(q)) {
    const habits = (store.habits || []).filter((h) => h.active);
    if (habits.length === 0) return { text: 'No tenés hábitos activos. Andá a **Hábitos** y creá algunos (o usá el Wizard de bienvenida).' };
    const top = top3Habits(store);
    const stats = store.getTodayStats ? store.getTodayStats() : { done: 0, total: habits.length };
    return {
      text: `Hoy llevás **${stats.done}/${stats.total} hábitos hechos**.\n\n` +
        `Tus hábitos:\n${top.map((h) => `• ${h.name} — ${h.streak}🔥 ${h.today_label}`).join('\n')}\n\n` +
        `Tocá un hábito en la pestaña Hábitos para marcarlo como hecho.`,
    };
  }

  // 10) METAS
  if (/(meta|objetivo|progress|como van mis metas)/.test(q)) {
    const goals = store.goals || [];
    if (goals.length === 0) return { text: 'No tenés metas todavía. Andá a **Metas** y tocá "+" para crear una (o usá el Asistente de metas).' };
    const lines = goals.slice(0, 5).map((g) => {
      const pct = goalProgress(g);
      const due = g.dueDate ? ` (vence ${g.dueDate})` : '';
      return `• **${g.title}**: ${pct === null ? '— sin avance' : pct + '%'}${due}`;
    });
    return { text: `Tus metas:\n\n${lines.join('\n')}\n\nTocá una meta para ver detalle o registrar avance.` };
  }

  // 11) ÁREAS
  if (/(area|areas de vida)/.test(q)) {
    const areas = store.areas || [];
    if (areas.length === 0) return { text: 'No tenés áreas creadas. Andá a **Áreas** y agregá las áreas de tu vida (salud, carrera, relaciones, etc.).' };
    const lines = areas.slice(0, 8).map((a) => `• **${a.name}** — ${a.habitsCount || 0} hábitos`);
    return { text: `Tus áreas de vida:\n\n${lines.join('\n')}\n\nTocá un área para ver sus hábitos o agregar nuevos.` };
  }

  // 12) DEUDAS / PRÉSTAMOS
  if (/(deuda|deudas|prestamo|prestamos)/.test(q)) {
    const debts = store.finance?.debts || [];
    const loans = store.finance?.loans || [];
    if (debts.length === 0 && loans.length === 0) {
      return { text: 'No tenés deudas ni préstamos registrados. Podés agregarlos en **Finanzas** → "+" → "Deuda" o "Préstamo".' };
    }
    const dLines = debts.map((d) => `• Deuda con **${d.creditor || d.name}**: ${formatMoney(d.amount, cur)}`);
    const lLines = loans.map((l) => `• Préstamo **${l.name}**: ${formatMoney(l.amount, cur)} ${l.installments ? `(${l.installments} cuotas)` : ''}`);
    return { text: `${dLines.length > 0 ? '💸 Deudas:\n' + dLines.join('\n') + '\n\n' : ''}${lLines.length > 0 ? '🏦 Préstamos:\n' + lLines.join('\n') : ''}` };
  }

  // 13) PRESUPUESTO
  if (/(presupuesto|presup|budget|cuanto.*asignado|cuanto.*presupuesto)/.test(q)) {
    const budgets = store.finance?.budgets || [];
    if (budgets.length === 0) return { text: 'No tenés presupuestos configurados. En **Finanzas** podés crear uno por categoría.' };
    const lines = budgets.slice(0, 6).map((b) => {
      const used = b.used || 0;
      const total = b.amount || 0;
      const pct = total > 0 ? Math.round((used / total) * 100) : 0;
      return `• **${b.category}**: ${formatMoney(used, cur)} / ${formatMoney(total, cur)} (${pct}%)`;
    });
    return { text: `Tus presupuestos:\n\n${lines.join('\n')}` };
  }

  // 14) CÓMO REGISTRAR GASTO
  if (/(como.*(registro|agrego|anoto|pongo).*(gasto|movimiento)|como.*registrar|como.*anotar)/.test(q)) {
    return {
      text: `Para registrar un gasto tenés 3 formas:\n\n` +
        `1️⃣ **Botón "+"** flotante en la pantalla de Inicio (el más rápido)\n` +
        `2️⃣ Pestaña **Finanzas** → "+" → elegir tipo (Gasto, Ingreso, Pago, etc.)\n` +
        `3️⃣ Decirmelo a mí: "registrá un gasto de 50 en comida"\n\n` +
        `El gasto queda guardado con fecha, categoría y nota.`,
    };
  }

  // 15) TEMA / MODO OSCURO
  if (/(modo oscuro|tema oscuro|claro|oscuro|theme|modo claro)/.test(q)) {
    const curTheme = store.settings?.themeMode || 'dark';
    return { text: `Estás en modo **${curTheme === 'dark' ? '🌙 Oscuro' : '☀️ Claro'}**.\n\nPara cambiarlo: **Perfil** → "Apariencia" → Claro / Oscuro.` };
  }

  // 16) MONEDA
  if (/(moneda|cambio de moneda|dolares|soles|currency|divisa)/.test(q)) {
    return { text: `Tu moneda actual es **${cur}**.\n\nPara cambiarla: **Perfil** → "Moneda" → tocá la que quieras (soporta varias, los totales se reformatean solos).` };
  }

  // 17) EXPORTAR / CSV / RESPALDO
  if (/(exportar|export|csv|respaldo|backup|descargar)/.test(q)) {
    return {
      text: `Para exportar todos tus movimientos a CSV (Excel):\n\n` +
        `**Perfil** → "Exportar movimientos (CSV)" → se genera un archivo con todas las transacciones, listo para abrir en Excel o Google Sheets.\n\n` +
        `Sirve como respaldo o para trabajar los números en otro lado.`,
    };
  }

  // 18) NOTIFICACIONES / PERMISOS
  if (/(notificacion|notif|permiso|recordatorio|alarma)/.test(q)) {
    return { text: `Para configurar recordatorios:\n\n**Perfil** → "Notificaciones y permisos" → activá las que quieras (hábitos, pagos de tarjeta, etc.).\n\nSi no te llegan, también podés revisar los permisos de Android en Ajustes del sistema.` };
  }

  // 19) CERRAR SESIÓN
  if (/(cerrar sesion|salir|logout|cerrar la cuenta)/.test(q)) {
    return { text: `Para cerrar sesión: **Perfil** → "Cerrar sesión" (botón rojo al final). Te pide confirmación. Tus datos quedan guardados, solo cerrás la sesión actual.` };
  }

  // 20) CATEGORÍAS PERSONALIZADAS
  if (/(categoria|categorias|agregar.*categoria|categoria.*nueva)/.test(q)) {
    return { text: `Podés crear categorías de gasto personalizadas (Taxi, Mascotas, Gym, etc.):\n\n**Perfil** → "Categorías de gasto personalizadas" → escribí el nombre → "Agregar".\n\nAparecen al lado de las predeterminadas cuando registrás un gasto.` };
  }

  // 21) PLAN / PLANNING / BLOQUES
  if (/(plan|planning|bloque|bloqu|horario|agenda|semanal)/.test(q)) {
    return {
      text: `La pestaña **Plan** es tu organizador semanal:\n\n` +
        `• Creás bloques de tiempo (trabajo, estudio, gym, cena, dormir…)\n` +
        `• Bloques fijos: se repiten cada día/semana\n` +
        `• Huecos libres: la app te sugiere qué meter según tus hábitos y metas\n` +
        `• Tocá un bloque para editarlo (inicio, fin, nota)\n\n` +
        `Si arrancás de cero, usá el Wizard (botón mágico en Plan).`,
    };
  }

  // 22) MENTALIDAD / AFIRMACIONES
  if (/(mentalidad|afirmacion|afirmaciones|reflexion|journal)/.test(q)) {
    return { text: `La pantalla **Mentalidad** te permite escribir afirmaciones y reflexiones diarias. Se guarda todo y podés releerlo cuando quieras. Es como un mini-diario para entrenar la cabeza 🧠.` };
  }

  // 23) RESUMEN / DASHBOARD / ESTADO GENERAL
  if (/(resumen|estado general|como voy|como estoy|que tal voy|que tal estoy|panorama)/.test(q)) {
    const stats = monthTxStats(store, month);
    const todayStats = store.getTodayStats ? store.getTodayStats() : { done: 0, total: 0 };
    const goals = store.goals || [];
    const cards = (store.finance?.cards || []).filter((c) => c.kind !== 'debito');
    return {
      text: `📊 **Tu panorama de hoy**\n\n` +
        `💰 Balance del mes: **${formatMoney(stats.balance, cur)}**\n` +
        `   (ingresos ${formatMoney(stats.ingresos, cur)} / gastos ${formatMoney(stats.gastos, cur)})\n\n` +
        `🔁 Hábitos hoy: **${todayStats.done}/${todayStats.total}**\n` +
        `⭐ Metas activas: **${goals.length}**\n` +
        `💳 Tarjetas de crédito: **${cards.length}**\n\n` +
        `Preguntame detalles de cualquier cosa.`,
    };
  }

  // 24) CONSEJOS / TIPS
  if (/(consejo|sugerencia|que hago|recomend|que deberia|que me recomendas)/.test(q)) {
    const tips = [];
    const txs = store.finance?.transactions || [];
    const monthGastos = txs.filter((t) => (t.date || '').startsWith(month) && t.type === 'gasto');
    if (monthGastos.length === 0) tips.push('💸 Este mes no registrás gastos. Anotá todo lo que salga, así sabés en qué se va tu plata.');
    const habits = (store.habits || []).filter((h) => h.active);
    const habitLogs = store.habitLogs || {};
    const weakHabit = habits.find((h) => habitLogs[h.id]?.[format(today, 'yyyy-MM-dd')] === 'missed');
    if (weakHabit) tips.push(`💪 El hábito "${weakHabit.name}" se te escapó hoy. Si tenés un momento, anotalo igual.`);
    const cards = store.finance?.cards || [];
    const hotCard = cards.find((c) => c.kind !== 'debito' && c.limit > 0 && ((c.used || 0) / c.limit) >= 0.8);
    if (hotCard) tips.push(`⚠️ Tu tarjeta ${hotCard.bank} está al ${Math.round(((hotCard.used || 0) / hotCard.limit) * 100)}%. Si podés, no la uses este mes.`);
    const goals = store.goals || [];
    const goalLow = goals.find((g) => { const p = goalProgress(g); return p !== null && p < 50; });
    if (goalLow) tips.push(`🎯 Tu meta "${goalLow.title}" está al ${goalProgress(goalLow)}%. Un pasito más hoy.`);
    const todayStats = store.getTodayStats ? store.getTodayStats() : { done: 0, total: habits.length };
    if (todayStats.total > 0 && todayStats.done < todayStats.total) {
      tips.push(`🔥 Te faltan ${todayStats.total - todayStats.done} hábitos hoy. Arrancá por el más fácil para no perder la racha.`);
    }
    if (tips.length === 0) tips.push('✨ Todo va bien. Mantenete así, un día a la vez.');
    return { text: tips.join('\n\n') };
  }

  // 25) RACHAS
  if (/(racha|streak|dias seguidos)/.test(q)) {
    const habits = (store.habits || []).filter((h) => h.active);
    if (habits.length === 0) return { text: 'No tenés hábitos activos todavía.' };
    const ranked = habits.map((h) => ({ name: h.name, streak: (store.getHabitStreak && store.getHabitStreak(h.id)) || 0 }))
      .sort((a, b) => b.streak - a.streak).slice(0, 3);
    return {
      text: `🔥 **Top rachas**:\n\n` +
        ranked.map((h, i) => `${i + 1}. ${h.name}: **${h.streak} días** seguidos`).join('\n') +
        `\n\nLas rachas se cortan si no marcás el hábito un día. ¡Cuidalas!`,
    };
  }

  // 26) NIVELES / PUNTOS / EXPERIENCIA
  if (/(nivel|niveles|puntos|experiencia|xp|ranking|que nivel|medalla|bronce|plata|oro|platino|diamante|leyenda|maestro)/.test(q)) {
    const pts = computePoints(store);
    const lvl = levelFor(pts.total);
    const prog = progressToNext(pts.total);
    const br = pts.breakdown;
    return {
      text: `🏆 **Tu nivel: ${lvl.name}** (${pts.total} pts)\n\n` +
        `Cómo se calculan tus puntos:\n` +
        `• Hábitos: +5 por hecho, +bonus por racha, -3 por no hacerlo\n` +
        `• Finanzas: +3 por movimiento del día, +15 por cada pago de deuda/tarjeta\n` +
        `• Plan: +8 por bloque cumplido a horario, -5 si hiciste menos de la mitad\n` +
        `• Inactividad: -10 si llevás 7+ días sin registrar nada\n\n` +
        `Hoy:\n` +
        `• Hábitos: ${br.habits.done} hechos / ${br.habits.missed} fallados → ${br.habits.points >= 0 ? '+' : ''}${br.habits.points} pts\n` +
        `• Movimientos hoy: ${br.transactions.count} → +${br.transactions.points} pts\n` +
        `• Pagos recientes: ${br.transactions.payments} → +${br.transactions.paymentPts} pts\n` +
        `• Plan: ${br.plan.completed}/${br.plan.total} bloques → ${br.plan.points >= 0 ? '+' : ''}${br.plan.points} pts\n\n` +
        (prog.next
          ? `Faltan **${prog.remaining} pts** para subir a ${prog.next.name}.`
          : `¡Estás en el nivel máximo! 👑`) +
        `\n\nLo ves en **Perfil** (la card grande arriba con tu medalla).`,
    };
  }

  // 27) FALLBACK
  return {
    text: `Mmm, no estoy seguro de qué preguntaste 🤔\n\n` +
      `Puedo ayudarte con: gastos, ingresos, balance, tarjetas, hábitos, rachas, metas, áreas, deudas, préstamos, presupuestos, plan semanal, mentalidad, tema oscuro/claro, moneda, exportar CSV, notificaciones, cerrar sesión, consejos personalizados…\n\n` +
      `Decime algo como:\n• "resumen del mes"\n• "cómo van mis hábitos"\n• "qué pantallas tiene la app"\n• "dame un consejo"`,
  };
}

export default function AsistenteIAScreen() {
  const store = useStore();
  const [messages, setMessages] = useState([WELCOME]);
  const [text, setText] = useState('');
  const [ratings, setRatings] = useState({});
  const scrollRef = useRef(null);

  const send = (msg) => {
    const t = (msg ?? text).trim();
    if (!t) return;
    Haptics.selectionAsync().catch(() => {});
    const convId = `ia_${Date.now()}`;
    const answer = buildAnswer(t, store);
    const userMsg = { from: 'user', text: t };
    const iaMsg = { from: 'ia', text: answer.text, convId };
    setMessages((m) => [...m, userMsg, iaMsg]);
    setText('');
    store.saveAiConversation({ id: convId, question: t, answer: answer.text });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const rate = (convId, value) => {
    setRatings(r => ({ ...r, [convId]: value }));
    store.rateAiConversation(convId, value);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  };

  const voice = () => Alert.alert('Voz en desarrollo', 'El dictado por voz necesita un módulo nativo. Lo activaremos con un development build más adelante.');

  const renderText = (txt) => {
    // Renderiza **negrita** simple
    const parts = txt.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((p, i) => {
      if (/^\*\*[^*]+\*\*$/.test(p)) {
        return <Text key={i} style={{ fontWeight: '800' }}>{p.slice(2, -2)}</Text>;
      }
      return <Text key={i}>{p}</Text>;
    });
  };

  return (
    <View style={styles.bg}>
      <View style={styles.hero}>
        <View style={styles.heroRow}>
          <View style={styles.heroIcon}><Ionicons name="sparkles" size={20} color="#fff" /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>Asistente IA</Text>
            <Text style={styles.heroSub}>Tu copiloto dentro de Vida Plena</Text>
          </View>
          <View style={styles.versionChip}>
            <Text style={styles.versionChipText}>v{APP_VERSION}</Text>
          </View>
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={styles.chat} showsVerticalScrollIndicator={false}>
          {messages.map((m, i) => (
            <View key={i} style={m.from === 'ia' ? { alignSelf: 'flex-start', maxWidth: '88%' } : null}>
              <View style={[styles.bubble, m.from === 'user' ? styles.bubbleUser : styles.bubbleIA]}>
                <Text style={[styles.bubbleText, m.from === 'user' && { color: '#fff' }]}>
                  {renderText(m.text)}
                </Text>
              </View>
              {m.from === 'ia' && m.convId && (
                <View style={styles.feedbackRow}>
                  <TouchableOpacity onPress={() => rate(m.convId, 'up')} style={[styles.feedbackBtn, ratings[m.convId] === 'up' && styles.feedbackBtnOn]}>
                    <Ionicons name={ratings[m.convId] === 'up' ? 'thumbs-up' : 'thumbs-up-outline'} size={14} color={ratings[m.convId] === 'up' ? COLORS.green : COLORS.textMuted} />
                    <Text style={[styles.feedbackTxt, ratings[m.convId] === 'up' && { color: COLORS.green }]}>Útil</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => rate(m.convId, 'down')} style={[styles.feedbackBtn, ratings[m.convId] === 'down' && { ...styles.feedbackBtnOn, borderColor: COLORS.red + '55' }]}>
                    <Ionicons name={ratings[m.convId] === 'down' ? 'thumbs-down' : 'thumbs-down-outline'} size={14} color={ratings[m.convId] === 'down' ? COLORS.red : COLORS.textMuted} />
                    <Text style={[styles.feedbackTxt, ratings[m.convId] === 'down' && { color: COLORS.red }]}>Incorrecta</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))}

          {messages.length <= 1 && (
            <View style={styles.examples}>
              <Text style={styles.examplesTitle}>💡 Probá con:</Text>
              {EXAMPLES.map((ex) => (
                <TouchableOpacity key={ex} style={styles.exChip} onPress={() => send(ex)}>
                  <Ionicons name="arrow-up-circle-outline" size={16} color={COLORS.purpleLight} />
                  <Text style={styles.exText}>{ex}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>

        <View style={styles.inputBar}>
          <TouchableOpacity style={styles.micBtn} onPress={voice}><Ionicons name="mic-outline" size={22} color={COLORS.purpleLight} /></TouchableOpacity>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="Preguntame algo…"
            placeholderTextColor={COLORS.textMuted}
            onSubmitEditing={() => send()}
            returnKeyType="send"
            multiline
          />
          <TouchableOpacity style={styles.sendBtn} onPress={() => send()}><Ionicons name="send" size={18} color="#fff" /></TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: COLORS.bg },
  hero: { padding: 20, paddingTop: 54, backgroundColor: COLORS.bg, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  heroIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: COLORS.purple, alignItems: 'center', justifyContent: 'center' },
  heroTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  heroSub: { fontSize: 12, color: COLORS.purpleLight, marginTop: 2 },
  versionChip: { backgroundColor: COLORS.purpleDim, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  versionChipText: { fontSize: 11, color: COLORS.purpleLight, fontWeight: '700' },
  chat: { padding: 16, gap: 10, paddingBottom: 20 },
  bubble: { maxWidth: '88%', borderRadius: 16, padding: 12 },
  bubbleIA: { backgroundColor: COLORS.card, alignSelf: 'flex-start', borderWidth: 0.5, borderColor: COLORS.cardBorder },
  bubbleUser: { backgroundColor: COLORS.purple, alignSelf: 'flex-end' },
  bubbleText: { fontSize: 14, color: COLORS.text, lineHeight: 21 },
  examples: { marginTop: 16, gap: 8 },
  examplesTitle: { fontSize: 12, color: COLORS.textSub, marginBottom: 2 },
  exChip: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.bg2, borderRadius: 12, padding: 12, borderWidth: 0.5, borderColor: COLORS.cardBorder },
  exText: { flex: 1, fontSize: 13, color: COLORS.textSub },
  feedbackRow: { flexDirection: 'row', gap: 6, marginTop: 4, paddingLeft: 2 },
  feedbackBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, backgroundColor: COLORS.card, borderWidth: 0.5, borderColor: COLORS.cardBorder },
  feedbackBtnOn: { borderColor: COLORS.green + '55', backgroundColor: COLORS.greenDim },
  feedbackTxt: { fontSize: 11, color: COLORS.textMuted },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: COLORS.bg2, borderTopWidth: 0.5, borderTopColor: COLORS.cardBorder },
  micBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: COLORS.card, alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: COLORS.cardBorder },
  input: { flex: 1, maxHeight: 110, backgroundColor: COLORS.card, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, color: COLORS.text, fontSize: 15, borderWidth: 0.5, borderColor: COLORS.cardBorder },
  sendBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: COLORS.purple, alignItems: 'center', justifyContent: 'center' },
});
