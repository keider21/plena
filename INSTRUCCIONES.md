# 🚀 Vida Plena — Instrucciones de instalación (Windows)

## Lo que vas a tener en tu teléfono

- Login / registro por usuario (múltiples usuarios)
- Onboarding personalizado con cuestionario de 5 pasos
- Dashboard con métricas del día, semana y finanzas
- Hábitos con seguimiento diario, gráficas y recordatorios
- Metas con barras de progreso editables
- Finanzas con ingresos, gastos, categorías y gráficas
- Mentalidad con rasgos y referencias de éxito
- Perfil de usuario
- Diseño oscuro moderno tipo fintech
- Todo guardado localmente en el teléfono

---

## PASO 1 — Instalar Node.js

1. Ve a: https://nodejs.org
2. Descarga la versión LTS (la verde, recomendada)
3. Instala con todas las opciones por defecto
4. Reinicia tu PC

Verifica: abre CMD y escribe:
```
node --version
npm --version
```
Debes ver números de versión.

---

## PASO 2 — Instalar Expo CLI

Abre CMD como administrador y escribe:
```
npm install -g expo-cli
```

---

## PASO 3 — Instalar las dependencias del proyecto

En CMD, navega a la carpeta del proyecto:
```
cd C:\ruta\donde\guardaste\vidaplena
npm install
```

Espera que termine (puede tardar 2-3 minutos).

---

## PASO 4 — Instalar Expo Go en tu teléfono

Android: https://play.google.com/store/apps/details?id=host.exp.exponent
iPhone: https://apps.apple.com/app/expo-go/id982107779

---

## PASO 5 — Ejecutar la app

En CMD dentro de la carpeta del proyecto:
```
npx expo start
```

Aparecerá un código QR en la terminal.

- **Android**: Abre Expo Go → Escanea el QR
- **iPhone**: Abre la cámara → Apunta al QR → Toca el banner

¡La app se abrirá en tu teléfono! 🎉

---

## PASO 6 — Crear tu cuenta

1. Toca "Regístrate"
2. Ingresa tu nombre, correo y contraseña
3. Completa el cuestionario de personalización (5 pasos)
4. ¡Listo! Ya estás dentro de tu app personal

---

## Si ves errores comunes

**"Unable to resolve module"**
```
npm install
npx expo start --clear
```

**La app no conecta con el teléfono**
- Asegúrate de que tu PC y teléfono estén en el MISMO WiFi
- Desactiva el firewall de Windows temporalmente

**"SDK version not supported"**
```
npm install expo@latest
```

---

## Para generar el APK (instalar sin Expo Go)

Cuando quieras la app como archivo .apk instalable:

1. Crea cuenta gratis en: https://expo.dev
2. En CMD dentro del proyecto:
```
npm install -g eas-cli
eas login
eas build --platform android --profile preview
```
3. Descarga el .apk del link que te da y compártelo

---

## Estructura del proyecto

```
vidaplena/
├── App.js                    ← Punto de entrada, maneja auth
├── app.json                  ← Config de Expo
├── package.json              ← Dependencias
└── src/
    ├── screens/
    │   ├── AuthScreen.js     ← Login y registro
    │   ├── OnboardingScreen.js ← Cuestionario inicial
    │   ├── DashboardScreen.js  ← Pantalla principal
    │   ├── HabitosScreen.js    ← Hábitos + gráficas
    │   ├── MetasScreen.js      ← Metas y progreso
    │   ├── FinanzasScreen.js   ← Control financiero
    │   ├── MentalidadScreen.js ← Mentalidad + refs
    │   └── ProfileScreen.js    ← Perfil y config
    ├── navigation/
    │   └── AppNavigator.js   ← Tabs y navegación
    ├── store/
    │   └── useStore.js       ← Estado global (Zustand)
    └── utils/
        ├── theme.js          ← Colores y estilos
        └── notifications.js  ← Recordatorios
```

---

Hecho con ❤️ para tu crecimiento personal.
