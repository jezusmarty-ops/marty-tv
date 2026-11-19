package tv.martytv.app

import android.annotation.SuppressLint
import android.os.Bundle
import android.view.KeyEvent
import android.view.View
import android.view.ViewGroup
import android.view.WindowManager
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import androidx.appcompat.app.AppCompatActivity

/**
 * Toca vídeos pelo PLAYER OFICIAL de cada plataforma (YouTube, Vimeo, Dailymotion, gloria.tv),
 * embutido numa página mínima. Nada é baixado nem desviado do player deles.
 *
 * Segurança: este WebView é separado do app — não tem a ponte JavaScript (NativePlayer),
 * então nenhuma página de fora consegue mexer no Marty TV. Links que tentam abrir outra
 * página são bloqueados (só os domínios do próprio player carregam).
 */
class EmbedActivity : AppCompatActivity() {

    companion object {
        const val EXTRA_KIND = "kind"   // youtube | ytlive | vimeo | dailymotion | gloria
        const val EXTRA_ID = "id"
        const val EXTRA_TITLE = "title"

        private val PERMITIDOS = listOf(
            "youtube-nocookie.com", "youtube.com", "ytimg.com", "googlevideo.com", "google.com", "gstatic.com", "ggpht.com",
            "vimeo.com", "vimeocdn.com", "akamaized.net",
            "dailymotion.com", "dmcdn.net", "dm-event.net",
            "gloria.tv", "gloriatv.net",
            "martytv.app",
        )
    }

    private lateinit var web: WebView
    private var fullscreenView: View? = null
    private var customCallback: WebChromeClient.CustomViewCallback? = null

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        val root = FrameLayout(this)
        root.setBackgroundColor(0xFF000000.toInt())
        web = WebView(this)
        root.addView(web, FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT))
        setContentView(root)

        with(web.settings) {
            javaScriptEnabled = true
            domStorageEnabled = true
            mediaPlaybackRequiresUserGesture = false
            loadWithOverviewMode = true
            useWideViewPort = true
            textZoom = 100
        }
        web.setBackgroundColor(0xFF000000.toInt())
        web.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                // só deixa navegar dentro dos domínios do player; o resto é bloqueado
                val host = request.url.host ?: return true
                return PERMITIDOS.none { host == it || host.endsWith(".$it") }
            }
        }
        web.webChromeClient = object : WebChromeClient() {
            override fun onShowCustomView(view: View, callback: CustomViewCallback) {
                fullscreenView = view; customCallback = callback
                root.addView(view, FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT))
                web.visibility = View.GONE
            }
            override fun onHideCustomView() {
                fullscreenView?.let { root.removeView(it) }
                fullscreenView = null
                web.visibility = View.VISIBLE
                customCallback?.onCustomViewHidden()
            }
        }

        val kind = intent.getStringExtra(EXTRA_KIND) ?: ""
        val id = (intent.getStringExtra(EXTRA_ID) ?: "").replace(Regex("[^A-Za-z0-9_-]"), "")
        if (id.isEmpty()) { finish(); return }
        val src = when (kind) {
            "youtube" -> "https://www.youtube-nocookie.com/embed/$id?autoplay=1&rel=0&playsinline=0&fs=1"
            "ytlive" -> "https://www.youtube-nocookie.com/embed/live_stream?channel=$id&autoplay=1&rel=0"
            "vimeo" -> "https://player.vimeo.com/video/$id?autoplay=1"
            "dailymotion" -> "https://www.dailymotion.com/embed/video/$id?autoplay=1"
            "gloria" -> "https://gloria.tv/post/$id/embed"
            else -> { finish(); return }
        }
        // Página mínima com o player oficial ocupando a tela toda.
        // A origem "https://martytv.app" vira o Referer — o YouTube recusa embed sem ele (erro 153).
        val html = """
            <!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">
            <style>html,body{margin:0;height:100%;background:#000;overflow:hidden}
            iframe{position:fixed;top:0;left:0;width:100%;height:100%;border:0}</style></head>
            <body><iframe id="p" src="$src" allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
            allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>
            <script>var f=document.getElementById('p');f.addEventListener('load',function(){f.focus();});</script>
            </body></html>
        """.trimIndent()
        web.loadDataWithBaseURL("https://martytv.app/", html, "text/html", "utf-8", null)
        web.requestFocus()
    }

    override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
        if (keyCode == KeyEvent.KEYCODE_BACK || keyCode == KeyEvent.KEYCODE_ESCAPE) {
            if (fullscreenView != null) { web.webChromeClient?.onHideCustomView(); return true }
            finish(); return true
        }
        // OK do controle = espaço (play/pausa nos players oficiais)
        if (keyCode == KeyEvent.KEYCODE_DPAD_CENTER || keyCode == KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE) {
            web.dispatchKeyEvent(KeyEvent(KeyEvent.ACTION_DOWN, KeyEvent.KEYCODE_SPACE))
            web.dispatchKeyEvent(KeyEvent(KeyEvent.ACTION_UP, KeyEvent.KEYCODE_SPACE))
            return true
        }
        return super.onKeyDown(keyCode, event)
    }

    override fun onPause() { web.onPause(); super.onPause() }
    override fun onResume() { super.onResume(); web.onResume() }
    override fun onDestroy() {
        (web.parent as? ViewGroup)?.removeView(web)
        web.destroy()
        super.onDestroy()
    }
}
