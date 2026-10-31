/* Build dist without a moment when it is missing. In a workspace or submodule checkout, npm runs each package's
 * `prepare` concurrently, so a dependent's tsc can read these declarations while this build runs. tsc emits into a
 * private directory; each file then replaces its dist copy by rename, and files the new build no longer emits go
 * last. A concurrent reader sees each file whole, old or new. Run through `npm run`, which puts tsc on PATH. */
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const dist = path.join(root, "dist");
// Inside the package root, so each rename stays on one file system; per process, so two builds never share it.
const staging = path.join(root, `.dist-build-${process.pid}`);

/** Relative paths of every file below dir. */
function files(dir, prefix = "") {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const rel = path.join(prefix, entry.name);
    return entry.isDirectory() ? files(path.join(dir, entry.name), rel) : [rel];
  });
}

try {
  execFileSync("tsc", ["-p", "tsconfig.build.json", "--outDir", staging], { cwd: root, stdio: "inherit", shell: process.platform === "win32" });
  const emitted = files(staging);
  for (const rel of emitted) {
    fs.mkdirSync(path.dirname(path.join(dist, rel)), { recursive: true });
    fs.renameSync(path.join(staging, rel), path.join(dist, rel));
  }
  const keep = new Set(emitted);
  // tsc never emits a dot-file, so one in dist belongs to a consumer, as a stamp of the commit dist was built from.
  for (const rel of files(dist)) if (!keep.has(rel) && !path.basename(rel).startsWith(".")) fs.rmSync(path.join(dist, rel), { force: true });
} finally {
  fs.rmSync(staging, { recursive: true, force: true });
}
