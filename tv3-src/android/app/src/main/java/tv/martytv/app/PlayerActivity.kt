package tv.martytv.app

import android.content.Context
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
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.MimeTypes
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.common.TrackSelectionOverride
import androidx.media3.common.Tracks
import androidx.media3.common.util.UnstableApi
import androidx.media3.datasource.DefaultHttpDataSource
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory
import androidx.media3.ui.PlayerView
import org.json.JSONArray
import org.json.JSONObject
import java.util.Locale

/**
 * Player de TV ao vivo.
 *  ▲ / ▼ (ou CH+ / CH-)  troca de canal dentro da lista de onde a pessoa veio
 *  OK                     mostra o nome do canal; OK de novo abre "Áudio e legendas"
 *  MENU                   abre "Áudio e legendas" direto
 *  VOLTAR                 volta para a lista
 * Canal que não abre é marcado como "fora do ar" e a interface fica sabendo.
 * A escolha de idioma de áudio/legenda fica guardada e vale para os próximos canais.
 */
@OptIn(UnstableApi::class)
class PlayerActivity : AppCompatActivity() {

    companion object {
        const val EXTRA_ITEMS = "items"
        const val EXTRA_INDEX = "index"
        const val EXTRA_LANG = "lang"
        const val EXTRA_RESULT = "result"
        const val EXTRA_VOD = "vod"          // filme/episódio: barra de tempo, sem troca de canal
        private const val LOAD_TIMEOUT_MS = 20_000L
        private const val INFO_MS = 5_000L
        private const val PREFS = "player"
        private const val P_AUDIO = "audioLang"   // "" = automático (idioma do app)
        private const val P_SUBS = "subsLang"     // "" = desligada
    }

    private data class Item(val id: String, val name: String, val url: String, val ua: String, val ref: String, val meta: String)

    /** Uma opção de faixa (áudio ou legenda) que o canal oferece agora. */
    private data class TrackOpt(val label: String, val lang: String, val group: Tracks.Group?, val index: Int)

    private var player: ExoPlayer? = null
    private lateinit var playerView: PlayerView
    private lateinit var info: View
    private lateinit var tName: TextView
    private lateinit var tMeta: TextView
    private lateinit var tNum: TextView
    private lateinit var tTracks: TextView
    private lateinit var tError: TextView
    private lateinit var spinner: ProgressBar

    private val items = ArrayList<Item>()
    private var index = 0
    private var lang = "pt"
    private var retried = false
    private val broken = LinkedHashSet<String>()
    private val ok = LinkedHashSet<String>()
    private var dialog: AlertDialog? = null
    private var vod = false
    private var resumed = false

    private val ui = Handler(Looper.getMainLooper())
    private val hideInfo = Runnable { info.visibility = View.GONE }
    private val loadTimeout = Runnable { onFail() }

