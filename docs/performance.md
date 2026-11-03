# Performance

## Test the production build, not `pnpm dev`

`pnpm dev` serves unbundled, unminified, uncompressed files plus Vite's
~330 KB dev client, and resizes images on request. Lighthouse numbers from it
say nothing about the deployed site. Measure this instead:

```sh
pnpm serve
```

It runs `astro build`, then serves `dist/` with `docker.io/library/caddy:2-alpine`
and `deploy/Caddyfile`. That's the same server, headers, compression and
caching as production, minus the TLS edge. Open http://127.0.0.1:3000 and stop
it with Ctrl-C. With Docker instead of Podman: `CONTAINER=docker pnpm serve`.

- **On your phone:** `HOST=0.0.0.0 pnpm serve`, then open
  `http://<computer's LAN IP>:3000` (`hostname -I`). Same Wi-Fi. If it doesn't load,
  the firewall is blocking it: `sudo firewall-cmd --add-port=3000/tcp`
  (until reboot).
- **Rebuilds need a restart.** After changing code, stop and rerun `pnpm serve`.
  The container mounts `dist/`; if `dist/` is deleted and recreated, the
  container keeps serving the old, now empty, directory and returns 404s.
- **Use `127.0.0.1`, not `localhost`.** The port is published on IPv4 only, and
  browsers may try `::1` first.
- **Port 3000 must be free.** If it's taken, stop whatever holds it
  (`podman ps`).
- **Manual Lighthouse runs:** use an incognito window. Extensions (password
  managers especially) inject scripts that show up as unused or unminified JS
  and long tasks.

## Benchmarks

Two checks, both against the budget in SPEC.md §8 (Lighthouse ≥ 95; under
50 KB of gzipped HTML + CSS + JS per page).

### `pnpm perf:budget`: sizes, no browser

Reads `dist/` and fails on any page that breaks one of these:

| Check | Budget | Why |
| --- | --- | --- |
| HTML + CSS + JS, gzipped | ≤ 50 KB | SPEC budget |
| JavaScript | ≤ 2 KB | Only `vt.js` (slide direction) ships, inlined |
| Stylesheets | 1 | One site-wide CSS file (`cssCodeSplit: false`), so navigating never waits on a new CSS round-trip |
| Images without `loading="lazy"` | ≤ 1 | Only the LCP image loads eagerly |
| Images without `width`/`height` | 0 | Prevents layout shift |
| Inline scripts | hash in the CSP | Otherwise the browser refuses to run them |

It takes milliseconds and gives the same result every run. `pnpm check` runs it
after the build.

### `pnpm perf:lighthouse`: page-load timing

With `pnpm serve` running in another terminal:

```sh
pnpm perf:lighthouse                            # http://127.0.0.1:3000, 3 runs per page
node scripts/lighthouse.mjs https://fsakel.com 5  # another server or run count
```

It runs Lighthouse (mobile, simulated slow 4G, performance only) in a clean
headless Chrome profile on every built page, and reports the median of the runs:

| Metric | Budget |
| --- | --- |
| Performance score | ≥ 95 |
| First Contentful Paint | ≤ 1800 ms |
| Largest Contentful Paint | ≤ 2500 ms |
| Total Blocking Time | ≤ 200 ms |
| Cumulative Layout Shift | ≤ 0.1 |

Set `CHROME_PATH` if Chrome isn't found (Fedora:
`CHROME_PATH=/usr/bin/chromium-browser`). Timings vary with the machine, so
compare runs from the same machine.

Baseline (2026-11-02, local `pnpm serve`, median of 5):

| Page | Score | FCP | LCP | TBT | CLS |
| --- | --- | --- | --- | --- | --- |
| `/` | 100 | 756 ms | 1355 ms | 0 ms | 0 |
| `/projects/` | 100 | 753 ms | 753 ms | 0 ms | 0 |
| `/education/` | 100 | 755 ms | 755 ms | 0 ms | 0 |
| `/hobbies/` | 100 | 753 ms | 1653 ms | 0 ms | 0 |

## No regressions

Benchmark before committing anything that can move these numbers: a new
font, image, script, stylesheet or dependency; animation changes; layout,
CSS architecture, build config, or Caddy headers. Typos and content edits
don't need it.

1. Run `pnpm check`, then `pnpm serve` and `pnpm perf:lighthouse` (median of 3
   or more; use 5 when the difference is small).
2. Compare with the baseline above. If any page gets worse, fix it or drop
   the change. A regression ships only as an explicit, written-down trade-off.
3. When numbers improve, update the baseline in the same commit.

## Rules and why

What we measured or learned. Each rule records the reason, so it's clear when
it stops applying.

### Measuring

- **Never measure `pnpm dev`.** It gave 75/100 (FCP 3.2 s, LCP 5.1 s) for the
  same pages that score 100 when built.
- **Use `127.0.0.1` and a clean profile.** Extensions inject scripts, and even
  text: a Cyrillic character from one made the page fetch a font subset
  it doesn't need.
- **Lighthouse's estimated savings are simulated.** It prices every
  request at a slow-4G round-trip. Use them to rank issues, not as real
  numbers, and confirm a fix with a before/after run.
- **Lighthouse can't measure prerendering.** Chrome disables it while
  DevTools/CDP controls the page (`PrerenderingDisabledByDevTools`). Launch
  Chrome without CDP, attach after load, and check
  `performance.getEntriesByType("navigation")[0].activationStart > 0` on the
  next page.
