# Estrategia de Escalabilidad: Vida Plena

Este documento detalla el plan técnico para llevar la aplicación de un prototipo basado en almacenamiento de clave-valor a una plataforma robusta capaz de soportar miles de usuarios concurrentes y funciones avanzadas de IA.

## 1. Evolución de la Arquitectura de Datos

### Estado Actual:
- **Modelo:** Key-Value (JSONB).
- **Problema:** Almacenar módulos completos (como toda la sección de finanzas) en un solo blob de texto en Supabase dificulta las consultas complejas, aumenta el consumo de datos y puede causar conflictos de sincronización si el usuario usa dos dispositivos a la vez.

### Propuesta: Modelo Relacional
Debemos migrar de blobs JSON a tablas SQL estructuradas:
1.  **Tabla `accounts`:** Una fila por cuenta bancaria.
2.  **Tabla `transactions`:** Una fila por movimiento (permitiendo paginación real).
3.  **Tabla `habits` y `habit_logs`:** Separar la definición del hábito de sus registros diarios.

**Beneficios:**
- Consultas más rápidas (ej. "¿cuánto gasté en total en 2023?").
- Sincronización delta: Solo se descargan los cambios nuevos, no todo el historial.
- Integridad referencial: Evita que una transacción quede huérfana si se borra una cuenta.

## 2. Optimización de la Inteligencia Artificial

### Estado Actual:
- Consultas directas al modelo con el contexto completo.

### Próximos Pasos:
1.  **RAG (Retrieval Augmented Generation):** En lugar de enviarle a la IA todos tus datos financieros y metas en cada mensaje, usaremos una base de datos vectorial. La IA solo "leerá" la información relevante para responder la pregunta actual.
2.  **Local LLM (Edge AI):** Para tareas simples (como "anota 20 soles"), se puede usar un modelo pequeño que corra dentro del teléfono, reduciendo costos de API y mejorando la privacidad.

## 3. Infraestructura y Sincronización

1.  **Offline-First con Replicación:** Implementar una cola de cambios local que se sincronice automáticamente cuando haya internet, manejando conflictos de "última escritura gana" por campo.
2.  **Caché de Imágenes:** Mover las fotos de recibos a Supabase Storage con una política de limpieza automática para fotos muy antiguas o redimensionamiento en el lado del servidor.

## 4. Seguridad y Privacidad

1.  **Cifrado de Extremo a Extremo:** Para los datos más sensibles (notas personales), implementar cifrado en el dispositivo antes de subir a Supabase.
2.  **Auditoría de Sesiones:** Permitir al usuario ver qué dispositivos tienen acceso a su cuenta y cerrar sesiones remotamente.

---

Este plan garantiza que Vida Plena no solo funcione bien hoy, sino que sea la base sólida para un ecosistema de crecimiento personal completo.
