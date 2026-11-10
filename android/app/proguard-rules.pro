# Regras do ProGuard/R8 (release não usa minificação por padrão)
-keep class tv.martytv.app.NativeBridge { *; }
-keepclassmembers class tv.martytv.app.MainActivity$NativeBridge {
    @android.webkit.JavascriptInterface <methods>;
}
