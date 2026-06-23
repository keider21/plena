package com.vidaplena.app

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.PowerManager
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat

class AlarmReceiver : BroadcastReceiver() {

    companion object {
        const val EXTRA_ID = "fsn_id"
        const val EXTRA_TITLE = "fsn_title"
        const val EXTRA_BODY = "fsn_body"
        const val EXTRA_DATA = "fsn_data"
        const val EXTRA_NOTIF_INT_ID = "fsn_notif_int_id"
        private const val CHANNEL_ID = "fsn_alarmas"
        private const val TAG = "VPAlarm"

        fun ensureChannel(context: Context) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val ch = NotificationChannel(
                    CHANNEL_ID, "Alarmas Vida Plena",
                    NotificationManager.IMPORTANCE_HIGH
                ).apply {
                    enableVibration(true)
                    vibrationPattern = longArrayOf(0, 400, 200, 400, 200, 400)
                    setBypassDnd(true)
                }
                context.getSystemService(NotificationManager::class.java)?.createNotificationChannel(ch)
            }
        }
    }

    override fun onReceive(context: Context, intent: Intent) {
        Log.d(TAG, "Alarm received! Action: ${intent.action}")

        // Wake lock: mantiene el CPU activo el tiempo suficiente para lanzar el popup
        val pm = context.getSystemService(PowerManager::class.java)
        val wl = pm?.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "VidaPlena:AlarmWL")
        wl?.acquire(15_000L)

        try {
            val id = intent.getStringExtra(EXTRA_ID) ?: return
            val title = intent.getStringExtra(EXTRA_TITLE) ?: "Actividad"
            val body = intent.getStringExtra(EXTRA_BODY) ?: ""
            val data = intent.getStringExtra(EXTRA_DATA) ?: "{}"
            val notifIntId = id.hashCode()

            Log.d(TAG, "Processing alarm id: $id, title: $title")

            // Emit to React Native if app is in foreground
            FullScreenNotifModule.emitShow(id, title, body, data)

            ensureChannel(context)

            // fullScreenIntent → PopupActivity (fires when screen is OFF / phone idle)
            val popupIntent = Intent(context, PopupActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                putExtra(EXTRA_ID, id)
                putExtra(EXTRA_TITLE, title)
                putExtra(EXTRA_BODY, body)
                putExtra(EXTRA_DATA, data)
                putExtra(EXTRA_NOTIF_INT_ID, notifIntId)
            }
            val fullScreenPi = PendingIntent.getActivity(
                context, notifIntId, popupIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            // Content tap → open app
            val openPi = PendingIntent.getActivity(
                context, notifIntId + 100,
                Intent(context, MainActivity::class.java).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
                },
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            val iconRes = context.resources.getIdentifier("notification_icon", "drawable", context.packageName)
                .takeIf { it != 0 } ?: android.R.drawable.ic_dialog_info

            val notification = NotificationCompat.Builder(context, CHANNEL_ID)
                .setSmallIcon(iconRes)
                .setContentTitle(title)
                .setContentText(body)
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setCategory(NotificationCompat.CATEGORY_ALARM)
                .setFullScreenIntent(fullScreenPi, true)
                .setContentIntent(openPi)
                .setAutoCancel(true)
                .setOngoing(true) // Hace que la notif sea más difícil de ignorar
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .build()

            try {
                Log.d(TAG, "Displaying notification $notifIntId")
                NotificationManagerCompat.from(context).notify(notifIntId, notification)
            } catch (e: SecurityException) {
                Log.e(TAG, "SecurityException displaying notif: ${e.message}")
            }

        } catch (e: Exception) {
            Log.e(TAG, "Error in onReceive: ${e.message}")
        } finally {
            wl?.release()
        }
    }
}
