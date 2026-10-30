package page.reece.kino;

import android.content.Context;
import android.graphics.Color;
import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.net.Uri;
import android.os.Build;
import android.view.Gravity;
import android.view.SurfaceHolder;
import android.view.SurfaceView;
import android.view.View;
import android.widget.FrameLayout;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Androids own MediaPlayer, the backup when exoplayer has trouble with a file. It uses the device makers player
 * underneath so it sometimes copes with odd files exoplayer doesnt. It cant use Kino's subtitle files, only the ones
 * inside the video, and Kino draws those itself
 */
class MediaEngine implements Engine, SurfaceHolder.Callback {
    private final Context c;
    private final Map<String, String> headers;
    private final Listener l;
    private final FrameLayout box;
    private final SurfaceView surface;
    private MediaPlayer mp;
    private boolean prepared, haveSurface, wantPlay = true, first;
    private long start;
    private int bufferPct, vw, vh;

    MediaEngine(Context c, Map<String, String> headers, Listener l) {
        this.c = c;
        this.headers = headers;
        this.l = l;
        // Keeps the picture the right shape in the middle of the screen
        box = new FrameLayout(c) {
            @Override protected void onLayout(boolean changed, int left, int top, int right, int bottom) {
                int w = right - left, h = bottom - top, sw = w, sh = h;
                if (vw > 0 && vh > 0) {
                    if ((float) vw / vh > (float) w / h) sh = Math.round(w * (float) vh / vw);
                    else sw = Math.round(h * (float) vw / vh);
                }
                int x = (w - sw) / 2, y = (h - sh) / 2;
                surface.layout(x, y, x + sw, y + sh);
            }
        };
        box.setBackgroundColor(Color.BLACK);
        surface = new SurfaceView(c);
        surface.getHolder().addCallback(this);
        box.addView(surface, new FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT, Gravity.CENTER));
    }

    @Override public String name() { return "android"; }
    @Override public View view() { return box; }

    @Override
    public void open(String url, boolean hls, long startMs, List<Sub> subs) {
        release();
        prepared = false;
        first = false;
        start = startMs;
        mp = new MediaPlayer();
        mp.setAudioAttributes(new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_MEDIA).setContentType(AudioAttributes.CONTENT_TYPE_MOVIE).build());
        try {
            mp.setDataSource(c, Uri.parse(url), headers);
        } catch (Exception e) {
            l.onError("couldn't open the video", false);
            return;
        }
        if (haveSurface) mp.setDisplay(surface.getHolder());
        mp.setScreenOnWhilePlaying(true);
        mp.setOnPreparedListener(p -> {
            prepared = true;
            l.onTracks();
            if (start > 0) p.seekTo((int) start);
            if (wantPlay) { p.start(); l.onPlaying(true); }
            l.onBuffering(false);
        });
        mp.setOnVideoSizeChangedListener((p, w, h) -> { vw = w; vh = h; box.requestLayout(); });
        mp.setOnBufferingUpdateListener((p, pct) -> bufferPct = pct);
        mp.setOnInfoListener((p, what, extra) -> {
            if (what == MediaPlayer.MEDIA_INFO_BUFFERING_START) l.onBuffering(true);
            else if (what == MediaPlayer.MEDIA_INFO_BUFFERING_END) l.onBuffering(false);
            else if (what == MediaPlayer.MEDIA_INFO_VIDEO_RENDERING_START && !first) { first = true; l.onFirstFrame(); }
            return false;
        });
        mp.setOnCompletionListener(p -> l.onEnded());
        mp.setOnErrorListener((p, what, extra) -> {
            l.onError("the device's player said no (" + what + "/" + extra + ")", extra == MediaPlayer.MEDIA_ERROR_UNSUPPORTED || extra == MediaPlayer.MEDIA_ERROR_MALFORMED);
            return true;
        });
        mp.setOnTimedTextListener((p, t) -> l.onText(t == null ? null : t.getText()));
        l.onBuffering(true);
        mp.prepareAsync();
    }

    @Override public long pos() { return prepared ? mp.getCurrentPosition() : start; }
    @Override public long dur() { return prepared ? Math.max(0, mp.getDuration()) : 0; }
    @Override public long buffered() { return dur() * bufferPct / 100; }
    @Override public boolean playing() { return prepared && mp.isPlaying(); }
    @Override public void play() { wantPlay = true; if (prepared) { mp.start(); l.onPlaying(true); } }
    @Override public void pause() { wantPlay = false; if (prepared) { mp.pause(); l.onPlaying(false); } }

    @Override
    public void seek(long ms) {
        if (!prepared) { start = ms; return; }
        if (Build.VERSION.SDK_INT >= 26) mp.seekTo(ms, MediaPlayer.SEEK_CLOSEST_SYNC);
        else mp.seekTo((int) ms);
    }

    private List<Track> tracks(int... types) {
        List<Track> out = new ArrayList<>();
        if (!prepared) return out;
        MediaPlayer.TrackInfo[] ti;
        try { ti = mp.getTrackInfo(); } catch (Exception e) { return out; }
        int sel = -1;
        try { sel = mp.getSelectedTrack(types[0]); } catch (Exception ignored) { }
        for (int i = 0; i < ti.length; i++) {
            int t = ti[i].getTrackType();
            boolean match = false;
            for (int x : types) match |= x == t;
            if (!match) continue;
            String lang = ti[i].getLanguage();
            String label = lang == null || lang.equals("und") || lang.isEmpty() ? "Track " + (out.size() + 1) : new Locale(lang).getDisplayLanguage(Locale.ENGLISH);
            out.add(new Track(i, label, i == sel, true));
        }
        return out;
    }

    @Override public List<Track> audio() { return tracks(MediaPlayer.TrackInfo.MEDIA_TRACK_TYPE_AUDIO); }
    @Override public List<Track> text() { return tracks(MediaPlayer.TrackInfo.MEDIA_TRACK_TYPE_TIMEDTEXT, MediaPlayer.TrackInfo.MEDIA_TRACK_TYPE_SUBTITLE); }

    @Override public void pickAudio(int id) { try { mp.selectTrack(id); } catch (Exception ignored) { } }

    @Override
    public void pickText(int id) {
        try {
            if (id < 0) {
                for (Track t : text()) if (t.selected) mp.deselectTrack(t.id);
                l.onText(null);
            } else mp.selectTrack(id);
        } catch (Exception ignored) { }
    }

    @Override
    public void speed(float s) {
        if (prepared && Build.VERSION.SDK_INT >= 23) {
            try { mp.setPlaybackParams(mp.getPlaybackParams().setSpeed(s)); } catch (Exception ignored) { }
        }
    }

    @Override public void subsRaised(boolean up) { }

    @Override public void surfaceCreated(SurfaceHolder h) { haveSurface = true; if (mp != null) mp.setDisplay(h); }
    @Override public void surfaceChanged(SurfaceHolder h, int f, int w, int ht) { }
    @Override public void surfaceDestroyed(SurfaceHolder h) { haveSurface = false; if (mp != null) mp.setDisplay(null); }

    @Override
    public void release() {
        if (mp != null) {
            try { mp.release(); } catch (Exception ignored) { }
            mp = null;
        }
        prepared = false;
    }
}
