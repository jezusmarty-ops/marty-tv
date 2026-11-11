# A página web chama estes métodos pelo nome: o R8 não pode renomear nem apagar.
-keepclassmembers class tv.martytv.app.MainActivity$NativeBridge {
    @android.webkit.JavascriptInterface <methods>;
}
-keepattributes JavascriptInterface
