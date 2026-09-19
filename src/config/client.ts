/**
 * D5 — THE client profile. The one file that differs between deployments.
 *
 * This storefront is a product delivered per client, not a bespoke site and not
 * a multi-tenant application. One codebase, one deployment per client, and every
 * difference resolved at build time. Each deployment therefore still serves ONE
 * market in ONE currency from ONE warehouse, exactly as `DATA-11a` and
 * architecture §1.3 require — what varies is which market, not how many.
 *
 * ## Onboarding a new client
 *
 * 1. This file — market, formatting, which optional features are on, and the
 *    store's contact details.
 * 2. `src/styles/globals.css` `@theme` — colour, radius, spacing, type scale.
 * 3. `src/i18n/messages/*` — every user-visible string, including the store name.
 * 4. `src/i18n/locales.ts` — which languages, and the default.
 * 5. `src/config/fonts.ts` — the two typefaces.
 * 6. `app/icon.svg` — the browser-tab icon. An asset rather than a token, because a
 *    favicon is fetched and drawn outside the page and cannot read `@theme`; the
 *    one shipped is deliberately neutral until the client's own mark replaces it.
 * 7. Backend content — products, imagery, homepage composition, help pages, and
 *    the information and policy pages (about, delivery, returns, terms, privacy).
 *
 * `keyPrefix` below names this deployment's own cookies and browser storage, so
 * a second client's store does not ship with the first client's name in them.
 *
 * Nothing else should need touching. A component that hard-codes anything on
 * that list is a defect, not a shortcut.
 *
 * ## What does NOT belong here
 *
 * The apparel domain. `SIMPLE`/`SET`, per-piece sizing, unstitched metreage and
 * the fabric vocabularies are the PRODUCT, not the client — a second ethnic
 * apparel retailer wants all of it, and a furniture retailer is a different
 * product rather than a customisation. Generalising the domain layer in the name
 * of configurability would build an abstraction with exactly one real user.
 *
 * Secrets and per-environment URLs do not belong here either; those are
 * `SSOT-03` env, validated in `env.server.ts` / `env.client.ts`.
 */

/** Supported currencies, as an `as const` union rather than an enum (TS-10). */
const CURRENCIES = {
  PKR: { code: 'PKR', minorUnitsPerMajor: 100 },
  INR: { code: 'INR', minorUnitsPerMajor: 100 },
  AED: { code: 'AED', minorUnitsPerMajor: 100 },
  USD: { code: 'USD', minorUnitsPerMajor: 100 },
  GBP: { code: 'GBP', minorUnitsPerMajor: 100 },
} as const;

export type CurrencyCode = keyof typeof CURRENCIES;

export interface MarketProfile {
  /**
   * DATA-11a: ONE currency for this deployment. This is a build-time choice, not
   * a runtime selector — offering the customer a currency menu would model a
   * market structure that does not exist.
   */
  readonly currency: (typeof CURRENCIES)[CurrencyCode];
  /**
   * BCP-47 tag per locale, used for every `Intl` call.
   *
   * The region matters as much as the language, and getting it wrong is not
   * cosmetic: `ur-PK` resolves to Latin digits while `ur-IN` resolves to Eastern
   * Arabic-Indic, so the same Urdu string renders `123` for one market and `۱۲۳`
   * for another. Keyed by locale so a client adding a language adds one entry.
   */
  readonly formatting: Readonly<Record<string, string>>;
  /**
   * The national mobile-number format, for the sign-in and checkout fields.
   *
   * A pattern rather than a library: this system collects one country's numbers,
   * and a full international parser would be a dependency earning its keep on a
   * single field. `example` is shown as the placeholder, so the two cannot drift.
   */
  readonly mobile: {
    readonly pattern: RegExp;
    readonly example: string;
  };
}

/**
 * Optional features, per client.
 *
 * Flags are added when a feature actually becomes optional — never speculatively
 * (PD-05). A flag with nothing reading it is dead configuration that still has
 * to be understood by the next person.
 */
