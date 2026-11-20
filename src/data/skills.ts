/**
 * Skills shown on /education/. Entries reference these by exact name in their
 * `skills:` list (typos fail the build), and each skill links back to every
 * entry that uses it. Order here = display order.
 */
export const skillGroups = {
  Languages: ['Swift', 'Python', 'C', 'TypeScript', 'OCaml', 'Java', 'C++', 'Kotlin', 'SQL', 'HTML/CSS', 'MATLAB'],
  'Web & Mobile': ['SvelteKit', 'Node.js', 'React', 'Firebase', 'REST APIs', 'SwiftUI', 'Jetpack Compose'],
  'DevOps & Testing': ['GitHub Actions', 'Docker', 'AWS', 'Caddy', 'pytest', 'Vitest', 'Playwright'],
  'Systems & Tools': ['Linux', 'Bash/Zsh', 'Git', 'Neovim', 'CMake', 'Compilers'],
  'Data & ML': ['NumPy', 'SciPy', 'PyTorch', 'TensorFlow', 'napari'],
} as const;

export type Skill = (typeof skillGroups)[keyof typeof skillGroups][number];

/**
 * A short note on how I use a skill, shown in its popover above any entry
 * links. Every skill needs an entry, a note, or both: the build fails
 * otherwise, so no skill renders as a dead label.
 */
export const skillNotes: Partial<Record<Skill, string>> = {
  Java:
    'Learned it in Software Design & Implementation (JUnit tests, agile sprints), then spent two semesters as a CS coach reviewing students’ Android apps and Java code.',
  Caddy:
    'My go-to web server: automatic HTTPS and per-client rate limiting in front of Swift TypeGraph, and it serves this site.',
  SwiftUI:
    'Self-taught since 2020 from WWDC sessions and SwiftUI Lab. I built iOS and macOS apps with it, wrote a SwiftUI-style UI framework of my own, and merged contributions to Tokamak, a SwiftUI-compatible framework for the web.',
  Linux:
    'My daily driver for about two years: Fedora Asahi Remix on an Apple Silicon MacBook Air, plus a Raspberry Pi home server.',
  'Bash/Zsh':
    'My everyday shell (Zsh now, Bash before): getting around Linux, managing my AWS and Netcup servers, and running OCaml scripts and class projects.',
  Neovim: 'An editor I use every day, set up with language-server (LSP) and debugger (DAP) plugins.',
};

export const allSkills = Object.values(skillGroups).flat() as [Skill, ...Skill[]];

/** Anchor id of a skill on /education/ (e.g. `skill-node-js`). */
export const skillId = (s: string) => 'skill-' + s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-$/, '');
