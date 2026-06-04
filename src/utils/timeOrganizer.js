// Organizador de tiempo — "IA" local por reglas.
// A partir del horario del usuario calcula los bloques libres del día
// y sugiere dónde colocar sus actividades. Todo determinístico, sin internet.

export const WEEKDAYS = [
  { n: 1, short: 'L', label: 'Lunes' },
  { n: 2, short: 'M', label: 'Martes' },
  { n: 3, short: 'X', label: 'Miércoles' },
  { n: 4, short: 'J', label: 'Jueves' },
  { n: 5, short: 'V', label: 'Viernes' },
  { n: 6, short: 'S', label: 'Sábado' },
  { n: 0, short: 'D', label: 'Domingo' },
];

export const PREFERENCES = [
  { value: 'manana', label: 'Mañana', from: 0, to: 720 },
  { value: 'tarde', label: 'Tarde', from: 720, to: 1080 },
  { value: 'noche', label: 'Noche', from: 1080, to: 1440 },
  { value: 'cualquiera', label: 'Cualquiera', from: 0, to: 1440 },
];

export const toMin = (t) => {
  if (!t || typeof t !== 'string') return 0;
  const [h, m] = t.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

export const toTime = (min) => {
  let v = Math.round(min);
  v = ((v % 1440) + 1440) % 1440;
  const h = Math.floor(v / 60);
  const m = v % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

export const minutesToLabel = (min) => {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
};

function mergeIntervals(intervals) {
  if (!intervals.length) return [];
  const sorted = [...intervals].sort((a, b) => a.start - b.start);
  const out = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const last = out[out.length - 1];
    if (sorted[i].start <= last.end) {
      last.end = Math.max(last.end, sorted[i].end);
    } else {
      out.push({ ...sorted[i] });
    }
  }
  return out;
}

// Devuelve los bloques ocupados (con etiqueta) para un día de la semana
export function getBusyBlocks(schedule, weekday) {
  if (!schedule) return [];
  const blocks = [];

  if (schedule.work?.enabled && (schedule.work.days || []).includes(weekday)) {
    blocks.push({
      start: toMin(schedule.work.start),
      end: toMin(schedule.work.end),
      label: 'Trabajo',
      type: 'work',
      icon: 'briefcase-outline',
      color: '#F59E0B',
    });
  }

  (schedule.meals || []).forEach((meal) => {
    if (meal.enabled !== false) {
      blocks.push({
        start: toMin(meal.start),
        end: toMin(meal.end),
        label: meal.name,
        type: 'meal',
        icon: 'restaurant-outline',
        color: '#0EA5E9',
      });
    }
  });

  if (schedule.familyBlock?.enabled && (schedule.familyBlock.days || []).includes(weekday)) {
    blocks.push({
      start: toMin(schedule.familyBlock.start),
      end: toMin(schedule.familyBlock.end),
      label: 'Tiempo en familia',
      type: 'family',
      icon: 'heart-outline',
      color: '#EC4899',
    });
  }

  (schedule.customBlocks || []).forEach((b) => {
    if ((b.days || []).includes(weekday)) {
      blocks.push({
        start: toMin(b.start),
        end: toMin(b.end),
        label: b.name,
        type: 'custom',
        icon: b.icon || 'pin-outline',
        color: b.color || '#6366F1',
      });
    }
  });

  return blocks.filter((b) => b.end > b.start).sort((a, b) => a.start - b.start);
}

// Calcula los bloques libres dentro de la ventana de vigilia
export function getFreeBlocks(schedule, weekday) {
  if (!schedule) return { free: [], totalFree: 0, awakeStart: 0, awakeEnd: 0 };

  const wake = toMin(schedule.wakeTime);
  let sleep = toMin(schedule.sleepTime);
  if (sleep <= wake) sleep += 1440; // se duerme pasada la medianoche

  const busy = mergeIntervals(
    getBusyBlocks(schedule, weekday).map((b) => ({
      start: b.start < wake ? b.start + 1440 : b.start,
      end: b.end <= b.start ? b.end + 1440 : (b.end < wake ? b.end + 1440 : b.end),
    }))
  );

  const free = [];
  let cursor = wake;
  for (const b of busy) {
    if (b.start > cursor) free.push({ start: cursor, end: Math.min(b.start, sleep) });
    cursor = Math.max(cursor, b.end);
    if (cursor >= sleep) break;
  }
  if (cursor < sleep) free.push({ start: cursor, end: sleep });

  const cleaned = free
    .map((f) => ({ start: f.start, end: f.end, duration: f.end - f.start }))
    .filter((f) => f.duration >= 15);

  const totalFree = cleaned.reduce((a, f) => a + f.duration, 0);
  return { free: cleaned, totalFree, awakeStart: wake, awakeEnd: sleep };
}

// Sugiere dónde colocar cada actividad dentro de los bloques libres
export function suggestPlacements(schedule, weekday, activities) {
  const { free } = getFreeBlocks(schedule, weekday);
  // copia mutable de la capacidad libre de cada bloque
  const slots = free.map((f) => ({ start: f.start, cursor: f.start, end: f.end }));
  const placements = [];

  const active = (activities || []).filter((a) => a.enabled !== false && a.minutesPerDay > 0);
  // primero las de preferencia específica, luego "cualquiera"
  const ordered = [...active].sort((a, b) => (a.preferred === 'cualquiera' ? 1 : 0) - (b.preferred === 'cualquiera' ? 1 : 0));

  for (const act of ordered) {
    const pref = PREFERENCES.find((p) => p.value === act.preferred) || PREFERENCES[3];
    // busca un slot con espacio que solape la preferencia
    let slot = slots.find(
      (s) => s.end - s.cursor >= act.minutesPerDay && s.cursor < pref.to && s.end > pref.from
    );
    if (!slot) slot = slots.find((s) => s.end - s.cursor >= act.minutesPerDay); // fallback
    if (slot) {
      const start = Math.max(slot.cursor, Math.min(pref.from, slot.end - act.minutesPerDay));
      const realStart = Math.max(slot.cursor, start);
      const end = realStart + act.minutesPerDay;
      placements.push({
        activityId: act.id,
        name: act.name,
        icon: act.icon,
        color: act.color,
        start: realStart,
        end,
        placed: true,
      });
      slot.cursor = end;
    } else {
      placements.push({
        activityId: act.id,
        name: act.name,
        icon: act.icon,
        color: act.color,
        placed: false,
      });
    }
  }
  return placements;
}

// Tabla completa del día: ocupados + actividades + huecos clasificados.
// Un "hueco" es un espacio libre menor a gapThreshold minutos (difícil de aprovechar).
// freeReal = tiempo libre REAL (no incluye lo ya asignado a actividades ni los huecos).
export function buildDayTable(schedule, weekday, activities, gapThreshold = 30) {
  if (!schedule) return { segments: [], freeReal: 0, holesCount: 0, holesMin: 0 };

  const wake = toMin(schedule.wakeTime);
  let sleep = toMin(schedule.sleepTime);
  if (sleep <= wake) sleep += 1440;

  const norm = (b) => {
    let s = b.start;
    let e = b.end;
    if (s < wake) s += 1440;
    if (e <= b.start) e += 1440;
    else if (e < wake) e += 1440;
    return { ...b, start: s, end: e };
  };

  const busy = getBusyBlocks(schedule, weekday).map(norm);
  const placed = suggestPlacements(schedule, weekday, activities)
    .filter((p) => p.placed)
    .map((p) => ({ start: p.start, end: p.end, label: p.name, icon: p.icon, color: p.color, type: 'activity', activityId: p.activityId }));
  const occ = [...busy, ...placed].sort((a, b) => a.start - b.start);

  const segments = [];
  let cursor = wake;
  for (const o of occ) {
    if (o.end <= cursor) continue; // contenido dentro de un bloque anterior
    if (o.start > cursor) {
      const dur = Math.min(o.start, sleep) - cursor;
      if (dur > 0) {
        segments.push({
          start: cursor, end: cursor + dur, duration: dur,
          type: 'hole',
          label: 'Hueco',
        });
      }
    }
    const s = Math.max(o.start, cursor);
    const e = Math.min(o.end, sleep);
    if (e > s) segments.push({ ...o, start: s, end: e, duration: e - s });
    cursor = Math.max(cursor, o.end);
    if (cursor >= sleep) break;
  }
  if (cursor < sleep) {
    const dur = sleep - cursor;
    segments.push({
      start: cursor, end: sleep, duration: dur,
      type: 'hole',
      label: 'Hueco',
    });
  }

  const freeReal = segments.filter((s) => s.type === 'free').reduce((a, s) => a + s.duration, 0);
  const holes = segments.filter((s) => s.type === 'hole');
  return { segments, freeReal, holesCount: holes.length, holesMin: holes.reduce((a, s) => a + s.duration, 0) };
}

// Actividades colocadas por día de la semana (para programar notificaciones)
export function placementsByDay(schedule, activities) {
  const out = {};
  if (!schedule) return out;
  for (let d = 0; d < 7; d++) {
    out[d] = suggestPlacements(schedule, d, activities)
      .filter((p) => p.placed)
      .map((p) => ({ activityId: p.activityId, name: p.name, start: p.start }));
  }
  return out;
}

// Construye la línea de tiempo ordenada del día (ocupados + actividades sugeridas)
export function buildTimeline(schedule, weekday, activities) {
  if (!schedule) return [];
  const busy = getBusyBlocks(schedule, weekday).map((b) => ({ ...b }));
  const placed = suggestPlacements(schedule, weekday, activities)
    .filter((p) => p.placed)
    .map((p) => ({
      start: p.start,
      end: p.end,
      label: p.name,
      type: 'activity',
      icon: p.icon || 'ellipse-outline',
      color: p.color || '#7C3AED',
    }));
  return [...busy, ...placed].sort((a, b) => a.start - b.start);
}