export interface FeatureProfile {
  /** §28.4 newsletter capture in the footer. */
  readonly newsletter: boolean;
  /**
   * The light/dark toggle. A client with a single brand treatment may want the
   * store to render one way only; the tokens still define both schemes, so this
   * removes the control rather than the capability.
   */
  readonly themeToggle: boolean;
  /**
   * The language switcher in the header.
   *
   * Off does NOT mean the store is monolingual: `LOCALES`, every message file
   * and the whole RTL layout stay exactly as they are, and turning this back on
   * is a one-word change. It removes the CONTROL, for a client who is launching
   * in one language while the second is still being reviewed.
   */
  readonly languageSwitcher: boolean;
}

/** An ISO weekday: 1 is Monday and 7 is Sunday. */
export type IsoWeekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

/**
 * How a customer reaches the store — shown on the Contact us page.
 *
 * DATA, not copy: the day names and times are formatted per locale through `Intl`
 * (`formatWeekday`, `formatClockTime`), so nothing here is written in a language
 * except the postal address, which is given per locale the way `formatting` is.
 */
export interface ContactProfile {
  /** International form, as a customer would dial it: `+92 …`. */
  readonly phone: string;
  /** The WhatsApp number, international form. May be the same line as `phone`. */
  readonly whatsApp: string;
  readonly email: string;
  /** The postal address as lines, per locale. Every locale needs one (`client.test.ts`). */
  readonly address: Readonly<Record<string, readonly string[]>>;
  /** One run of opening days, each open between the same two 24-hour `HH:MM` times. */
  readonly hours: {
    readonly firstDay: IsoWeekday;
    readonly lastDay: IsoWeekday;
    readonly opens: string;
    readonly closes: string;
  };
}

export interface ClientProfile {
  readonly market: MarketProfile;
  readonly features: FeatureProfile;
  /**
   * FIXTURE — the store's contact details. See `CLIENT.contact` below: every value
   * there is a placeholder until the client supplies its own.
   */
  readonly contact: ContactProfile;
  /**
   * The prefix on every cookie and browser-storage name this storefront owns —
   * the cart, a guest's measurements, a guest's saved list. See `clientKey`.
   *
   * Cookies are scoped by HOST, not by port, so two stores developed on one
   * machine share a cookie jar; a prefix per client is what keeps one store's
   * cart out of another's. It must be a cookie-name token: letters, digits,
   * `-` and `_` only (`client.test.ts` holds it to that).
   */
  readonly keyPrefix: string;
}

export const CLIENT: ClientProfile = {
  market: {
    currency: CURRENCIES.PKR,
    formatting: { en: 'en-PK', ur: 'ur-PK' },
    mobile: {
      // Pakistani mobile numbers: 03xx xxxxxxx, with optional spaces or dashes.
      pattern: /^03\d{2}[\s-]?\d{7}$/,
      example: '03xx xxxxxxx',
    },
  },
  features: {
    newsletter: true,
    themeToggle: true,
    /*
     * Off for launch. The Urdu content is written and shipped — D2's closing
     * phase (Nastaliq, the protected-terms list) is what is not finished, and
     * offering a switch to a half-reviewed translation is worse than offering
     * no switch at all.
     */
    languageSwitcher: false,
  },
  /*
   * FIXTURE — NOT the client's details. Every value below is a placeholder shaped
   * like the real thing, chosen so nobody can mistake it for a working line: the
   * numbers are zeros, the email is on the reserved `example.com` domain, and the
   * address says it is still to come. The HOURS are the one placeholder that looks
   * real, so name it aloud at any demo. Replace all five with the client's own;
   * nothing else needs to change, because the Contact us page renders from here.
   */
  contact: {
    phone: '+92 300 0000000',
    whatsApp: '+92 300 0000000',
    email: 'contact@example.com',
    address: {
      en: ['Shop address to be confirmed', 'Pakistan'],
      ur: ['دکان کا پتا ابھی طے ہونا ہے', 'پاکستان'],
    },
    hours: { firstDay: 1, lastDay: 6, opens: '10:00', closes: '19:00' },
  },
  keyPrefix: 'aa',
};

/**
 * D5 — the name of a cookie or storage entry this storefront owns, e.g.
 * `clientKey('cart')`. Every such name goes through here, so none is written
 * with a client's brand in a feature (and none can collide with another store's).
 */
export function clientKey(name: string): string {
  return `${CLIENT.keyPrefix}_${name}`;
}
