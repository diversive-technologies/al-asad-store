import type { Locale } from '@/i18n/locales';

/**
 * D1 — how §21's pages are written in the fixture, and the shape they are served
 * in. Shared by `pages-db.ts` and the store and policy page modules, which are
 * split from it only by size (MOD-03).
 */

interface PageBlockPayload {
  kind: 'HEADING' | 'PARAGRAPH' | 'DEFINITION';
  id: string;
  text?: string;
  term?: string;
  description?: string;
}

export interface StaticPagePayload {
  slug: string;
  title: string;
  intro: string;
  blocks: PageBlockPayload[];
}

/** A page as an editor writes it: a string is a paragraph, `{ heading }` opens a section. */
export type AuthoredBlock = string | { readonly heading: string };

export interface AuthoredPage {
  readonly title: string;
  readonly intro: string;
  readonly body: readonly AuthoredBlock[];
}

/**
 * One page, written in every locale. `Record<Locale, …>` rather than a partial
 * map, so a page without its Urdu version does not compile — §21's fallback to
 * English is for content the operator has not translated YET, not for fixture
 * content that simply forgot.
 */
export function authoredPage(
  slug: string,
  copy: Readonly<Record<Locale, AuthoredPage>>,
): (locale: Locale) => StaticPagePayload {
  return (locale) => ({
    slug,
    title: copy[locale].title,
    intro: copy[locale].intro,
    blocks: copy[locale].body.map((block, index) => {
      const id = `${slug}-${String(index)}`;
      return typeof block === 'string'
        ? { kind: 'PARAGRAPH' as const, id, text: block }
        : { kind: 'HEADING' as const, id, text: block.heading };
    }),
  });
}
