package page.reece.kino;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.media.MediaCodecInfo;
import android.media.MediaCodecList;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
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
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import androidx.media3.common.AudioAttributes;
import androidx.media3.common.C;
import androidx.media3.common.MediaItem;
import androidx.media3.common.MimeTypes;
import androidx.media3.common.PlaybackException;
import androidx.media3.common.Player;
import androidx.media3.common.TrackSelectionOverride;
import androidx.media3.common.Tracks;
import androidx.media3.datasource.DefaultHttpDataSource;
import androidx.media3.exoplayer.DefaultRenderersFactory;
import androidx.media3.exoplayer.ExoPlayer;
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory;
import androidx.media3.exoplayer.trackselection.DefaultTrackSelector;
import androidx.media3.ui.PlayerView;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * The player the app uses instead of the one in the web page. Its exoplayer, the same thing stremio uses on android tv,
 * so the video goes straight to the tv's own hardware decoder. That fixes the green and purple blocks the webview
 * player gave on fire tv with hevc and dolby vision films, and seeking is instant cause nothing gets converted.
 * When the tv cant play the sound (dts or truehd) or the picture (dolby vision on a tv without it), it asks the server
 * for a converted stream instead, same as the web player does.
 */
public class PlayerActivity extends Activity {
    static final String EXTRA = "info";

    private JSONObject info;
    private String base, ua, fid;
    private ExoPlayer player;
    private PlayerView view;
    private TextView title, sub;
    private LinearLayout top;
    private Button skip;
    private final Handler h = new Handler(Looper.getMainLooper());

