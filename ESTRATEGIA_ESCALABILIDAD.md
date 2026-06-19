# Estrategia de Escalabilidad - Vida Plena 🪶

Este documento detalla el plan para escalar la aplicación desde un prototipo funcional a una plataforma robusta capaz de manejar miles de usuarios y grandes volúmenes de datos.

## 1. Evolución de la Base de Datos (Supabase)

Actualmente, la app utiliza un modelo de **almacenamiento Key-Value** simplificado en la tabla `user_data`.

### Situación Actual:
- Toda la información de un módulo (ej. `finance`) se guarda como un solo objeto JSON.
- **Limitación:** Al crecer el número de transacciones, el objeto JSON se vuelve pesado, ralentizando la sincronización y dificultando consultas complejas o reportes avanzados desde el servidor.

### Propuesta a Mediano Plazo:
Migrar a un esquema **Relacional Puro**:
1. **Tablas Específicas:** Crear tablas para `transactions`, `accounts`, `habits`, `goals`, etc.
2. **Consultas Eficientes:** Permitir que la app descargue solo los últimos 30 días de transacciones al iniciar, y cargue el resto bajo demanda (pagination).
3. **Integridad Referencial:** Evitar que queden "transacciones huérfanas" si se borra una cuenta.

## 2. Optimización del Desempeño (Frontend)

### Gestión de Estado:
- **Zustand Selectors:** Actualmente algunos componentes escuchan todo el store. Debemos refactorizar para usar selectores específicos:
  `const balance = useStore(state => state.finance.balance);`
  Esto evita re-renders innecesarios en pantallas grandes como el Dashboard.

### Sincronización Inteligente:
- **Diff-based Sync:** En lugar de subir todo el bloque de finanzas cada 5 minutos, implementar un sistema que solo envíe los cambios realizados (delta sync).
- **Background Tasks:** Utilizar `expo-task-manager` para asegurar que los registros pendientes se suban incluso si el usuario cierra la app abruptamente.

## 3. Escalabilidad de la IA (Cerebro de la App)

### Transición a LLM en la Nube:
Actualmente, el asistente usa lógica basada en reglas y regex local (`buildAnswer`). Para escalar:
1. **Edge Functions (Supabase):** Mover la lógica de procesamiento de lenguaje natural a funciones de Supabase.
2. **Contexto Dinámico:** Enviar al modelo un resumen del perfil del usuario (metas, balance actual, hábitos pendientes) para que los consejos sean 100% personalizados.
3. **Costo-Eficiencia:** Usar modelos como `gpt-4o-mini` o `Llama 3` vía API para mantener costos bajos mientras se ofrece una experiencia de "IA Real".

## 4. UX/UI y Retención

### Gamificación Avanzada:
- Expandir el sistema de niveles (`levels.js`) con recompensas visuales, medallas compartibles y desafíos semanales entre amigos.
- **Mind Map de Áreas:** Mejorar la visualización de la pestaña Áreas para que se sienta como una herramienta de pensamiento visual profesional.

## 5. Infraestructura y Seguridad

- **Row Level Security (RLS):** Asegurar que las políticas de Supabase estén correctamente configuradas para que ningún usuario pueda acceder a los datos de otro, incluso si conocen su ID.
- **Backups:** Configurar backups automáticos diarios de la base de datos PostgreSQL en Supabase.

---
*Documento preparado por Jules para el proyecto Vida Plena.*
