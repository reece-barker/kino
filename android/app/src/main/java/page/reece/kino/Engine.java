package page.reece.kino;

import android.view.View;

import java.util.List;

/**
 * What the player screen needs from whatever is actualy playing the video. There's two: exoplayer (the normal one,
 * same as stremio) and androids own MediaPlayer as a backup that decodes things a different way. Swapping between
 * them happens in the player's Player menu, VLC and other apps are handled seperatly cause they open on there own
 */
interface Engine {
    interface Listener {
        void onBuffering(boolean buffering);
        void onPlaying(boolean playing);
        void onFirstFrame();
        void onEnded();
        /** codec is true when its the kind of problem the server's converted stream would fix */
        void onError(String message, boolean codec);
        void onTracks();
        void onBandwidth(long bitsPerSecond);
        /** Subtitle text for engines that dont draw there own, null clears it */
        void onText(String text);
    }

    class Track {
        final int id;
        final String label;
        final boolean selected, supported;

        Track(int id, String label, boolean selected, boolean supported) {
            this.id = id;
            this.label = label;
            this.selected = selected;
            this.supported = supported;
        }
    }

    class Sub {
        final String url, label, lang;

        Sub(String url, String label, String lang) {
            this.url = url;
            this.label = label;
            this.lang = lang;
        }
    }

    String name();
    View view();
    void open(String url, boolean hls, long startMs, List<Sub> subs);
    long pos();
    long dur();
    long buffered();
    boolean playing();
    void play();
    void pause();
    void seek(long ms);
    List<Track> audio();
    List<Track> text();
    void pickAudio(int id);
    void pickText(int id);
    void speed(float s);
    /** Moves the subtitles up while the controls are showing so they dont sit under them */
    void subsRaised(boolean up);
    void release();
}
