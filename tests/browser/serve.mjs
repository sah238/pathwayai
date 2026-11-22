/**
 * Builds and serves the app for the browser tests, saving server output to
 * test-results/server.log so the privacy test can read it. The API key is set
 * to empty, which also overrides any .env.local, so Claude cannot be called.
 */
import { spawn, spawnSync } from "node:child_process";
import { createWriteStream, mkdirSync } from "node:fs";

const port = process.argv[2] ?? "3100";
const next = "node_modules/next/dist/bin/next";
const env = { ...process.env, ANTHROPIC_API_KEY: "", NEXT_TELEMETRY_DISABLED: "1" };

mkdirSync("test-results", { recursive: true });
const log = createWriteStream("test-results/server.log");

const build = spawnSync(process.execPath, [next, "build"], { env, encoding: "utf8" });
log.write(build.stdout ?? "");
log.write(build.stderr ?? "");
if (build.status !== 0) {
  process.stderr.write(`${build.stdout}\n${build.stderr}\n`);
  process.exit(build.status ?? 1);
}

const server = spawn(process.execPath, [next, "start", "-p", port], { env, stdio: ["ignore", "pipe", "pipe"] });
server.stdout.pipe(log);
server.stderr.pipe(log);
server.on("exit", (code) => process.exit(code ?? 0));
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => server.kill());
