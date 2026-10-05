// Starts the production build on a free port, crawls every internal link, then stops the server.
// Run `npm run build` first. Exits non-zero on any broken link.
import { spawn } from "node:child_process";
import net from "node:net";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const nextBin = require.resolve("next/dist/bin/next");

const port = await new Promise((resolve, reject) => {
  const probe = net.createServer();
  probe.listen(0, () => {
    const { port } = probe.address();
    probe.close(() => resolve(port));
  });
  probe.on("error", reject);
});
const base = `http://localhost:${port}`;

// No indexer, so the pages render their local-mode HTML. Links do not depend on the data.
const env = { ...process.env, ENVIO_GRAPHQL_URL: "", PORT: String(port) };
const server = spawn(process.execPath, [nextBin, "start", "-p", String(port)], { env, stdio: ["ignore", "pipe", "pipe"] });
let log = "";
server.stdout.on("data", (d) => (log += d));
server.stderr.on("data", (d) => (log += d));

async function ready() {
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(base + "/", { redirect: "manual" });
      if (res.status === 200) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("server did not start:\n" + log);
}

let code = 1;
try {
  await ready();
  code = await new Promise((resolve) => {
    const run = spawn("npx", ["vitest", "run", "src/links/crawl.test.ts"], {
      env: { ...env, CRAWL_BASE_URL: base },
      stdio: "inherit",
      shell: true,
    });
    run.on("exit", (c) => resolve(c ?? 1));
  });
} catch (error) {
  console.error(String(error));
} finally {
  server.kill();
}
process.exit(code);
