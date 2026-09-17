import type { Metadata } from 'next';

import {
  requestedProduct,
  requestedSource,
  requestedStyle,
  StitchedScreen,
} from '@/features/made-to-measure';
import { getMessages } from '@/i18n';

export async function generateMetadata(): Promise<Metadata> {
  const messages = await getMessages();
  return {
    title: messages.madeToMeasure.pageTitle,
    description: messages.madeToMeasure.pageLead,
  };
}

export interface StitchedPageProps {
  // NEXT-03: searchParams is a Promise in Next.js 16.
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/**
 * §34 — the measurement atelier at its own address: `?style=` chooses which
 * garment style's list it opens, `?source=` how it is measured, and `?product=`
 * names the garment it was opened from — which settles the style itself, and is
 * what the customer is sent back to and what the bag takes at the end.
 *
 * Public and usable WITHOUT buying anything, deliberately. It is the one thing
 * on the store somebody will open out of curiosity, and a customer who has
 * already measured themselves has made the buying decision easy.
 *
 * Full bleed rather than inside `page-shell`: the stage is the page. The root
 * layout already renders `<main>`, so none is added here (A11Y-01).
 *
 * STRUCT-02: the route composes; it does not decide anything.
 */
export default async function StitchedPage({ searchParams }: StitchedPageProps) {
  const { style, source, product } = await searchParams;
  return (
    <StitchedScreen
      requested={{
        style: requestedStyle(style),
        source: requestedSource(source),
        product: requestedProduct(product),
      }}
    />
  );
}
