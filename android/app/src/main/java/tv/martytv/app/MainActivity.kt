package tv.martytv.app

import android.annotation.SuppressLint
import android.content.Intent
import android.os.Bundle
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {

    private lateinit var web: WebView

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        web = findViewById(R.id.web)
        web.settings.javaScriptEnabled = true
        web.settings.domStorageEnabled = true
        web.settings.mediaPlaybackRequiresUserGesture = false
        web.webViewClient = WebViewClient()
        web.webChromeClient = WebChromeClient()
        web.addJavascriptInterface(NativeBridge(), "NativePlayer")
        web.loadUrl("file:///android_asset/web/index.html")
    }

    override fun onBackPressed() {
        if (web.canGoBack()) web.goBack() else super.onBackPressed()
    }

    /** Ponte JS -> player nativo (ExoPlayer): o app web chama NativePlayer.play(url, título) */
    inner class NativeBridge {
        @android.webkit.JavascriptInterface
        fun play(url: String, title: String, meta: String) {
            runOnUiThread {
                startActivity(
                    Intent(this@MainActivity, PlayerActivity::class.java)
                        .putExtra("url", url)
                        .putExtra("title", title)
                        .putExtra("meta", meta)
                )
            }
        }
    }
}
