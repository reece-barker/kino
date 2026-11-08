# Kino for Mac

A small Electron app that opens the Kino site (https://kino.reece.page) in its own window with a Mac look: dark, hidden title bar, traffic lights over the page. It is the same web app as in the browser, nothing is reimplemented. It adds the `KinoDesktop/<version>` token to the user agent and a `window.KinoDesktop = { version, platform }` object so the site can tell it is the desktop app.

## Run it in dev

```
cd desktop
npm install
npm start
```

Dev and the built app share the same data folder (`~/Library/Application Support/Kino`), so you stay logged in either way.

## Build

```
npm run dist
```

Needs network the first time (it downloads Electron for both chips). Output goes to `desktop/dist/`:

- `Kino-<version>-arm64.dmg` and `.zip` for Apple Silicon
- `Kino-<version>-x64.dmg` and `.zip` for Intel

`npm run dist:universal` also builds one fat app that runs on both (`Kino-<version>-universal.dmg`), it is about twice the size.

`npm run pack` makes just the `.app` folder without a dmg, quicker for testing.

No Xcode needed, only the command line tools.

## Install an unsigned app (first time only)

There is no Apple developer account behind this, so the app is not signed by a developer or notarised. It is ad hoc signed (a signature with no certificate) so it runs on Apple Silicon, but macOS Gatekeeper will still complain the first time.

1. Open the dmg and drag Kino to Applications.
2. Right click (or Control click) Kino in Applications and choose **Open**, then **Open** again in the dialog. You only need to do this once.

On recent macOS (Sequoia and later) the right click trick may only show "Done" and "Move to Bin". If so, go to System Settings, Privacy and Security, scroll down and press **Open Anyway** next to the Kino message.

Or skip all that from the terminal:

```
xattr -dr com.apple.quarantine /Applications/Kino.app
```

If you got the zip from the browser, do the same on the extracted app.

## Change the URL

The app opens `https://kino.reece.page` by default. To point it somewhere else (a dev server, say), either:

- set the env var when starting it: `KINO_URL=http://127.0.0.1:8000 npm start` (or `KINO_URL=... open -a Kino` does not pass env on macOS, so for the built app use the settings file below, or run `KINO_URL=... /Applications/Kino.app/Contents/MacOS/Kino`)
- or make a file `~/Library/Application Support/Kino/settings.json` with

```json
{ "url": "https://kino.example.com" }
```

The env var wins over the file. Only http and https URLs are accepted. The app only ever navigates inside that origin, any other link opens in your default browser. Help, Show Settings Folder opens the folder for you.

`KINO_USER_DATA=/some/folder` uses a different data folder (handy for testing without touching your real login).

## What it does

- One window, remembers size, position and zoom. Min size 900x600.
- One copy at a time, opening it again focuses the open window.
- Normal persistent session, so the device cookie, IndexedDB, Cache Storage, service worker and the Origin Private File System all survive restarts. Nothing is cleared.
- Menus: Kino, Edit, View (reload, zoom, full screen), Go (Back Cmd+[, Forward Cmd+], Home, Downloads which opens `#/downloads`), Window, Help.
- Media keys go to the page's media session.
- Offline: it first tries the real site (the site's service worker can serve its cached interface if you opened it before). If that fails with a network error, a bundled page shows "You're offline" with Retry and Open Downloads. It retries by itself when the Mac reports it is back online, and checks the server every 15 seconds while that page is up.
- Safety: context isolation, sandbox on, no node in the page, preload exposes only `version` and `platform`. Permissions are denied except microphone (voice search, never camera), fullscreen, notifications and clipboard write, and only for the Kino origin. It does not touch the site's CSP.
- The page title bar area is draggable and the top bar is nudged right to make room for the traffic lights. That is a tiny bit of CSS injected in `src/main.js` (`WINDOW_CSS`), it targets `.topbar` so update it if the site header changes.

## Icons

`build/icon.icns`, `icon.ico`, `icon.png` and the dmg background are generated from `app/static/icon.svg` by `build/make-icons.py` (squircle mask, about 10% margin, needs macOS `sips` and `iconutil` and Playwright). The generated files are committed, so you only need this if the icon changes:

```
~/.venvs/kino/bin/python build/make-icons.py
```

## Honest limits

- Not signed or notarised, so the first open needs the steps above. It cannot be put on the App Store this way.
- No auto update. To update, build a new dmg and replace the app. (Auto update needs signing on macOS.)
- Only the arm64 build was launched and tested while making this. The Intel and universal builds were built and their signatures checked, but not run.
- Videos use Chromium's decoders inside Electron, not Safari's, so codec support matches Chrome (H.264, AAC, VP9 and so on). Anything Chrome cannot play in the browser will not play here either.
- The app is about 120 MB because it ships its own Chromium.
- If the site's own service worker does not serve a page while offline, you get the bundled offline page, and Open Downloads will only work offline if the site already cached it.
- AirPlay and Chromecast are not available in Electron (Cast is a Chrome browser feature), use the browser or the other apps for that.
- Windows and Linux icon files are there and electron-builder is configured for them, but only Mac is built and supported.