    private boolean hls, ended, introSkipped, audioPicked, triedHls;
    private double offset;          // where the converted stream starts in the film, in seconds
    private String sid;             // the servers player session when its converting
    private int hlsRetries;
    private long lastInput = System.currentTimeMillis();
    private AlertDialog still;
    private String error;

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

        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        hideBars();

        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(Color.BLACK);
        view = new PlayerView(this);
        view.setShowSubtitleButton(true);
        view.setShowNextButton(false);
        view.setShowPreviousButton(false);
        view.setControllerShowTimeoutMs(4000);
        view.setKeepContentOnPlayerReset(true);
        root.addView(view, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));

        // Title at the top, shows and hides with the controls
        top = new LinearLayout(this);
        top.setOrientation(LinearLayout.VERTICAL);
        int pad = dp(28);
        top.setPadding(pad, dp(22), pad, dp(40));
        GradientDrawable fade = new GradientDrawable(GradientDrawable.Orientation.TOP_BOTTOM, new int[]{0xCC000000, 0x00000000});
        top.setBackground(fade);
        title = new TextView(this);
        title.setTextColor(Color.WHITE);
        title.setTextSize(TypedValue.COMPLEX_UNIT_SP, 22);
        title.setTypeface(Typeface.DEFAULT_BOLD);
        title.setText(info.optString("title"));
        sub = new TextView(this);
        sub.setTextColor(0xB3FFFFFF);
        sub.setTextSize(TypedValue.COMPLEX_UNIT_SP, 15);
        sub.setText(info.optString("sub"));
        sub.setVisibility(info.optString("sub").isEmpty() ? View.GONE : View.VISIBLE);
        top.addView(title);
        top.addView(sub);
        root.addView(top, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT, Gravity.TOP));
        view.setControllerVisibilityListener((PlayerView.ControllerVisibilityListener) v -> top.setVisibility(v));

        // Skip intro, bottom right like netflix
        skip = new Button(this);
        skip.setText("Skip Intro");
        skip.setAllCaps(false);
        skip.setTextColor(Color.BLACK);
        skip.setTextSize(TypedValue.COMPLEX_UNIT_SP, 16);
        skip.setTypeface(Typeface.DEFAULT_BOLD);
        GradientDrawable pill = new GradientDrawable();
        pill.setColor(Color.WHITE);
        pill.setCornerRadius(dp(12));
        skip.setBackground(pill);
        skip.setPadding(dp(22), dp(10), dp(22), dp(10));
        skip.setVisibility(View.GONE);
        skip.setOnClickListener(v -> skipIntro());
        FrameLayout.LayoutParams sl = new FrameLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT, Gravity.BOTTOM | Gravity.END);
        sl.setMargins(0, 0, dp(40), dp(110));
        root.addView(skip, sl);
        setContentView(root);

        // Picks the profile's audio and subtitle languages, the exact audio track comes from the page in onTracksChanged
        DefaultTrackSelector ts = new DefaultTrackSelector(this);
        DefaultTrackSelector.Parameters.Builder pb = ts.buildUponParameters();
        String al = info.optString("audioLang"), sl2 = info.optString("subLang");
        if (!al.isEmpty()) pb.setPreferredAudioLanguage(al);
        if (!sl2.isEmpty()) pb.setPreferredTextLanguage(sl2).setSelectUndeterminedTextLanguage(false);
        ts.setParameters(pb.build());

        Map<String, String> headers = new HashMap<>();
        String cookie = CookieManager.getInstance().getCookie(base);
        if (cookie != null) headers.put("Cookie", cookie);
        headers.put("X-Kino", "1");
        DefaultHttpDataSource.Factory http = new DefaultHttpDataSource.Factory()
                .setUserAgent(ua)
                .setDefaultRequestProperties(headers)
                .setConnectTimeoutMs(20000)
                .setReadTimeoutMs(30000)
                .setAllowCrossProtocolRedirects(false);

        // Decoder fallback means if the first hevc decoder says no another one gets tried before giving up
        DefaultRenderersFactory rf = new DefaultRenderersFactory(this).setEnableDecoderFallback(true);
        player = new ExoPlayer.Builder(this, rf)
                .setTrackSelector(ts)
                .setMediaSourceFactory(new DefaultMediaSourceFactory(http))
                .setSeekBackIncrementMs(10000)
                .setSeekForwardIncrementMs(10000)
                .build();
        player.setAudioAttributes(AudioAttributes.DEFAULT, true);
        view.setPlayer(player);
        player.addListener(new Player.Listener() {
            @Override
            public void onTracksChanged(Tracks tracks) { checkTracks(tracks); }

            @Override
            public void onPlaybackStateChanged(int s) {
                if (s == Player.STATE_ENDED) {
                    ended = true;
                    done();
                }
            }

            @Override
            public void onIsPlayingChanged(boolean playing) {
                if (playing) hlsRetries = 0;
                else save();
            }

            @Override
            public void onPlayerError(PlaybackException e) { failed(e); }
        });

        double start = info.optDouble("start", 0);
        boolean dovi = info.optBoolean("dovi");
        if (info.optBoolean("forceHls") || (dovi && !hasDecoder("video/dolby-vision"))) startHls(start);
        else startDirect(start);

        h.postDelayed(tick, 500);
        h.postDelayed(saver, 10000);
    }

    private int dp(int v) {
        return Math.round(TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, v, getResources().getDisplayMetrics()));
    }

    // ---- starting playback

    private void startDirect(double at) {
        hls = false;
        offset = 0;
        MediaItem.Builder b = new MediaItem.Builder().setUri(Uri.parse(base + info.optString("url")));
        // Subtitle files from the folder and from addons come in as extra tracks, the ones inside the file are found by exoplayer
        List<MediaItem.SubtitleConfiguration> subs = new ArrayList<>();
        JSONArray js = info.optJSONArray("subs");
        for (int i = 0; js != null && i < js.length(); i++) {
            JSONObject s = js.optJSONObject(i);
            if (s == null) continue;
            subs.add(new MediaItem.SubtitleConfiguration.Builder(Uri.parse(base + s.optString("url")))
                    .setMimeType(MimeTypes.TEXT_VTT)
                    .setLanguage(s.optString("lang", null))
                    .setLabel(s.optString("label"))
                    .build());
        }
        b.setSubtitleConfigurations(subs);
        player.setMediaItem(b.build(), (long) (at * 1000));
        player.prepare();
        player.play();
    }

    // Asks the server for a converted stream from a point in the film, it answers once the first bit is ready
    private void startHls(double at) {
        hls = true;
        triedHls = true;
        stopSession();
        Toast.makeText(this, "Preparing a version this TV can play…", Toast.LENGTH_SHORT).show();
        new Thread(() -> {
            try {
                JSONObject body = new JSONObject().put("t", at).put("audio", info.optInt("audioN", 0)).put("hevc", hasDecoder("video/hevc"));
                JSONObject r = new JSONObject(post("/api/play/" + Uri.encode(fid), body.toString()));
                runOnUiThread(() -> {
                    if (isFinishing()) { stopSession(r.optString("sid")); return; }
                    sid = r.optString("sid");
                    offset = r.optDouble("offset", at);
                    MediaItem item = new MediaItem.Builder().setUri(Uri.parse(base + r.optString("url"))).setMimeType(MimeTypes.APPLICATION_M3U8).build();
                    player.setMediaItem(item, 0);
                    player.prepare();
                    player.play();
                });
            } catch (Exception e) {
                runOnUiThread(() -> { error = message(e); done(); });
            }
        }).start();
    }

    // If the tv cant do the sound in this file it would play silent, so the server converts it instead
    private void checkTracks(Tracks t) {
        if (!hls && !triedHls && t.containsType(C.TRACK_TYPE_AUDIO) && !t.isTypeSupported(C.TRACK_TYPE_AUDIO)) {
            startHls(pos());
            return;
        }
        if (hls || audioPicked) return;
        audioPicked = true;
        // The page already worked out which audio track to use (by language tag or by name), that one gets picked here
        int want = info.optInt("audioN", -1), n = 0;
        if (want < 0 || !info.optBoolean("audioChosen")) return;
        for (Tracks.Group g : t.getGroups()) {
            if (g.getType() != C.TRACK_TYPE_AUDIO) continue;
            if (n++ == want && g.isSupported()) {
                player.setTrackSelectionParameters(player.getTrackSelectionParameters().buildUpon()
                        .setOverrideForType(new TrackSelectionOverride(g.getMediaTrackGroup(), 0)).build());
                return;
            }
        }
    }

    private void failed(PlaybackException e) {
        double at = pos();
        // Direct play didnt work (a codec the tv doesnt have), the converted stream nearly always does
        if (!hls && !triedHls) { startHls(at); return; }
        // The converted stream stops on the server after a while paused, it just gets started again from where it was
        if (hls && hlsRetries++ < 2) { startHls(at); return; }
        error = "This video won't play on this TV (" + e.getErrorCodeName() + ")";
        done();
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

    // ---- position, intro, still watching

    private double pos() {
        return (hls ? offset : 0) + Math.max(0, player.getCurrentPosition()) / 1000.0;
    }

    private double dur() {
        double d = info.optDouble("duration", 0);
        if (d > 0) return d;
        long ms = player.getDuration();
        return ms == C.TIME_UNSET ? 0 : ms / 1000.0;
    }

    private final Runnable tick = new Runnable() {
        @Override
        public void run() {
            JSONObject intro = info.optJSONObject("intro");
            if (intro != null && player != null) {
                double p = pos(), s = intro.optDouble("start"), e = intro.optDouble("end");
                boolean in = p >= s - 1 && p < e - 2;
                if (in && info.optBoolean("autoSkip") && !introSkipped) skipIntro();
                else if (in != (skip.getVisibility() == View.VISIBLE)) {
                    skip.setVisibility(in ? View.VISIBLE : View.GONE);
                    if (in) skip.requestFocus();
                }
            }
            int mins = info.optInt("stillMins", 0);
            if (mins > 0 && still == null && player != null && player.isPlaying() && System.currentTimeMillis() - lastInput > mins * 60000L) askStill();
            h.postDelayed(this, 500);
        }
    };

    private void skipIntro() {
        JSONObject intro = info.optJSONObject("intro");
        if (intro == null) return;
        introSkipped = true;
        skip.setVisibility(View.GONE);
        seekTo(intro.optDouble("end"));
    }

    private void seekTo(double t) {
        if (!hls) { player.seekTo((long) (t * 1000)); return; }
        double rel = t - offset;
        long have = player.getDuration();
        if (rel >= 0 && have != C.TIME_UNSET && rel * 1000 < have - 2000) player.seekTo((long) (rel * 1000));
        else startHls(t);
    }

    // Are you still watching, pauses and asks after the profile's set time with nobody touching the remote
    private void askStill() {
        player.pause();
        still = new AlertDialog.Builder(this, android.R.style.Theme_DeviceDefault_Dialog_Alert)
                .setTitle("Are you still watching?")
                .setMessage(info.optString("title"))
                .setPositiveButton("Continue Watching", (d, w) -> { still = null; lastInput = System.currentTimeMillis(); player.play(); })
                .setNegativeButton("Stop", (d, w) -> { still = null; done(); })
                .setOnCancelListener(d -> { still = null; lastInput = System.currentTimeMillis(); player.play(); })
                .show();
        // Nobody answers for 10 minutes and it closes, saving where it got to
        h.postDelayed(() -> { if (still != null) { still.dismiss(); still = null; done(); } }, 600000);
    }

    @Override
    public boolean dispatchKeyEvent(KeyEvent e) {
        lastInput = System.currentTimeMillis();
        if (e.getAction() == KeyEvent.ACTION_DOWN && player != null) {
            switch (e.getKeyCode()) {
                case KeyEvent.KEYCODE_BACK:
                    done();
                    return true;
                case KeyEvent.KEYCODE_MEDIA_FAST_FORWARD:
                case KeyEvent.KEYCODE_MEDIA_SKIP_FORWARD:
                    seekTo(pos() + 10); view.showController(); return true;
                case KeyEvent.KEYCODE_MEDIA_REWIND:
                case KeyEvent.KEYCODE_MEDIA_SKIP_BACKWARD:
                    seekTo(Math.max(0, pos() - 10)); view.showController(); return true;
                case KeyEvent.KEYCODE_DPAD_LEFT:
                case KeyEvent.KEYCODE_DPAD_RIGHT:
                    // With the controls hidden left and right skip 10 seconds, like the fire tv's own player
                    if (!view.isControllerFullyVisible() && skip.getVisibility() != View.VISIBLE) {
                        seekTo(Math.max(0, pos() + (e.getKeyCode() == KeyEvent.KEYCODE_DPAD_RIGHT ? 10 : -10)));
                        view.showController();
                        return true;
                    }
                    break;
            }
        }
        if (e.getKeyCode() == KeyEvent.KEYCODE_BACK) return true;
        return super.dispatchKeyEvent(e);
    }

    @Override
    public boolean dispatchTouchEvent(MotionEvent e) {
        lastInput = System.currentTimeMillis();
        return super.dispatchTouchEvent(e);
    }

    // ---- saving progress and leaving

    private final Runnable saver = new Runnable() {
        @Override
        public void run() {
            if (player != null && player.isPlaying()) save();
            h.postDelayed(this, 10000);
        }
    };

    private void save() {
        if (player == null) return;
        double p = pos(), d = dur();
        if (d <= 0) return;
        String body = "{\"file_id\":" + JSONObject.quote(fid) + ",\"pos\":" + p + ",\"dur\":" + d + "}";
        new Thread(() -> { try { post("/api/progress", body); } catch (Exception ignored) { } }).start();
    }

    private void done() {
        if (isFinishing()) return;
        double p = player != null ? pos() : 0, d = dur();
        save();
        try {
            JSONObject r = new JSONObject().put("fid", fid).put("pos", p).put("dur", d).put("ended", ended);
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
        c.setRequestProperty("X-Kino", "1");
        c.setRequestProperty("User-Agent", ua);
        String cookie = CookieManager.getInstance().getCookie(base);
        if (cookie != null) c.setRequestProperty("Cookie", cookie);
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
        java.io.ByteArrayOutputStream b = new java.io.ByteArrayOutputStream();
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
        // Leaving the app pauses it, coming back carries on
        if (player != null) { save(); player.pause(); }
    }

    @Override
    protected void onDestroy() {
        h.removeCallbacksAndMessages(null);
        stopSession();
        if (player != null) { player.release(); player = null; }
        super.onDestroy();
    }
}
