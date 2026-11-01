# The javascript bridge methods are only called from the web page, so they have to survive shrinking
-keepclassmembers class page.reece.kino.MainActivity$Bridge {
    @android.webkit.JavascriptInterface <methods>;
}

# Kept readable so a crash report from a TV names the class and line instead of letters
-keepattributes SourceFile,LineNumberTable
-keepnames class page.reece.kino.**
