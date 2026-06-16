package com.vidaplena.app

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

// Cuando el teléfono reinicia, las alarmas del AlarmManager se pierden.
// Este receiver marca que hay que re-agendar, y cuando el usuario abre la app
// DashboardScreen llama rescheduleAll automáticamente.
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED ||
            intent.action == "android.intent.action.QUICKBOOT_POWERON") {
            // Marca en preferencias que se necesita re-agendar
            context.getSharedPreferences("FSN_PREFS", Context.MODE_PRIVATE)
                .edit()
                .putBoolean("NEEDS_RESCHEDULE", true)
                .apply()
        }
    }
}
