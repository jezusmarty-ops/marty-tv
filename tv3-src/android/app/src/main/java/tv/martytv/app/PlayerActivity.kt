package tv.martytv.app

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.KeyEvent
import android.view.View
import android.view.WindowManager
import android.widget.ProgressBar
import android.widget.TextView
import androidx.annotation.OptIn
import androidx.appcompat.app.AppCompatActivity
import androidx.media3.common.MediaItem
import androidx.media3.common.MimeTypes
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi
import androidx.media3.datasource.DefaultHttpDataSource
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory
import androidx.media3.ui.PlayerView
import org.json.JSONArray
import org.json.JSONObject

/**
 * Player de TV ao vivo.
 *  ▲ / ▼ (ou CH+ / CH-)  troca de canal dentro da lista de onde a pessoa veio
 *  OK / ◀ / ▶            mostra o nome do canal
 *  VOLTAR                volta para a lista
 * Canal que não abre é marcado como "fora do ar" e a interface fica sabendo.
 */
@OptIn(UnstableApi::class)
class PlayerActivity : AppCompatActivity() {

    companion object {
        const val EXTRA_ITEMS = "items"
        const val EXTRA_INDEX = "index"
        const val EXTRA_LANG = "lang"
        const val EXTRA_RESULT = "result"
        private const val LOAD_TIMEOUT_MS = 20_000L
        private const val INFO_MS = 4_000L
    }

    private data class Item(val id: String, val name: String, val url: String, val ua: String, val ref: String, val meta: String)

    private var player: ExoPlayer? = null
    private lateinit var playerView: PlayerView
    private lateinit var info: View
    private lateinit var tName: TextView
    private lateinit var tMeta: TextView
    private lateinit var tNum: TextView
    private lateinit var tError: TextView
    private lateinit var spinner: ProgressBar

    private val items = ArrayList<Item>()
    private var index = 0
    private var lang = "pt"
    private var retried = false
    private val broken = LinkedHashSet<String>()
    private val ok = LinkedHashSet<String>()

