package page.reece.kino;

import android.animation.ObjectAnimator;
import android.animation.ValueAnimator;
import android.app.Activity;
import android.app.ActivityManager;
import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.content.res.ColorStateList;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Color;
import android.graphics.RenderEffect;
import android.graphics.Shader;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.graphics.drawable.StateListDrawable;
import android.media.MediaCodecInfo;
import android.media.MediaCodecList;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.text.TextUtils;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.KeyEvent;
import android.view.MotionEvent;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.webkit.CookieManager;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Kino's own player screen in the app. The video is played by an Engine (exoplayer normally, androids MediaPlayer as
 * a backup) and everything on top is drawn here to look like the web player: title or logo at the top, the timeline,
 * round buttons, menus for subtitles, audio, speed and which player to use, skip intro, up next and the loading
 * screen. VLC or any other video app can be picked from the Player menu too, it opens on its own and Kino saves
 * where it got to when it comes back
 */
public class PlayerActivity extends Activity implements Engine.Listener {
    static final String EXTRA = "info";
    private static final int EXTERNAL = 51;

    private JSONObject info;
    private String base, ua, fid;
    private Map<String, String> headers;
    private boolean tv, lowRam;
    private final Handler h = new Handler(Looper.getMainLooper());
    private SharedPreferences prefs;

    // playback state
    private Engine eng;
    private boolean hls, triedHls, ended, introSkipped, audioPicked, errorShown, leaving, loading = true;
    private double offset;        // where the server's converted stream starts in the film, seconds
    private String sid;           // the server's converting session
    private int hlsRetries;
    private float speed = 1f;
    private long lastInput = System.currentTimeMillis();

    // views
    private FrameLayout root, video, controls, loadLayer, menuWrap;
    private LinearLayout menu, stats, upNext, card;
    private TextView title, sub, tNow, tLeft, tTip, subText, toastView, unLeft, plName;
    private ImageView logo, plLogo, plBg;
    private Timeline line;
    private RoundButton bPlay, bBack, bFwd, bSubs, bAudio, bSpeed, bPlayer, bClose;
    private TextView skip;
    private View focusBeforeMenu;
    private ObjectAnimator pulse;
    private final List<TextView> statLines = new ArrayList<>();
    private int upNextLeft = -1;
    private boolean upNextShown;

    // ---------------------------------------------------------------- setup

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        try {
            info = new JSONObject(getIntent().getStringExtra(EXTRA));
        } catch (Exception e) {
            finish();
            return;
        }
        base = info.optString("base").replaceAll("/+$", "");
        ua = info.optString("ua");
        fid = info.optString("fid");
        live = info.optBoolean("live");
        liveList = info.optJSONArray("channels");
        liveIdx = info.optInt("index", 0);
        tv = getPackageManager().hasSystemFeature(PackageManager.FEATURE_LEANBACK) || getPackageManager().hasSystemFeature("amazon.hardware.fire_tv");
        ActivityManager am = (ActivityManager) getSystemService(Context.ACTIVITY_SERVICE);
        ActivityManager.MemoryInfo mi = new ActivityManager.MemoryInfo();
        am.getMemoryInfo(mi);
        lowRam = am.isLowRamDevice() || mi.totalMem < 2_200_000_000L;
        prefs = getSharedPreferences("kino", MODE_PRIVATE);

        headers = new HashMap<>();
        String cookie = CookieManager.getInstance().getCookie(base);
        if (cookie != null) headers.put("Cookie", cookie);
        headers.put("X-Kino", "1");

        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        hideBars();
        buildUi();

