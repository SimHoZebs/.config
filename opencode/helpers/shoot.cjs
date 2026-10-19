#!/usr/bin/env node
// Shared screenshot helper. Do not copy per task. Reuse as is.
// Usage: node shoot.cjs <url> <out.png> [--full] [--wait ms] [--width N] [--height N]
// Run from project root or frontend dir so `playwright` resolves.
const fs = require("fs");
const path = require("path");
let chromium;
try {
  ({ chromium } = require("playwright"));
} catch {
  ({ chromium } = require(require.resolve("playwright", { paths: [process.cwd()] })));
}

(async () => {
  const [url, out, ...rest] = process.argv.slice(2);
  if (!url || !out) {
    console.error("Usage: node shoot.cjs <url> <out.png> [--full] [--wait ms]");
    process.exit(2);
  }
  const full = rest.includes("--full");
  const waitIdx = rest.indexOf("--wait");
  const wait = waitIdx >= 0 ? parseInt(rest[waitIdx + 1] || "2500", 10) : 2500;
  const wIdx = rest.indexOf("--width");
  const hIdx = rest.indexOf("--height");
  const width = wIdx >= 0 ? parseInt(rest[wIdx + 1] || "1280", 10) : 1280;
  const height = hIdx >= 0 ? parseInt(rest[hIdx + 1] || "900", 10) : 900;

  fs.mkdirSync(path.dirname(out), { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width, height } });
  const errors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text().slice(0, 300));
  });
  page.on("pageerror", (err) => errors.push(String(err).slice(0, 300)));
  await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(wait);
  await page.screenshot({ path: out, fullPage: full });
  console.log(JSON.stringify({ out, errors: errors.slice(0, 10) }));
  await browser.close();
})().catch((e) => { console.error("SHOTFAIL", e); process.exit(1); });
