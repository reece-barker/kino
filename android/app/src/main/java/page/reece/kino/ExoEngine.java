package page.reece.kino;

import android.content.Context;
import android.graphics.Color;
import android.graphics.Typeface;
import android.net.Uri;
import android.view.View;

import androidx.media3.common.AudioAttributes;
import androidx.media3.common.C;
import androidx.media3.common.Format;
import androidx.media3.common.MediaItem;
import androidx.media3.common.MimeTypes;
import androidx.media3.common.PlaybackException;
import androidx.media3.common.PlaybackParameters;
import androidx.media3.common.Player;
import androidx.media3.common.TrackSelectionOverride;
import androidx.media3.common.Tracks;
import androidx.media3.datasource.DefaultHttpDataSource;
import androidx.media3.exoplayer.DefaultLoadControl;
import androidx.media3.exoplayer.DefaultRenderersFactory;
import androidx.media3.exoplayer.ExoPlayer;
import androidx.media3.exoplayer.analytics.AnalyticsListener;
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory;
import androidx.media3.exoplayer.trackselection.DefaultTrackSelector;
import androidx.media3.ui.AspectRatioFrameLayout;
import androidx.media3.ui.CaptionStyleCompat;
import androidx.media3.ui.PlayerView;
import androidx.media3.ui.SubtitleView;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/** Exoplayer, the tv's hardware decoder straight from the file. Kino draws its own controls over the top */
class ExoEngine implements Engine {
    private final ExoPlayer player;
    private final PlayerView view;
    private final Listener l;
    private final float subSize;
    private boolean firstFrame;

    ExoEngine(Context c, Map<String, String> headers, String ua, String audioLang, String subLang, String subSizePref, boolean lowRam, Listener l) {
        this.l = l;
        DefaultTrackSelector ts = new DefaultTrackSelector(c);
        DefaultTrackSelector.Parameters.Builder pb = ts.buildUponParameters();
        if (!audioLang.isEmpty()) pb.setPreferredAudioLanguage(audioLang);
        if (!subLang.isEmpty()) pb.setPreferredTextLanguage(subLang).setSelectUndeterminedTextLanguage(false);
        ts.setParameters(pb.build());
        DefaultHttpDataSource.Factory http = new DefaultHttpDataSource.Factory().setUserAgent(ua).setDefaultRequestProperties(headers)
                .setConnectTimeoutMs(20000).setReadTimeoutMs(30000).setAllowCrossProtocolRedirects(false);
        player = new ExoPlayer.Builder(c, new DefaultRenderersFactory(c).setEnableDecoderFallback(true))
                .setTrackSelector(ts).setMediaSourceFactory(new DefaultMediaSourceFactory(http))
                // Low memory tvs keep less video ready ahead, by default exoplayer can hold over 100 MB of a 4K film
                .setLoadControl(lowRam ? new DefaultLoadControl.Builder().setBufferDurationsMs(15000, 30000, 2000, 4000)
                        .setTargetBufferBytes(48 * 1024 * 1024).setPrioritizeTimeOverSizeThresholds(false).build() : new DefaultLoadControl())
                .build();
        player.setAudioAttributes(AudioAttributes.DEFAULT, true);
        player.setHandleAudioBecomingNoisy(true);  // Pauses when headphones or bluetooth go away instead of blasting out of the speaker

        view = new PlayerView(c);
        view.setUseController(false);
        view.setShutterBackgroundColor(Color.BLACK);
        view.setKeepContentOnPlayerReset(true);
        view.setResizeMode(AspectRatioFrameLayout.RESIZE_MODE_FIT);
        view.setFocusable(false);
        view.setPlayer(player);
        // Subtitles look like the web player's: bold white on a soft dark box
        subSize = "s".equals(subSizePref) ? 0.045f : "l".equals(subSizePref) ? 0.068f : 0.055f;
        SubtitleView sv = view.getSubtitleView();
        if (sv != null) {
            sv.setStyle(new CaptionStyleCompat(Color.WHITE, 0x8C000000, Color.TRANSPARENT, CaptionStyleCompat.EDGE_TYPE_DROP_SHADOW, 0x99000000, Typeface.DEFAULT_BOLD));
            sv.setFractionalTextSize(subSize);
            sv.setBottomPaddingFraction(0.08f);
            sv.setApplyEmbeddedStyles(false);
        }

        player.addListener(new Player.Listener() {
            @Override public void onPlaybackStateChanged(int s) {
                l.onBuffering(s == Player.STATE_BUFFERING);
                if (s == Player.STATE_ENDED) l.onEnded();
            }
            @Override public void onIsPlayingChanged(boolean p) { l.onPlaying(p); }
            @Override public void onRenderedFirstFrame() { if (!firstFrame) { firstFrame = true; l.onFirstFrame(); } }
            @Override public void onTracksChanged(Tracks t) { l.onTracks(); }
            @Override public void onPlayerError(PlaybackException e) {
                int code = e.errorCode;
                boolean codec = code >= 4000 && code < 5000 || code == PlaybackException.ERROR_CODE_PARSING_CONTAINER_UNSUPPORTED
                        || code == PlaybackException.ERROR_CODE_PARSING_CONTAINER_MALFORMED;
                // A bad answer from the server says which one (403, 404, 429...), that is what tells a refused stream from a dead one
                String extra = "";
                Throwable cause = e.getCause();
                if (cause instanceof androidx.media3.datasource.HttpDataSource.InvalidResponseCodeException) extra = " " + ((androidx.media3.datasource.HttpDataSource.InvalidResponseCodeException) cause).responseCode;
                l.onError(e.getErrorCodeName().replace("ERROR_CODE_", "").replace('_', ' ').toLowerCase(Locale.ROOT) + extra, codec);
            }
        });
        player.addAnalyticsListener(new AnalyticsListener() {
            @Override public void onBandwidthEstimate(EventTime t, int loadMs, long bytes, long bitrate) { l.onBandwidth(bitrate); }
        });
    }

