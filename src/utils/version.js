// Sistema de versiones visible para el usuario + registro de cambios.
export const APP_VERSION = '0.05';

export const CHANGELOG = [
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
