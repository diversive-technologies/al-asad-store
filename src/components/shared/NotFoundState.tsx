import type { ReactNode } from 'react';

export interface NotFoundStateProps {
  /** Resolved copy from SSOT-07 — the page's single `h1`. */
  heading: string;
  body: string;
  /** The ways back, as links (CMP-08: composed by the caller, not configured here). */
  children: ReactNode;
}

/**
 * What a `not-found.tsx` renders: in the reader's language, and never a dead end.
 *
 * Next's own 404 is English whatever the page's language, and offers nothing but
 * the words. Every `not-found.tsx` in the store renders this instead, with at least
 * one way back into the shop.
 *
 * No `<main>`: the root layout already renders it (A11Y-01).
 */
export function NotFoundState({ heading, body, children }: NotFoundStateProps) {
  return (
    <section className="page-shell flex max-w-2xl flex-col items-start gap-3 py-16">
      <h1 className="text-fg text-2xl font-semibold">{heading}</h1>
      <p className="text-fg-muted">{body}</p>
      <div className="mt-3 flex flex-wrap gap-2">{children}</div>
    </section>
  );
}
