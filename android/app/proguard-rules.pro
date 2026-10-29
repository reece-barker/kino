# The javascript bridge methods are only called from the web page, so they have to survive shrinking
-keepclassmembers class page.reece.kino.MainActivity$Bridge {
    @android.webkit.JavascriptInterface <methods>;
}
