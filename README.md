# fsakel.com

Filip Sakellariou's personal site: an interactive resume, projects, education
and hobbies. Static Astro build with no required JavaScript, served by Caddy in
a container.

## Commands

Needs Node 24 and pnpm. `pnpm serve` also needs Podman, or Docker with
`CONTAINER=docker`.

| Command | What it does |
| --- | --- |
| `pnpm install` | Install dependencies |
| `pnpm dev` | Dev server with hot reload. Unoptimized: don't measure performance here |
| `pnpm serve` | Build, then serve `dist/` through the production Caddy config on http://127.0.0.1:3000 (`HOST=0.0.0.0` to open it on your phone) |
| `pnpm check` | Type-check, build, and check the size budget |
| `pnpm perf:budget` | Size budget for `dist/` (no browser needed) |
| `pnpm perf:lighthouse` | Lighthouse benchmark; needs `pnpm serve` running |

Once per clone, turn on the hook that rejects images carrying metadata:
`git config core.hooksPath .githooks`.

## Editing content

Each entry is one Markdown file in `src/content/` (`projects/`, `education/`,
`hobbies/`). Images go in `src/assets/`. Site-wide data (name, nav, links,
skills) lives in `src/data/`.

## Docs

- [SPEC.md](SPEC.md): design, content model, motion, and budgets
- [docs/performance.md](docs/performance.md): testing the production build and the benchmarks
- [DEPLOY.md](DEPLOY.md): running it on the server
