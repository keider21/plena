package com.vidaplena.app

import android.app.AlarmManager
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule

class FullScreenNotifModule(private val rc: ReactApplicationContext)
    : ReactContextBaseJavaModule(rc) {

    companion object {
        @Volatile private var emitter: DeviceEventManagerModule.RCTDeviceEventEmitter? = null
        @Volatile private var pendingEvent: WritableMap? = null

        fun emitShow(id: String, title: String, body: String, data: String) {
            val map = Arguments.createMap().apply {
                putString("action", "SHOW")
                putString("id", id)
                putString("title", title)
                putString("body", body)
                putString("data", data)
            }
            val e = emitter
            if (e != null) e.emit("FSN_EVENT", map) else pendingEvent = map
        }

        fun emitAction(action: String, id: String, data: String) {
            val map = Arguments.createMap().apply {
                putString("action", action)
                putString("id", id)
                putString("data", data)
            }
            val e = emitter
            if (e != null) e.emit("FSN_EVENT", map) else pendingEvent = map
        }
    }

    override fun getName() = "FullScreenNotif"

    override fun initialize() {
        super.initialize()
        emitter = rc.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
    }

    override fun onCatalystInstanceDestroy() {
        super.onCatalystInstanceDestroy()
        emitter = null
    }

    // JS calls this on mount to retrieve any action that happened while app was killed
    @ReactMethod
    fun getPendingEvent(promise: Promise) {
        val p = pendingEvent
        pendingEvent = null
        if (p != null) promise.resolve(p) else promise.resolve(null)
    }

    @ReactMethod
    fun schedule(id: String, title: String, body: String, timestamp: Double, dataJson: String) {
        val am = rc.getSystemService(AlarmManager::class.java) ?: return
        val intent = Intent(rc, AlarmReceiver::class.java).apply {
            putExtra(AlarmReceiver.EXTRA_ID, id)
            putExtra(AlarmReceiver.EXTRA_TITLE, title)
            putExtra(AlarmReceiver.EXTRA_BODY, body)
            putExtra(AlarmReceiver.EXTRA_DATA, dataJson)
        }
        val pi = PendingIntent.getBroadcast(
            rc, id.hashCode(), intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        val ms = timestamp.toLong()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !am.canScheduleExactAlarms()) {
            am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, ms, pi)
        } else {
            am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, ms, pi)
        }
    }

    @ReactMethod
    fun cancelNotif(id: String) {
        val am = rc.getSystemService(AlarmManager::class.java) ?: return
        val intent = Intent(rc, AlarmReceiver::class.java)
        val pi = PendingIntent.getBroadcast(
            rc, id.hashCode(), intent,
            PendingIntent.FLAG_NO_CREATE or PendingIntent.FLAG_IMMUTABLE
        )
        pi?.let { am.cancel(it) }
    }

    // Diagnóstico: dispara la notificación inmediatamente desde el hilo principal
    // (sin AlarmManager). Útil para probar si el problema es el alarm o el permiso de notif.
    @ReactMethod
    fun fireNow(id: String, title: String, body: String, dataJson: String, promise: Promise) {
        try {
            AlarmReceiver.ensureChannel(rc)
            val notifIntId = id.hashCode()

            val popupIntent = Intent(rc, PopupActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
                putExtra(AlarmReceiver.EXTRA_ID, id)
                putExtra(AlarmReceiver.EXTRA_TITLE, title)
                putExtra(AlarmReceiver.EXTRA_BODY, body)
                putExtra(AlarmReceiver.EXTRA_DATA, dataJson)
                putExtra(AlarmReceiver.EXTRA_NOTIF_INT_ID, notifIntId)
            }
            val fullScreenPi = PendingIntent.getActivity(
                rc, notifIntId + 200, popupIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            val openPi = PendingIntent.getActivity(
                rc, notifIntId + 300,
                Intent(rc, MainActivity::class.java).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
                },
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            val iconRes = rc.resources.getIdentifier("notification_icon", "drawable", rc.packageName)
                .takeIf { it != 0 } ?: android.R.drawable.ic_dialog_info

            val notif = NotificationCompat.Builder(rc, "fsn_alarmas")
                .setSmallIcon(iconRes)
                .setContentTitle(title)
                .setContentText(body)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setCategory(NotificationCompat.CATEGORY_ALARM)
                .setFullScreenIntent(fullScreenPi, true)
                .setContentIntent(openPi)
                .setAutoCancel(true)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .build()

            NotificationManagerCompat.from(rc).notify(notifIntId + 400, notif)
            promise.resolve("ok")
        } catch (e: Exception) {
            promise.reject("ERR", e.message ?: "error desconocido")
        }
    }

    // Verifica si POST_NOTIFICATIONS está concedido (Android 13+)
    @ReactMethod
    fun hasNotifPermission(promise: Promise) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            val nm = rc.getSystemService(NotificationManager::class.java)
            promise.resolve(nm?.areNotificationsEnabled() ?: false)
        } else {
            promise.resolve(true)
        }
    }

    // Verifica si puede programar alarmas exactas
    @ReactMethod
    fun canScheduleExact(promise: Promise) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val am = rc.getSystemService(AlarmManager::class.java)
            promise.resolve(am?.canScheduleExactAlarms() ?: false)
        } else {
            promise.resolve(true)
        }
    }

    // Android 14+: USE_FULL_SCREEN_INTENT requires explicit user approval
    @ReactMethod
    fun canUseFullScreenIntent(promise: Promise) {
        if (Build.VERSION.SDK_INT >= 34) {
            val nm = rc.getSystemService(NotificationManager::class.java)
            promise.resolve(nm?.canUseFullScreenIntent() ?: false)
        } else {
            promise.resolve(true)
        }
    }

    // Abre los ajustes de notificaciones a pantalla completa (Android 14+)
    @ReactMethod
    fun openFullScreenIntentSettings(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= 34) {
                val intent = Intent("android.settings.MANAGE_APP_USE_FULL_SCREEN_INTENT").apply {
                    data = Uri.parse("package:${rc.packageName}")
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
                rc.startActivity(intent)
            }
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("ERR", e.message ?: "error")
        }
    }

    // Verifica si el sistema ignora la optimización de batería para esta app
    @ReactMethod
    fun isBatteryOptimizationIgnored(promise: Promise) {
        val pm = rc.getSystemService(PowerManager::class.java)
        promise.resolve(pm?.isIgnoringBatteryOptimizations(rc.packageName) ?: false)
    }

    @ReactMethod fun addListener(eventName: String) {}
    @ReactMethod fun removeListeners(count: Int) {}
}
