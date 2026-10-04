package com.aviad.bama

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.Worker
import androidx.work.WorkerParameters
import androidx.work.Constraints
import androidx.work.NetworkType
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.TimeUnit

/** Polls the Firestore "submissions" collection for the library owner and posts a notification for new songs. */
class SubmissionWorker(ctx: Context, params: WorkerParameters) : Worker(ctx, params) {

    companion object {
        private const val KEY = "AIzaSyAQj76Gha9yGidawfxbouvrE47teuzIsO4"
        private const val BASE = "https://firestore.googleapis.com/v1/projects/stagepromt/databases/(default)/documents"
        private const val PREFS = "sp-admin"
        private const val WORK = "sp-submissions"
        const val CHANNEL = "submissions"

        fun schedule(ctx: Context, refresh: String) {
            val p = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            if (refresh.isEmpty()) {
                p.edit().remove("refresh").apply()
                WorkManager.getInstance(ctx).cancelUniqueWork(WORK)
                return
            }
            p.edit().putString("refresh", refresh).apply()
            val req = PeriodicWorkRequestBuilder<SubmissionWorker>(15, TimeUnit.MINUTES)
                .setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
                .build()
            WorkManager.getInstance(ctx).enqueueUniquePeriodicWork(WORK, ExistingPeriodicWorkPolicy.KEEP, req)
        }
    }

    private fun http(method: String, url: String, body: String?, token: String?): String {
        val c = URL(url).openConnection() as HttpURLConnection
        c.requestMethod = method; c.connectTimeout = 15000; c.readTimeout = 20000
        c.setRequestProperty("Referer", "https://aviadderi1.github.io/")
        if (token != null) c.setRequestProperty("Authorization", "Bearer $token")
        if (body != null) { c.doOutput = true; c.setRequestProperty("Content-Type", "application/json"); c.outputStream.use { it.write(body.toByteArray()) } }
        val code = c.responseCode
        val t = (if (code >= 400) c.errorStream else c.inputStream)?.use { it.readBytes().toString(Charsets.UTF_8) } ?: ""
        c.disconnect()
        if (code >= 400) throw IllegalStateException("HTTP $code")
        return t
    }

    override fun doWork(): Result {
        val p = applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val refresh = p.getString("refresh", null) ?: return Result.success()
        return try {
            val tok = JSONObject(http("POST", "https://securetoken.googleapis.com/v1/token?key=$KEY",
                JSONObject().put("grant_type", "refresh_token").put("refresh_token", refresh).toString(), null))
            val idToken = tok.getString("id_token")
            tok.optString("refresh_token").takeIf { it.isNotEmpty() }?.let { p.edit().putString("refresh", it).apply() }
            val list = JSONObject(http("GET", "$BASE/submissions?pageSize=100", null, idToken))
            val docs = list.optJSONArray("documents")
            val seen = (p.getString("seen", "") ?: "").split(",").filter { it.isNotEmpty() }.toMutableSet()
            val fresh = mutableListOf<String>()
            val ids = mutableSetOf<String>()
            if (docs != null) for (i in 0 until docs.length()) {
                val d = docs.getJSONObject(i)
                val id = d.getString("name").substringAfterLast('/')
                ids.add(id)
                if (id !in seen) fresh.add(d.optJSONObject("fields")?.optJSONObject("title")?.optString("stringValue") ?: "שיר")
            }
            p.edit().putString("seen", ids.joinToString(",")).apply()
            if (fresh.isNotEmpty()) notify(fresh, ids.size)
            Result.success()
        } catch (e: Exception) { Result.retry() }
    }

    private fun notify(titles: List<String>, total: Int) {
        val ctx = applicationContext
        val nm = ctx.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (Build.VERSION.SDK_INT >= 26 && nm.getNotificationChannel(CHANNEL) == null)
            nm.createNotificationChannel(NotificationChannel(CHANNEL, "שירים חדשים במאגר", NotificationManager.IMPORTANCE_DEFAULT))
        val open = Intent(ctx, MainActivity::class.java).putExtra("openAdmin", true).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
        val pi = PendingIntent.getActivity(ctx, 7, open, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        val title = if (titles.size == 1) "שיר חדש נשלח למאגר" else "${titles.size} שירים חדשים נשלחו למאגר"
        val n = NotificationCompat.Builder(ctx, CHANNEL)
            .setSmallIcon(android.R.drawable.stat_notify_more)
            .setContentTitle(title)
            .setContentText(titles.joinToString(" · ") + if (total > titles.size) "  (סה\"כ $total ממתינים)" else "")
            .setContentIntent(pi).setAutoCancel(true).build()
        try { NotificationManagerCompat.from(ctx).notify(4242, n) } catch (_: SecurityException) { }
    }
}
