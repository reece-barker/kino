package page.reece.kino;

import android.app.Activity;
import android.app.DownloadManager;
import android.app.PictureInPictureParams;
import android.app.UiModeManager;
import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.res.Configuration;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.speech.RecognizerIntent;
import android.util.Rational;
import android.view.KeyEvent;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.URLUtil;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.RenderProcessGoneDetail;
import android.widget.FrameLayout;
import android.widget.Toast;

import org.json.JSONObject;

import java.util.ArrayList;

/**
 * Kino for android. Its the kino website in a full screen webview with the bits a browser cant do:
 * proper full screen video, picture in picture, the back button, tv remotes, voice search and downloads.
 * Everything else (profiles, the player, sign in, allowed devices) is the same web app as in the browser.
 */
public class MainActivity extends Activity {

    private static final int VOICE_REQUEST = 7;

    private static final int PLAYER_REQUEST = 43;
    private volatile long playerOpened;
    private String parkedUrl;
    private volatile String pendingResult, lastCrash, javaCrash;
    private boolean clearHistoryNext;
    private long playerClosed;

    private boolean lowMemory() {
        android.app.ActivityManager am = (android.app.ActivityManager) getSystemService(Context.ACTIVITY_SERVICE);
        android.app.ActivityManager.MemoryInfo mi = new android.app.ActivityManager.MemoryInfo();
        am.getMemoryInfo(mi);
        return am.isLowRamDevice() || mi.totalMem < 2_200_000_000L;
    }

    // Android says memory is getting tight, the page drops pictures it isnt showing right away
    @Override
    public void onTrimMemory(int level) {
        super.onTrimMemory(level);
        if (web != null && level >= TRIM_MEMORY_RUNNING_LOW) js("window.kinoTrim && window.kinoTrim(" + level + ")");
    }
    private static final String HOME = BuildConfig.KINO_URL;

    private FrameLayout root;
    private WebView web;
    private View fullView;
    private WebChromeClient.CustomViewCallback fullCallback;
    private boolean isTv;
    private volatile boolean playing;
    private boolean loadFailed;

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        CrashLog.install(this);
        takeJavaCrash();
        isTv = detectTv();

        Window w = getWindow();
        w.setStatusBarColor(Color.BLACK);
        w.setNavigationBarColor(Color.BLACK);

        root = new FrameLayout(this);
        root.setBackgroundColor(Color.BLACK);
        web = new WebView(this);
        web.setBackgroundColor(Color.BLACK);
        root.addView(web, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        setContentView(root);

        // Keeps the page out from under the status and navigation bars, newer android draws edge to edge by default
        root.setOnApplyWindowInsetsListener((v, insets) -> {
            if (fullView == null && !isTv) {
                int top, bottom, left, right;
                if (Build.VERSION.SDK_INT >= 30) {
                    android.graphics.Insets i = insets.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout());
                    top = i.top; bottom = i.bottom; left = i.left; right = i.right;
                } else {
                    top = insets.getSystemWindowInsetTop(); bottom = insets.getSystemWindowInsetBottom();
                    left = insets.getSystemWindowInsetLeft(); right = insets.getSystemWindowInsetRight();
                }
                web.setPadding(0, 0, 0, 0);
                FrameLayout.LayoutParams lp = (FrameLayout.LayoutParams) web.getLayoutParams();
                lp.setMargins(left, top, right, bottom);
                web.setLayoutParams(lp);
            }
            return insets;
        });

        setupWebView();
        if (isTv) hideSystemBars();

