// The only thing the site gets from us. No node, no ipc.
const { contextBridge } = require("electron");

const arg = process.argv.find((a) => a.startsWith("--kino-version="));
const version = arg ? arg.slice("--kino-version=".length) : "";

contextBridge.exposeInMainWorld("KinoDesktop", Object.freeze({ version, platform: process.platform }));
