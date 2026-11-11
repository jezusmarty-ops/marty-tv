package tv.martytv.app

import android.annotation.SuppressLint
import android.content.ActivityNotFoundException
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.view.View
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import kotlin.concurrent.thread

/**
 * Tela principal: a interface é uma página web (assets/web) dentro de um WebView.
 * O vídeo toca no player nativo (PlayerActivity), que aguenta muito mais formatos.
 */
class MainActivity : AppCompatActivity() {

    private lateinit var web: WebView

    private val playerLauncher =
        registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { res ->
            val json = res.data?.getStringExtra(PlayerActivity.EXTRA_RESULT) ?: "{}"
            web.evaluateJavascript(
                "window.martyPlayerResult && martyPlayerResult(${JSONObject.quote(json)})", null
            )
        }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        web = findViewById(R.id.web)
        with(web.settings) {
            javaScriptEnabled = true
            domStorageEnabled = true
            mediaPlaybackRequiresUserGesture = false
            allowFileAccess = true
            textZoom = 100 // a TV não deve aumentar a letra por conta própria
        }
        web.setBackgroundColor(0xFF07080D.toInt())
        web.webViewClient = WebViewClient()
        web.webChromeClient = WebChromeClient()
        web.addJavascriptInterface(NativeBridge(), "NativePlayer")
        web.isFocusable = true
        web.isFocusableInTouchMode = true
        web.loadUrl("file:///android_asset/web/index.html")
        web.requestFocus(View.FOCUS_DOWN)
    }

    @Deprecated("Ainda é o jeito que funciona em todos os Androids de TV box")
    override fun onBackPressed() {
        // a página decide: voltar de tela, fechar janela ou pedir 2º VOLTAR para sair
        web.evaluateJavascript("window.martyBack ? martyBack() : false") { r ->
            if (r != "true") finish()
        }
    }

    override fun onDestroy() {
        web.destroy()
        super.onDestroy()
    }

    /** Ponte JS -> Android. Só a nossa página (assets) é carregada neste WebView. */
    inner class NativeBridge {

        @android.webkit.JavascriptInterface
        fun playList(itemsJson: String, index: Int, lang: String) {
            runOnUiThread {
                val i = Intent(this@MainActivity, PlayerActivity::class.java)
                    .putExtra(PlayerActivity.EXTRA_ITEMS, itemsJson)
                    .putExtra(PlayerActivity.EXTRA_INDEX, index)
                    .putExtra(PlayerActivity.EXTRA_LANG, lang)
                playerLauncher.launch(i)
            }
        }

        /** Abre outro app instalado (Pluto TV, YouTube...). */
        @android.webkit.JavascriptInterface
        fun openApp(pkg: String): Boolean {
            val pm = packageManager
            val intent = pm.getLeanbackLaunchIntentForPackage(pkg)
                ?: pm.getLaunchIntentForPackage(pkg)
                ?: return false
            return try {
                startActivity(intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)); true
            } catch (e: Exception) {
                false
            }
        }

        /** Abre a loja (se a TV tiver uma) na página do app. */
        @android.webkit.JavascriptInterface
        fun openStore(pkg: String): Boolean = try {
            startActivity(
                Intent(Intent.ACTION_VIEW, Uri.parse("market://details?id=$pkg"))
                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            ); true
        } catch (e: ActivityNotFoundException) {
            false
        }

        /** Baixa a lista de canais pelo Android (evita bloqueios do navegador). */
        @android.webkit.JavascriptInterface
        fun fetchText(url: String, callbackId: String) {
            if (!url.startsWith("https://")) return
            thread(name = "marty-fetch") {
                var ok = false
                var body = ""
                try {
                    val c = URL(url).openConnection() as HttpURLConnection
                    c.connectTimeout = 10000
                    c.readTimeout = 20000
                    c.setRequestProperty("User-Agent", "MartyTV/" + BuildConfig.VERSION_NAME)
                    if (c.responseCode == 200) {
                        body = c.inputStream.bufferedReader().use { it.readText() }
                        ok = true
                    }
                    c.disconnect()
                } catch (e: Exception) {
                    ok = false
                }
                val js = "window.martyFetchDone && martyFetchDone(" +
                    JSONObject.quote(callbackId) + "," + ok + "," + JSONObject.quote(body) + ")"
                runOnUiThread { web.evaluateJavascript(js, null) }
            }
        }

        @android.webkit.JavascriptInterface
        fun version(): String = BuildConfig.VERSION_NAME
    }
}
