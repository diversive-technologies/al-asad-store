import { Inter, Noto_Nastaliq_Urdu } from 'next/font/google';

/**
 * D5 — THE typeface declarations, so a client's fonts are one file rather than a
 * change inside the root layout.
 *
 * NEXT-10: fonts come from `next/font`; third-party `<link>` tags are
 * PROHIBITED. That imposes a real constraint on how configurable this can be —
 * `next/font` loaders must be called at module scope with literal arguments so
 * the bundler can self-host the files and generate the CSS at build time. A
 * font chosen from a runtime value cannot be optimised, and would silently
 * become a network request to Google on every page.
 *
 * So this is centralisation, not indirection: swapping a typeface is editing the
 * two calls below, and nothing else in the application refers to a font by name.
 * The CSS custom properties are the contract everything downstream uses.
 */

/** The Latin face, used for English and for every number and Latin code. */
const latin = Inter({
  subsets: ['latin'],
  variable: '--font-latin',
  display: 'swap',
});

/**
 * I18N-11 — the stack covers both scripts. `preload: false` keeps the Nastaliq
 * files off the critical path for English visitors: architecture 30.1 requires
 * that this face is loaded only for Urdu.
 *
 * A client whose second language is not Nastaliq-scripted replaces this loader;
 * the `--font-nastaliq` variable name stays, because `globals.css` binds the
 * RTL script to it and renaming would touch both files for no gain.
 */
const nastaliq = Noto_Nastaliq_Urdu({
  subsets: ['arabic'],
  weight: ['400', '600'],
  variable: '--font-nastaliq',
  display: 'swap',
  preload: false,
});

/** The class list the root layout puts on `<html>`. */
export const fontVariables = `${latin.variable} ${nastaliq.variable}`;