        String pick = prefs.getString("engine", "exo");
        startEngine(pick.equals("android") ? "android" : "exo", info.optDouble("start", 0));
        h.post(tick);
        h.postDelayed(saver, 10000);
    }

    // Tvs cut a bit off the edges of the picture (overscan), so controls stay at least 5% in from every side
    private int safeX() { return Math.max(dp(40), Math.round(getResources().getDisplayMetrics().widthPixels * (tv ? 0.05f : 0.03f))); }
    private int safeY() { return Math.max(dp(20), Math.round(getResources().getDisplayMetrics().heightPixels * (tv ? 0.05f : 0.02f))); }

    private int dp(float v) {
        return Math.round(TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, v, getResources().getDisplayMetrics()));
    }

    private TextView text(float sp, int color, boolean bold) {
        TextView t = new TextView(this);
        t.setTextSize(TypedValue.COMPLEX_UNIT_SP, sp);
        t.setTextColor(color);
        t.setTypeface(Typeface.create("sans-serif", bold ? Typeface.BOLD : Typeface.NORMAL));
        if (!bold) t.setTypeface(Typeface.create("sans-serif-medium", Typeface.NORMAL));
        t.setIncludeFontPadding(false);
        return t;
    }

    private static GradientDrawable rounded(int color, float radius) {
        GradientDrawable g = new GradientDrawable();
        g.setColor(color);
        g.setCornerRadius(radius);
        return g;
    }

    /** The round icon buttons. Focused on a tv they go white with a dark icon, like the web player's tv mode */
    class RoundButton extends ImageView {
        RoundButton(int icon, int sizeDp, String label) {
            super(PlayerActivity.this);
            setImageResource(icon);
            setScaleType(ScaleType.CENTER_INSIDE);
            int pad = dp(sizeDp * 0.24f);
            setPadding(pad, pad, pad, pad);
            StateListDrawable bg = new StateListDrawable();
            GradientDrawable on = new GradientDrawable(); on.setShape(GradientDrawable.OVAL); on.setColor(Color.WHITE);
            GradientDrawable press = new GradientDrawable(); press.setShape(GradientDrawable.OVAL); press.setColor(0x66FFFFFF);
            GradientDrawable off = new GradientDrawable(); off.setShape(GradientDrawable.OVAL); off.setColor(0x00000000);
            bg.addState(new int[]{android.R.attr.state_focused}, on);
            bg.addState(new int[]{android.R.attr.state_pressed}, press);
            bg.addState(new int[]{}, off);
            setBackground(bg);
            setImageTintList(new ColorStateList(new int[][]{{android.R.attr.state_focused}, {}}, new int[]{Color.BLACK, Color.WHITE}));
            setFocusable(true);
            setClickable(true);
            setContentDescription(label);
            setLayoutParams(new LinearLayout.LayoutParams(dp(sizeDp), dp(sizeDp)));
            // Focus shows as the white circle, no growing: a grown button got cut off by the row it sits in
        }
    }

    /** White pill buttons for skip intro, up next and the dialogs */
    private TextView pill(String label, boolean primary) {
        TextView b = text(16, primary ? Color.BLACK : Color.WHITE, true);
        b.setText(label);
        b.setGravity(Gravity.CENTER);
        b.setPadding(dp(20), dp(11), dp(20), dp(11));
        StateListDrawable bg = new StateListDrawable();
        bg.addState(new int[]{android.R.attr.state_focused}, rounded(Color.WHITE, dp(12)));
        bg.addState(new int[]{}, rounded(primary ? 0xEBFFFFFF : 0x40767680, dp(12)));
        b.setBackground(bg);
        if (!primary) b.setTextColor(new ColorStateList(new int[][]{{android.R.attr.state_focused}, {}}, new int[]{Color.BLACK, Color.WHITE}));
        b.setFocusable(true);
        b.setClickable(true);
        b.setSingleLine(true);
        b.setEllipsize(TextUtils.TruncateAt.END);
        return b;
    }

    private void buildUi() {
        root = new FrameLayout(this);
        root.setBackgroundColor(Color.BLACK);
        video = new FrameLayout(this);
        root.addView(video, match());

        // Subtitles for the backup player, exoplayer draws its own
        subText = text(22, Color.WHITE, true);
        subText.setGravity(Gravity.CENTER);
        subText.setShadowLayer(dp(2), 0, dp(1), 0xCC000000);
        subText.setBackground(rounded(0x8C000000, dp(6)));
        subText.setPadding(dp(10), dp(3), dp(10), dp(3));
        subText.setVisibility(View.GONE);
        FrameLayout.LayoutParams stl = new FrameLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT, Gravity.BOTTOM | Gravity.CENTER_HORIZONTAL);
        stl.bottomMargin = dp(48);
        root.addView(subText, stl);

        buildControls();
        buildLoading();

        // Skip intro, bottom right
        skip = pill("Skip Intro", true);
        skip.setVisibility(View.GONE);
        skip.setOnClickListener(v -> skipIntro());
        FrameLayout.LayoutParams sl = new FrameLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT, Gravity.BOTTOM | Gravity.END);
        sl.setMargins(0, 0, safeX(), safeY() + dp(130));
        root.addView(skip, sl);

        buildUpNext();

        // Menus open above the buttons on the right
        menuWrap = new FrameLayout(this);
        menuWrap.setVisibility(View.GONE);
        menuWrap.setOnClickListener(v -> closeMenu());
        root.addView(menuWrap, match());

        toastView = text(15, Color.WHITE, true);
        toastView.setBackground(rounded(0xE61C1C1E, dp(22)));
        toastView.setPadding(dp(18), dp(10), dp(18), dp(10));
        toastView.setVisibility(View.GONE);
        FrameLayout.LayoutParams tl = new FrameLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT, Gravity.TOP | Gravity.CENTER_HORIZONTAL);
        tl.topMargin = dp(28);
        root.addView(toastView, tl);

        setContentView(root);
    }

    private static FrameLayout.LayoutParams match() {
        return new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT);
    }

    private void buildControls() {
        controls = new FrameLayout(this);
        controls.setAlpha(0f);
        controls.setVisibility(View.GONE);
        root.addView(controls, match());

        // Top: logo or title, and the episode underneath, on a fade
        LinearLayout top = new LinearLayout(this);
        top.setOrientation(LinearLayout.HORIZONTAL);
        top.setGravity(Gravity.CENTER_VERTICAL);
        top.setPadding(safeX(), safeY() + dp(4), safeX(), dp(60));
        top.setBackground(new GradientDrawable(GradientDrawable.Orientation.TOP_BOTTOM, new int[]{0xB3000000, 0x00000000}));
        if (!tv) {
            bClose = new RoundButton(R.drawable.ic_close, 44, "Close");
            bClose.setBackground(rounded(0x993C3C40, dp(22)));
            bClose.setOnClickListener(v -> done());
            top.addView(bClose);
            View gap = new View(this);
            top.addView(gap, new LinearLayout.LayoutParams(dp(16), 1));
        }
        LinearLayout names = new LinearLayout(this);
        names.setOrientation(LinearLayout.VERTICAL);
        logo = new ImageView(this);
        logo.setAdjustViewBounds(true);
        logo.setMaxHeight(dp(64));
        logo.setMaxWidth(dp(300));
        logo.setScaleType(ImageView.ScaleType.FIT_START);
        logo.setVisibility(View.GONE);
        names.addView(logo, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT));
        title = text(22, Color.WHITE, true);
        title.setText(info.optString("title"));
        title.setMaxLines(1);
        title.setEllipsize(TextUtils.TruncateAt.END);
        names.addView(title);
        sub = text(15, 0xB3FFFFFF, false);
        sub.setText(info.optString("sub"));
        sub.setPadding(0, dp(6), 0, 0);
        sub.setVisibility(info.optString("sub").isEmpty() ? View.GONE : View.VISIBLE);
        names.addView(sub);
        top.addView(names, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1));
        controls.addView(top, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT, Gravity.TOP));

        // Bottom: timeline with the times, then the buttons
        LinearLayout bottom = new LinearLayout(this);
        bottom.setOrientation(LinearLayout.VERTICAL);
        bottom.setPadding(safeX(), dp(70), safeX(), safeY());
        bottom.setBackground(new GradientDrawable(GradientDrawable.Orientation.BOTTOM_TOP, new int[]{0xC7000000, 0x59000000, 0x00000000}));

        FrameLayout tipRow = new FrameLayout(this);
        tTip = text(13, Color.WHITE, true);
        tTip.setBackground(rounded(0xE61E1E20, dp(6)));
        tTip.setPadding(dp(8), dp(4), dp(8), dp(4));
        tTip.setVisibility(View.INVISIBLE);
        tipRow.addView(tTip, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT));
        bottom.addView(tipRow);

        LinearLayout tlRow = new LinearLayout(this);
        tlRow.setGravity(Gravity.CENTER_VERTICAL);
        tNow = text(13, 0xB8FFFFFF, false);
        tNow.setMinWidth(dp(52));
        tLeft = text(13, 0xB8FFFFFF, false);
        tLeft.setMinWidth(dp(52));
        tLeft.setGravity(Gravity.END);
        line = new Timeline(this);
        line.setCallback(new Timeline.Callback() {
            @Override public void onPreview(long ms) { showTip(ms); bump(); }
            @Override public void onSeek(long ms) { tTip.setVisibility(View.INVISIBLE); seekTo(ms / 1000.0); }
        });
        tlRow.addView(tNow);
        tlRow.addView(line, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1));
        tlRow.addView(tLeft);
        bottom.addView(tlRow);

        FrameLayout row = new FrameLayout(this);
        LinearLayout mid = new LinearLayout(this);
        mid.setGravity(Gravity.CENTER);
        bBack = new RoundButton(R.drawable.ic_back10, 48, "Back 10 seconds");
        bPlay = new RoundButton(R.drawable.ic_pause, 62, "Pause");
        bFwd = new RoundButton(R.drawable.ic_fwd10, 48, "Forward 10 seconds");
        mid.addView(bBack);
        mid.addView(space(14));
        mid.addView(bPlay);
        mid.addView(space(14));
        mid.addView(bFwd);
        row.addView(mid, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT, Gravity.CENTER));
        LinearLayout right = new LinearLayout(this);
        right.setGravity(Gravity.CENTER_VERTICAL);
        bSubs = new RoundButton(R.drawable.ic_cc, 46, "Subtitles");
        bAudio = new RoundButton(R.drawable.ic_audio, 46, "Audio");
        bSpeed = new RoundButton(R.drawable.ic_speed, 46, "Playback Speed");
        bPlayer = new RoundButton(R.drawable.ic_player, 46, "Player");
        for (View v : new View[]{bSubs, bAudio, bSpeed, bPlayer}) { right.addView(v); right.addView(space(6)); }
        row.addView(right, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT, Gravity.END | Gravity.CENTER_VERTICAL));
        LinearLayout.LayoutParams rl = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        rl.topMargin = dp(8);
        bottom.addView(row, rl);
        controls.addView(bottom, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT, Gravity.BOTTOM));

        bPlay.setOnClickListener(v -> togglePlay());
        bBack.setOnClickListener(v -> { if (live) switchChannel(-1); else seekTo(Math.max(0, pos() - 10)); bump(); });
        bFwd.setOnClickListener(v -> { if (live) switchChannel(1); else seekTo(pos() + 10); bump(); });
        if (live) {
            tlRow.setVisibility(View.GONE);
            bBack.setImageResource(R.drawable.ic_back);
            bBack.setContentDescription("Previous channel");
            bFwd.setImageResource(R.drawable.ic_back);
            bFwd.setRotation(180f);
            bFwd.setContentDescription("Next channel");
        }
        bSubs.setOnClickListener(v -> openMenu("subs"));
        bAudio.setOnClickListener(v -> openMenu("audio"));
        bSpeed.setOnClickListener(v -> openMenu("speed"));
        bPlayer.setOnClickListener(v -> openMenu("player"));

        // Up from the buttons goes to the timeline, down from the timeline goes to play
        line.setNextFocusDownId(View.generateViewId());
        bPlay.setId(View.generateViewId());
        line.setId(View.generateViewId());
        line.setNextFocusDownId(bPlay.getId());
        for (View v : new View[]{bBack, bPlay, bFwd, bSubs, bAudio, bSpeed, bPlayer}) v.setNextFocusUpId(line.getId());

        // A tap on the video shows or hides the controls on phones
        video.setOnClickListener(v -> { if (controls.getVisibility() == View.VISIBLE) hideControls(); else showControls(bPlay); });
        controls.setOnClickListener(v -> hideControls());
    }

    private View space(int w) {
        View v = new View(this);
        v.setLayoutParams(new LinearLayout.LayoutParams(dp(w), 1));
        return v;
    }

    private void buildLoading() {
        loadLayer = new FrameLayout(this);
        loadLayer.setBackgroundColor(Color.BLACK);
        loadLayer.setClickable(true);
        plBg = new ImageView(this);
        plBg.setScaleType(ImageView.ScaleType.CENTER_CROP);
        plBg.setAlpha(0.32f);
        if (Build.VERSION.SDK_INT >= 31 && !lowRam) plBg.setRenderEffect(RenderEffect.createBlurEffect(dp(14), dp(14), Shader.TileMode.CLAMP));
        loadLayer.addView(plBg, match());
        View shade = new View(this);
        GradientDrawable vg = new GradientDrawable();
        vg.setGradientType(GradientDrawable.RADIAL_GRADIENT);
        vg.setGradientRadius(dp(700));
        vg.setColors(new int[]{0x1A000000, 0xBF000000});
        shade.setBackground(vg);
        loadLayer.addView(shade, match());

        LinearLayout mid = new LinearLayout(this);
        mid.setOrientation(LinearLayout.VERTICAL);
        mid.setGravity(Gravity.CENTER_HORIZONTAL);
        FrameLayout logoBox = new FrameLayout(this);
        logoBox.setMinimumHeight(dp(90));
        plLogo = new ImageView(this);
        plLogo.setAdjustViewBounds(true);
        plLogo.setMaxHeight(dp(140));
        plLogo.setMaxWidth(dp(420));
        plLogo.setVisibility(View.GONE);
        logoBox.addView(plLogo, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT, Gravity.CENTER));
        plName = text(40, Color.WHITE, true);
        plName.setText(info.optString("title"));
        plName.setGravity(Gravity.CENTER);
        plName.setMaxLines(2);
        logoBox.addView(plName, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT, Gravity.CENTER));
        mid.addView(logoBox);
        pulse = ObjectAnimator.ofFloat(logoBox, "alpha", 0.45f, 1f);
        pulse.setDuration(900);
        pulse.setRepeatMode(ValueAnimator.REVERSE);
        pulse.setRepeatCount(ValueAnimator.INFINITE);
        pulse.start();

        stats = new LinearLayout(this);
        stats.setOrientation(LinearLayout.VERTICAL);
        stats.setGravity(Gravity.CENTER_HORIZONTAL);
        stats.setMinimumHeight(dp(92));
        stats.setVisibility(info.optBoolean("loadStats", true) ? View.VISIBLE : View.GONE);
        // The logo sits dead centre, the details hang underneath it without pushing it up
        loadLayer.addView(mid, new FrameLayout.LayoutParams(dp(560), ViewGroup.LayoutParams.WRAP_CONTENT, Gravity.CENTER));
        FrameLayout.LayoutParams sl = new FrameLayout.LayoutParams(dp(560), ViewGroup.LayoutParams.WRAP_CONTENT, Gravity.CENTER_HORIZONTAL | Gravity.TOP);
        sl.topMargin = getResources().getDisplayMetrics().heightPixels / 2 + dp(84);
        loadLayer.addView(stats, sl);
        root.addView(loadLayer, match());

        JSONObject art = info.optJSONObject("art");
        if (art != null) {
            String bg = art.optString("background"), lg = art.optString("logo");
            if (!bg.isEmpty() && !"null".equals(bg)) loadImage(img(bg, false, lowRam ? 640 : 960), b -> plBg.setImageBitmap(b));
            if (!lg.isEmpty() && !"null".equals(lg)) loadImage(img(lg, true, 640), b -> {
                plLogo.setImageBitmap(b); plLogo.setVisibility(View.VISIBLE); plName.setVisibility(View.GONE);
                logo.setImageBitmap(b); logo.setVisibility(View.VISIBLE); title.setVisibility(View.GONE);
            });
        }
    }

    private String img(String u, boolean trim, int w) {
        return base + "/api/img?u=" + Uri.encode(u) + (trim ? "&trim=1" : "") + "&w=" + w;
    }

    interface Got { void on(Bitmap b); }

    private void loadImage(String url, Got cb) {
        new Thread(() -> {
            try {
                HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
                c.setRequestProperty("User-Agent", ua);
                for (Map.Entry<String, String> e : headers.entrySet()) c.setRequestProperty(e.getKey(), e.getValue());
                c.setConnectTimeout(10000);
                c.setReadTimeout(15000);
                if (c.getResponseCode() != 200) return;
                Bitmap b = BitmapFactory.decodeStream(c.getInputStream());
                if (b != null) runOnUiThread(() -> { if (!isFinishing()) cb.on(b); });
            } catch (Exception ignored) { }
        }).start();
    }

    // One line per step on the loading screen. Lines fade in once, after that only there text changes
    private void step(String text, String note) {
        if (!loading) return;
        for (TextView t : statLines) t.setTextColor(0x8CFFFFFF);
        TextView t = text(14, Color.WHITE, false);
        t.setText(note == null || note.isEmpty() ? text : text + "  ·  " + note);
        t.setGravity(Gravity.CENTER);
        t.setPadding(0, dp(3), 0, dp(3));
        t.setAlpha(0f);
        t.setTranslationY(dp(6));
        stats.addView(t);
        statLines.add(t);
        if (statLines.size() > 4) { stats.removeView(statLines.remove(0)); }
        t.animate().alpha(1f).translationY(0).setDuration(350).start();
    }

    private void note(String note) {
        if (!loading || statLines.isEmpty()) return;
        TextView t = statLines.get(statLines.size() - 1);
        String s = t.getText().toString();
        int i = s.indexOf("  ·  ");
        t.setText((i > 0 ? s.substring(0, i) : s) + "  ·  " + note);
    }

    private void loaded() {
        if (!loading) return;
        loading = false;
        loadLayer.animate().alpha(0f).setDuration(450).withEndAction(() -> {
            loadLayer.setVisibility(View.GONE);
            if (pulse != null) pulse.cancel();
            plBg.setImageBitmap(null);       // the blurred background isnt needed once its playing
        }).start();
    }

    private void relaunchLoading(String why) {
        loading = true;
        loadLayer.setVisibility(View.VISIBLE);
        loadLayer.animate().alpha(1f).setDuration(200).start();
        if (pulse != null && !pulse.isRunning()) pulse.start();
        step(why, null);
    }

    private void buildUpNext() {
        upNext = new LinearLayout(this);
        upNext.setOrientation(LinearLayout.HORIZONTAL);
        upNext.setGravity(Gravity.CENTER_VERTICAL);
        upNext.setBackground(rounded(0xEB1C1C1E, dp(18)));
        upNext.setPadding(dp(14), dp(14), dp(14), dp(14));
        upNext.setVisibility(View.GONE);
        JSONObject n = info.optJSONObject("next");
        ImageView th = new ImageView(this);
        th.setScaleType(ImageView.ScaleType.CENTER_CROP);
        th.setBackground(rounded(0xFF2C2C2E, dp(10)));
        th.setClipToOutline(true);
        upNext.addView(th, new LinearLayout.LayoutParams(dp(150), dp(84)));
        LinearLayout body = new LinearLayout(this);
        body.setOrientation(LinearLayout.VERTICAL);
        body.setPadding(dp(14), 0, 0, 0);
        unLeft = text(13, 0xB3FFFFFF, false);
        TextView nm = text(16, Color.WHITE, true);
        nm.setMaxLines(2);
        if (n != null) {
            String ep = n.isNull("season") ? "" : "S" + n.optInt("season") + ", E" + n.optInt("episode");
            nm.setText(ep + (n.optString("name").isEmpty() || n.isNull("name") ? "" : "  " + n.optString("name")));
            String thumb = n.optString("thumbnail");
            if (!thumb.isEmpty() && !"null".equals(thumb)) loadImage(img(thumb, false, 480), th::setImageBitmap);
        }
        body.addView(unLeft);
        body.addView(nm);
        LinearLayout acts = new LinearLayout(this);
        acts.setPadding(0, dp(10), 0, 0);
        TextView now = pill("Play Now", true), cancel = pill("Cancel", false);
        now.setOnClickListener(v -> { ended = true; done(); });
        cancel.setOnClickListener(v -> { upNextLeft = -1; upNext.setVisibility(View.GONE); showControls(bPlay); });
        acts.addView(now);
        acts.addView(space(10));
        acts.addView(cancel);
        body.addView(acts);
        upNext.addView(body, new LinearLayout.LayoutParams(dp(250), ViewGroup.LayoutParams.WRAP_CONTENT));
        FrameLayout.LayoutParams ul = new FrameLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT, Gravity.BOTTOM | Gravity.END);
        ul.setMargins(0, 0, safeX(), safeY() + dp(130));
        root.addView(upNext, ul);
    }

    // ---------------------------------------------------------------- engines

    private Engine makeEngine(String which) {
        if (which.equals("android")) return new MediaEngine(this, headers, this);
        return new ExoEngine(this, headers, ua, info.optString("audioLang"), info.optString("subLang"), info.optString("subSize", "m"), lowRam, this);
    }

    private void startEngine(String which, double at) {
        if (eng != null) { eng.release(); video.removeAllViews(); }
        eng = makeEngine(which);
        video.addView(eng.view(), match());
        audioPicked = false;
        errorShown = false;
        boolean dovi = info.optBoolean("dovi");
        // The converted stream only works with exoplayer, the backup player always plays the file as it is
        if (which.equals("exo") && (info.optBoolean("forceHls") || (dovi && !hasDecoder("video/dolby-vision")))) startHls(at);
        else startDirect(at);
    }

    private void startDirect(double at) {
        hls = false;
        offset = 0;
        List<Engine.Sub> subs = new ArrayList<>();
        JSONArray js = info.optJSONArray("subs");
        for (int i = 0; js != null && i < js.length(); i++) {
            JSONObject s = js.optJSONObject(i);
            if (s != null) subs.add(new Engine.Sub(base + s.optString("url"), s.optString("label"), s.optString("lang")));
        }
        JSONObject v = info.optJSONObject("video");
        String what = v == null ? "" : (v.optString("codec").toUpperCase(Locale.ROOT) + (v.optInt("height") >= 2000 ? " 4K" : v.optInt("height") >= 1000 ? " 1080p" : ""));
        if (live) {
            step("Tuning in", info.optString("title"));
            eng.open(base + info.optString("url"), true, -1, subs);
            return;
        }
        step(eng.name().equals("exo") ? "Direct play" : "Direct play with the Android player", what.trim());
        eng.open(base + info.optString("url"), false, (long) (at * 1000), subs);
        if (speed != 1f) eng.speed(speed);
    }

    // Asks the server for a converted stream from a point in the film, its ready once the first bit is made
    private void startHls(double at) {
        hls = true;
        triedHls = true;
        stopSession();
        step("Kino is converting it for this TV", at > 1 ? "from " + clock(at) : null);
        new Thread(() -> {
            try {
                JSONObject body = new JSONObject().put("t", at).put("audio", info.optInt("audioN", 0)).put("hevc", hasDecoder("video/hevc")).put("ad", audioDelay);
                JSONObject r = new JSONObject(post("/api/play/" + Uri.encode(fid), body.toString()));
                runOnUiThread(() -> {
                    if (isFinishing()) { stopSession(r.optString("sid")); return; }
                    sid = r.optString("sid");
                    offset = r.optDouble("offset", at);
                    step("Buffering", null);
                    eng.open(base + r.optString("url"), true, 0, new ArrayList<>());
                    if (speed != 1f) eng.speed(speed);
                });
            } catch (Exception e) {
                runOnUiThread(() -> showError(message(e)));
            }
        }).start();
    }

    private static boolean hasDecoder(String mime) {
        try {
            for (MediaCodecInfo c : new MediaCodecList(MediaCodecList.ALL_CODECS).getCodecInfos()) {
                if (c.isEncoder()) continue;
                for (String t : c.getSupportedTypes()) if (t.equalsIgnoreCase(mime)) return true;
            }
        } catch (Exception ignored) { }
        return false;
    }

    // ---- what the engine tells us

    @Override
    public void onBuffering(boolean b) {
        if (b && loading) note("buffering");
        long now = System.currentTimeMillis();
        if (b && bufStart == 0) bufStart = now;
        else if (!b && bufStart > 0) {
            // Stalls after a seek dont count, jumping somewhere always has to load a bit
            if (!loading && now - lastSeekAt > 10000) stalls.add(new long[]{now, now - bufStart});
            bufStart = 0;
        }
    }

    @Override
    public void onPlaying(boolean p) {
        bPlay.setImageResource(p ? R.drawable.ic_pause : R.drawable.ic_play);
        bPlay.setContentDescription(p ? "Pause" : "Play");
        if (p) { hlsRetries = 0; loaded(); bump(); }
        else { save(); showControls(null); }
    }

    @Override public void onFirstFrame() { loaded(); }

    @Override
    public void onEnded() {
        if (hls && pos() < dur() - 30) return;
        ended = true;
        done();
    }

    /** An online source (not the library) and theres another one to try */
    private boolean sourceCanMoveOn() {
        return info.optBoolean("isStream") && info.optBoolean("moreSources");
    }

    private void sourceFailed(String msg) {
        if (leaving) return;
        leaving = true;
        try {
            JSONObject r = new JSONObject().put("fid", fid).put("pos", pos()).put("dur", dur()).put("sourceFailed", true).put("error", msg);
            setResult(RESULT_OK, new Intent().putExtra("result", r.toString()));
        } catch (Exception ignored) { }
        finish();
    }

    @Override
    public void onError(String msg, boolean codec) {
        if (live) {
            // A channel thats down: try the next one or go back, nothing else to switch to
            errorShown = true;
            loading = false;
            loadLayer.setVisibility(View.GONE);
            new Thread(() -> { try { post("/api/live/" + fid + "/bad", "{}"); } catch (Exception ignored) { } }).start();
            LinearLayout c = dialog("This channel isn't working", "It might be off air right now, or the link stopped working.");
            TextView next = pill("Next Channel", true), again = pill("Try Again", false), close = pill("Close", false);
            next.setOnClickListener(v -> { closeDialog(); relaunchLoading("Tuning in"); switchChannel(1); });
            again.setOnClickListener(v -> { closeDialog(); errorShown = false; relaunchLoading("Tuning in"); eng.open(base + "/api/live/" + fid + "/index.m3u8", true, -1, new ArrayList<>()); });
            close.setOnClickListener(v -> { closeDialog(); done(); });
            if (liveList != null && liveList.length() > 1) buttons(c, next, again, close);
            else buttons(c, again, close);
            return;
        }
        double at = pos();
        boolean exo = eng.name().equals("exo");
        // Direct links from addons that fail are nearly always a broken source, not the player, so the next one gets tried.
        // TorBox copies go through Kino, those get the converted stream first in case its the format
        // A source that was playing fine and then errors (nearly always right after a seek) gets another go from the same
        // spot before anything else, it used to jump straight to the next source and say this one was broken
        if (playedAt > 0 && sameRetries < 2) {
            sameRetries++;
            relaunchLoading("Reconnecting");
            if (hls) startHls(at); else startEngine(eng.name(), at);
            return;
        }
        if (sourceCanMoveOn() && (!info.optBoolean("torbox") || triedHls)) { sourceFailed(msg); return; }
        // Direct play didnt work, the converted stream nearly always does
        boolean canConvert = !info.optBoolean("isStream") || info.optBoolean("torbox");
        if (exo && !hls && !triedHls && canConvert) { relaunchLoading("This TV can't play the file as it is"); startHls(at); return; }
        // The converted stream stops on the server after a while paused, it just gets started again from where it was
        if (exo && hls && hlsRetries++ < 2) { relaunchLoading("Reconnecting"); startHls(at); return; }
        showError("This video won't play in the " + (exo ? "Kino" : "Android") + " player (" + msg + ")");
    }

    @Override
    public void onTracks() {
        boolean canConvert = !info.optBoolean("isStream") || info.optBoolean("torbox");
        if (eng instanceof ExoEngine && !hls && !triedHls && ((ExoEngine) eng).noPlayableAudio() && !canConvert && sourceCanMoveOn()) {
            sourceFailed("no sound this TV can play");
            return;
        }
        if (eng instanceof ExoEngine && !hls && !triedHls && canConvert && ((ExoEngine) eng).noPlayableAudio()) {
            relaunchLoading("This TV can't play the sound in this file");
            startHls(pos());
            return;
        }
        if (audioPicked || hls) return;
        audioPicked = true;
        // The page already worked out which audio track to use (by language tag or by name), that one is picked here
        int want = info.optInt("audioN", -1);
        if (want >= 0 && info.optBoolean("audioChosen")) {
            List<Engine.Track> a = eng.audio();
            if (want < a.size() && a.get(want).supported) eng.pickAudio(a.get(want).id);
        }
        for (Engine.Track t : eng.audio()) if (t.selected) { note(t.label); break; }
    }

    @Override
    public void onBandwidth(long bps) {
        if (loading && bps > 0) note(String.format(Locale.ROOT, "%.1f Mbps", bps / 1e6));
    }

    @Override
    public void onText(String t) {
        if (t == null || t.trim().isEmpty()) subText.setVisibility(View.GONE);
        else { subText.setText(t.trim()); subText.setVisibility(View.VISIBLE); }
    }

    // ---------------------------------------------------------------- position, controls

    private double pos() { return eng == null ? 0 : (hls ? offset : 0) + eng.pos() / 1000.0; }

    private double dur() {
        double d = info.optDouble("duration", 0);
        if (d > 0) return d;
        return eng == null ? 0 : eng.dur() / 1000.0;
    }

    private void seekTo(double t) {
        lastSeekAt = System.currentTimeMillis();
        t = Math.max(0, Math.min(t, dur() > 0 ? dur() - 1 : t));
        if (!hls) { eng.seek((long) (t * 1000)); return; }
        double rel = t - offset;
        long have = eng.dur();
        if (rel >= 0 && have > 0 && rel * 1000 < have - 2000) eng.seek((long) (rel * 1000));
        else { relaunchLoading("Jumping to " + clock(t)); startHls(t); }
    }

    private void togglePlay() {
        if (eng.playing()) eng.pause(); else eng.play();
        bump();
    }

    private static String clock(double s) {
        long x = Math.max(0, (long) s), hh = x / 3600, mm = (x % 3600) / 60, ss = x % 60;
        return hh > 0 ? String.format(Locale.ROOT, "%d:%02d:%02d", hh, mm, ss) : String.format(Locale.ROOT, "%d:%02d", mm, ss);
    }

    private void showTip(long ms) {
        tTip.setText(clock(ms / 1000.0));
        tTip.setVisibility(View.VISIBLE);
        double d = dur();
        float frac = d > 0 ? (float) (ms / 1000.0 / d) : 0;
        float x = line.getLeft() + dp(9) + (line.getWidth() - dp(18)) * frac - tTip.getWidth() / 2f;
        tTip.setTranslationX(Math.max(0, x));
    }

    private final Runnable hideLater = this::hideControls;

    /** Keeps the controls up for another 4 seconds */
    private void bump() {
        h.removeCallbacks(hideLater);
        if (controls.getVisibility() == View.VISIBLE && eng != null && eng.playing()) h.postDelayed(hideLater, 4000);
    }

    private void showControls(View focus) {
        if (controls.getVisibility() != View.VISIBLE) {
            controls.setVisibility(View.VISIBLE);
            controls.animate().alpha(1f).setDuration(220).start();
            eng.subsRaised(true);
            subText.animate().translationY(-dp(130)).setDuration(220).start();
        }
        if (focus != null && (getCurrentFocus() == null || !isInControls(getCurrentFocus()))) focus.requestFocus();
        bump();
    }

    private void hideControls() {
        if (menuWrap.getVisibility() == View.VISIBLE || line.scrubbing() || errorShown) return;
        if (eng != null && !eng.playing()) return;
        controls.animate().alpha(0f).setDuration(260).withEndAction(() -> controls.setVisibility(View.GONE)).start();
        eng.subsRaised(false);
        subText.animate().translationY(0).setDuration(260).start();
        if (skip.getVisibility() == View.VISIBLE) skip.requestFocus();
        else if (upNext.getVisibility() == View.VISIBLE) upNext.getChildAt(1).requestFocus();
        else root.requestFocus();
    }

    private boolean isInControls(View v) {
        for (View p = v; p != null; p = p.getParent() instanceof View ? (View) p.getParent() : null) if (p == controls) return true;
        return false;
    }

    private final Runnable tick = new Runnable() {
        @Override public void run() {
            if (eng != null) {
                double p = pos(), d = dur();
                if (!line.scrubbing()) line.set((long) (p * 1000), (long) (d * 1000), (long) (((hls ? offset * 1000 : 0)) + eng.buffered()));
                double shown = line.shown() / 1000.0;
                tNow.setText(clock(shown));
                tLeft.setText("-" + clock(Math.max(0, d - shown)));
                checkIntro(p);
                checkUpNext(p, d);
                checkFake(d);
                checkStall(p);
                int mins = info.optInt("stillMins", 0);
                if (mins > 0 && card == null && eng.playing() && System.currentTimeMillis() - lastInput > mins * 60000L) askStill();
            }
            h.postDelayed(this, 250);
        }
    };

    private void checkIntro(double p) {
        JSONObject intro = info.optJSONObject("intro");
        if (intro == null || loading) return;
        double s = intro.optDouble("start"), e = intro.optDouble("end");
        boolean in = p >= s - 1 && p < e - 2;
        if (in && info.optBoolean("autoSkip") && !introSkipped) { skipIntro(); toast("Intro skipped"); return; }
        if (in != (skip.getVisibility() == View.VISIBLE)) {
            skip.setVisibility(in ? View.VISIBLE : View.GONE);
            if (in && controls.getVisibility() != View.VISIBLE) skip.requestFocus();
        }
    }

    private void skipIntro() {
        JSONObject intro = info.optJSONObject("intro");
        if (intro == null) return;
        introSkipped = true;
        skip.setVisibility(View.GONE);
        seekTo(intro.optDouble("end"));
    }

    // Up next with a countdown like netflix, during the credits or the last 25 seconds
    private void checkUpNext(double p, double d) {
        if (info.optJSONObject("next") == null || d <= 0 || p < d * 0.5) return;
        double at = info.optDouble("credits", 0) > 0 ? info.optDouble("credits") : d - 25;
        if (!upNextShown && p >= at) {
            upNextShown = true;
            upNext.setVisibility(View.VISIBLE);
            upNext.setAlpha(0f);
            upNext.animate().alpha(1f).setDuration(300).start();
            upNextLeft = info.optBoolean("autoplay", true) ? 10 : -1;
            if (controls.getVisibility() != View.VISIBLE) upNext.post(() -> ((ViewGroup) ((ViewGroup) upNext.getChildAt(1)).getChildAt(2)).getChildAt(0).requestFocus());
            h.post(countdown);
        }
    }

    private final Runnable countdown = new Runnable() {
        @Override public void run() {
            if (upNext.getVisibility() != View.VISIBLE) return;
            if (upNextLeft < 0) { unLeft.setText("Next Episode"); return; }
            unLeft.setText("Next episode in " + upNextLeft);
            if (upNextLeft == 0) { ended = true; done(); return; }
            if (eng.playing()) upNextLeft--;
            h.postDelayed(this, 1000);
        }
    };

    // ---------------------------------------------------------------- menus

    private void openMenu(String which) {
        focusBeforeMenu = getCurrentFocus();
        menuWrap.removeAllViews();
        menu = new LinearLayout(this);
        menu.setOrientation(LinearLayout.VERTICAL);
        menu.setPadding(dp(6), dp(8), dp(6), dp(6));
        TextView head = text(12, 0x99FFFFFF, true);
        head.setLetterSpacing(0.06f);
        head.setPadding(dp(12), dp(4), dp(12), dp(8));
        menu.addView(head);
        View firstOn = null;
        switch (which) {
            case "subs": {
                head.setText("SUBTITLES");
                List<Engine.Track> ts = eng.text();
                boolean any = false;
                for (Engine.Track t : ts) any |= t.selected;
                firstOn = item("Off", !any, () -> eng.pickText(-1));
                for (Engine.Track t : ts) { View v = item(t.label, t.selected, () -> eng.pickText(t.id)); if (t.selected) firstOn = v; }
                if (ts.isEmpty()) item("No subtitles in this video", false, null);
                break;
            }
            case "audio": {
                head.setText("AUDIO");
                for (Engine.Track t : eng.audio()) {
                    View v = item(t.label + (t.supported ? "" : " (not on this TV)"), t.selected, t.supported ? () -> eng.pickAudio(t.id) : null);
                    if (t.selected || firstOn == null) firstOn = v;
                }
                if (hls) item("Pick audio on the Kino web player when the TV converts", false, null);
                // Audio sync: resync on the spot, and for files that go through the server, shift the sound by hand
                item("Resync Audio", false, () -> {
                    if (hls) { relaunchLoading("Resyncing"); startHls(pos()); } else seekTo(Math.max(0, pos() - 0.05));
                    toast("Audio resynced");
                });
                boolean canShift = !live && (!info.optBoolean("isStream") || info.optBoolean("torbox"));
                if (canShift) {
                    for (double d : new double[]{-0.5, -0.25, 0, 0.25, 0.5}) {
                        String l = d == 0 ? "Sound In Sync" : "Sound " + Math.abs(d) + "s " + (d < 0 ? "Earlier" : "Later");
                        item(l, audioDelay == d, () -> { audioDelay = d; relaunchLoading("Shifting the sound"); startHls(pos()); });
                    }
                }
                break;
            }
            case "speed": {
                head.setText("SPEED");
                for (float s : new float[]{0.5f, 0.75f, 1f, 1.25f, 1.5f, 2f}) {
                    View v = item(s == 1f ? "Normal" : (s == (int) s ? String.valueOf((int) s) : String.valueOf(s)) + "×", s == speed, () -> { speed = s; eng.speed(s); });
                    if (s == speed) firstOn = v;
                }
                break;
            }
            case "player": {
                head.setText("PLAYER");
                String cur = eng.name();
                firstOn = item("Kino Player", cur.equals("exo"), () -> switchEngine("exo"));
                View a = item("Android Player", cur.equals("android"), () -> switchEngine("android"));
                if (cur.equals("android")) firstOn = a;
                String vlc = vlcPackage();
                item(vlc != null ? "Open in VLC" : "Open in Another App", false, () -> openExternal(vlc));
                if (vlc != null) item("Open in Another App", false, () -> openExternal(null));
                TextView hint = text(12, 0x80FFFFFF, false);
                hint.setText("Try another player if the picture or sound is wrong. Kino remembers your pick on this device.");
                hint.setPadding(dp(12), dp(8), dp(12), dp(4));
                hint.setLineSpacing(0, 1.2f);
                menu.addView(hint);
                break;
            }
        }
        ScrollView sc = new ScrollView(this);
        sc.setVerticalScrollBarEnabled(false);
        sc.setBackground(rounded(0xF52C2C2E, dp(16)));
        sc.setElevation(dp(12));
        sc.addView(menu);
        FrameLayout.LayoutParams ml = new FrameLayout.LayoutParams(dp(380), ViewGroup.LayoutParams.WRAP_CONTENT, Gravity.BOTTOM | Gravity.END);
        ml.setMargins(0, safeY() + dp(20), safeX(), safeY() + dp(78));
        menuWrap.addView(sc, ml);
        menuWrap.setVisibility(View.VISIBLE);
        sc.setAlpha(0f);
        sc.setTranslationY(dp(10));
        sc.animate().alpha(1f).translationY(0).setDuration(200).start();
        h.removeCallbacks(hideLater);
        View f = firstOn;
        if (f != null) f.post(f::requestFocus);
    }

    private View item(String label, boolean on, Runnable run) {
        LinearLayout row = new LinearLayout(this);
        row.setGravity(Gravity.CENTER_VERTICAL);
        row.setPadding(dp(14), 0, dp(14), 0);
        row.setMinimumHeight(dp(50));
        ImageView ck = new ImageView(this);
        ck.setImageResource(R.drawable.ic_check);
        ck.setImageTintList(new ColorStateList(new int[][]{{android.R.attr.state_focused}, {}}, new int[]{0xFF0A84FF, 0xFF0A84FF}));
        ck.setVisibility(on ? View.VISIBLE : View.INVISIBLE);
        row.addView(ck, new LinearLayout.LayoutParams(dp(18), dp(18)));
        TextView t = text(16, Color.WHITE, on);
        t.setText(label);
        t.setSingleLine(true);
        t.setEllipsize(TextUtils.TruncateAt.END);
        t.setPadding(dp(12), 0, 0, 0);
        t.setDuplicateParentStateEnabled(true);
        t.setTextColor(new ColorStateList(new int[][]{{android.R.attr.state_focused}, {}}, new int[]{Color.BLACK, run == null ? 0x80FFFFFF : Color.WHITE}));
        row.addView(t, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1));
        if (run != null) {
            StateListDrawable bg = new StateListDrawable();
            bg.addState(new int[]{android.R.attr.state_focused}, rounded(Color.WHITE, dp(10)));
            bg.addState(new int[]{android.R.attr.state_pressed}, rounded(0x33FFFFFF, dp(10)));
            bg.addState(new int[]{}, rounded(0x00000000, dp(10)));
            row.setBackground(bg);
            row.setFocusable(true);
            row.setClickable(true);
            row.setOnClickListener(v -> { closeMenu(); run.run(); });
        }
        menu.addView(row);
        return row;
    }

    private void closeMenu() {
        if (menuWrap.getVisibility() != View.VISIBLE) return;
        menuWrap.setVisibility(View.GONE);
        menuWrap.removeAllViews();
        if (focusBeforeMenu != null) focusBeforeMenu.requestFocus();
        bump();
    }

    private void switchEngine(String which) {
        if (which.equals(eng.name())) return;
        double at = pos();
        prefs.edit().putString("engine", which).apply();
        stopSession();
        triedHls = false;
        hlsRetries = 0;
        relaunchLoading(which.equals("exo") ? "Switching to the Kino player" : "Switching to the Android player");
        startEngine(which, at);
    }

    private String vlcPackage() {
        for (String p : new String[]{"org.videolan.vlc", "org.videolan.vlc.betav7neon"}) {
            try { getPackageManager().getPackageInfo(p, 0); return p; } catch (PackageManager.NameNotFoundException ignored) { }
        }
        return null;
    }

    // VLC and other apps get a signed link (they cant send Kino's cookies), and the position to start from
    private void openExternal(String pkg) {
        double at = pos();
        eng.pause();
        save();
        toast("Opening " + (pkg != null ? "VLC" : "the other app") + "…");
        new Thread(() -> {
            try {
                JSONObject r = new JSONObject(post("/api/extlink/" + Uri.encode(fid), "{}"));
                Uri u = Uri.parse(base + r.getString("url"));
                runOnUiThread(() -> {
                    Intent i = new Intent(Intent.ACTION_VIEW).setDataAndType(u, "video/*");
                    i.putExtra("title", info.optString("title") + (info.optString("sub").isEmpty() ? "" : "  " + info.optString("sub")));
                    i.putExtra("position", (long) (at * 1000));       // vlc and mx player both read this
                    i.putExtra("from_start", false);
                    i.putExtra("return_result", true);
                    if (pkg != null) i.setPackage(pkg);
                    try {
                        startActivityForResult(pkg != null ? i : Intent.createChooser(i, "Play with"), EXTERNAL);
                    } catch (ActivityNotFoundException e) {
                        toast("No other video player is installed. VLC is free in the app store");
                    }
                });
            } catch (Exception e) {
                runOnUiThread(() -> toast(message(e)));
            }
        }).start();
    }

    @Override
    protected void onActivityResult(int req, int res, Intent data) {
        super.onActivityResult(req, res, data);
        if (req != EXTERNAL) return;
        // VLC and MX Player say where they stopped, Kino saves that and carries on from there
        long p = data != null ? data.getLongExtra("extra_position", data.getIntExtra("position", -1)) : -1;
        long d = data != null ? data.getLongExtra("extra_duration", data.getIntExtra("duration", -1)) : -1;
        if (p > 0) {
            double at = p / 1000.0, du = d > 0 ? d / 1000.0 : dur();
            postProgress(at, du);
            if (du > 0 && at / du > 0.93) { ended = true; done(); return; }
            seekTo(at);
        }
        toast("Back in Kino");
    }

    // ---------------------------------------------------------------- dialogs

    private LinearLayout dialog(String heading, String body) {
        closeMenu();
        if (card != null) root.removeView(card);
        card = new LinearLayout(this);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setGravity(Gravity.CENTER_HORIZONTAL);
        card.setBackground(rounded(0xF21E1E20, dp(26)));
        card.setPadding(dp(28), dp(26), dp(28), dp(22));
        card.setElevation(dp(16));
        TextView hd = text(22, Color.WHITE, true);
        hd.setText(heading);
        hd.setGravity(Gravity.CENTER);
        card.addView(hd);
        TextView bd = text(15, 0x99FFFFFF, false);
        bd.setText(body);
        bd.setGravity(Gravity.CENTER);
        bd.setPadding(0, dp(8), 0, dp(18));
        bd.setLineSpacing(0, 1.15f);
        card.addView(bd);
        root.addView(card, new FrameLayout.LayoutParams(dp(420), ViewGroup.LayoutParams.WRAP_CONTENT, Gravity.CENTER));
        return card;
    }

    private void buttons(LinearLayout c, TextView... bs) {
        for (int i = 0; i < bs.length; i++) {
            LinearLayout.LayoutParams l = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(50));
            if (i > 0) l.topMargin = dp(8);
            c.addView(bs[i], l);
        }
        bs[0].post(bs[0]::requestFocus);
    }

    private void closeDialog() {
        if (card != null) { root.removeView(card); card = null; }
    }

    // Are you still watching, pauses and asks after the profile's set time with nobody touching the remote
    // A 30 second clip in place of a whole film or episode, torbox sends one of those (a green screen) when a download
    // didnt really happen. Asks to try the next source, or just does it if the profile turned that on in Settings
    private boolean fakeAsked, backDown;
    // Live tv: no timeline, and the remote's up and down (or channel buttons) flick through the channels it was opened
    // from without leaving the player, the same player keeps going so switching is quick
    private boolean live;
    private double audioDelay;
    private JSONArray liveList;
    private int liveIdx;

    private void switchChannel(int d) {
        if (liveList == null || liveList.length() < 2) return;
        liveIdx = (liveIdx + d + liveList.length()) % liveList.length();
        JSONObject ch = liveList.optJSONObject(liveIdx);
        if (ch == null) return;
        fid = ch.optString("id");
        title.setText(ch.optString("name"));
        String now = ch.optString("now");
        sub.setText(now.isEmpty() ? "Live" : "Live  ·  " + now);
        sub.setVisibility(View.VISIBLE);
        toast((liveIdx + 1) + "  " + ch.optString("name"));
        errorShown = false;
        closeDialog();
        relaunchLoading("Tuning in");
        eng.open(base + "/api/live/" + ch.optString("id") + "/index.m3u8", true, -1, new ArrayList<>());
    }
    // Buffering watch: when this source keeps stopping to load it offers the next one, or moves on by itself
    private long bufStart, lastSeekAt, stallAskedAt, playedAt;
    private int sameRetries;
    private final java.util.ArrayDeque<long[]> stalls = new java.util.ArrayDeque<>();

    private void checkStall(double p) {
        long now = System.currentTimeMillis();
        if (!loading && p > 5 && playedAt == 0) playedAt = now;
        if (loading || card != null || errorShown || !sourceCanMoveOn() || playedAt == 0) return;
        if (now - stallAskedAt < 180000 || now - lastSeekAt < 10000) return;
        while (!stalls.isEmpty() && now - stalls.peekFirst()[0] > 120000) stalls.pollFirst();
        long total = 0;
        for (long[] x : stalls) total += x[1];
        long cur = bufStart > 0 ? now - bufStart : 0;
        if (cur < 12000 && total + cur < 25000) return;
        stallAskedAt = now;
        if (info.optBoolean("autoNextSource")) { moveOn("That source kept buffering", pos(), false); return; }
        LinearLayout c = dialog("This source keeps buffering", "Another source might play smoother. Kino can switch and carry on from " + clock(pos()) + ".");
        TextView next = pill("Next Source", true), keep = pill("Keep Waiting", false);
        next.setOnClickListener(v -> { closeDialog(); moveOn("Switched sources", pos(), false); });
        keep.setOnClickListener(v -> { closeDialog(); stalls.clear(); });
        buttons(c, next, keep);
    }

    private void checkFake(double d) {
        if (fakeAsked || loading || !info.optBoolean("checkFake")) return;
        double len = Math.max(d, info.optDouble("duration", 0));
        if (len < 27 || len > 33) return;
        fakeAsked = true;
        boolean more = sourceCanMoveOn();
        if (more && info.optBoolean("autoNextSource")) { moveOn("That copy was a 30 second placeholder", 0, true); return; }
        eng.pause();
        LinearLayout c = dialog("This copy is only 30 seconds long", "It's probably a placeholder, the download didn't really finish on TorBox."
                + (more ? "" : " There aren't any other sources to try right now."));
        TextView next = pill("Next Source", true), keep = pill(more ? "Keep Watching" : "OK", !more);
        next.setOnClickListener(v -> { closeDialog(); moveOn("Skipped the placeholder", 0, true); });
        keep.setOnClickListener(v -> { closeDialog(); eng.play(); });
        if (more) buttons(c, next, keep);
        else buttons(c, keep);
    }

    private void moveOn(String why, double at, boolean fake) {
        if (leaving) return;
        leaving = true;
        try {
            JSONObject r = new JSONObject().put("fid", fid).put("pos", at).put("dur", dur()).put("sourceFailed", true).put("fake", fake).put("why", why).put("error", why);
            setResult(RESULT_OK, new Intent().putExtra("result", r.toString()));
        } catch (Exception ignored) { }
        finish();
    }

    private void askStill() {
        eng.pause();
        LinearLayout c = dialog("Are you still watching?", info.optString("title") + (info.optString("sub").isEmpty() ? "" : "\n" + info.optString("sub")));
        TextView yes = pill("Continue Watching", true), no = pill("Stop", false);
        yes.setOnClickListener(v -> { closeDialog(); lastInput = System.currentTimeMillis(); eng.play(); });
        no.setOnClickListener(v -> { closeDialog(); done(); });
        buttons(c, yes, no);
        h.postDelayed(() -> { if (card == c) { closeDialog(); done(); } }, 600000);
    }

    private void showError(String msg) {
        errorShown = true;
        loading = false;
        loadLayer.setVisibility(View.GONE);
        LinearLayout c = dialog("This won't play here", msg + ". Another player might manage it.");
        String other = eng.name().equals("exo") ? "android" : "exo";
        TextView tryOther = pill(other.equals("android") ? "Try Android Player" : "Try Kino Player", true);
        String vlc = vlcPackage();
        TextView ext = pill(vlc != null ? "Open in VLC" : "Another App", false);
        TextView web = pill("Web Player", false);
        tryOther.setOnClickListener(v -> { closeDialog(); errorShown = false; switchEngine(other); });
        ext.setOnClickListener(v -> { closeDialog(); errorShown = false; openExternal(vlc); });
        web.setOnClickListener(v -> { closeDialog(); done(msg); });
        buttons(c, tryOther, ext, web);
    }

    private final Runnable hideToast = () -> toastView.animate().alpha(0f).setDuration(250).withEndAction(() -> toastView.setVisibility(View.GONE)).start();

    private void toast(String t) {
        toastView.setText(t);
        toastView.setVisibility(View.VISIBLE);
        toastView.setAlpha(0f);
        toastView.animate().alpha(1f).setDuration(200).start();
        h.removeCallbacks(hideToast);
        h.postDelayed(hideToast, 2800);
    }

    // ---------------------------------------------------------------- keys

    @Override
    public boolean dispatchKeyEvent(KeyEvent e) {
        lastInput = System.currentTimeMillis();
        int k = e.getKeyCode();
        boolean down = e.getAction() == KeyEvent.ACTION_DOWN;
        if (k == KeyEvent.KEYCODE_BACK) {
            // Acts when the button comes back up, not when its pressed. Closing on the press left the release going to
            // the page behind, which took that as a second back and left the title page for Home
            if (down) { if (e.getRepeatCount() == 0) backDown = true; return true; }
            if (backDown && !e.isCanceled()) {
                backDown = false;
                if (menuWrap.getVisibility() == View.VISIBLE) closeMenu();
                else if (card != null && !errorShown) { closeDialog(); eng.play(); }
                else done();
            }
            return true;
        }
        if (eng == null || card != null) return super.dispatchKeyEvent(e);
        if (down) {
            switch (k) {
                case KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE:
                case KeyEvent.KEYCODE_HEADSETHOOK: togglePlay(); showControls(bPlay); return true;
                case KeyEvent.KEYCODE_MEDIA_PLAY: eng.play(); return true;
                case KeyEvent.KEYCODE_MEDIA_PAUSE: eng.pause(); return true;
                case KeyEvent.KEYCODE_CHANNEL_UP:
                case KeyEvent.KEYCODE_PAGE_UP: if (live) { switchChannel(-1); return true; } break;
                case KeyEvent.KEYCODE_CHANNEL_DOWN:
                case KeyEvent.KEYCODE_PAGE_DOWN: if (live) { switchChannel(1); return true; } break;
                case KeyEvent.KEYCODE_MEDIA_NEXT: if (live) { switchChannel(1); return true; } break;
                case KeyEvent.KEYCODE_MEDIA_PREVIOUS: if (live) { switchChannel(-1); return true; } break;
                case KeyEvent.KEYCODE_MEDIA_FAST_FORWARD:
                case KeyEvent.KEYCODE_MEDIA_SKIP_FORWARD: if (live) return true; seekTo(pos() + 10); showControls(line); return true;
                case KeyEvent.KEYCODE_MEDIA_REWIND:
                case KeyEvent.KEYCODE_MEDIA_SKIP_BACKWARD: seekTo(Math.max(0, pos() - 10)); showControls(line); return true;
                case KeyEvent.KEYCODE_MEDIA_STOP: done(); return true;
            }
        }
        boolean shown = controls.getVisibility() == View.VISIBLE;
        boolean onPopup = (skip.getVisibility() == View.VISIBLE && skip.isFocused()) || (upNext.getVisibility() == View.VISIBLE && upNext.hasFocus());
        if (!shown && !onPopup && menuWrap.getVisibility() != View.VISIBLE) {
            // Controls hidden: left and right jump with the timeline focused, ok pauses, anything else brings them up
            if (down && (k == KeyEvent.KEYCODE_DPAD_LEFT || k == KeyEvent.KEYCODE_DPAD_RIGHT)) {
                showControls(line);
                line.requestFocus();
                line.onKeyDown(k, e);
                return true;
            }
            if (down && (k == KeyEvent.KEYCODE_DPAD_CENTER || k == KeyEvent.KEYCODE_ENTER)) { togglePlay(); showControls(bPlay); return true; }
            if (down && live && (k == KeyEvent.KEYCODE_DPAD_UP || k == KeyEvent.KEYCODE_DPAD_DOWN)) { switchChannel(k == KeyEvent.KEYCODE_DPAD_UP ? -1 : 1); return true; }
            if (down && live && (k == KeyEvent.KEYCODE_DPAD_LEFT || k == KeyEvent.KEYCODE_DPAD_RIGHT)) { showControls(bPlay); return true; }
            if (down && (k == KeyEvent.KEYCODE_DPAD_UP || k == KeyEvent.KEYCODE_DPAD_DOWN)) { showControls(bPlay); return true; }
            if (!down && (k == KeyEvent.KEYCODE_DPAD_CENTER || k == KeyEvent.KEYCODE_ENTER || k == KeyEvent.KEYCODE_DPAD_UP || k == KeyEvent.KEYCODE_DPAD_DOWN)) return true;
        }
        if (shown) bump();
        return super.dispatchKeyEvent(e);
    }

    @Override
    public boolean dispatchTouchEvent(MotionEvent e) {
        lastInput = System.currentTimeMillis();
        return super.dispatchTouchEvent(e);
    }

    // ---------------------------------------------------------------- saving and leaving

    private final Runnable saver = new Runnable() {
        @Override public void run() {
            if (eng != null && eng.playing()) save();
            h.postDelayed(this, 10000);
        }
    };

    private void save() {
        if (eng == null || loading || live) return;
        postProgress(pos(), dur());
    }

    private void postProgress(double p, double d) {
        if (d <= 0) return;
        String body = "{\"file_id\":" + JSONObject.quote(fid) + ",\"pos\":" + p + ",\"dur\":" + d + "}";
        new Thread(() -> { try { post("/api/progress", body); } catch (Exception ignored) { } }).start();
    }

    private void done() { done(null); }

    private void done(String error) {
        if (leaving) return;
        leaving = true;
        double p = eng != null ? pos() : 0, d = dur();
        if (!loading && !live) postProgress(p, d);
        try {
            JSONObject r = new JSONObject().put("fid", fid).put("pos", p).put("dur", d).put("ended", ended).put("engine", eng != null ? eng.name() : "");
            if (error != null) r.put("error", error);
            setResult(RESULT_OK, new Intent().putExtra("result", r.toString()));
        } catch (Exception ignored) { }
        finish();
    }

    private void stopSession() { stopSession(sid); sid = null; }

    private void stopSession(String s) {
        if (s == null || s.isEmpty()) return;
        new Thread(() -> { try { post("/api/play/" + s + "/stop", "{}"); } catch (Exception ignored) { } }).start();
    }

    private String post(String path, String json) throws Exception {
        HttpURLConnection c = (HttpURLConnection) new URL(base + path).openConnection();
        c.setRequestMethod("POST");
        c.setConnectTimeout(20000);
        c.setReadTimeout(60000);
        c.setDoOutput(true);
        c.setRequestProperty("Content-Type", "application/json");
        c.setRequestProperty("User-Agent", ua);
        for (Map.Entry<String, String> e : headers.entrySet()) c.setRequestProperty(e.getKey(), e.getValue());
        try (OutputStream o = c.getOutputStream()) { o.write(json.getBytes(StandardCharsets.UTF_8)); }
        int code = c.getResponseCode();
        InputStream in = code < 400 ? c.getInputStream() : c.getErrorStream();
        String txt = in == null ? "" : new String(readAll(in), StandardCharsets.UTF_8);
        if (code >= 400) {
            String msg = txt;
            try { msg = new JSONObject(txt).optString("detail", txt); } catch (Exception ignored) { }
            throw new Exception(msg.isEmpty() ? "The server said " + code : msg);
        }
        return txt;
    }

    private static byte[] readAll(InputStream in) throws Exception {
        ByteArrayOutputStream b = new ByteArrayOutputStream();
        byte[] buf = new byte[8192];
        int n;
        while ((n = in.read(buf)) > 0) b.write(buf, 0, n);
        in.close();
        return b.toByteArray();
    }

    private static String message(Exception e) {
        String m = e.getMessage();
        return m == null || m.isEmpty() ? "Playback couldn't start" : m;
    }

    private void hideBars() {
        if (Build.VERSION.SDK_INT >= 30) {
            WindowInsetsController c = getWindow().getInsetsController();
            if (c != null) {
                c.hide(WindowInsets.Type.systemBars());
                c.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
            }
        } else {
            getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                    | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY | View.SYSTEM_UI_FLAG_LAYOUT_STABLE);
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        hideBars();
    }

    @Override
    protected void onStop() {
        super.onStop();
        // Leaving the app pauses it, coming back carries on. Not when VLC is in front, that one is playing it
        if (eng != null && !isFinishing()) { save(); eng.pause(); }
    }

    @Override
    protected void onDestroy() {
        h.removeCallbacksAndMessages(null);
        stopSession();
        if (eng != null) { eng.release(); eng = null; }
        super.onDestroy();
    }
}
