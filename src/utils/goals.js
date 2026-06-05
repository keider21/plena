// Modelo de meta con contexto + utilidades.
// El % de progreso SOLO existe cuando hay indicadores reales (regla del usuario).

export const GOAL_CATEGORIES = [
  { key: 'monetaria', label: 'Monetaria', color: '#10B981', icon: 'cash-outline' },
  { key: 'personal', label: 'Personal', color: '#7C3AED', icon: 'person-outline' },
  { key: 'salud', label: 'Salud', color: '#EF4444', icon: 'fitness-outline' },
  { key: 'estudio', label: 'Estudio', color: '#0EA5E9', icon: 'book-outline' },
  { key: 'trabajo', label: 'Trabajo', color: '#F59E0B', icon: 'briefcase-outline' },
];

export const catOf = (key) => GOAL_CATEGORIES.find((c) => c.key === key) || GOAL_CATEGORIES[0];

// Devuelve el % (0-100) si hay indicadores; null si no hay (no se muestra progreso).
export function goalProgress(goal) {
  if (!goal) return null;
  if (goal.category === 'monetaria') {
    const t = goal.targetAmount || 0;
    if (t > 0) return Math.min(100, Math.round(((goal.currentAmount || 0) / t) * 100));
    return null;
  }
  if (typeof goal.progress === 'number') return Math.max(0, Math.min(100, Math.round(goal.progress)));
  // compat con metas antiguas (indicadores)
  const ind = goal.indicators || [];
  if (ind.length > 0) return Math.round((ind.filter((i) => i.done).length / ind.length) * 100);
  return null;
}

const uid = () => Date.now().toString() + Math.random().toString(36).slice(2, 6);

export const newItem = (text = '', extra = {}) => ({ id: uid(), text, ...extra });

export function newGoal(partial = {}) {
  return {
    id: uid(),
    title: '',
    description: '',
    category: 'personal',     // tipo: monetaria/personal/salud/estudio/trabajo
    targetDate: '',
    targetAmount: 0,          // si es monetaria
    currentAmount: 0,
    estimatedTime: '',        // tiempo estimado (texto libre)
    progress: null,           // % manual para metas no monetarias
    createdAt: new Date().toISOString().slice(0, 10),
    ...partial,
  };
}

// Convierte un texto multilínea en lista de items {id, text, done?}
export function linesToItems(text, withDone = false) {
  return (text || '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => (withDone ? newItem(l, { done: false }) : newItem(l)));
}

// ── Asistente de desglose por reglas ──
// Genera preguntas según el tipo de meta detectado por palabras clave.
export function buildQuestions(title) {
  const t = (title || '').toLowerCase();
  const specific = [];

  if (/(casa|departamento|depa|vivienda|terreno|hogar)/.test(t)) {
    specific.push(
      { id: 's_ciudad', q: '¿En qué ciudad o zona la quieres?', ph: 'Ej. Lima, Arequipa...' },
      { id: 's_tipo', q: '¿Casa o departamento?', ph: 'Casa / Departamento' },
      { id: 's_metros', q: '¿Cuántos metros² aprox.?', ph: 'Ej. 90 m²' },
      { id: 's_cuartos', q: '¿Cuántos cuartos?', ph: 'Ej. 3 dormitorios' },
      { id: 's_presupuesto', q: '¿Presupuesto aproximado?', ph: 'Ej. S/ 250,000', money: true },
    );
  } else if (/(auto|carro|coche|vehiculo|veh[ií]culo|moto)/.test(t)) {
    specific.push(
      { id: 's_tipo', q: '¿Qué tipo de vehículo?', ph: 'Ej. SUV, sedán...' },
      { id: 's_estado', q: '¿Nuevo o usado?', ph: 'Nuevo / Usado' },
      { id: 's_presupuesto', q: '¿Presupuesto aproximado?', ph: 'Ej. S/ 60,000', money: true },
    );
  } else if (/(empresa|negocio|emprend|startup|marca)/.test(t)) {
    specific.push(
      { id: 's_rubro', q: '¿De qué rubro es?', ph: 'Ej. comida, software...' },
      { id: 's_clientes', q: '¿Quiénes serán tus clientes?', ph: 'Tu público objetivo' },
      { id: 's_capital', q: '¿Capital inicial estimado?', ph: 'Ej. S/ 10,000', money: true },
    );
  } else if (/(ingl[eé]s|idioma|portugu[eé]s|franc[eé]s|alem[aá]n)/.test(t)) {
    specific.push(
      { id: 's_nivel', q: '¿Qué nivel quieres alcanzar?', ph: 'Ej. B2 conversacional' },
      { id: 's_para', q: '¿Para qué lo necesitas?', ph: 'Trabajo, viajes, estudios...' },
    );
  } else if (/(viaj|conocer|vacacion)/.test(t)) {
    specific.push(
      { id: 's_destino', q: '¿A dónde quieres ir?', ph: 'Destino' },
      { id: 's_presupuesto', q: '¿Presupuesto del viaje?', ph: 'Ej. S/ 8,000', money: true },
    );
  }

  return [
    { id: 'why', q: '¿Por qué quieres lograrlo?', ph: 'Tu razón personal más fuerte...', field: 'why' },
    ...specific,
    { id: 'targetDate', q: '¿Para cuándo lo quieres? (opcional)', ph: 'Ej. Diciembre 2027', field: 'targetDate' },
    { id: 'currentState', q: '¿Dónde estás hoy con esto?', ph: 'Tu punto de partida...', field: 'currentState' },
    { id: 'benefits', q: '¿Qué mejorará en tu vida al lograrlo?', ph: 'Los beneficios...', field: 'benefits' },
    { id: 'resources', q: '¿Qué necesitas? (uno por línea)', ph: 'Dinero\nTiempo\nConocimiento', multi: true, list: 'resources' },
    { id: 'obstacles', q: '¿Qué obstáculos podrían aparecer? (uno por línea)', ph: 'Falta de tiempo\n...', multi: true, list: 'obstacles' },
    { id: 'steps', q: '¿Cuáles son los primeros pasos? (uno por línea)', ph: 'Paso 1\nPaso 2\n...', multi: true, list: 'actionPlan' },
    { id: 'indicators', q: '¿Cómo sabrás que avanzas? (señales medibles, una por línea)', ph: 'Ahorré S/ X\nTerminé Y', multi: true, list: 'indicators' },
  ];
}

// Aplica las respuestas del asistente a un objeto meta.
export function applyAnswers(goal, questions, answers) {
  const g = { ...goal };
  const detailLines = [];
  let resources = [...(g.resources || [])];

  for (const q of questions) {
    const val = (answers[q.id] || '').trim();
    if (!val) continue;
    if (q.field) {
      g[q.field] = val;
    } else if (q.list) {
      const withDone = q.list === 'actionPlan' || q.list === 'indicators';
      g[q.list] = [...(g[q.list] || []), ...linesToItems(val, withDone)];
    } else if (q.id.startsWith('s_')) {
      detailLines.push(`• ${q.q.replace(/\?$/, '')}: ${val}`);
      if (q.money) resources.push(newItem(`${q.q.replace(/\?.*$/, '').replace('¿', '')}: ${val}`));
    }
  }

  if (detailLines.length) {
    g.currentState = [g.currentState, '', 'Detalles:', ...detailLines].filter(Boolean).join('\n').trim();
  }
  g.resources = resources;
  return g;
}
