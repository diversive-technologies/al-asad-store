import { randomUUID } from 'node:crypto';

import type { BrowserContext } from '@playwright/test';

import { SESSION_COOKIE } from '@/features/auth/lib/session-cookie';
import { sealSessionWith } from '@/features/auth/lib/session-seal';
import type { Session } from '@/features/auth/schemas/auth.schema';
import { LOCALE_COOKIE, type Locale } from '@/i18n/locales';

import { E2E_BASE_URL, E2E_SESSION_SECRET } from './server';

/**
 * D3 — signs a customer in by setting the session cookie directly.
 *
 * No journey ever types a password: the sign-in screen is not what these
 * journeys are about, and a credential typed by a test is a credential written
 * into a test. The cookie is exactly what `storeSession` writes after a
 * successful sign-in — the session SEALED with the suite's secret (F-01) — so
 * every server read that decides who is signed in sees an ordinary signed-in
 * customer. A cookie written as raw JSON no longer signs anyone in.
 *
 * Every call is a NEW customer. Saved items, sizes, addresses and orders belong
 * to the account (§28.3), and the backend keeps them, so two journeys sharing
 * an account would see each other's.
 */
export async function signInAsNewCustomer(context: BrowserContext): Promise<Session> {
  const session: Session = {
    displayName: 'E2E Customer',
    email: `e2e-${randomUUID()}@example.com`,
    mobile: '03001234567',
  };

  await context.addCookies([
    {
      name: SESSION_COOKIE,
      value: sealSessionWith(session, Math.floor(Date.now() / 1000), E2E_SESSION_SECRET),
      url: E2E_BASE_URL,
    },
  ]);

  return session;
}

/** F-01 — the cookie a hand-written session would be: unsigned JSON, as the store used to accept. */
export async function writeForgedSession(context: BrowserContext, session: Session): Promise<void> {
  await context.addCookies([
    {
      name: SESSION_COOKIE,
      value: encodeURIComponent(JSON.stringify(session)),
      url: E2E_BASE_URL,
    },
  ]);
}

/** I18N-03 — reads the store in `locale`, as the cookie a language choice sets. */
export async function readInLocale(context: BrowserContext, locale: Locale): Promise<void> {
  await context.addCookies([{ name: LOCALE_COOKIE, value: locale, url: E2E_BASE_URL }]);
}

/** An address nobody else in the run has asked with, for a request the backend keeps. */
export function uniqueEmail(purpose: string): string {
  return `e2e-${purpose}-${randomUUID()}@example.com`;
}
