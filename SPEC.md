# fsakel.com: Site Spec

Status: v0.4 (2026-11-01), Phase 1 prototype built; sections restructured; dark mode
Scope of this document: architecture, content model, and the Phase 1 prototype. Later phases are listed so the structure supports them, but they are not specified in detail yet.

---

## 1. Goals and constraints

1. **Personal portfolio**: an "interactive resume" home page, a projects section with optional long-form write-ups, a hobbies section, and contact links.
2. **Static output.** No server-side runtime. The build produces plain HTML, CSS, and assets.
3. **JS is never required.** Every page must be fully readable and navigable with JavaScript disabled. Shipping zero JS is the default; any future JS is an opt-in enhancement.
4. **CSS-first motion.** Animations use modern CSS (scroll-driven animations, view transitions). Each one is a progressive enhancement: unsupported browsers, or users with `prefers-reduced-motion: reduce`, get the static layout, which must look intentional rather than broken.
5. **Desktop and mobile are equal targets.** Layout is mobile-first. Desktop must also match `design/home-design.pdf`.
6. **Easy to edit.** Adding an experience entry, project, write-up, or hobby means adding one Markdown file. No component code changes.
7. **Deployment**: a container behind the server's public Caddy edge, which also fronts swift-typegraph (§9).

## 2. Stack

| Concern | Choice |
|---|---|
| Framework | **Astro 7**, `output: 'static'`. CSS is minified by Lightning CSS with `vite.build.cssTarget` set (see §7) |
| Language | TypeScript (strict), used only at build time |
| Package manager | pnpm (installed) on Node 24 LTS |
| Styling | Plain modern CSS: custom properties for tokens, `@layer`, native nesting, Astro scoped `<style>` per component. No Tailwind, no preprocessor. |
| Content | Astro content collections (Markdown/MDX + Zod schemas) |
| Images | `astro:assets` (`<Image>`/`<Picture>`), producing AVIF/WebP, `srcset`, and explicit dimensions |
| Fonts | Self-hosted WOFF2 via Fontsource; no Google Fonts requests at runtime |
| Container | Podman, multi-stage `Containerfile` |

Explicitly **not** used: Astro `<ClientRouter />` (requires JS), UI framework islands (none in Phase 1), and analytics or third-party scripts.

## 3. Information architecture

| Route | Content | Phase |
|---|---|---|
| `/` | Hero (photo, name, tagline, LinkedIn/GitHub icons), "Project Highlights" timeline, compact education | 1 |
| `/projects/` | Projects & Awards: roles, research, projects, awards, each with fuller bullets | 1 |
| `/education/` | Education & Skills: each school with its coursework/projects/activities, then skills. Clicking a skill opens a popover (declarative `popovertarget`, no JS) listing every entry that used it | 1 |
| `/projects/<slug>/` | Long-form write-up. **Generated only when the entry's Markdown body is non-empty.** | 2 |
| `/hobbies/` | Cards with icon, blurb, optional photos: running, swimming, biking, jump rope, public transit & urban design, open source | 1 (stub) |
| `/blog/` | Omitted for now; one commented line in `nav` in `site.ts` | later |
| `/hobbies/<slug>/` | Hobby page (may embed videos as links/thumbnails or link a PDF paper) | 2 |
| `/404.html` | Not-found page | 1 |
| Contact | No section. LinkedIn/GitHub icons sit in the hero; the footer has a "Contact" heading with labelled LinkedIn/GitHub buttons. | 1 |

No email address appears anywhere on the site for now.

## 4. Repository layout

