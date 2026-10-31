package page.reece.kino;

import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.graphics.RectF;
import android.os.Handler;
import android.os.Looper;
import android.util.TypedValue;
import android.view.KeyEvent;
import android.view.MotionEvent;
import android.view.View;

/**
 * The timeline under the video, drawn like the web player's: a thin white bar that gets thicker with a knob when
 * its focused. With a remote, left and right move a preview (further the longer you hold it) and it jumps there
 * a moment after you let go, so you can skip a few minutes without it restarting every 10 seconds
 */
class Timeline extends View {
    interface Callback {
        void onPreview(long ms);
        void onSeek(long ms);
    }

    private final Paint track = new Paint(Paint.ANTI_ALIAS_FLAG), buf = new Paint(Paint.ANTI_ALIAS_FLAG),
            fill = new Paint(Paint.ANTI_ALIAS_FLAG), knob = new Paint(Paint.ANTI_ALIAS_FLAG), ring = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final RectF r = new RectF();
    private final Handler h = new Handler(Looper.getMainLooper());
    private final float dp;
    private long pos, dur, buffered, preview = -1;
    private Callback cb;
    private boolean dragging;
    private final Runnable commit = () -> { if (preview >= 0) { cb.onSeek(preview); preview = -1; invalidate(); } };

    Timeline(Context c) {
        super(c);
        dp = TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, 1, c.getResources().getDisplayMetrics());
        track.setColor(0x33FFFFFF);
        buf.setColor(0x47FFFFFF);
        fill.setColor(0xFFFFFFFF);
        knob.setColor(0xFFFFFFFF);
        ring.setColor(0x40FFFFFF);
        setFocusable(true);
        setFocusableInTouchMode(false);
    }

    void setCallback(Callback cb) { this.cb = cb; }

    void set(long pos, long dur, long buffered) {
        this.pos = pos;
        this.dur = dur;
        this.buffered = buffered;
        invalidate();
    }

    boolean scrubbing() { return preview >= 0 || dragging; }
    long shown() { return preview >= 0 ? preview : pos; }

    @Override
    protected void onMeasure(int w, int h) {
        setMeasuredDimension(MeasureSpec.getSize(w), Math.round(28 * dp));
    }

    @Override
    protected void onDraw(Canvas c) {
        float w = getWidth(), cy = getHeight() / 2f;
        boolean big = isFocused() || dragging;
        float th = (big ? 8 : 5) * dp, pad = 9 * dp;
        float left = pad, right = w - pad, len = right - left;
        r.set(left, cy - th / 2, right, cy + th / 2);
        c.drawRoundRect(r, th / 2, th / 2, track);
        if (dur > 0) {
            float b = left + len * Math.min(1f, (float) buffered / dur);
            r.set(left, cy - th / 2, Math.max(left, b), cy + th / 2);
            c.drawRoundRect(r, th / 2, th / 2, buf);
            float p = left + len * Math.min(1f, (float) shown() / dur);
            r.set(left, cy - th / 2, Math.max(left + th, p), cy + th / 2);
            c.drawRoundRect(r, th / 2, th / 2, fill);
            if (big) {
                c.drawCircle(p, cy, 13 * dp, ring);
                c.drawCircle(p, cy, 8 * dp, knob);
            }
        }
    }

    @Override
    protected void onFocusChanged(boolean f, int dir, android.graphics.Rect prev) {
        super.onFocusChanged(f, dir, prev);
        invalidate();
    }

    @Override
    public boolean onKeyDown(int code, KeyEvent e) {
        if (dur <= 0 || (code != KeyEvent.KEYCODE_DPAD_LEFT && code != KeyEvent.KEYCODE_DPAD_RIGHT)) {
            if ((code == KeyEvent.KEYCODE_DPAD_CENTER || code == KeyEvent.KEYCODE_ENTER) && preview >= 0) {
                h.removeCallbacks(commit);
                commit.run();
                return true;
            }
            return super.onKeyDown(code, e);
        }
        // 10 seconds a press, holding it speeds up to 30 and then 60
        int rep = e.getRepeatCount();
        long step = rep > 20 ? 60000 : rep > 6 ? 30000 : 10000;
        long base = preview >= 0 ? preview : pos;
        preview = Math.max(0, Math.min(dur - 1000, base + (code == KeyEvent.KEYCODE_DPAD_RIGHT ? step : -step)));
        cb.onPreview(preview);
        invalidate();
        h.removeCallbacks(commit);
        h.postDelayed(commit, 750);
        return true;
    }

    @Override
    protected void onDetachedFromWindow() {
        // A pending seek must not fire once the player has been closed
        h.removeCallbacks(commit);
        super.onDetachedFromWindow();
    }

    @Override
    public boolean onTouchEvent(MotionEvent e) {
        if (dur <= 0) return false;
        float pad = 9 * dp, frac = Math.max(0, Math.min(1, (e.getX() - pad) / (getWidth() - 2 * pad)));
        switch (e.getAction()) {
            case MotionEvent.ACTION_DOWN:
                dragging = true;
                getParent().requestDisallowInterceptTouchEvent(true);
            case MotionEvent.ACTION_MOVE:
                preview = (long) (frac * dur);
                cb.onPreview(preview);
                invalidate();
                return true;
            case MotionEvent.ACTION_CANCEL:
                // A system gesture or a call took the touch, thats not a seek
                dragging = false;
                preview = -1;
                invalidate();
                return true;
            case MotionEvent.ACTION_UP:
                dragging = false;
                preview = (long) (frac * dur);
                commit.run();
                return true;
        }
        return super.onTouchEvent(e);
    }
}