        String start = HOME;
        Uri data = getIntent() != null ? getIntent().getData() : null;
        if (data != null && isKinoLink(data)) start = data.toString();
        String parked = state != null ? state.getString("parked") : null;
        if (parked != null && parked.startsWith(HOME)) web.loadUrl(parked);
        else if (state != null) web.restoreState(state);
        else web.loadUrl(start);
    }

    // A crash the last run left behind: kept for the page to report, and if it came within 30 seconds of the player opening (or is in the player or
    // its libraries) the Kino Player is switched off on this device, so the next Play uses the web player instead of closing the app again
    private void takeJavaCrash() {
        android.content.SharedPreferences sp = getSharedPreferences("kino", MODE_PRIVATE);
        String c = sp.getString("javaCrash", null);
        if (c == null) return;
        sp.edit().remove("javaCrash").apply();
        try {
            JSONObject j = new JSONObject(c);
            if (System.currentTimeMillis() - j.optLong("t") > 86400000L) return;
            javaCrash = c;
            String s = j.optString("stack");
            long gap = j.optLong("t") - sp.getLong("playerAt", 0);
            boolean soon = gap >= 0 && gap < 30000;
            if (soon || s.contains("PlayerActivity") || s.contains("androidx.media3")) sp.edit().putBoolean("playerBroken", true).apply();
        } catch (Exception ignored) { }
    }

    private boolean detectTv() {
        UiModeManager ui = (UiModeManager) getSystemService(Context.UI_MODE_SERVICE);
        PackageManager pm = getPackageManager();
        return (ui != null && ui.getCurrentModeType() == Configuration.UI_MODE_TYPE_TELEVISION)
                || pm.hasSystemFeature(PackageManager.FEATURE_LEANBACK)
                || pm.hasSystemFeature("amazon.hardware.fire_tv");
    }

    private boolean isKino(Uri u) {
        Uri home = Uri.parse(HOME);
        return u != null && "https".equals(u.getScheme()) && home.getHost() != null && home.getHost().equalsIgnoreCase(u.getHost())
                && u.getUserInfo() == null && u.getPort() == -1 && !u.toString().contains("\\");
    }

    // For links other apps send in. Android and chromium read some odd urls differently (a backslash before an @ for one), so
    // these are checked as plain text, it has to start with the real address
    private boolean isKinoLink(Uri u) {
        if (u == null) return false;
        String s = u.toString();
        return (s.equals(HOME.substring(0, HOME.length() - 1)) || s.startsWith(HOME)) && !s.contains("\\") && isKino(u);
    }

    private void setupWebView() {
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        // The web app looks for these to switch on tv navigation and the native extras
        s.setUserAgentString(s.getUserAgentString() + " KinoAndroid/" + BuildConfig.VERSION_NAME + (isTv ? " KinoTV" : ""));

        CookieManager cookies = CookieManager.getInstance();
        cookies.setAcceptCookie(true);
        cookies.setAcceptThirdPartyCookies(web, false);

        web.addJavascriptInterface(new Bridge(), "KinoAndroid");
        if (Build.VERSION.SDK_INT >= 26) web.setRendererPriorityPolicy(WebView.RENDERER_PRIORITY_IMPORTANT, true);
        web.setFocusable(true);
        web.setFocusableInTouchMode(true);

        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest req) {
                Uri u = req.getUrl();
                if (isKino(u)) return false;
                // Only a real tap on the page can leave the app, not a script or a frame inside an embed
                if (!req.isForMainFrame() || !req.hasGesture()) return true;
                // And only to normal web links, no intent: or file: or market: tricks
                String sc = u.getScheme();
                if (!"https".equals(sc) && !"http".equals(sc)) return true;
                // Anything that isnt kino (like the imdb or addon links) opens in the normal browser
                try { startActivity(new Intent(Intent.ACTION_VIEW, u)); } catch (Exception ignored) { }
                return true;
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                CookieManager.getInstance().flush();
                // The blank page from while the player was open shouldnt be something back can go to
                if (clearHistoryNext && url != null && !url.startsWith("about:")) { clearHistoryNext = false; view.clearHistory(); }
            }

            // The page crashed, or android killed it to free memory (old fire tv sticks do this on big pages). Without
            // this the whole app closes, now it swaps in a fresh webview and opens the same page again
            @Override
            @android.annotation.TargetApi(26)
            public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
                String url = view.getUrl();
                // Kept so the page can tell the server what happened once its back, to find which pages are too heavy
                try {
                    android.app.ActivityManager am = (android.app.ActivityManager) getSystemService(Context.ACTIVITY_SERVICE);
                    android.app.ActivityManager.MemoryInfo mi = new android.app.ActivityManager.MemoryInfo();
                    am.getMemoryInfo(mi);
                    lastCrash = new JSONObject().put("url", url).put("crashed", detail.didCrash())
                            .put("free_mb", mi.availMem / 1048576).put("total_mb", mi.totalMem / 1048576)
                            .put("device", Build.MANUFACTURER + " " + Build.MODEL).put("android", Build.VERSION.RELEASE).toString();
                } catch (Exception ignored) { }
                recreateWeb(url != null && isKino(Uri.parse(url)) ? url : HOME);
                Toast.makeText(MainActivity.this, detail.didCrash() ? "Kino had a problem and reloaded" : "Kino reloaded to free up memory", Toast.LENGTH_SHORT).show();
                return true;
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest req, WebResourceError err) {
                if (req.isForMainFrame()) {
                    loadFailed = true;
                    showOffline();
                }
            }
        });

        web.setWebChromeClient(new WebChromeClient() {
            // The player asks for full screen, the webview hands over a view to show on top of everything
            @Override
            public void onShowCustomView(View view, CustomViewCallback callback) {
                if (fullView != null) { callback.onCustomViewHidden(); return; }
                fullView = view;
                fullCallback = callback;
                root.addView(view, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
                hideSystemBars();
            }

            @Override
            public void onHideCustomView() {
                if (fullView == null) return;
                root.removeView(fullView);
                fullView = null;
                if (fullCallback != null) fullCallback.onCustomViewHidden();
                fullCallback = null;
                if (!isTv) showSystemBars();
            }
        });

        web.setDownloadListener((url, userAgent, disposition, mime, length) -> download(url, userAgent, disposition, mime));
    }

    private void recreateWeb(String url) {
        WebView old = web;
        ViewGroup.LayoutParams lp = old.getLayoutParams();
        root.removeView(old);
        old.destroy();
        if (fullView != null) { root.removeView(fullView); fullView = null; fullCallback = null; }
        // The page that said it was playing is gone, so the screen is allowed to sleep again
        playing = false;
        getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        web = new WebView(this);
        web.setBackgroundColor(Color.BLACK);
        root.addView(web, 0, lp);
        setupWebView();
        web.loadUrl(url);
        web.requestFocus();
    }

    // ---- updating the app itself
    private String pendingUpdate;
    private final java.util.concurrent.atomic.AtomicBoolean updating = new java.util.concurrent.atomic.AtomicBoolean(false);

    private void startUpdate(String path) {
        // Android only lets an app install updates once its been allowed to, the first time that setting gets opened
        if (Build.VERSION.SDK_INT >= 26 && !getPackageManager().canRequestPackageInstalls()) {
            pendingUpdate = path;
            js("window.kinoUpdate && window.kinoUpdate({state:'permission'})");
            try {
                startActivity(new Intent(android.provider.Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + getPackageName())));
            } catch (ActivityNotFoundException e) {
                js("window.kinoUpdate && window.kinoUpdate({state:'error', message:'This device has no setting for installing apps'})");
            }
            return;
        }
        pendingUpdate = null;
        // Two downloads at once would write the same file
        if (!updating.compareAndSet(false, true)) return;
        String url = Uri.parse(HOME).buildUpon().path(path).build().toString();
        String ua = web.getSettings().getUserAgentString();
        new Thread(() -> {
            try {
                java.net.HttpURLConnection c = (java.net.HttpURLConnection) new java.net.URL(url).openConnection();
                // No redirects, the cookie would go along to wherever it pointed
                c.setInstanceFollowRedirects(false);
                c.setRequestProperty("User-Agent", ua);
                String cookie = CookieManager.getInstance().getCookie(url);
                if (cookie != null) c.setRequestProperty("Cookie", cookie);
                c.setConnectTimeout(20000);
                c.setReadTimeout(60000);
                if (c.getResponseCode() != 200) throw new Exception("The server said " + c.getResponseCode());
                long total = c.getContentLengthLong(), got = 0;
                java.io.File dir = new java.io.File(getCacheDir(), "updates");
                dir.mkdirs();
                java.io.File apk = new java.io.File(dir, "kino.apk");
                java.io.File part = new java.io.File(dir, "kino.apk.part");
                int last = -1;
                try (java.io.InputStream in = c.getInputStream(); java.io.FileOutputStream out = new java.io.FileOutputStream(part)) {
                    byte[] buf = new byte[64 * 1024];
                    int n;
                    while ((n = in.read(buf)) > 0) {
                        out.write(buf, 0, n);
                        got += n;
                        int pct = total > 0 ? (int) (got * 100 / total) : -1;
                        if (pct != last) { last = pct; js("window.kinoUpdate && window.kinoUpdate({state:'downloading', progress:" + pct + "})"); }
                    }
                }
                if (total > 0 && got != total) throw new Exception("The download got cut off, try again");
                // Android would refuse a wrong one anyway, but say so here instead of a vague installer error
                String bad = checkUpdate(part);
                if (bad != null) { part.delete(); throw new Exception(bad); }
                if (!part.renameTo(apk)) throw new Exception("Couldn't save the update");
                runOnUiThread(() -> {
                    Uri uri = UpdateProvider.uri(this);
                    Intent i = new Intent(Intent.ACTION_VIEW).setDataAndType(uri, "application/vnd.android.package-archive")
                            .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
                    js("window.kinoUpdate && window.kinoUpdate({state:'installing'})");
                    try { startActivity(i); }
                    catch (ActivityNotFoundException e) { js("window.kinoUpdate && window.kinoUpdate({state:'error', message:'No installer on this device'})"); }
                });
            } catch (Exception e) {
                String m = e.getMessage() == null ? "Download failed" : e.getMessage();
                js("window.kinoUpdate && window.kinoUpdate({state:'error', message:" + JSONObject.quote(m) + "})");
            } finally {
                updating.set(false);
            }
        }).start();
    }

    /** Looks inside the downloaded apk, returns what is wrong with it or null when it is a newer Kino with the same signing key */
    private String checkUpdate(java.io.File f) {
        PackageManager pm = getPackageManager();
        int flags = Build.VERSION.SDK_INT >= 28 ? PackageManager.GET_SIGNING_CERTIFICATES : PackageManager.GET_SIGNATURES;
        android.content.pm.PackageInfo got = pm.getPackageArchiveInfo(f.getPath(), flags);
        if (got == null) return "That isn't a valid app file";
        if (!getPackageName().equals(got.packageName)) return "That isn't the Kino app";
        long code = Build.VERSION.SDK_INT >= 28 ? got.getLongVersionCode() : got.versionCode;
        if (code <= BuildConfig.VERSION_CODE) return "That isn't a newer version";
        try {
            android.content.pm.PackageInfo mine = pm.getPackageInfo(getPackageName(), flags);
            android.content.pm.Signature[] a, b;
            if (Build.VERSION.SDK_INT >= 28) {
                if (got.signingInfo == null || mine.signingInfo == null) return "Couldn't check who signed the update";
                a = got.signingInfo.getApkContentsSigners();
                b = mine.signingInfo.getApkContentsSigners();
            } else {
                a = got.signatures;
                b = mine.signatures;
            }
            if (a == null || b == null || a.length == 0 || !java.util.Arrays.equals(a, b)) return "The update isn't signed with the same key as this app";
        } catch (Exception e) {
            return "Couldn't check who signed the update";
        }
        return null;
    }

    private void showOffline() {
        String html = "<html><head><meta name='viewport' content='width=device-width, initial-scale=1'><style>"
                + "body{margin:0;height:100vh;display:grid;place-items:center;background:#000;color:#fff;font-family:sans-serif;text-align:center}"
                + "h1{font-size:22px;margin:0 0 8px}p{color:#999;margin:0 0 24px;padding:0 24px}"
                + "button{font-size:17px;font-weight:600;padding:12px 28px;border-radius:12px;border:0;background:#fff;color:#000}"
                + "button:focus{outline:3px solid #0a84ff;outline-offset:3px}</style></head><body><div>"
                + "<h1>Kino can't be reached</h1><p>Check your internet connection, then try again.</p>"
                + "<button autofocus onclick='KinoAndroid.retry()'>Try Again</button></div></body></html>";
        web.loadDataWithBaseURL(null, html, "text/html", "utf-8", null);
    }

    // Downloads go through androids download manager with the kino cookies so they work for allowed devices
    private void download(String url, String ua, String disposition, String mime) {
        try {
            DownloadManager.Request r = new DownloadManager.Request(Uri.parse(url));
            String name = URLUtil.guessFileName(url, disposition, mime);
            String ck = CookieManager.getInstance().getCookie(url);
            if (ck != null) r.addRequestHeader("Cookie", ck);
            r.addRequestHeader("User-Agent", ua);
            r.setTitle(name);
            r.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
            r.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, name);
            DownloadManager dm = (DownloadManager) getSystemService(Context.DOWNLOAD_SERVICE);
            dm.enqueue(r);
            Toast.makeText(this, "Downloading " + name, Toast.LENGTH_SHORT).show();
        } catch (Exception e) {
            Toast.makeText(this, "Couldn't start the download", Toast.LENGTH_SHORT).show();
        }
    }

    private void hideSystemBars() {
        if (Build.VERSION.SDK_INT >= 30) {
            try {
                getWindow().getDecorView();  // the window's controls only exist once its decor view does (see PlayerActivity.hideBars)
                WindowInsetsController c = getWindow().getInsetsController();
                if (c != null) {
                    c.hide(WindowInsets.Type.systemBars());
                    c.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
                }
            } catch (RuntimeException ignored) { }
        } else {
            getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                    | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY | View.SYSTEM_UI_FLAG_LAYOUT_STABLE);
        }
    }

    private void showSystemBars() {
        if (Build.VERSION.SDK_INT >= 30) {
            WindowInsetsController c = getWindow().getInsetsController();
            if (c != null) c.show(WindowInsets.Type.systemBars());
        } else {
            getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LAYOUT_STABLE);
        }
    }

    private void js(String code) {
        runOnUiThread(() -> web.evaluateJavascript(code, null));
    }

    // Back first asks the page (closes a popup, the player or the profile menu), then goes back a page, then leaves
    @Override
    @SuppressWarnings("deprecation")
    public void onBackPressed() {
        if (fullView != null) {
            web.evaluateJavascript("document.fullscreenElement && document.exitFullscreen()", null);
            return;
        }
        if (loadFailed) { super.onBackPressed(); return; }
        // A back that was really for the player that just closed is ignored, otherwise the title page went back to Home
        if (System.currentTimeMillis() - playerClosed < 700) return;
        web.evaluateJavascript("window.kinoBack ? window.kinoBack() : false", result -> {
            if ("true".equals(result)) return;
            if (web.canGoBack()) web.goBack();
            else if (isTv) finish();
            else moveTaskToBack(true);
        });
    }

    // Play, pause and skip buttons on tv remotes and headphones
    @Override
    public boolean dispatchKeyEvent(KeyEvent e) {
        if (e.getAction() == KeyEvent.ACTION_DOWN) {
            String cmd = null;
            switch (e.getKeyCode()) {
                case KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE:
                case KeyEvent.KEYCODE_HEADSETHOOK: cmd = "playpause"; break;
                case KeyEvent.KEYCODE_MEDIA_PLAY: cmd = "play"; break;
                case KeyEvent.KEYCODE_MEDIA_PAUSE: cmd = "pause"; break;
                case KeyEvent.KEYCODE_MEDIA_FAST_FORWARD:
                case KeyEvent.KEYCODE_MEDIA_SKIP_FORWARD:
                case KeyEvent.KEYCODE_MEDIA_NEXT: cmd = "forward"; break;
                case KeyEvent.KEYCODE_MEDIA_REWIND:
                case KeyEvent.KEYCODE_MEDIA_SKIP_BACKWARD:
                case KeyEvent.KEYCODE_MEDIA_PREVIOUS: cmd = "back"; break;
                case KeyEvent.KEYCODE_MEDIA_STOP: cmd = "stop"; break;
                case KeyEvent.KEYCODE_SEARCH: js("location.hash = '#/search'"); return true;
            }
            if (cmd != null) { js("window.kinoMedia && window.kinoMedia('" + cmd + "')"); return true; }
        }
        return super.dispatchKeyEvent(e);
    }

    // Leaving the app while something plays shrinks it to picture in picture on phones and tablets
    @Override
    protected void onUserLeaveHint() {
        super.onUserLeaveHint();
        if (playing && !isTv && Build.VERSION.SDK_INT >= 26 && getPackageManager().hasSystemFeature(PackageManager.FEATURE_PICTURE_IN_PICTURE)) {
            try {
                enterPictureInPictureMode(new PictureInPictureParams.Builder().setAspectRatio(new Rational(16, 9)).build());
            } catch (IllegalStateException ignored) { }
        }
    }

    @Override
    public void onPictureInPictureModeChanged(boolean inPip, Configuration newConfig) {
        super.onPictureInPictureModeChanged(inPip, newConfig);
        js("window.kinoPip && window.kinoPip(" + inPip + ")");
    }

    @Override
    protected void onActivityResult(int request, int result, Intent data) {
        super.onActivityResult(request, result, data);
        if (request == PLAYER_REQUEST) {
            playerClosed = System.currentTimeMillis();
            // Tells the page where the player got to, so it can refresh progress or start the next episode
            String r = data != null ? data.getStringExtra("result") : null;
            if (parkedUrl != null) {
                // The page was let go while playing, it opens again and picks the result up itself
                pendingResult = r;
                clearHistoryNext = true;
                web.loadUrl(parkedUrl);
                parkedUrl = null;
                return;
            }
            js("window.kinoNativeDone && window.kinoNativeDone(" + (r != null ? r : "null") + ")");
            return;
        }
        if (request != VOICE_REQUEST) return;
        String text = "";
        if (result == RESULT_OK && data != null) {
            ArrayList<String> got = data.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS);
            if (got != null && !got.isEmpty()) text = got.get(0);
        }
        js("window.kinoVoice && window.kinoVoice(" + JSONObject.quote(text) + ")");
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        Uri data = intent.getData();
        if (data != null && isKinoLink(data)) web.loadUrl(data.toString());
    }

    @Override
    protected void onSaveInstanceState(Bundle out) {
        super.onSaveInstanceState(out);
        // While the page is let go for the player its url is about:blank, so keep the real one or coming back would be a black screen
        if (parkedUrl != null) out.putString("parked", parkedUrl);
        else web.saveState(out);
    }

    @Override
    protected void onPause() {
        super.onPause();
        CookieManager.getInstance().flush();
        if (!isInPip()) web.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        web.onResume();
        if (isTv) hideSystemBars();
        if (pendingUpdate != null && Build.VERSION.SDK_INT >= 26) {
            if (getPackageManager().canRequestPackageInstalls()) startUpdate(pendingUpdate);
            else { pendingUpdate = null; js("window.kinoUpdate && window.kinoUpdate({state:'denied'})"); }
        }
    }

    @Override
    protected void onDestroy() {
        root.removeAllViews();
        web.destroy();
        super.onDestroy();
    }

    private boolean isInPip() {
        return Build.VERSION.SDK_INT >= 24 && isInPictureInPictureMode();
    }

    /** What the web page can call as window.KinoAndroid */
    class Bridge {
        @JavascriptInterface public boolean isTv() { return isTv; }
        @JavascriptInterface public String version() { return BuildConfig.VERSION_NAME; }
        // The player picked in Settings: "exo" (Kino player) or "android" (the device's own), the web player is chosen on the page itself
        @JavascriptInterface public String player() { return getSharedPreferences("kino", MODE_PRIVATE).getString("engine", "exo"); }
        @JavascriptInterface public void setPlayer(String v) { if ("exo".equals(v) || "android".equals(v)) getSharedPreferences("kino", MODE_PRIVATE).edit().putString("engine", v).apply(); }
        @JavascriptInterface public int versionCode() { return BuildConfig.VERSION_CODE; }

        // Downloads the newer app from the server and opens androids installer for it
        @JavascriptInterface
        public void installUpdate(String path) {
            // Only the real app download, a page (or an embed frame) cant point it anywhere else
            if (!"/app".equals(path)) return;
            runOnUiThread(() -> startUpdate(path));
        }

        // Plays a video in the native player (exoplayer) instead of the web one, the page hands over everything it needs
        @JavascriptInterface
        public void playNative(String json) {
            runOnUiThread(() -> {
                // Pressing play twice quickly would open two players
                if (System.currentTimeMillis() - playerOpened < 2500) return;
                playerOpened = System.currentTimeMillis();
                Intent i = new Intent(MainActivity.this, PlayerActivity.class).putExtra(PlayerActivity.EXTRA, json);
                // When the player was opened, so a crash soon after can be put down to it
                getSharedPreferences("kino", MODE_PRIVATE).edit().putLong("playerAt", System.currentTimeMillis()).commit();
                startActivityForResult(i, PLAYER_REQUEST);
                // On low memory tvs the page behind the player is let go while the video plays, it's the biggest
                // thing in memory and android kills it (or the player) when both are there. It comes back after
                if (lowMemory()) web.postDelayed(() -> {
                    if (!isFinishing() && parkedUrl == null) {
                        parkedUrl = web.getUrl();
                        web.loadUrl("about:blank");
                    }
                }, 1500);
            });
        }

        // What crashed the app last time, once (the page tells the server), and whether the player crashed on this device: then videos use the web player
        @JavascriptInterface
        public String javaCrash() {
            String c = javaCrash;
            javaCrash = null;
            return c;
        }

        @JavascriptInterface
        public boolean playerBroken() {
            return getSharedPreferences("kino", MODE_PRIVATE).getBoolean("playerBroken", false);
        }

        @JavascriptInterface
        public void resetPlayer() {
            getSharedPreferences("kino", MODE_PRIVATE).edit().putBoolean("playerBroken", false).apply();
        }

        @JavascriptInterface
        public String lastCrash() {
            String c = lastCrash;
            lastCrash = null;
            return c;
        }

        // The page asks for the player's result after it was reloaded, see playNative
        @JavascriptInterface
        public String takeResult() {
            String r = pendingResult;
            pendingResult = null;
            return r;
        }

        @JavascriptInterface
        public boolean hasVoice() {
            return new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).resolveActivity(getPackageManager()) != null;
        }

        @JavascriptInterface
        public void startVoice() {
            runOnUiThread(() -> {
                Intent i = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
                i.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
                i.putExtra(RecognizerIntent.EXTRA_PROMPT, "Search Kino");
                try { startActivityForResult(i, VOICE_REQUEST); }
                catch (ActivityNotFoundException e) { Toast.makeText(MainActivity.this, "Voice search isn't available on this device", Toast.LENGTH_SHORT).show(); }
            });
        }

        // The player says when something is playing so the screen stays on and picture in picture knows when to kick in
        @JavascriptInterface
        public void setPlaying(boolean on) {
            playing = on;
            runOnUiThread(() -> {
                if (on) getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                else getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            });
        }

        @JavascriptInterface
        public void retry() {
            runOnUiThread(() -> { loadFailed = false; web.loadUrl(HOME); });
        }
    }
}
