import headshot from '../assets/headshot.png';

export const site = {
  name: 'Filip Sakellariou',
  tagline: 'Aspiring software engineer, problem-solver & public-transit nerd',
  description:
    'Filip Sakellariou: CS & Math at Vassar College. Compilers, Swift tooling, and public transit.',
  photo: headshot,
  photoAlt: 'A very corporate LinkedIn portrait photo.',
} as const;

/**
 * Icons are Iconify names, inlined at build time by astro-icon (only the ones
 * used ship). Browse: https://icon-sets.iconify.design/material-symbols/
 * The nav order also drives the page-slide direction (see src/scripts/vt.js).
 */
export const nav: { label: string; href: string; icon: string }[] = [
  { label: 'Home', href: '/', icon: 'material-symbols:home-outline-rounded' },
  { label: 'Projects', href: '/projects/', icon: 'material-symbols:code-blocks-outline-rounded' },
  { label: 'Education', href: '/education/', icon: 'material-symbols:school-outline-rounded' },
  { label: 'Hobbies', href: '/hobbies/', icon: 'material-symbols:interests-outline-rounded' },
  // { label: 'Blog', href: '/blog/', icon: 'material-symbols:edit-note-outline-rounded' },
];

export const social: { label: string; href: string; icon: string }[] = [
  { label: 'LinkedIn', href: 'https://linkedin.com/in/fsakel', icon: 'tabler:brand-linkedin' },
  { label: 'GitHub', href: 'https://github.com/filip-sakel', icon: 'tabler:brand-github' },
];

/** Home page sections, top to bottom. Reorder or remove to change the page. */
export const homeSections = ['hero', 'highlights', 'education'] as const;
export type HomeSection = (typeof homeSections)[number];
