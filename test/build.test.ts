// The build replaces dist while a dependent's build may read it: npm runs workspace `prepare` scripts concurrently.
// A reader that polls the export target during a rebuild must never find it missing or empty.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const root = join(import.meta.dirname, "..");
const target = join(root, "dist", "index.d.ts");
const build = () =>
	new Promise<number | null>((resolve) => {
		spawn("npm", ["run", "build", "--silent"], { cwd: root, stdio: "inherit", shell: process.platform === "win32" }).on("exit", resolve);
	});

test("a rebuild keeps every declaration readable and removes only files it no longer emits", async () => {
	assert.equal(await build(), 0);
	const stale = join(root, "dist", "stale.js");
	writeFileSync(stale, "export {};\n");
	let reads = 0;
	let misses = 0;
	let running = true;
	const exit = build().finally(() => (running = false));
	while (running) {
		reads++;
		if (!existsSync(target) || statSync(target).size === 0) misses++;
		await new Promise((resolve) => setImmediate(resolve));
	}
	assert.equal(await exit, 0);
	assert.ok(reads > 100, `the reader polled only ${reads} times`);
	assert.equal(misses, 0, `${misses} of ${reads} reads found dist/index.d.ts missing or empty`);
	assert.equal(existsSync(stale), false, "a file the build no longer emits stays in dist");
	assert.deepEqual(readdirSync(root).filter((name) => name.startsWith(".dist-build-")), [], "the staging directory stays");
});

// A consumer may write a dot-file into dist, as HyperCarrier's stamp of the commit it built dist from.
test("a rebuild keeps a dot-file it did not write", async (t) => {
	const stamp = join(root, "dist", ".source-commit");
	const prior = existsSync(stamp) ? readFileSync(stamp, "utf8") : undefined;
	t.after(() => (prior === undefined ? rmSync(stamp, { force: true }) : writeFileSync(stamp, prior)));
	assert.equal(await build(), 0);
	writeFileSync(stamp, "aaaf5dc\n");
	assert.equal(await build(), 0);
	assert.equal(existsSync(stamp) && readFileSync(stamp, "utf8"), "aaaf5dc\n", "the build deleted dist/.source-commit");
});
