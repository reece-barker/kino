// Kino for Mac. One window around the Kino site, nothing else.
const { app, BrowserWindow, Menu, shell, session, screen, net, nativeTheme, systemPreferences } = require("electron");
const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");
const settings = require("./settings");

// handy for testing without touching the real profile
if (process.env.KINO_USER_DATA) app.setPath("userData", process.env.KINO_USER_DATA);
app.setName("Kino");

// normal Chrome user agent plus our token so the site can tell it is the desktop app
app.userAgentFallback =
  app.userAgentFallback.replace(/ Electron\/\S+/, "").replace(/ Kino\/\S+/, "") + ` KinoDesktop/${app.getVersion()}`;

// lets the hardware media keys reach the page's media session
app.commandLine.appendSwitch("enable-features", "HardwareMediaKeyHandling,MediaSessionService");

const SITE = settings.siteUrl();
const SITE_ORIGIN = new URL(SITE).origin;
const OFFLINE_BASE = pathToFileURL(path.join(__dirname, "offline", "offline.html")).href;
const STATE_FILE = "window-state.json";
const ZOOM_STEP = 0.5;
const ZOOM_MIN = -3;
const ZOOM_MAX = 5;
const PROBE_MS = 15000;

// permissions we ever say yes to, and only for the Kino origin. mic is for voice search.
const ALLOWED_PERMS = new Set(["media", "fullscreen", "notifications", "clipboard-sanitized-write"]);

// only matters where the topbar exists: room for the traffic lights and a draggable title strip
const WINDOW_CSS = `
  @media (min-width: 761px) { .topbar { padding-left: max(var(--gutter, 16px), 92px) !important; } }
  .topbar { -webkit-app-region: drag; }
  .topbar a, .topbar button, .topbar input, .topbar select, .topbar textarea,
  .topbar .tabs, .topbar .top-right, .topbar .brand { -webkit-app-region: no-drag; }
`;

let win = null;
let probeTimer = null;
let saveTimer = null;
let state = {};

const isKino = (url) => {
  try {
    return new URL(url).origin === SITE_ORIGIN;
  } catch {
    return false;
  }
};
const isOffline = (url) => typeof url === "string" && url.startsWith(OFFLINE_BASE);
const downloadsUrl = () => {
  const u = new URL(SITE);
  u.hash = "#/downloads";
  return u.toString();
};

function openExternal(url) {
  try {
    const p = new URL(url).protocol;
    if (p === "http:" || p === "https:" || p === "mailto:") shell.openExternal(url);
  } catch {}
}

// ---------- window state

function loadState() {
  const s = settings.readJson(STATE_FILE);
  if (typeof s.zoom !== "number") s.zoom = 0;
  // forget the position if that screen is gone
  if (typeof s.x === "number" && typeof s.y === "number" && s.width && s.height) {
    const seen = screen.getAllDisplays().some((d) => {
      const a = d.workArea;
      return s.x < a.x + a.width - 80 && s.x + s.width > a.x + 80 && s.y >= a.y - 20 && s.y < a.y + a.height - 80;
    });
    if (!seen) {
      delete s.x;
      delete s.y;
    }
  }
  return s;
}

function saveState() {
  if (!win || win.isDestroyed()) return;
  const b = win.getNormalBounds();
  state = {
    ...state,
    x: b.x,
    y: b.y,
    width: b.width,
    height: b.height,
    maximized: win.isMaximized(),
    zoom: win.webContents.getZoomLevel(),
  };
  settings.writeJson(STATE_FILE, state);
}

function saveSoon() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveState, 400);
}

// ---------- loading, offline page

function loadSite(url = SITE) {
  stopProbe();
  if (win && !win.isDestroyed()) win.loadURL(url).catch(() => {});
}

function showOffline(desc) {
  if (!win || win.isDestroyed()) return;
  const q = new URLSearchParams({ host: new URL(SITE).host, err: desc || "" });
  win.loadURL(`${OFFLINE_BASE}?${q}`).catch(() => {});
  startProbe();
}

// while the offline page is up, quietly check if the server is back and load it when it is
function startProbe() {
  stopProbe();
  probeTimer = setInterval(async () => {
    if (!win || win.isDestroyed() || !isOffline(win.webContents.getURL())) return stopProbe();
    try {
      await net.fetch(SITE, { method: "HEAD", signal: AbortSignal.timeout(5000) });
      loadSite();
    } catch {}
  }, PROBE_MS);
}

function stopProbe() {
  clearInterval(probeTimer);
  probeTimer = null;
}

function reload(force) {
  const wc = win.webContents;
  if (isOffline(wc.getURL())) return loadSite();
  force ? wc.reloadIgnoringCache() : wc.reload();
}

function setZoom(level) {
  const z = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, level));
  win.webContents.setZoomLevel(z);
  saveSoon();
}

// ---------- window

