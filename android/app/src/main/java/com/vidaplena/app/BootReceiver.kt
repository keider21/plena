package com.vidaplena.app

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action
        Log.d("VPBoot", "Boot received: $action")

        if (action == Intent.ACTION_BOOT_COMPLETED ||
            action == "android.intent.action.QUICKBOOT_POWERON" ||
            action == "com.htc.intent.action.QUICKBOOT_POWERON") {

            // Aquí podríamos iniciar un servicio para reprogramar alarmas
            // Por ahora, el App.js lo hará al abrirse, pero ideally
            // registraríamos un WorkManager aquí.
        }
    }
}
