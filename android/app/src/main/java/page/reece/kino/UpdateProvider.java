package page.reece.kino;

import android.content.ContentProvider;
import android.content.ContentValues;
import android.database.Cursor;
import android.database.MatrixCursor;
import android.net.Uri;
import android.os.ParcelFileDescriptor;
import android.provider.OpenableColumns;

import java.io.File;
import java.io.FileNotFoundException;

/** Lets androids installer read the downloaded update, it only ever hands out that one file and only to read */
public class UpdateProvider extends ContentProvider {
    static Uri uri(android.content.Context c) {
        return Uri.parse("content://" + c.getPackageName() + ".files/kino.apk");
    }

    private File apk() {
        return new File(new File(getContext().getCacheDir(), "updates"), "kino.apk");
    }

    @Override public boolean onCreate() { return true; }

    @Override
    public ParcelFileDescriptor openFile(Uri u, String mode) throws FileNotFoundException {
        if (!"kino.apk".equals(u.getLastPathSegment()) || !"r".equals(mode)) throw new FileNotFoundException();
        return ParcelFileDescriptor.open(apk(), ParcelFileDescriptor.MODE_READ_ONLY);
    }

    @Override public String getType(Uri u) { return "application/vnd.android.package-archive"; }

    @Override
    public Cursor query(Uri u, String[] projection, String sel, String[] args, String sort) {
        MatrixCursor c = new MatrixCursor(new String[]{OpenableColumns.DISPLAY_NAME, OpenableColumns.SIZE});
        c.addRow(new Object[]{"Kino.apk", apk().length()});
        return c;
    }

    @Override public Uri insert(Uri u, ContentValues v) { return null; }
    @Override public int delete(Uri u, String s, String[] a) { return 0; }
    @Override public int update(Uri u, ContentValues v, String s, String[] a) { return 0; }
}
