package page.reece.kino;

import android.content.Context;
import android.os.Build;

import org.json.JSONObject;

/** Writes down what crashed (the app has no other way to say, it just closes), so the page can tell the server the next time the app opens */
final class CrashLog {
    private static boolean on;

    private CrashLog() { }

    static synchronized void install(Context c) {
        if (on) return;
        on = true;
        final Context app = c.getApplicationContext();
        final Thread.UncaughtExceptionHandler prev = Thread.getDefaultUncaughtExceptionHandler();
        Thread.setDefaultUncaughtExceptionHandler((t, e) -> {
            try {
                StringBuilder sb = new StringBuilder(String.valueOf(e));
                int n = 0;
                for (StackTraceElement el : e.getStackTrace()) {
                    sb.append(" <- ").append(el.getClassName().replace("page.reece.kino.", "")).append('.').append(el.getMethodName()).append(':').append(el.getLineNumber());
                    if (++n >= 8) break;
                }
                if (e.getCause() != null) sb.append(" | cause ").append(e.getCause());
                String stack = sb.length() > 900 ? sb.substring(0, 900) : sb.toString();
                app.getSharedPreferences("kino", Context.MODE_PRIVATE).edit().putString("javaCrash", new JSONObject()
                        .put("t", System.currentTimeMillis()).put("stack", stack).put("device", Build.MANUFACTURER + " " + Build.MODEL)
                        .put("android", Build.VERSION.RELEASE).put("sdk", Build.VERSION.SDK_INT).toString()).commit();
            } catch (Throwable ignored) { }
            if (prev != null) prev.uncaughtException(t, e);
        });
    }
}
