// Sistema de versiones visible para el usuario + registro de cambios.
export const APP_VERSION = '0.17';

export const CHANGELOG = [
  {
    v: '0.17',
    fecha: '2026-06-11',
    cambios: [
      'Devuelto el bloque "En qué se fue tu plata" al Inicio (me equivoqué antes, lo quité de donde no era)',
      'Quitada la sección "Categorías de gasto personalizadas" del Perfil',
      '🏆 Sistema de niveles y puntos: Bronce → Plata → Oro → Platino → Diamante → Leyenda → Maestro',
      '+5 pts por hábito hecho hoy, -3 por fallado, +bonus por racha',
      '+3 pts por movimiento financiero del día, +15 por cada pago de deuda/tarjeta',
      '+8 pts por bloque del plan cumplido a horario, -5 si hiciste menos de la mitad',
      '-10 pts si llevás 7+ días sin registrar nada (castiga el abandono)',
      'Card grande en el Perfil con tu nivel, puntos, barra de progreso y desglose del día',
      'El bot IA te dice en qué nivel estás y cómo se calculan los puntos',
    ],
  },
  {
    v: '0.16',
    fecha: '2026-06-11',
    cambios: [
      'Quitado el bloque "En qué se fue tu plata" del Inicio (ahora vivís más limpio)',
      'Nueva pestaña "Perfil" en la barra inferior (antes se abría desde otro lado)',
      'Asistente IA muy mejorado: explica todas las pantallas de la app, enseña a registrar gastos, cambiar tema/moneda, exportar CSV, ver notificaciones, cerrar sesión, crear categorías, y más',
      'Asistente IA entiende más frases coloquiales y devuelve un resumen general cuando le pedís "cómo voy"',
      'Negritas en las respuestas del bot para resaltar lo importante',
    ],
  },
  {
    v: '0.15.9',
    fecha: '2026-06-11',
    cambios: [
      'Asistente IA local: responde sobre gastos, hábitos, metas, tarjetas, balance y consejos',
      'Ejemplos de preguntas listas para tocar',
    ],
  },
  {
    v: '0.15',
    fecha: '2026-06-11',
    cambios: [
      'Auditoría UI/UX completa (10 mejoras: empty states, hápticos, gradientes, etc.)',
      'Balance del mes gigante en Inicio',
      'Streak counter con chip 🔥 en hábitos',
      'Saludo dinámico (Buenos días/tardes/noches)',
      'Búsqueda de movimientos en Inicio',
      'Toggle Oscuro/Claro',
    ],
  },
  {
    v: '0.14.1',
    fecha: '2026-06-10',
    cambios: [
      'Fix "Monto inválido" al pagar tarjeta',
      'Editar bloques fijos del plan (cena, trabajo, dormir) con override solo para hoy',
    ],
  },
  {
    v: '0.14',
    fecha: '2026-06-10',
    cambios: [
      'Onboarding pregunta campos avanzados (corte, pago, línea, pago mín/total, interés, cuotas)',
      'Préstamos por cuotas con KPIs y barra capital/pendiente',
      'Editar bloque en curso (incluye huecos y bloques fijos)',
      'Historial de pagos con modal y total (deuda/préstamo/tarjeta)',
    ],
  },
  {
    v: '0.13',
    fecha: '2026-06-10',
    cambios: [
      'Fix pagar tarjeta (no descontaba del "used")',
      'EmptyState con personalidad (gradiente, pulso, chips, hápticos)',
      'Modal "Cuánto falta" al pagar tarjeta',
    ],
  },
  {
    v: '0.12',
    fecha: '2026-06-06',
    cambios: [
      'Deudas y préstamos: botón "Registrar pago" que baja automáticamente el saldo pendiente',
      'Préstamos: "Monto adicional" (si te prestan más) actualiza el saldo',
      'Los pagos se descuentan de la cuenta elegida y aparecen en el historial y los reportes (categoría Deudas)',
      'Las tarjetas de deuda/préstamo muestran el saldo pendiente y el % pagado',
    ],
  },
  {
    v: '0.11',
    fecha: '2026-06-06',
    cambios: [
      'Encuesta inicial: nueva sección Préstamos (entidad, monto, fecha, cuota, interés, saldo pendiente)',
      'Encuesta: aviso "tienes datos sin agregar" al avanzar; ya no se pierden datos escritos',
      'Encuesta: Deudas con más campos (para qué fue, fecha, monto inicial, saldo pendiente, observaciones)',
      'Pregunta "¿A qué te dedicas?": crea una categoría de ingreso propia (ej. Ingresos por taxi)',
    ],
  },
  {
    v: '0.10',
    fecha: '2026-06-05',
    cambios: [
      'Nuevo asistente de configuración inicial (reemplaza la encuesta): registras cuentas, tarjetas y deudas con sus saldos al empezar',
      'Todo es omitible y solo aparece una vez',
    ],
  },
  {
    v: '0.09',
    fecha: '2026-06-05',
    cambios: [
      'Nueva pantalla "Notificaciones y permisos" (Perfil): activar notificaciones, permitir segundo plano (batería), alarmas exactas, abrir ajustes y probar',
      'Permisos nativos agregados: alarmas exactas, ignorar optimización de batería, pantalla completa, wake lock',
      'Requiere regenerar el dev build para que los permisos nativos tomen efecto',
    ],
  },
  {
    v: '0.08',
    fecha: '2026-06-05',
    cambios: [
      'Áreas: cada área puede tener una descripción que se muestra al tocarla',
      'Hábitos: botón + con sugerencias rápidas (Leer, Caminar, Ejercicio, Beber agua, Meditar, Dormir temprano)',
      'Hábitos: crear hábito personalizado',
    ],
  },
  {
    v: '0.07',
    fecha: '2026-06-05',
    cambios: [
      'Reanudar actividades: pausar (Detener) y continuar contando desde el tiempo acumulado + Finalizar',
      'Cambiar la actividad antes de aceptarla, y también después (con aviso de que perderás el progreso)',
      'Reactivar una actividad rechazada por error mientras su horario siga vigente',
      'Siesta opcional (aparte del sueño principal; no cuenta en productividad ni en los gráficos)',
    ],
  },
  {
    v: '0.06',
    fecha: '2026-06-05',
    cambios: [
      'Historial protegido: editar el plan ya NO cambia días pasados ni estadísticas/gráficos antiguos',
      '"Tu día" es editable solo para HOY — mantén presionada una actividad para cambiar hora/actividad, moverla o eliminarla',
      'Editar el plan (botón "Editar plan") afecta de hoy en adelante; los otros días muestran tu plantilla',
      'Llenar un hueco ya no duplica actividades (se crea solo para el día de hoy)',
    ],
  },
  {
    v: '0.05',
    fecha: '2026-06-05',
    cambios: [
      'Metas rediseñadas y simples: nombre, descripción, tipo (monetaria/personal/salud/estudio/trabajo), fecha, monto y tiempo',
      'Las metas monetarias miden tu avance por monto; las demás con un progreso manual',
      'Se quitó el asistente de preguntas de metas',
      'Nueva sección "Asistente IA" (interfaz de chat lista; voz y ejecución de acciones llegan después)',
    ],
  },
  {
    v: '0.04',
    fecha: '2026-06-05',
    cambios: [
      'Integridad de datos: ya no se permiten saldos negativos imposibles (valida antes de gasto/transferencia/pago)',
      'El historial de los gráficos queda congelado: editar o borrar una actividad ya no borra su avance pasado',
      'Pago de tarjeta confirmado: se refleja en tarjeta, historial, resumen y balance',
    ],
  },
  {
    v: '0.03',
    fecha: '2026-06-04',
    cambios: [
      'Familia unificada (se quitó el "Tiempo en familia" duplicado)',
      'Cada actividad puede ser Automática o de Hora fija (editas inicio, fin y días)',
      'Lista de actividades simplificada: solo 3 sugeridas + desplegable para agregar más',
      'Se eliminó "Compromisos fijos" (ahora todo son actividades/eventos editables)',
      'Llenar huecos ahora funciona siempre, incluso con una actividad en curso',
      'Tarjetas de débito con saldo: registran gasto/categoría e impactan balance y gráficos',
      'Nuevo tipo "Pago de tarjeta" (reduce lo utilizado de tu crédito)',
      'Botón flotante en Inicio para registrar gasto/ingreso/transferencia/pago al instante',
    ],
  },
  {
    v: '0.02',
    fecha: '2026-06-04',
    cambios: [
      'Notificaciones reales en Android (sonido, vibración, app minimizada)',
      'Modo alarma con Aceptar / Posponer / Rechazar',
      'Entrada manual de horas con AM/PM (cualquier minuto)',
      'Colores únicos por categoría en los gráficos',
      'Selectores cambiados a menús desplegables',
      'Tarjetas: tipo Débito / Crédito + aviso de cuándo pagarás la compra',
      'Agregar actividad en los huecos libres (se ajusta al tiempo disponible)',
      'Sección de versión en el Perfil',
    ],
  },
  {
    v: '0.01',
    fecha: '2026-06-02',
    cambios: [
      'Versión inicial: Planificación, Metas, Finanzas y Árbol de áreas',
    ],
  },
];

export const LATEST = CHANGELOG[0];