function createWindow() {
  state = loadState();
  win = new BrowserWindow({
    x: state.x,
    y: state.y,
    width: state.width || 1360,
    height: state.height || 860,
    minWidth: 900,
    minHeight: 600,
    show: false,
    title: "Kino",
    backgroundColor: "#000000",
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: 24, y: 29 },
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      additionalArguments: [`--kino-version=${app.getVersion()}`],
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      // the site plays its little sounds without a click first
      autoplayPolicy: "no-user-gesture-required",
    },
  });
  if (state.maximized) win.maximize();

  const wc = win.webContents;
  win.once("ready-to-show", () => win.show());
  win.on("resize", saveSoon);
  win.on("move", saveSoon);
  win.on("close", saveState);
  win.on("closed", () => {
    win = null;
    stopProbe();
  });

  wc.on("dom-ready", () => {
    wc.setZoomLevel(state.zoom || 0);
    if (isKino(wc.getURL())) wc.insertCSS(WINDOW_CSS).catch(() => {});
  });

  wc.on("did-fail-load", (_e, code, desc, url, isMainFrame) => {
    // -3 is a navigation that got replaced, not a real failure
    if (!isMainFrame || code === -3 || isOffline(url)) return;
    showOffline(desc);
  });

  const guard = (e, url) => {
    if (isOffline(url)) {
      // the offline page buttons are plain links like offline.html?action=retry
      const action = new URL(url).searchParams.get("action");
      if (action) {
        e.preventDefault();
        if (action === "retry") loadSite();
        if (action === "downloads") loadSite(downloadsUrl());
      }
      return;
    }
    if (isKino(url)) return;
    e.preventDefault();
    openExternal(url);
  };
  wc.on("will-navigate", guard);
  wc.on("will-redirect", guard);

  loadSite();
}

// ---------- menu

function buildMenu() {
  const nav = () => win && win.webContents.navigationHistory;
  const template = [
    {
      label: "Kino",
      submenu: [
        { role: "about", label: "About Kino" },
        { type: "separator" },
        { role: "hide", label: "Hide Kino" },
        { role: "hideOthers" },
        { role: "unhide" },
        { type: "separator" },
        { role: "quit", label: "Quit Kino" },
      ],
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "pasteAndMatchStyle" },
        { role: "delete" },
        { role: "selectAll" },
      ],
    },
    {
      label: "View",
      submenu: [
        { label: "Reload", accelerator: "CmdOrCtrl+R", click: () => win && reload(false) },
        { label: "Force Reload", accelerator: "CmdOrCtrl+Shift+R", click: () => win && reload(true) },
        { type: "separator" },
        { label: "Zoom In", accelerator: "CmdOrCtrl+=", click: () => win && setZoom(win.webContents.getZoomLevel() + ZOOM_STEP) },
        // same thing for keyboards where plus is its own key
        { label: "Zoom In", accelerator: "CmdOrCtrl+Plus", visible: false, click: () => win && setZoom(win.webContents.getZoomLevel() + ZOOM_STEP) },
        { label: "Zoom Out", accelerator: "CmdOrCtrl+-", click: () => win && setZoom(win.webContents.getZoomLevel() - ZOOM_STEP) },
        { label: "Actual Size", accelerator: "CmdOrCtrl+0", click: () => win && setZoom(0) },
        { type: "separator" },
        { role: "togglefullscreen" },
        ...(app.isPackaged && !process.env.KINO_DEVTOOLS
          ? []
          : [{ type: "separator" }, { role: "toggleDevTools" }]),
      ],
    },
    {
      label: "Go",
      submenu: [
        { label: "Back", accelerator: "CmdOrCtrl+[", click: () => nav() && nav().canGoBack() && nav().goBack() },
        { label: "Forward", accelerator: "CmdOrCtrl+]", click: () => nav() && nav().canGoForward() && nav().goForward() },
        { type: "separator" },
        { label: "Home", accelerator: "CmdOrCtrl+Shift+H", click: () => win && loadSite() },
        { label: "Downloads", accelerator: "CmdOrCtrl+Shift+D", click: () => win && loadSite(downloadsUrl()) },
      ],
    },
    { role: "windowMenu" },
    {
      role: "help",
      submenu: [
        { label: "Open Kino in Browser", click: () => openExternal(SITE) },
        {
          label: "Show Settings Folder",
          click: () => shell.openPath(app.getPath("userData")),
        },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ---------- security

function lockDown() {
  // every web contents we ever get, not just the main one
  app.on("web-contents-created", (_e, contents) => {
    contents.on("will-attach-webview", (e) => e.preventDefault());
    contents.setWindowOpenHandler(({ url }) => {
      if (isKino(url) && win) win.loadURL(url).catch(() => {});
      else openExternal(url);
      return { action: "deny" };
    });
  });

  const ses = session.defaultSession;
  ses.setPermissionRequestHandler((wc, perm, cb, details) => {
    const origin = details.requestingUrl || wc.getURL();
    if (!ALLOWED_PERMS.has(perm) || !isKino(origin)) return cb(false);
    if (perm === "media") {
      const types = details.mediaTypes || [];
      if (types.includes("video")) return cb(false); // no camera, only voice search needs the mic
      if (process.platform === "darwin" && types.includes("audio")) {
        return systemPreferences.askForMediaAccess("microphone").then(cb, () => cb(false));
      }
    }
    cb(true);
  });
  ses.setPermissionCheckHandler((_wc, perm, origin) => ALLOWED_PERMS.has(perm) && isKino(origin));
}

// ---------- app

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (!win) return;
    if (win.isMinimized()) win.restore();
    win.show();
    win.focus();
  });

  app.whenReady().then(() => {
    nativeTheme.themeSource = "dark";
    app.setAboutPanelOptions({
      applicationName: "Kino",
      applicationVersion: app.getVersion(),
      version: "",
      copyright: "Kino, the family media site",
    });
    if (!app.isPackaged && app.dock) {
      const icon = path.join(__dirname, "..", "build", "icon.png");
      if (fs.existsSync(icon)) app.dock.setIcon(icon);
    }
    lockDown();
    buildMenu();
    createWindow();
    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });
}
