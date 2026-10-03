package com.aviad.bama

import android.content.Context
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.OutputStream
import java.net.Inet4Address
import java.net.NetworkInterface
import java.net.ServerSocket
import java.net.Socket
import java.util.concurrent.CopyOnWriteArrayList
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import kotlin.concurrent.thread

/**
 * Tiny local web server that serves the stage viewer (assets/viewer.html)
 * and streams the live prompter state to every connected screen via
 * Server-Sent Events on /events.
 */
class CastServer(private val context: Context) {

    @Volatile var state: String = "{\"idle\":true}"
        private set
    var port: Int = 0
        private set

    /** Current stage background image (id, JPEG bytes). */
    @Volatile var bg: Pair<String, ByteArray>? = null

    private var server: ServerSocket? = null
    /** Sets shared with band members: token -> JSON. */
    val shares = java.util.concurrent.ConcurrentHashMap<String, String>()
    private val clients = CopyOnWriteArrayList<OutputStream>()
    private val sender = Executors.newSingleThreadScheduledExecutor()

    init {
        sender.scheduleWithFixedDelay({ broadcast(": ping\n\n".toByteArray()) }, 15, 15, TimeUnit.SECONDS)
    }

    val running: Boolean get() = server != null

    @Synchronized
    fun start(): Int {
        if (server != null) return port
        for (p in intArrayOf(8080, 8081, 8888, 9090, 0)) {
            try {
                val s = ServerSocket(p)
                s.reuseAddress = true
                server = s
                port = s.localPort
                break
            } catch (_: Exception) { }
        }
        val s = server ?: return 0
        thread(isDaemon = true, name = "cast-accept") {
            while (!s.isClosed) {
                try {
                    val c = s.accept()
                    thread(isDaemon = true) { handle(c) }
                } catch (_: Exception) {
                    break
                }
            }
        }
        return port
    }

    @Synchronized
    fun stop() {
        try { server?.close() } catch (_: Exception) { }
        server = null
        for (c in clients) try { c.close() } catch (_: Exception) { }
        clients.clear()
        state = "{\"idle\":true}"
    }

    fun shutdown() {
        stop()
        sender.shutdownNow()
    }

    fun push(json: String) {
        state = json
        broadcast(("data: $json\n\n").toByteArray(Charsets.UTF_8))
    }

    private fun broadcast(bytes: ByteArray) {
        if (clients.isEmpty()) return
        try {
            sender.execute {
                for (c in clients) {
                    try {
                        c.write(bytes)
                        c.flush()
                    } catch (_: Exception) {
                        clients.remove(c)
                        try { c.close() } catch (_: Exception) { }
                    }
                }
            }
        } catch (_: Exception) { }
    }

