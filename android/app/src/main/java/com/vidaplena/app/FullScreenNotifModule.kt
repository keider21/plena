package com.vidaplena.app

import android.app.Activity
import android.app.AlarmManager
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.speech.RecognizerIntent
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.util.*

class FullScreenNotifModule(private val reactContext: ReactApplicationContext)
    : ReactContextBaseJavaModule(reactContext), ActivityEventListener {

    private var speechPromise: Promise? = null
    private val TAG = "VPModule"

    private val receiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            if (intent.action == "com.vidaplena.app.PAYMENT_NOTIFICATION") {
                val amount = intent.getDoubleExtra("amount", 0.0)
                val sender = intent.getStringExtra("sender") ?: ""
                val packageName = intent.getStringExtra("packageName") ?: ""
                val text = intent.getStringExtra("text") ?: ""

                val params = Arguments.createMap().apply {
                    putDouble("amount", amount)
                    putString("sender", sender)
                    putString("packageName", packageName)
                    putString("text", text)
                }

                try {
                    reactContext.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                        .emit("onPaymentNotification", params)
                } catch (e: Exception) {
                    Log.w(TAG, "Bridge no listo")
                }
            }
        }
    }

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
        reactContext.addActivityEventListener(this)
        emitter = reactContext.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)

        val filter = IntentFilter("com.vidaplena.app.PAYMENT_NOTIFICATION")
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            reactContext.registerReceiver(receiver, filter, Context.RECEIVER_EXPORTED)
        } else {
            reactContext.registerReceiver(receiver, filter)
        }
    }

    override fun onCatalystInstanceDestroy() {
        super.onCatalystInstanceDestroy()
        reactContext.removeActivityEventListener(this)
        emitter = null
        try { reactContext.unregisterReceiver(receiver) } catch (e: Exception) {}
    }

    @ReactMethod
    fun startSpeechRecognition(promise: Promise) {
        val act = currentActivity
        if (act == null) {
            promise.reject("ERR_NO_ACTIVITY", "No hay una ventana activa")
            return
        }

        speechPromise = promise
        val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            putExtra(RecognizerIntent.EXTRA_LANGUAGE, Locale.getDefault().toString())
            putExtra(RecognizerIntent.EXTRA_PROMPT, "Te escucho...")
        }

        try {
            act.startActivityForResult(intent, 7777)
        } catch (e: Exception) {
            promise.reject("ERR_SPEECH", e.message)
            speechPromise = null
        }
    }

    // Firma exacta requerida por el compilador según el reporte de error
    override fun onActivityResult(activity: Activity, requestCode: Int, resultCode: Int, data: Intent?) {
        if (requestCode == 7777) {
            if (resultCode == Activity.RESULT_OK && data != null) {
                val results = data.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS)
                if (!results.isNullOrEmpty()) {
                    speechPromise?.resolve(results[0])
                } else {
                    speechPromise?.resolve("")
                }
            } else {
                speechPromise?.resolve("")
            }
            speechPromise = null
        }
    }

    override fun onNewIntent(intent: Intent) {
        // Implementación requerida por la interfaz
    }

    @ReactMethod
    fun getPendingEvent(promise: Promise) {
        val p = pendingEvent
        pendingEvent = null
        if (p != null) promise.resolve(p) else promise.resolve(null)
    }

    @ReactMethod
    fun schedule(id: String, title: String, body: String, timestamp: Double, dataJson: String) {
        val am = reactContext.getSystemService(AlarmManager::class.java) ?: return
        val intent = Intent(reactContext, AlarmReceiver::class.java).apply {
            putExtra(AlarmReceiver.EXTRA_ID, id)
            putExtra(AlarmReceiver.EXTRA_TITLE, title)
            putExtra(AlarmReceiver.EXTRA_BODY, body)
            putExtra(AlarmReceiver.EXTRA_DATA, dataJson)
        }
        val pi = PendingIntent.getBroadcast(
            reactContext, id.hashCode(), intent,
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
        val am = reactContext.getSystemService(AlarmManager::class.java) ?: return
        val intent = Intent(reactContext, AlarmReceiver::class.java)
        val pi = PendingIntent.getBroadcast(
            reactContext, id.hashCode(), intent,
            PendingIntent.FLAG_NO_CREATE or PendingIntent.FLAG_IMMUTABLE
        )
        pi?.let { am.cancel(it) }
    }

    @ReactMethod
    fun fireNow(id: String, title: String, body: String, dataJson: String, promise: Promise) {
        try {
            AlarmReceiver.ensureChannel(reactContext)
            val notifIntId = id.hashCode()

            val popupIntent = Intent(reactContext, PopupActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                putExtra(AlarmReceiver.EXTRA_ID, id)
                putExtra(AlarmReceiver.EXTRA_TITLE, title)
                putExtra(AlarmReceiver.EXTRA_BODY, body)
                putExtra(AlarmReceiver.EXTRA_DATA, dataJson)
                putExtra(AlarmReceiver.EXTRA_NOTIF_INT_ID, notifIntId)
            }
            val fullScreenPi = PendingIntent.getActivity(
                reactContext, notifIntId + 200, popupIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            val openPi = PendingIntent.getActivity(
                reactContext, notifIntId + 300,
                Intent(reactContext, MainActivity::class.java).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
                },
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            val iconRes = reactContext.resources.getIdentifier("notification_icon", "drawable", reactContext.packageName)
                .takeIf { it != 0 } ?: android.R.drawable.ic_dialog_info

            val notif = NotificationCompat.Builder(reactContext, "fsn_alarmas")
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

            NotificationManagerCompat.from(reactContext).notify(notifIntId + 400, notif)
            promise.resolve("ok")
        } catch (e: Exception) {
            promise.reject("ERR", e.message ?: "error")
        }
    }

    @ReactMethod
    fun hasNotifPermission(promise: Promise) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            val nm = reactContext.getSystemService(NotificationManager::class.java)
            promise.resolve(nm?.areNotificationsEnabled() ?: false)
        } else {
            promise.resolve(true)
        }
    }

    @ReactMethod
    fun canScheduleExact(promise: Promise) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val am = reactContext.getSystemService(AlarmManager::class.java)
            promise.resolve(am?.canScheduleExactAlarms() ?: false)
        } else {
            promise.resolve(true)
        }
    }

    @ReactMethod
    fun canUseFullScreenIntent(promise: Promise) {
        if (Build.VERSION.SDK_INT >= 34) {
            val nm = reactContext.getSystemService(NotificationManager::class.java)
            promise.resolve(nm?.canUseFullScreenIntent() ?: false)
        } else {
            promise.resolve(true)
        }
    }

    @ReactMethod
    fun openFullScreenIntentSettings(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= 34) {
                val intent = Intent("android.settings.MANAGE_APP_USE_FULL_SCREEN_INTENT").apply {
                    data = Uri.parse("package:${reactContext.packageName}")
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
                reactContext.startActivity(intent)
            }
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("ERR", e.message ?: "error")
        }
    }

    @ReactMethod
    fun isBatteryOptimizationIgnored(promise: Promise) {
        val pm = reactContext.getSystemService(PowerManager::class.java)
        promise.resolve(pm?.isIgnoringBatteryOptimizations(reactContext.packageName) ?: false)
    }

    @ReactMethod fun addListener(eventName: String) {}
    @ReactMethod fun removeListeners(count: Int) {}
}
