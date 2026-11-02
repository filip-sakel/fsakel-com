// Lighthouse performance runs (mobile, simulated slow 4G) against a running
// production server, in a clean headless Chrome profile (no extensions).
// Reports the median of several runs per page and fails below the budget.
//
// Start the server first (`pnpm serve`), then:
//   node scripts/lighthouse.mjs [baseUrl] [runs]
// Defaults: http://127.0.0.1:3000 (`pnpm serve` listens on IPv4 only), 3 runs. CHROME_PATH picks the browser.

import { readdirSync } from "node:fs";
import { join, relative } from "node:path";
import * as chromeLauncher from "chrome-launcher";
import lighthouse from "lighthouse";

const base = process.argv[2] ?? "http://127.0.0.1:3000";
const runs = Number(process.argv[3] ?? 3);

const BUDGET = { score: 95, fcp: 1800, lcp: 2500, tbt: 200, cls: 0.1 }; // ms; SPEC.md: score ≥ 95

// Every built page except the 404.
const pages = (function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name)) : e.name === "index.html" ? ["/" + relative("dist", dir)] : [],
  );
})("dist").map((p) => (p === "/" ? p : `${p}/`));

const median = (xs) => xs.toSorted((a, b) => a - b)[Math.floor(xs.length / 2)];

const chrome = await chromeLauncher.launch({ chromeFlags: ["--headless=new"] });
const rows = [];
const failures = [];
try {
  for (const page of pages) {
    const samples = [];
    for (let i = 0; i < runs; i++) {
      const { lhr } = await lighthouse(base + page, {
        port: chrome.port,
        onlyCategories: ["performance"],
        logLevel: "error",
      });
      if (lhr.runtimeError) throw new Error(`${base + page}: ${lhr.runtimeError.message}`);
      const a = lhr.audits;
      samples.push({
        score: lhr.categories.performance.score * 100,
        fcp: a["first-contentful-paint"].numericValue,
        lcp: a["largest-contentful-paint"].numericValue,
        tbt: a["total-blocking-time"].numericValue,
        cls: a["cumulative-layout-shift"].numericValue,
      });
    }
    const m = Object.fromEntries(Object.keys(BUDGET).map((k) => [k, median(samples.map((s) => s[k]))]));
    rows.push({
      page,
      score: Math.round(m.score),
      FCP: `${Math.round(m.fcp)} ms`,
      LCP: `${Math.round(m.lcp)} ms`,
      TBT: `${Math.round(m.tbt)} ms`,
      CLS: m.cls.toFixed(3),
    });
    if (m.score < BUDGET.score) failures.push(`${page}: score ${Math.round(m.score)} < ${BUDGET.score}`);
    for (const k of ["fcp", "lcp", "tbt", "cls"])
      if (m[k] > BUDGET[k]) failures.push(`${page}: ${k.toUpperCase()} ${m[k].toFixed(k === "cls" ? 3 : 0)} > ${BUDGET[k]}`);
  }
} finally {
  chrome.kill();
}

console.table(rows);
if (failures.length) {
  console.error(`Over budget (median of ${runs}):\n  ${failures.join("\n  ")}`);
  process.exit(1);
}
console.log(`Within budget (median of ${runs} runs per page).`);