    @Override public String name() { return "exo"; }
    @Override public View view() { return view; }

    @Override
    public void open(String url, boolean hls, long startMs, List<Sub> subs) {
        firstFrame = false;
        MediaItem.Builder b = new MediaItem.Builder().setUri(Uri.parse(url));
        if (hls) b.setMimeType(MimeTypes.APPLICATION_M3U8);
        List<MediaItem.SubtitleConfiguration> sc = new ArrayList<>();
        for (Sub s : subs) {
            sc.add(new MediaItem.SubtitleConfiguration.Builder(Uri.parse(s.url)).setMimeType(MimeTypes.TEXT_VTT)
                    .setLanguage(s.lang.isEmpty() ? null : s.lang).setLabel(s.label).build());
        }
        b.setSubtitleConfigurations(sc);
        // -1 is live tv, it starts at the live edge instead of a position. It stays about 12 seconds behind it (the default is 3 pieces,
        // which a slow channel cant keep up with, so it kept stopping to load) and never speeds up or slows down to catch the edge
        if (startMs < 0) b.setLiveConfiguration(new MediaItem.LiveConfiguration.Builder().setTargetOffsetMs(12000).setMinOffsetMs(8000)
                .setMaxOffsetMs(30000).setMinPlaybackSpeed(1.0f).setMaxPlaybackSpeed(1.0f).build());
        if (startMs < 0) player.setMediaItem(b.build());
        else player.setMediaItem(b.build(), startMs);
        player.prepare();
        player.play();
    }

    @Override public long pos() { return Math.max(0, player.getCurrentPosition()); }
    @Override public long dur() { long d = player.getDuration(); return d == C.TIME_UNSET ? 0 : d; }
    @Override public long buffered() { return player.getBufferedPosition(); }
    @Override public boolean playing() { return player.isPlaying(); }
    @Override public void play() { player.play(); }
    @Override public void pause() { player.pause(); }
    @Override public void seek(long ms) { player.seekTo(Math.max(0, ms)); }