- **Unscored audits are leads, not failures.** A request chain that ends in
  a `font-display: swap` font blocks nothing.

### Rendering

- **Only one stylesheet blocks rendering.** One site-wide CSS file
  (`cssCodeSplit: false`), cached for a year. With per-page CSS, every
  navigation waited on a second round-trip (~100 ms) before the slide.
- **No external scripts in `<head>`.** `src/scripts/vt.js` was a separate
  file that blocked rendering. It's now inlined, which cut FCP from ~950 ms to
  ~755 ms. It can't be `defer`red: its `pagereveal` listener has to exist
  before the first render, or back-navigation slides the wrong way. The CSP
  allows it by hash; after editing it, `pnpm check` fails and prints the new
  hash for `script-src` in `deploy/Caddyfile`.
- **Register every value `.neu` derives with `@property`**
  (`src/styles/neu.css`), even though nothing animates them. Chrome computes
  a registered value once, but keeps an unregistered one as text that every
  `var()` using it parses again. Registering the ~25 derived values cut the
  nav buttons' style recalc by 15–20% (2026-11-03, headless Chromium), with
  identical computed styles. A new value added to `.neu` needs its own
  `@property` line, or it's on the slow path again. They're
  `inherits: false`, which holds only while nothing outside `.neu` reads
  them.
- **Don't cache the button rect in `src/scripts/neu.js`.** Chrome sends at
  most one `pointermove` per frame, after style is already up to date, so
  `getBoundingClientRect()` forces no recalc. Tested 2026-11-03: caching it
  left the count unchanged (512 recalcs for 488 moves either way), so it's
  not worth the extra state.
- **No inline styles.** The CSP is `style-src 'self'`. Per-element styles
  (e.g. a per-photo color preview) would need hashes for each value.

### Fonts

- **Fonts stay external, never `data:` URIs.** `assetsInlineLimit` excludes
  them. A `data:` font is blocked by the CSP (no `font-src`, so
  `default-src 'self'` applies). Inlining a font into the CSS also puts its
  bytes on the render-blocking path of every first visit. Today they load in
  parallel and swap in.
- **One web font: Hanken Grotesk, with only its latin subset preloaded.**
  Monospace uses the system `ui-monospace` stack. IBM Plex Mono was dropped:
  it added a request chain (HTML → CSS → font), and preloading it made the
  hobbies LCP worse (1658 → 1806 ms) because it competed with the photo.
- **Adding a font or weight is a benchmarked change.**

### Images

- **Use `<Image>` with `format="avif"`, `widths`, and an accurate `sizes`.**
  Otherwise phones download desktop-sized photos.
- **The LCP image gets `priority`; everything else is lazy.**
  `perf:budget` allows one eager image per page.
- **Every image has `width`/`height`** (Astro sets them), and photo frames
  show a placeholder background. The page lays out once and paints before
  the photos arrive.

### Navigation

- **Prerender on hover** (Chromium): `deploy/Caddyfile` sends a
  `Speculation-Rules` header pointing at `public/speculation-rules.json`.
  It's a header because the CSP forbids inline `<script type="speculationrules">`.
  Without it, a click waits a full round-trip before the slide starts. The
  transition waits for the new page's first frame (HTML plus the blocking
  CSS), not its images.
- **Don't prerender the nav pages with `eagerness: "immediate"`.** Tried
  2026-11-02: a list rule for `/`, `/projects/`, `/education/`, `/hobbies/`.
  Every nav click then activated a prerender, but the three background
  prerenders compete with the landing page for bandwidth and CPU. Cold-load
  LCP got worse on every page, from ~1420 to ~1800 ms on average (+27%). FCP
  got worse by a similar amount; TTFB didn't change. Setup: Slow-4G proxy
  (150 ms RTT, 1.6 Mbps), one CPU core, 15 runs (cut short; the direction was
  the same in every pair). Hover prerendering gets most of the benefit on
  desktop and costs the first page nothing.
- **The pressed nav item stays selected until the next page shows.** When a
  click is released `:active` ends, so the item used to pop back up until the
  new page arrived. `src/scripts/vt.js` marks it `data-held` on click, which
  keeps it pressed (and clears it on a back/forward-cache restore).
- **The slide matches the nav selection's move** (0.3 s, `src/styles/base.css`
  and `src/components/Nav.astro`), so both land together. It was 0.16 s
  before; 0.22 s felt sluggish then, when the nav didn't animate.

### Animation

- **Animate only `transform`/`translate`/`scale`, `opacity`, and `filter`.**
  These run on the compositor. Animating anything else (width, height,
  visibility, colors) runs on the main thread and can jank while
  scrolling. One such property pulls the whole animation onto the main
  thread.
- **Put unavoidable discrete changes in their own `step-end` animation.**
  The scroll cue fades on the compositor, and a separate `cue-hide` flips
  `visibility` once at the end (Lighthouse still lists it; that's expected).
- **Known exception: the timeline's `dot-arrive` animates `width`/`height`**
  (see Open questions).

## Open questions

- **TODO: timeline dots on the compositor?** `dot-arrive`
  (`src/components/TimelineEntry.astro`) grows each marker from a 12×4 px
  pill into a circle by animating `width`/`height`, which runs on the main
  thread while scrolling. Lighthouse flags it under "Avoid non-composited
  animations" (unscored). Animating `scale` instead would move it to the
  compositor, but the starting pill becomes an ellipse with slightly pointed
  ends. Undecided: keep the exact pill, or take the ellipse.