```
fsakel-com/
├── SPEC.md
├── design/                     # mockups (not shipped)
├── astro.config.ts
├── package.json / pnpm-lock.yaml
├── tsconfig.json
├── Containerfile
├── compose.yaml                # site (:3000) + edge (80/443)
├── DEPLOY.md                   # server setup
├── .githooks/pre-commit        # rejects staged images carrying metadata
├── scripts/
│   └── check-image-metadata.mjs # used by the hook and the Containerfile
├── deploy/
│   └── Caddyfile               # in-container static server config
├── edge/
│   ├── Containerfile           # xcaddy + caddy-ratelimit
│   └── Caddyfile               # public TLS edge and routing
├── public/
│   ├── files/                  # PDFs served as-is (paper, certificates)
│   └── favicon.svg
└── src/
    ├── content.config.ts       # collection schemas
    ├── content/
    │   ├── projects/           # one .md/.mdx per role or project
    │   ├── education/          # one .md per school
    │   └── hobbies/            # one .md/.mdx per hobby
    ├── data/
    │   └── site.ts             # name, tagline, nav items, social links, home section order
    ├── assets/                 # images processed by astro:assets (photo, logos)
    ├── styles/
    │   ├── tokens.css          # colors, type scale, spacing, radii, shadows
    │   ├── base.css            # reset, element defaults, focus styles
    │   └── motion.css          # shared @supports / reduced-motion guards
    ├── layouts/
    │   ├── BaseLayout.astro    # <head>, nav, footer/#contact, view-transition opt-in
    │   └── ArticleLayout.astro # long-form write-ups (Phase 2)
    ├── components/
    │   ├── Nav.astro
    │   ├── Hero.astro
    │   ├── ScrollCue.astro
    │   ├── Timeline.astro
    │   ├── TimelineEntry.astro
    │   ├── EducationList.astro
    │   ├── HobbyCards.astro
    │   └── ContactLinks.astro
    └── pages/
        ├── index.astro
        ├── projects/index.astro
        ├── projects/[slug].astro   # Phase 2
        ├── hobbies/index.astro
        ├── hobbies/[slug].astro    # Phase 2
        └── 404.astro
```

## 5. Content model

All schemas live in `src/content.config.ts`. Dates are `YYYY-MM` strings, formatted for display as "Mon YYYY". A missing `end` renders as "Present".

### 5.1 `projects`: roles and projects in one collection

The home timeline mixes jobs (Pirouette RA, GSoC) and projects (Trainfo), so they share a single collection.

```yaml
---
title: GSoC Contributor           # line shown in the timeline
org: Swift / swift-syntax         # optional
kind: role | project | research   # used for filtering on /projects/
start: 2026-05
end: 2026-08                      # optional
location: Remote                  # optional
logo: ../../assets/logos/swift.svg  # optional; image() schema helper
highlight: true                   # appears in the home timeline
order: 10                         # optional tie-breaker
summary:                          # 1–2 short bullets for the home timeline
  - Shipped a qualified-name-lookup API in swift-syntax
details:                          # fuller bullets for /projects/
  - ...
links:                            # optional
  - { label: trainfo.app, href: https://trainfo.app }
tags: [Swift, C++, compilers]
draft: false                      # drafts are excluded from production builds
---
Optional Markdown body. If non-empty, /projects/<slug>/ is generated
and the entry links to it ("Read more").
```

**Changed in v0.3:** the field `tags` became `skills`, validated against the list in `src/data/skills.ts` (a typo fails the build). New fields: `kind` adds `award | course | activity`; `course` (e.g. `CMPU 224`); `school` (a reference to an `education` entry, which lists the entry on /education/ under that school); `onProjects` (default: true when there is no `school`). `start` is optional. Drafts appear in `pnpm dev` with a badge, but not in production.

### 5.2 `education`

`school`, `degree`, `location`, `start`, `end`, `logo?`, `notes[]?`.

### 5.3 `hobbies`

`title`, `blurb`, `icon?` (an Iconify name), `photos[]` (`{ src: image(), alt }`), `order`, `links[]`, `draft`, plus an optional body that generates `/hobbies/<slug>/`. Each hobby is one file so that it can grow into its own page.

### 5.3b Icons

The site uses `astro-icon` with `@iconify-json/material-symbols` (outlined, rounded) and `@iconify-json/tabler` (outline brand icons). Icons are inlined as SVG at build time, so only the icons actually used ship.

### 5.4 `src/data/site.ts`

