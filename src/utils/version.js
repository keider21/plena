// Sistema de versiones visible para el usuario + registro de cambios.
export const APP_VERSION = '0.02';

export const CHANGELOG = [
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
