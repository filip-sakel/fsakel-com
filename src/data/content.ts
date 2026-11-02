import { getCollection, type CollectionEntry } from 'astro:content';
import type { Skill } from './skills';

export type Entry = CollectionEntry<'projects'>;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** `2026-05` → `May 2026`. */
export function formatMonth(ym: string): string {
  const [y, m] = ym.split('-');
  return `${MONTHS[Number(m) - 1]} ${y}`;
}

export function formatRange(start?: string, end?: string): string {
  if (!start) return '';
  if (end === start) return formatMonth(start);
  return `${formatMonth(start)} – ${end ? formatMonth(end) : 'Present'}`;
}

const isPublished = ({ data }: { data: { draft: boolean } }) => !(import.meta.env.PROD && data.draft);

/** Newest first (undated last); `order` breaks ties. */
const byStartDesc = (a: Entry, b: Entry) =>
  (b.data.start ?? '').localeCompare(a.data.start ?? '') || a.data.order - b.data.order;

export async function getEntries() {
  return (await getCollection('projects', isPublished)).sort(byStartDesc);
}

export const isOnProjects = (e: Entry) => e.data.onProjects ?? !e.data.school;

export async function getHighlights() {
  return (await getEntries()).filter((e) => e.data.highlight);
}

/** A project or hobby gets its own page only when its Markdown body has content. */
export const hasWriteUp = (entry: { body?: string }) => Boolean(entry.body?.trim());

/** Best place to send someone who clicks on this entry. */
export function entryHref(e: Entry): string {
  if (hasWriteUp(e)) return `/projects/${e.id}/`;
  return isOnProjects(e) ? `/projects/#${e.id}` : `/education/#${e.id}`;
}

/** skill → entries that list it. */
export async function getSkillUses() {
  const uses = new Map<Skill, Entry[]>();
  for (const e of await getEntries()) {
    for (const s of e.data.skills) uses.set(s, [...(uses.get(s) ?? []), e]);
  }
  return uses;
}

export async function getHobbies() {
  return (await getCollection('hobbies', isPublished)).sort((a, b) => a.data.order - b.data.order);
}

export async function getSchools() {
  return (await getCollection('education')).sort((a, b) => a.data.order - b.data.order);
}
