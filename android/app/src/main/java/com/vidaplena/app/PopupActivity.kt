package com.vidaplena.app

import android.app.NotificationManager
import android.content.Intent
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.Bundle
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.widget.*
import androidx.appcompat.app.AppCompatActivity

class PopupActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Show over lock screen and wake display
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true)
            setTurnScreenOn(true)
        } else {
            @Suppress("DEPRECATION")
            window.addFlags(
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
            )
        }

        val id = intent.getStringExtra(AlarmReceiver.EXTRA_ID) ?: ""
        val title = intent.getStringExtra(AlarmReceiver.EXTRA_TITLE) ?: "Actividad"
        val body = intent.getStringExtra(AlarmReceiver.EXTRA_BODY) ?: ""
        val data = intent.getStringExtra(AlarmReceiver.EXTRA_DATA) ?: "{}"
        val notifId = intent.getIntExtra(AlarmReceiver.EXTRA_NOTIF_INT_ID, -1)

        setContentView(buildUI(id, title, body, data, notifId))
    }

    private fun dp(v: Int) = (v * resources.displayMetrics.density + 0.5f).toInt()

    private fun pill(bg: String, radius: Int = 14) = GradientDrawable().apply {
        setColor(Color.parseColor(bg))
        cornerRadius = dp(radius).toFloat()
    }

    private fun buildUI(id: String, title: String, body: String, data: String, notifId: Int): FrameLayout {

        // Semi-transparent full-screen backdrop
        val root = FrameLayout(this)
        root.setBackgroundColor(0xCC000000.toInt())

        // White-ish card
        val card = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(20), dp(18), dp(20), dp(18))
            background = pill("#F5F3FF", 20)
            elevation = dp(20).toFloat()
        }

        // App label
        card.addView(TextView(this).apply {
            text = "VIDA PLENA · PLAN"
            textSize = 10f
            setTextColor(Color.parseColor("#9CA3AF"))
            setPadding(0, 0, 0, dp(10))
        })

        // Icon + title row
        val row = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            setPadding(0, 0, 0, dp(8))
        }
        row.addView(TextView(this).apply { text = "🔔"; textSize = 22f; setPadding(0, 0, dp(10), 0) })
        row.addView(TextView(this).apply {
            text = title; textSize = 17f
            setTextColor(Color.parseColor("#1a1a2e"))
            typeface = Typeface.DEFAULT_BOLD
        })
        card.addView(row)

        // Body
        card.addView(TextView(this).apply {
            text = body; textSize = 13f
            setTextColor(Color.parseColor("#555555"))
            setPadding(0, 0, 0, dp(18))
        })

        // Divider
        val divLp = LinearLayout.LayoutParams(-1, 1).apply { bottomMargin = dp(14) }
        card.addView(View(this).apply { setBackgroundColor(Color.parseColor("#E5E7EB")) }, divLp)

        // Button row
        val btnRow = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL }

        data class BtnSpec(val label: String, val bg: String, val fg: String, val action: String)
        val specs = listOf(
            BtnSpec("✓ Aceptar",   "#7C3AED", "#FFFFFF", "ACEPTAR"),
            BtnSpec("⏰ +5 min",   "#EDE9FE", "#7C3AED", "POSPONER"),
            BtnSpec("✕ Cancelar", "#F0EEF8", "#666666", "RECHAZAR")
        )

        specs.forEachIndexed { i, spec ->
            val btn = Button(this).apply {
                text = spec.label
                setTextColor(Color.parseColor(spec.fg))
                textSize = 12f
                isAllCaps = false
                background = pill(spec.bg, 12)
                setOnClickListener { onAction(spec.action, id, data, notifId) }
            }
            val lp = LinearLayout.LayoutParams(0, dp(44), 1f)
            if (i < specs.size - 1) lp.rightMargin = dp(8)
            btnRow.addView(btn, lp)
        }
        card.addView(btnRow)

        val cardLp = FrameLayout.LayoutParams(-1, -2, Gravity.BOTTOM)
        cardLp.setMargins(dp(14), 0, dp(14), dp(40))
        root.addView(card, cardLp)
        return root
    }

    private fun onAction(action: String, id: String, data: String, notifId: Int) {
        if (notifId != -1) getSystemService(NotificationManager::class.java)?.cancel(notifId)
        FullScreenNotifModule.emitAction(action, id, data)
        // Bring React Native app to foreground so it can process the event
        startActivity(Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
        })
        finish()
    }
}