    private List<Track> tracks(int type) {
        List<Track> out = new ArrayList<>();
        List<Tracks.Group> gs = player.getCurrentTracks().getGroups();
        for (int i = 0; i < gs.size(); i++) {
            Tracks.Group g = gs.get(i);
            if (g.getType() != type || g.length == 0) continue;
            out.add(new Track(i, label(g.getTrackFormat(0), type, out.size()), g.isSelected(), g.isSupported()));
        }
        return out;
    }

    // "English 5.1 Dolby Digital Plus", or the name the file gives the track
    private static String label(Format f, int type, int n) {
        StringBuilder s = new StringBuilder();
        String lang = f.language == null || f.language.equals("und") ? "" : new Locale(f.language).getDisplayLanguage(Locale.ENGLISH);
        if (f.label != null && !f.label.isEmpty()) s.append(f.label);
        else if (!lang.isEmpty()) s.append(lang);
        else s.append(type == C.TRACK_TYPE_AUDIO ? "Track " : "Subtitles ").append(n + 1);
        if (type == C.TRACK_TYPE_AUDIO) {
            if (f.channelCount == 6) s.append(" 5.1");
            else if (f.channelCount == 8) s.append(" 7.1");
            else if (f.channelCount == 2) s.append(" Stereo");
            String m = f.sampleMimeType == null ? "" : f.sampleMimeType;
            String codec = m.contains("eac3-joc") ? "Atmos" : m.contains("eac3") ? "Dolby Digital Plus" : m.contains("ac3") ? "Dolby Digital"
                    : m.contains("true-hd") ? "TrueHD" : m.contains("dts") ? "DTS" : m.contains("mp4a") ? "AAC" : m.contains("opus") ? "Opus" : "";
            if (!codec.isEmpty()) s.append(" · ").append(codec);
        } else if ((f.selectionFlags & C.SELECTION_FLAG_FORCED) != 0) s.append(" (Forced)");
        return s.toString();
    }

    @Override public List<Track> audio() { return tracks(C.TRACK_TYPE_AUDIO); }
    @Override public List<Track> text() { return tracks(C.TRACK_TYPE_TEXT); }

    private void pick(int type, int id) {
        List<Tracks.Group> gs = player.getCurrentTracks().getGroups();
        if (id < 0) {
            player.setTrackSelectionParameters(player.getTrackSelectionParameters().buildUpon().setTrackTypeDisabled(type, true).build());
            return;
        }
        if (id >= gs.size()) return;
        player.setTrackSelectionParameters(player.getTrackSelectionParameters().buildUpon().setTrackTypeDisabled(type, false)
                .setOverrideForType(new TrackSelectionOverride(gs.get(id).getMediaTrackGroup(), 0)).build());
    }

    @Override public void pickAudio(int id) { pick(C.TRACK_TYPE_AUDIO, id); }
    @Override public void pickText(int id) { pick(C.TRACK_TYPE_TEXT, id); }
    @Override public void speed(float s) { player.setPlaybackParameters(new PlaybackParameters(s)); }

    @Override
    public void subsRaised(boolean up) {
        SubtitleView sv = view.getSubtitleView();
        if (sv != null) sv.setBottomPaddingFraction(up ? 0.24f : 0.08f);
    }

    /** True when the file has sound but none this device can play (dts or truehd on most tvs) */
    boolean noPlayableAudio() {
        Tracks t = player.getCurrentTracks();
        return t.containsType(C.TRACK_TYPE_AUDIO) && !t.isTypeSupported(C.TRACK_TYPE_AUDIO);
    }

    @Override public void release() { player.release(); }

    // Audio focus is what pauses the picture when a tvs assistant or a notification sound grabs the sound, on a live channel
    // that looked like it paused for no reason so for those the player just keeps going
    @Override public void live(boolean on) { player.setAudioAttributes(AudioAttributes.DEFAULT, !on); }
}
