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

export const allSkills = Object.values(skillGroups).flat() as [Skill, ...Skill[]];

/** Anchor id of a skill on /education/ (e.g. `skill-node-js`). */
export const skillId = (s: string) => 'skill-' + s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-$/, '');
