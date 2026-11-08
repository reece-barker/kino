// electron-builder skips signing when identity is null, but it has already
// edited the plists, so the bundle seal is broken and Apple Silicon can be picky.
// An ad hoc signature (no certificate, no Apple account) makes the bundle consistent again.
const { execFileSync } = require("child_process");
const path = require("path");

exports.default = async function adhocSign(context) {
  if (context.electronPlatformName !== "darwin") return;
  // universal builds merge two temp apps first, signing those breaks the merge
  if (/-temp$/.test(context.appOutDir)) return;
  const app =path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`);
  execFileSync("codesign", ["--force", "--deep", "--sign", "-", "--timestamp=none", app], { stdio: "inherit" });
};
