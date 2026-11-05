// Tiny json file helpers. Two files in the user data dir:
//   settings.json      you edit this by hand (url)
//   window-state.json  the app writes this (bounds, zoom)
const fs = require("fs");
const path = require("path");
const { app } = require("electron");

const DEFAULT_URL = "https://kino.reece.page";

function file(name) {
  return path.join(app.getPath("userData"), name);
}

function readJson(name) {
  try {
    return JSON.parse(fs.readFileSync(file(name), "utf8"));
  } catch {
    return {};
  }
}

function writeJson(name, data) {
  try {
    fs.mkdirSync(app.getPath("userData"), { recursive: true });
    fs.writeFileSync(file(name), JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("could not write", name, err.message);
  }
}

// only plain http(s) urls count, anything else falls back to the default
function cleanUrl(raw) {
  try {
    const u = new URL(String(raw));
    if (u.protocol === "http:" || u.protocol === "https:") return u.toString();
  } catch {}
  return null;
}

// env var wins, then settings.json, then the default
function siteUrl() {
  return cleanUrl(process.env.KINO_URL) || cleanUrl(readJson("settings.json").url) || DEFAULT_URL;
}

module.exports = { DEFAULT_URL, file, readJson, writeJson, siteUrl };
