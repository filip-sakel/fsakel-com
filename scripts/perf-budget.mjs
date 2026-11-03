// Checks the built site (dist) against the performance budget in SPEC.md.
// Byte sizes only, so it is fast and gives the same answer on every run.
// Usage: node scripts/perf-budget.mjs [dir]

import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";

const root = process.argv[2] ?? "dist";

// Inline scripts only run if the CSP lists their hash.
const csp = readFileSync("deploy/Caddyfile", "utf8").match(/Content-Security-Policy "([^"]+)"/)[1];
const sha = (text) => `'sha256-${createHash("sha256").update(text).digest("base64")}'`;

const BUDGET = {
  pageGzip: 50 * 1024, // HTML + CSS + JS per page, gzipped (SPEC.md)
  jsRaw: 2 * 1024, // all scripts on a page, inline or external; today only the inlined vt.js, neu.js, haptic.js
  stylesheets: 1, // more than one means a per-page CSS round-trip again
  eagerImages: 1, // only the LCP image may skip lazy loading
};

const htmlFiles = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    return e.isDirectory() ? htmlFiles(p) : e.name.endsWith(".html") ? [p] : [];
  });

const read = (url) => readFileSync(join(root, url));
const gz = (buf) => gzipSync(buf, { level: 9 }).length;
const kb = (n) => `${(n / 1024).toFixed(1)} KB`;

const rows = [];
const failures = [];

for (const file of htmlFiles(root)) {
  const page = "/" + relative(root, file);
  const html = readFileSync(file, "utf8");
  const css = [...html.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map((m) => m[1]);
  const js = [...html.matchAll(/<script[^>]*\ssrc="([^"]+)"/g)].map((m) => m[1]);
  const inline = [...html.matchAll(/<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  const imgs = [...html.matchAll(/<img\s(?:[^>"]|"[^"]*")*>/g)].map((m) => m[0]);

  const pageGzip = gz(Buffer.from(html)) + [...css, ...js].reduce((n, u) => n + gz(read(u)), 0);
  const jsRaw = js.reduce((n, u) => n + read(u).length, 0) + inline.reduce((n, t) => n + Buffer.byteLength(t), 0);
  const eager = imgs.filter((t) => !/loading="lazy"/.test(t)).length;
  const unsized = imgs.filter((t) => !/\swidth="/.test(t) || !/\sheight="/.test(t)).length;

  rows.push({ page, "HTML+CSS+JS (gzip)": kb(pageGzip), JS: kb(jsRaw), CSS: css.length, "eager img": eager });

  if (pageGzip > BUDGET.pageGzip) failures.push(`${page}: ${kb(pageGzip)} gzipped > ${kb(BUDGET.pageGzip)}`);
  if (jsRaw > BUDGET.jsRaw) failures.push(`${page}: ${kb(jsRaw)} of JS > ${kb(BUDGET.jsRaw)}`);
  if (css.length > BUDGET.stylesheets) failures.push(`${page}: ${css.length} stylesheets > ${BUDGET.stylesheets}`);
  if (eager > BUDGET.eagerImages) failures.push(`${page}: ${eager} eager images > ${BUDGET.eagerImages}`);
  for (const t of inline)
    if (!csp.includes(sha(t))) failures.push(`${page}: inline script not allowed by the CSP; add ${sha(t)} to script-src in deploy/Caddyfile`);
  if (unsized) failures.push(`${page}: ${unsized} images without width/height (layout shift)`);
}

console.table(rows);
if (failures.length) {
  console.error(`Over budget:\n  ${failures.join("\n  ")}`);
  process.exit(1);
}
console.log("Within budget.");