Typed constants: display name, tagline, photo import, nav items (label, href, icon), social links, and **`homeSections`**, an ordered array (`['hero', 'highlights', 'education', 'hobbies']`) that `index.astro` maps over. Reordering or removing a home section is a one-line edit.

### 5.5 Initial content (from `~/Documents/resume/main.typ` and `portfolio/`)

Only public, résumé-level facts are used. The site **excludes** phone, email, work-authorization notes, and any line marked `TODO(confirm)` in the résumé source.

- **projects/**: `pirouette-ra` (Vassar, Sep 2026–Present), `gsoc-swift` (May–Aug 2026), `cs-coach` (Vassar, Sep 2024–May 2026; may merge with `pirouette-ra`), `dartmouth-georgakoudi` (Jun 2024–Aug 2025), `tufts-georgakoudi` (Jul–Aug 2022, JBO paper), `trainfo` (Jan 2024–Present), `swift-typegraph` (Oct 2026), `anatolia-clubs` (Jun 2022–Mar 2023, with the portfolio PNG), `swift-evolution` (SE-0293, SE-0309; 2020–21).
- **education/**: `vassar` (BA, CS & Mathematics, expected May 2027).
- **hobbies/**: `linguistics`, `public-transit`, `mt-olympus`, `running` as stubs with placeholder blurbs.
- **public/files/**: the JBO paper PDF is **not** re-hosted by default; link the DOI instead (publisher copyright). The SPLASH/ISSTA certificate stays out unless requested.

## 6. Visual design (from `design/home-design.pdf`)

### 6.1 Tokens (initial values, tuned against the mockup)

| Token | Value | Use |
|---|---|---|
| `--color-bg` | `#F1E9D2` (warm cream) | page background |
| `--color-text` | `#1F1D1A` | body text |
| `--color-muted` | `#6E6A62` | nav labels, scroll cue |
| `--color-accent` | `#C0714A` (terracotta) | active nav item |
| `--color-nav-active-bg` | `#F6EED8` + inset/border shadow | active nav pill |
| `--color-marker` | `#D9708A` (rose; called "purple dot" in the brief) | timeline dot and progress fill |
| `--color-rail` | `#B9B1A0` | timeline rail |
| `--font-sans` | Hanken Grotesk (variable) | headings, body |
| `--font-mono` | System monospace (`ui-monospace` stack; no web font) | timeline dates |
| `--radius-photo` | ~24px | portrait |

Dark mode: a `prefers-color-scheme: dark` block in `tokens.css` overrides only color and shadow tokens; light values are unchanged. The accent is `#93502f` in light mode (the mockup's terracotta fails WCAG AA as text) and `#e3895c` in dark mode. The hero name is the hand-kerned wordmark `src/assets/name.svg` (fill `currentColor`), with visually hidden text in the `h1`.

### 6.2 Layout

- **Nav**: centered row of items (icon + label): Home, Projects, Education, Hobbies (Blog later). The current page sits in a sunken, skeuomorphic well (inset shadows and a lighter bottom lip, `aria-current="page"`); `:active` on any item previews the same press. The nav is sticky at the top. On narrow screens (< ~420px) labels stay visible; spacing shrinks first, then font size. No hamburger menu, since four items fit.
- **Hero**: two columns on desktop (name + tagline left, portrait right), roughly vertically centered in `100svh` minus the nav. On mobile it stacks with the portrait first, then the name and tagline, centered.
- **Scroll cue**: "Project Highlights ⌄" centered near the bottom of the hero. It is an `<a href="#highlights">`, so it works as a jump link without JS or scroll animations.
- **Highlights**: section heading "Project Highlights", then the timeline. Desktop columns: date (mono) · rail with dot · title + bullets · logo. On mobile the logo moves inline next to the title (or is hidden), and the date sits above the title.

## 7. Motion spec

Every effect below sits inside **both** guards:

```css
@media (prefers-reduced-motion: no-preference) {
  @supports (animation-timeline: view()) { /* ... */ }
}
```

The default (unguarded) CSS is always the finished static state.

| # | Effect | Enhanced behavior | Fallback (no support / reduced motion / no CSS) |
|---|---|---|---|
| M1 | Scroll cue hand-off | As the user scrolls past the hero, the cue fades and slides up (`animation-timeline: scroll(root)`, range ≈ first 15–25% of the hero). The "Project Highlights" heading fades/slides in using a `view()` timeline on the heading. | Cue and heading are both visible; the cue is just a jump link. |
| M2 | Fixed marker, moving content | Each entry's marker is `position: sticky` at `--dot-y` inside its own entry, so the active dot stays put while text scrolls past. | Same: `position: sticky` needs no scroll-driven support. Without CSS, it's a plain list. |
| M3 | Marker hand-off | One pinned dot (with a glow above and below) lives in a track spanning the rail; it is `position: sticky` at `--dot-y`, appears the moment the first marker reaches the line, and rides off with the rail's end. Each entry's marker is rose and grows from a flat pill into a circle as it rises (shape only, in every motion mode) and is hidden the instant it lands under the pinned dot. Driven by one probe per entry whose `view-timeline-inset` puts the scrollport edge at `--dot-y`. | Plain timeline: a static rose circle per entry, no pinned dot. Firefox 158 lands here. |
| M4 | Active entry | Each entry animates from muted to full opacity/color as it crosses the dot's line (`view()` timeline, `animation-range` tuned to the sticky offset). Its logo fades in at the same time. | All entries are fully visible with their logos shown. |
| M5 | Page slide | Cross-document view transition. The page slides horizontally while the nav (its own `view-transition-name`) stays put. The default is forward (the new page comes in from the right). `src/scripts/vt.js` (~0.6 KB gzipped, optional, inlined in `<head>` and allowed by a CSP hash) adds the `back` type when the destination comes earlier in the nav order, which reverses the slide, and keeps a clicked nav item selected until the new page shows. | Normal navigation; without JS, every slide goes forward. |
| M6 | Hero entrance | A subtle fade/translate on load (`@starting-style` or a plain keyframe). | Static. |

**Reduced motion** never means *no* feedback: movement is swapped for blur and fade. The page transition cross-fades through a blur, the hero and heading sharpen in, the cue blurs out (it never bobs), and timeline markers keep their scroll-driven pill-to-circle shape change (the reader's scrolling drives it), with no blur. Every scroll-driven effect still sits behind `@supports (animation-timeline: view())`.

**Marker continuity (M3):** the parked dot's sticky box has a negative bottom margin of `marker-h + marker-top`, so it stays on the line until the next marker overlaps it exactly. It fades only over that last `--dot` of overlap, so the active dot never moves off the line.

**Build gotcha:** without explicit CSS targets, Lightning CSS folds `animation-timeline` into the `animation` shorthand, which Chromium rejects, so no scroll-driven animation runs. `astro.config.ts` sets `vite.build.cssTarget` to prevent this. Keep it.

**Browser support targets:** Chromium and Safari 26+ get the enhanced versions of M1–M4. Firefox gets whatever it supports when we build it; the fallbacks must be checked there explicitly. The site must also be checked with JS disabled and with CSS disabled (the document order must read sensibly).

## 8. Quality requirements

- **Accessibility**: semantic landmarks (`header`, `nav`, `main`, `footer`), one `h1` per page, visible `:focus-visible` styles, alt text on every image (decorative logos use `alt=""`), WCAG AA contrast against the cream background (check `--color-muted` and `--color-marker` especially), and a skip-to-content link. The timeline is an `<ol>` with `<time datetime>`.
- **Responsive**: no horizontal scroll from 320px to 2560px wide. Use `svh`/`dvh` instead of `vh` for full-height sections, and size touch targets at ≥ 44px.
- **Performance budget**: zero JS shipped; under 50 KB CSS + HTML for the home page (gzip), excluding images and fonts; LCP image (the portrait) preloaded with explicit dimensions; Lighthouse ≥ 95 in every category on mobile.
- **Image metadata**: no image in the repository or in `dist/` carries metadata: EXIF (including GPS), XMP, IPTC, PNG text and timestamp chunks, or SVG comments, `<metadata>` and editor namespaces (Inkscape, Sketch, Figma). Strip it before adding an image (`exiftool -all=`, or `svgo` for SVGs). `scripts/check-image-metadata.mjs` enforces this from the pre-commit hook and the Containerfile. It also checks images inlined as `data:` URIs, and it rejects formats it can't parse (GIF, AVIF, ICO and others) until it is extended to handle them.
- **SEO/meta**: per-page `<title>` and description, Open Graph tags, `sitemap.xml` (`@astrojs/sitemap`), canonical URL.
- **Checks** (`pnpm check`): `astro check` (types and content schemas) plus `astro build`. Playwright smoke tests (JS disabled, mobile and desktop viewports, reduced motion) come in Phase 2.

## 9. Build and deployment

- **Dev**: `pnpm dev`; **build**: `pnpm build`, producing `dist/`; **preview**: `pnpm preview`. Enable the pre-commit hook once per clone with `git config core.hooksPath .githooks`; it runs the image metadata check (§8) on staged images and needs `node`.
- **Containerfile** (multi-stage):
  1. `node:24-alpine`: enable corepack, run `pnpm install --frozen-lockfile`, then `pnpm build`, then the image metadata check (§8) on `dist/`, which fails the build if any image carries metadata.
  2. `caddy:2-alpine`: copy `dist/` to `/srv` and run `caddy file-server` on **port 3000** as a non-root user. It handles gzip/zstd, `Cache-Control: public, max-age=31536000, immutable` for `/_astro/*` (hashed assets), `no-cache` for HTML, security headers (strict CSP: `default-src 'self'`; no `'unsafe-inline'` for scripts), and the `404.html` fallback.
- **Run**: `docker compose up -d --build` (or `podman compose`). `compose.yaml` runs two services:
  - `site`: the container above, published on `127.0.0.1:3000` only.
  - `edge`: the server's public Caddy (`edge/`), built with the `caddy-ratelimit` plugin and run with host networking so it sees client addresses. It terminates TLS for every site (Let's Encrypt, HTTP/3 on 443/udp; certificates on the `caddy_data` volume) and routes `fsakel.com` → `127.0.0.1:3000` and `typegraph.fsakel.com` → `127.0.0.1:4000` (swift-typegraph's private `web`), rate-limiting its `/api/analyze` per client. `FSAKEL_ADDRESS` and `TYPEGRAPH_ADDRESS` override the domains. Server setup is in DEPLOY.md.
- **Deferred**: a CI/build-and-push workflow.

## 10. Phases

1. **Phase 1, prototype (this spec)**: scaffold, tokens, BaseLayout, Nav, Hero, ScrollCue, Timeline with M1–M4, the education block, stub `/projects/` and `/hobbies/` pages, the footer contact block, M5, and the Containerfile. Content is real for the timeline (from the résumé) and placeholder for hobbies.
2. **Phase 2**: write-up content and MDX embeds (the `[slug]` routes and a basic ArticleLayout already exist), Playwright smoke tests.
3. **Phase 3**: dark mode, the hobbies teaser on home, polish against the mockups, server deployment and domain wiring.

## 11. Decisions and open questions

Decided: newest first with résumé dates; name "Filip"; Hanken Grotesk + system monospace; contact is a footer block (`#contact`).

Open:
1. **Highlights**: currently Pirouette RA, GSoC, Trainfo, Dartmouth (set `highlight: true` in any entry's frontmatter).
2. **Logos**: none yet. Add files under `src/assets/logos/` and set `logo:` in the entry.
3. **Course code**: the xv6 syscall is CMPU 334 (confirmed).
4. **Swift Evolution dates**: `2020-10`–`2021-12` are placeholders; the résumé only says 2020–21.
5. **Linguistics paper**: to be added later under `public/files/`.

**Dark-mode depth.** Shadows don't read on near-black, so dark wells are a flat recess one step darker than the page (`#171511`) with a 1px dark lip inside the top edge and a faint light rim outside the bottom; raised controls get a lit top edge. Light-mode values are unchanged.