    private val ui = Handler(Looper.getMainLooper())
    private val hideInfo = Runnable { info.visibility = View.GONE }
    private val loadTimeout = Runnable { onFail() }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_player)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

        playerView = findViewById(R.id.playerView)
        info = findViewById(R.id.info)
        tName = findViewById(R.id.pTitle)
        tMeta = findViewById(R.id.pMeta)
        tNum = findViewById(R.id.pNum)
        tError = findViewById(R.id.pError)
        spinner = findViewById(R.id.pSpinner)

        lang = intent.getStringExtra(EXTRA_LANG) ?: "pt"
        findViewById<TextView>(R.id.pLive).text = t("● AO VIVO", "● EN VIVO")
        try {
            val arr = JSONArray(intent.getStringExtra(EXTRA_ITEMS) ?: "[]")
            for (i in 0 until arr.length()) {
                val o = arr.getJSONObject(i)
                val url = o.optString("u")
                if (url.startsWith("http")) {
                    items.add(Item(o.optString("id"), o.optString("n"), url, o.optString("ua"), o.optString("rf"), o.optString("meta")))
                }
            }
        } catch (e: Exception) { /* lista inválida: fecha abaixo */ }
        index = intent.getIntExtra(EXTRA_INDEX, 0).coerceIn(0, maxOf(0, items.size - 1))
        if (items.isEmpty()) { finishWithResult(); return }
    }

    override fun onStart() {
        super.onStart()
        if (items.isNotEmpty()) startChannel()
    }

    override fun onStop() {
        ui.removeCallbacksAndMessages(null)
        player?.release()
        player = null
        super.onStop()
    }

    private fun t(pt: String, es: String) = if (lang == "es") es else pt

    private fun startChannel() {
        val it = items[index]
        retried = false
        tError.visibility = View.GONE
        spinner.visibility = View.VISIBLE
        showInfo()

        val http = DefaultHttpDataSource.Factory()
            .setUserAgent(if (it.ua.isNotEmpty()) it.ua else "Mozilla/5.0 (Linux; Android 11) MartyTV/" + BuildConfig.VERSION_NAME)
            .setAllowCrossProtocolRedirects(true)
            .setConnectTimeoutMs(12_000)
            .setReadTimeoutMs(15_000)
        if (it.ref.isNotEmpty()) http.setDefaultRequestProperties(mapOf("Referer" to it.ref))

        player?.release()
        val p = ExoPlayer.Builder(this)
            .setMediaSourceFactory(DefaultMediaSourceFactory(this).setDataSourceFactory(http))
            .build()
        player = p
        playerView.player = p
        playerView.useController = false
        p.addListener(object : Player.Listener {
            override fun onPlaybackStateChanged(state: Int) {
                when (state) {
                    Player.STATE_READY -> {
                        ui.removeCallbacks(loadTimeout)
                        spinner.visibility = View.GONE
                        tError.visibility = View.GONE
                        ok.add(it.id); broken.remove(it.id)
                    }
                    Player.STATE_BUFFERING -> spinner.visibility = View.VISIBLE
                    else -> {}
                }
            }

            override fun onPlayerError(error: PlaybackException) {
                if (error.errorCode == PlaybackException.ERROR_CODE_BEHIND_LIVE_WINDOW) {
                    p.seekToDefaultPosition(); p.prepare(); return
                }
                if (!retried) { // uma segunda chance: muitos canais falham só na 1ª conexão
                    retried = true
                    ui.postDelayed({ if (player === p) { p.prepare(); p.play() } }, 1500)
                    return
                }
                onFail()
            }
        })
        val builder = MediaItem.Builder().setUri(Uri.parse(it.url))
        if (it.url.contains(".m3u8", ignoreCase = true)) builder.setMimeType(MimeTypes.APPLICATION_M3U8)
        p.setMediaItem(builder.build())
        p.prepare()
        p.playWhenReady = true
        ui.removeCallbacks(loadTimeout)
        ui.postDelayed(loadTimeout, LOAD_TIMEOUT_MS)
    }

    private fun onFail() {
        ui.removeCallbacks(loadTimeout)
        val it = items[index]
        if (!ok.contains(it.id)) broken.add(it.id)
        spinner.visibility = View.GONE
        tError.text = t(
            "Este canal está fora do ar agora.\n▲ ▼ para outro canal  ·  VOLTAR para a lista",
            "Este canal está fuera del aire ahora.\n▲ ▼ para otro canal  ·  ATRÁS para la lista"
        )
        tError.visibility = View.VISIBLE
        showInfo(persist = true)
    }

    private fun showInfo(persist: Boolean = false) {
        val it = items[index]
        tName.text = it.name
        tMeta.text = it.meta
        tNum.text = if (items.size > 1) "${index + 1} / ${items.size}   ▲▼" else ""
        info.visibility = View.VISIBLE
        ui.removeCallbacks(hideInfo)
        if (!persist) ui.postDelayed(hideInfo, INFO_MS)
    }

    private fun zap(step: Int) {
        if (items.size < 2) return
        index = (index + step + items.size) % items.size
        startChannel()
    }

    override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
        when (keyCode) {
            KeyEvent.KEYCODE_DPAD_DOWN, KeyEvent.KEYCODE_CHANNEL_UP, KeyEvent.KEYCODE_PAGE_DOWN -> { zap(+1); return true }
            KeyEvent.KEYCODE_DPAD_UP, KeyEvent.KEYCODE_CHANNEL_DOWN, KeyEvent.KEYCODE_PAGE_UP -> { zap(-1); return true }
            KeyEvent.KEYCODE_DPAD_CENTER, KeyEvent.KEYCODE_ENTER, KeyEvent.KEYCODE_DPAD_LEFT,
            KeyEvent.KEYCODE_DPAD_RIGHT, KeyEvent.KEYCODE_INFO, KeyEvent.KEYCODE_MENU -> { showInfo(); return true }
            KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE -> { player?.let { it.playWhenReady = !it.playWhenReady }; return true }
            KeyEvent.KEYCODE_BACK, KeyEvent.KEYCODE_ESCAPE -> { finishWithResult(); return true }
        }
        return super.onKeyDown(keyCode, event)
    }

    private fun finishWithResult() {
        val r = JSONObject()
        r.put("broken", JSONArray(broken.toList()))
        r.put("ok", JSONArray(ok.toList()))
        if (items.isNotEmpty()) r.put("last", items[index].id)
        setResult(RESULT_OK, Intent().putExtra(EXTRA_RESULT, r.toString()))
        finish()
    }
}