    private val prefs by lazy { getSharedPreferences(PREFS, Context.MODE_PRIVATE) }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_player)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

        playerView = findViewById(R.id.playerView)
        info = findViewById(R.id.info)
        tName = findViewById(R.id.pTitle)
        tMeta = findViewById(R.id.pMeta)
        tNum = findViewById(R.id.pNum)
        tTracks = findViewById(R.id.pTracks)
        tError = findViewById(R.id.pError)
        spinner = findViewById(R.id.pSpinner)

        lang = intent.getStringExtra(EXTRA_LANG) ?: "pt"
        vod = intent.getBooleanExtra(EXTRA_VOD, false)
        findViewById<TextView>(R.id.pLive).text =
            if (vod) t("▶ FILMES E SÉRIES", "▶ PELÍCULAS Y SERIES") else t("● AO VIVO", "● EN VIVO")
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
        savePosition()
        ui.removeCallbacksAndMessages(null)
        dialog?.dismiss(); dialog = null
        player?.release()
        player = null
        super.onStop()
    }

    private fun t(pt: String, es: String) = if (lang == "es") es else pt

    // ------------------------------------------------------------------ idiomas
    /** Preferências de idioma aplicadas a cada canal novo. */
    private fun applyLanguagePrefs(p: ExoPlayer) {
        val audio = prefs.getString(P_AUDIO, "") ?: ""
        val subs = prefs.getString(P_SUBS, "") ?: ""
        val b = p.trackSelectionParameters.buildUpon()
            .setPreferredAudioLanguages(*(if (audio.isNotEmpty()) arrayOf(audio, lang) else arrayOf(lang)))
        if (subs.isEmpty()) {
            b.setTrackTypeDisabled(C.TRACK_TYPE_TEXT, true)
        } else {
            b.setTrackTypeDisabled(C.TRACK_TYPE_TEXT, false)
                .setPreferredTextLanguage(subs)
                .setSelectUndeterminedTextLanguage(true)
        }
        p.trackSelectionParameters = b.build()
    }

    private fun langName(code: String?): String {
        if (code.isNullOrBlank() || code == "und") return t("Original", "Original")
        val name = Locale(code).getDisplayLanguage(Locale(if (lang == "es") "es" else "pt", "BR"))
        return name.replaceFirstChar { it.uppercase() }
    }

    private fun options(type: Int): List<TrackOpt> {
        val p = player ?: return emptyList()
        val out = ArrayList<TrackOpt>()
        val seen = HashSet<String>()
        for (g in p.currentTracks.groups) {
            if (g.type != type) continue
            for (i in 0 until g.length) {
                if (!g.isTrackSupported(i)) continue
                val f = g.getTrackFormat(i)
                var label = f.label ?: langName(f.language)
                if (type == C.TRACK_TYPE_TEXT && (f.sampleMimeType ?: "").contains("608")) label += " (CC)"
                if (!seen.add(label)) continue
                out.add(TrackOpt(label, f.language ?: "", g, i))
            }
        }
        return out
    }

    private fun selectedLabel(type: Int): String? {
        val p = player ?: return null
        for (g in p.currentTracks.groups) {
            if (g.type != type) continue
            for (i in 0 until g.length) if (g.isTrackSelected(i)) {
                val f = g.getTrackFormat(i)
                return f.label ?: langName(f.language)
            }
        }
        return null
    }

    private fun updateTracksLine() {
        val audios = options(C.TRACK_TYPE_AUDIO)
        val subs = options(C.TRACK_TYPE_TEXT)
        val parts = ArrayList<String>()
        if (audios.size > 1) parts.add("🔊 " + (selectedLabel(C.TRACK_TYPE_AUDIO) ?: "—") + t(" (${audios.size} idiomas)", " (${audios.size} idiomas)"))
        if (subs.isNotEmpty()) parts.add("💬 " + (selectedLabel(C.TRACK_TYPE_TEXT) ?: t("Legenda desligada", "Subtítulos apagados")))
        if (parts.isEmpty()) { tTracks.visibility = View.GONE; return }
        tTracks.text = parts.joinToString("   ·   ") + "   —   " + t("OK: áudio e legendas", "OK: audio y subtítulos")
        tTracks.visibility = View.VISIBLE
    }

    /** Janela principal: escolher o que mudar. */
    private fun showTrackMenu() {
        val audios = options(C.TRACK_TYPE_AUDIO)
        val subs = options(C.TRACK_TYPE_TEXT)
        val rows = ArrayList<Pair<String, () -> Unit>>()
        rows.add(Pair("🔊  " + t("Áudio: ", "Audio: ") + (selectedLabel(C.TRACK_TYPE_AUDIO) ?: t("padrão", "predeterminado")) +
            if (audios.size > 1) "  ›" else t("  (só um)", "  (solo uno)")) { if (audios.size > 1) pickAudio(audios) })
        rows.add(Pair("💬  " + t("Legendas: ", "Subtítulos: ") + (selectedLabel(C.TRACK_TYPE_TEXT) ?: t("desligadas", "apagados")) +
            if (subs.isNotEmpty()) "  ›" else t("  (este canal não tem)", "  (este canal no tiene)")) { if (subs.isNotEmpty()) pickSubs(subs) })
        dialog = AlertDialog.Builder(this, R.style.Theme_MinhaTV_Dialog)
            .setTitle(t("Áudio e legendas", "Audio y subtítulos"))
            .setItems(rows.map { it.first }.toTypedArray()) { _, w -> rows[w].second() }
            .setOnDismissListener { dialog = null }
            .show()
    }

    private fun pickAudio(opts: List<TrackOpt>) {
        val labels = opts.map { it.label }.toTypedArray()
        val cur = labels.indexOf(selectedLabel(C.TRACK_TYPE_AUDIO))
        dialog = AlertDialog.Builder(this, R.style.Theme_MinhaTV_Dialog)
            .setTitle(t("Idioma do áudio", "Idioma del audio"))
            .setSingleChoiceItems(labels, cur) { d, w ->
                val o = opts[w]
                val p = player
                if (p != null && o.group != null) {
                    p.trackSelectionParameters = p.trackSelectionParameters.buildUpon()
                        .setOverrideForType(TrackSelectionOverride(o.group.mediaTrackGroup, o.index))
                        .build()
                }
                prefs.edit().putString(P_AUDIO, o.lang).apply()
                d.dismiss()
                ui.postDelayed({ updateTracksLine(); showInfo() }, 400)
            }
            .setOnDismissListener { dialog = null }
            .show()
    }

    private fun pickSubs(opts: List<TrackOpt>) {
        val all = listOf(TrackOpt(t("Desligadas", "Apagados"), "", null, -1)) + opts
        val labels = all.map { it.label }.toTypedArray()
        val sel = selectedLabel(C.TRACK_TYPE_TEXT)
        val cur = if (sel == null) 0 else labels.indexOf(sel).coerceAtLeast(0)
        dialog = AlertDialog.Builder(this, R.style.Theme_MinhaTV_Dialog)
            .setTitle(t("Legendas", "Subtítulos"))
            .setSingleChoiceItems(labels, cur) { d, w ->
                val o = all[w]
                val p = player
                if (p != null) {
                    val b = p.trackSelectionParameters.buildUpon()
                    if (o.group == null) {
                        b.clearOverridesOfType(C.TRACK_TYPE_TEXT).setTrackTypeDisabled(C.TRACK_TYPE_TEXT, true)
                        prefs.edit().putString(P_SUBS, "").apply()
                    } else {
                        b.setTrackTypeDisabled(C.TRACK_TYPE_TEXT, false)
                            .setOverrideForType(TrackSelectionOverride(o.group.mediaTrackGroup, o.index))
                        prefs.edit().putString(P_SUBS, o.lang.ifEmpty { lang }).apply()
                    }
                    p.trackSelectionParameters = b.build()
                }
                d.dismiss()
                ui.postDelayed({ updateTracksLine(); showInfo() }, 400)
            }
            .setOnDismissListener { dialog = null }
            .show()
    }

    // ------------------------------------------------------------------ canal
    private fun startChannel() {
        val it = items[index]
        retried = false
        tError.visibility = View.GONE
        tTracks.visibility = View.GONE
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
        applyLanguagePrefs(p)
        playerView.player = p
        playerView.useController = vod
        if (vod) {
            playerView.controllerShowTimeoutMs = 4000
            playerView.setShowNextButton(false)
            playerView.setShowPreviousButton(false)
        }
        resumed = false
        p.addListener(object : Player.Listener {
            override fun onPlaybackStateChanged(state: Int) {
                when (state) {
                    Player.STATE_READY -> {
                        ui.removeCallbacks(loadTimeout)
                        spinner.visibility = View.GONE
                        tError.visibility = View.GONE
                        ok.add(it.id); broken.remove(it.id)
                        // filme: continua de onde parou (se faltava mais de 2 min)
                        if (vod && !resumed) {
                            resumed = true
                            val pos = prefs.getLong("pos_" + it.id, 0L)
                            val dur = p.duration
                            if (pos > 30_000 && (dur <= 0 || pos < dur - 120_000)) p.seekTo(pos)
                        }
                    }
                    Player.STATE_ENDED -> if (vod) prefs.edit().remove("pos_" + it.id).apply()
                    Player.STATE_BUFFERING -> spinner.visibility = View.VISIBLE
                    else -> {}
                }
            }

            override fun onTracksChanged(tracks: Tracks) {
                updateTracksLine()
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

    private fun savePosition() {
        if (!vod || items.isEmpty()) return
        val p = player ?: return
        val pos = p.currentPosition
        if (pos > 30_000) prefs.edit().putLong("pos_" + items[index].id, pos).apply()
    }

    /** Filme: as setas e o OK vão para a barra de controle do player (avançar, voltar, pausar). */
    override fun dispatchKeyEvent(event: KeyEvent): Boolean {
        if (!vod || dialog != null) return super.dispatchKeyEvent(event)
        when (event.keyCode) {
            KeyEvent.KEYCODE_BACK, KeyEvent.KEYCODE_ESCAPE -> {
                if (event.action == KeyEvent.ACTION_UP) {
                    if (playerView.isControllerFullyVisible) playerView.hideController() else finishWithResult()
                }
                return true
            }
            KeyEvent.KEYCODE_MENU, KeyEvent.KEYCODE_CAPTIONS, KeyEvent.KEYCODE_MEDIA_AUDIO_TRACK -> {
                if (event.action == KeyEvent.ACTION_UP) showTrackMenu()
                return true
            }
        }
        if (!playerView.isControllerFullyVisible && event.action == KeyEvent.ACTION_DOWN) {
            playerView.showController()
            showInfo()
            if (event.keyCode == KeyEvent.KEYCODE_DPAD_CENTER || event.keyCode == KeyEvent.KEYCODE_ENTER) return true
        }
        return playerView.dispatchKeyEvent(event) || super.dispatchKeyEvent(event)
    }

    override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
        if (dialog != null) return super.onKeyDown(keyCode, event)
        when (keyCode) {
            KeyEvent.KEYCODE_DPAD_DOWN, KeyEvent.KEYCODE_CHANNEL_UP, KeyEvent.KEYCODE_PAGE_DOWN -> { zap(+1); return true }
            KeyEvent.KEYCODE_DPAD_UP, KeyEvent.KEYCODE_CHANNEL_DOWN, KeyEvent.KEYCODE_PAGE_UP -> { zap(-1); return true }
            KeyEvent.KEYCODE_DPAD_CENTER, KeyEvent.KEYCODE_ENTER -> {
                // 1º OK mostra o nome; com a faixa já aberta, abre áudio e legendas
                if (info.visibility == View.VISIBLE && tError.visibility != View.VISIBLE) showTrackMenu() else showInfo()
                return true
            }
            KeyEvent.KEYCODE_MENU, KeyEvent.KEYCODE_CAPTIONS, KeyEvent.KEYCODE_MEDIA_AUDIO_TRACK -> { showTrackMenu(); return true }
            KeyEvent.KEYCODE_DPAD_LEFT, KeyEvent.KEYCODE_DPAD_RIGHT, KeyEvent.KEYCODE_INFO -> { showInfo(); return true }
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
