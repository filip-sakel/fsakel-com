import { defineCollection, reference } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { allSkills } from './data/skills';

/** `YYYY-MM`, e.g. `2026-05`. */
const yearMonth = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Use YYYY-MM');

const link = z.object({ label: z.string(), href: z.string() });

/**
 * Everything you did: roles, research, projects, awards, coursework, activities.
 * Where an entry is listed:
 *   - no `school`         → /projects/
 *   - `school: vassar`    → under that school on /education/
 *   - both                → set `school` and `onProjects: true`
 *   - `highlight: true`   → also in the home timeline
 */
const projects = defineCollection({
  loader: glob({ pattern: '**/[^_]*.{md,mdx}', base: './src/content/projects' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      org: z.string().optional(),
      kind: z.enum(['role', 'research', 'project', 'award', 'course', 'activity']),
      /** Course code, e.g. `CMPU 224`. */
      course: z.string().optional(),
      start: yearMonth.optional(),
      end: yearMonth.optional(),
      location: z.string().optional(),
      school: reference('education').optional(),
      onProjects: z.boolean().optional(),
      logo: image().optional(),
      logoAlt: z.string().default(''),
      highlight: z.boolean().default(false),
      /** Tie-breaker within the same start month; lower comes first. */
      order: z.number().default(0),
      /** Short bullets (home timeline, education page). */
      summary: z.array(z.string()).default([]),
      /** Fuller bullets for /projects/. Falls back to `summary`. */
      details: z.array(z.string()).optional(),
      links: z.array(link).default([]),
      skills: z.array(z.enum(allSkills)).default([]),
      /** Drafts show in `pnpm dev` (badged) but not in production builds. */
      draft: z.boolean().default(false),
    }),
});

const education = defineCollection({
  loader: glob({ pattern: '**/[^_]*.md', base: './src/content/education' }),
  schema: ({ image }) =>
    z.object({
      school: z.string(),
      degree: z.string(),
      location: z.string().optional(),
      /** Free-text date line, e.g. "Expected May 2027". */
      when: z.string().optional(),
      logo: image().optional(),
      notes: z.array(z.string()).default([]),
      order: z.number().default(0),
    }),
});

const hobbies = defineCollection({
  loader: glob({ pattern: '**/[^_]*.{md,mdx}', base: './src/content/hobbies' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      blurb: z.string(),
      /** Iconify name, e.g. `material-symbols:pool-rounded`. */
      icon: z.string().optional(),
      /** `alt` describes the image; `caption`, if set, is shown under it. */
      photos: z.array(z.object({ src: image(), alt: z.string(), caption: z.string().optional() })).default([]),
      links: z.array(link).default([]),
      order: z.number().default(0),
      draft: z.boolean().default(false),
    }),
});

export const collections = { projects, education, hobbies };
