package tv.martytv.app

import android.os.Bundle
import android.view.WindowManager
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.media3.common.MediaItem
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.ui.PlayerView

class PlayerActivity : AppCompatActivity() {

    private var player: ExoPlayer? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_player)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

        val url = intent.getStringExtra("url")
        val title = intent.getStringExtra("title") ?: ""
        if (url.isNullOrEmpty()) {
            finish()
            return
        }

        findViewById<TextView>(R.id.pTitle).text = title
        findViewById<TextView>(R.id.pMeta).text = intent.getStringExtra("meta") ?: ""
        findViewById<TextView>(R.id.pBack).setOnClickListener { finish() }

        val p = ExoPlayer.Builder(this).build()
        player = p
        findViewById<PlayerView>(R.id.playerView).player = p
        p.setMediaItem(MediaItem.fromUri(url))
        p.prepare()
        p.playWhenReady = true
    }

    override fun onStop() {
        player?.release()
        player = null
        super.onStop()
    }
}