    private fun handle(sock: Socket) {
        try {
            sock.soTimeout = 10000
            val reader = BufferedReader(InputStreamReader(sock.getInputStream(), Charsets.ISO_8859_1))
            val request = reader.readLine() ?: return sock.close()
            while (true) {
                val h = reader.readLine() ?: break
                if (h.isEmpty()) break
            }
            val parts = request.split(" ")
            var path = if (parts.size > 1) parts[1] else "/"
            val query = path.substringAfter('?', "")
            path = path.substringBefore('?').substringBefore('#')
            val out = sock.getOutputStream()

            if (path.startsWith("/share/")) {
                val token = path.removePrefix("/share/").trim('/')
                val json = shares[token]
                val wantJson = query.split('&').any { it == "json=1" }
                val (type, body) = when {
                    json == null -> "text/plain; charset=utf-8" to "The shared set is no longer available".toByteArray()
                    wantJson -> "application/json; charset=utf-8" to json.toByteArray(Charsets.UTF_8)
                    else -> "text/html; charset=utf-8" to sharePage(json).toByteArray(Charsets.UTF_8)
                }
                val code = if (json == null) "404 Not Found" else "200 OK"
                out.write(("HTTP/1.1 $code\r\nContent-Type: $type\r\nContent-Length: ${body.size}\r\nAccess-Control-Allow-Origin: *\r\nConnection: close\r\n\r\n").toByteArray())
                out.write(body)
                out.flush()
                sock.close()
                return
            }

            if (path == "/bg") {
                val b = bg
                if (b == null) {
                    out.write("HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\nConnection: close\r\n\r\n".toByteArray())
                } else {
                    out.write(("HTTP/1.1 200 OK\r\nContent-Type: image/jpeg\r\nContent-Length: ${b.second.size}\r\nAccess-Control-Allow-Origin: *\r\nCache-Control: max-age=86400\r\nConnection: close\r\n\r\n").toByteArray())
                    out.write(b.second)
                }
                out.flush()
                sock.close()
                return
            }

            if (path == "/events") {
                sock.soTimeout = 0
                out.write(
                    ("HTTP/1.1 200 OK\r\nContent-Type: text/event-stream; charset=utf-8\r\n" +
                        "Cache-Control: no-cache\r\nConnection: keep-alive\r\n" +
                        "Access-Control-Allow-Origin: *\r\n\r\n").toByteArray()
                )
                out.write(("retry: 1500\n\ndata: $state\n\n").toByteArray(Charsets.UTF_8))
                out.flush()
                clients.add(out)
                return
            }

            if (path == "/" || path.isEmpty()) path = "/viewer.html"
            val name = path.trimStart('/')
            val safe = name.isNotEmpty() && !name.contains("..") && name.matches(Regex("[A-Za-z0-9._/-]+")) &&
                name != "index.html"
            val bytes = if (safe) try {
                context.assets.open(name).use { it.readBytes() }
            } catch (_: Exception) { null } else null

            if (bytes == null) {
                val body = "Not found".toByteArray()
                out.write(("HTTP/1.1 404 Not Found\r\nContent-Type: text/plain\r\nContent-Length: ${body.size}\r\nConnection: close\r\n\r\n").toByteArray())
                out.write(body)
            } else {
                out.write(
                    ("HTTP/1.1 200 OK\r\nContent-Type: ${mime(name)}\r\nContent-Length: ${bytes.size}\r\n" +
                        "Cache-Control: max-age=300\r\nConnection: close\r\n\r\n").toByteArray()
                )
                out.write(bytes)
            }
            out.flush()
            sock.close()
        } catch (_: Exception) {
            try { sock.close() } catch (_: Exception) { }
        }
    }

    private fun sharePage(json: String): String {
        val safe = json.replace("</", "<\\/")
        return "<!doctype html><html lang=\"he\" dir=\"rtl\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">" +
            "<title>StagePromt – סט</title><style>body{margin:0;background:#111214;color:#F2EEE6;font-family:sans-serif;padding:24px}h1{margin:0 0 6px}li{margin:8px 0;font-size:18px}small{color:#A09A90}</style></head><body>" +
            "<h1 id=\"n\"></h1><p><small>כדי להוסיף את הסט: פתח את StagePromt ← קבלת סט מחבר להקה ← סרוק קוד.</small></p><ol id=\"l\"></ol>" +
            "<script>var d=" + safe + ";document.getElementById('n').textContent=d.name;d.songs.forEach(function(s){var li=document.createElement('li');li.textContent=s.title+(s.artist?' – '+s.artist:'');document.getElementById('l').appendChild(li)});</script></body></html>"
    }

    private fun mime(n: String): String = when (n.substringAfterLast('.', "").lowercase()) {
        "html" -> "text/html; charset=utf-8"
        "css" -> "text/css; charset=utf-8"
        "js" -> "application/javascript; charset=utf-8"
        "png" -> "image/png"
        "woff2" -> "font/woff2"
        "json" -> "application/json"
        else -> "application/octet-stream"
    }

    companion object {
        /** IPv4 addresses of this device on the local network (Wi-Fi / hotspot / Ethernet). */
        fun localIps(): List<String> {
            val list = mutableListOf<String>()
            try {
                val ifs = NetworkInterface.getNetworkInterfaces() ?: return list
                for (ni in ifs) {
                    if (!ni.isUp || ni.isLoopback) continue
                    for (a in ni.inetAddresses) {
                        if (a is Inet4Address && !a.isLoopbackAddress && a.isSiteLocalAddress) {
                            val ip = a.hostAddress ?: continue
                            val wifi = ni.name.startsWith("wlan") || ni.name.startsWith("ap") || ni.name.startsWith("swlan")
                            if (wifi) list.add(0, ip) else list.add(ip)
                        }
                    }
                }
            } catch (_: Exception) { }
            return list.distinct()
        }
    }
}
