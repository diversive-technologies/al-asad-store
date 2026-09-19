'use client';

import { useState } from 'react';

import type { Messages } from '@/i18n/messages/en';
import { cn } from '@/lib/utils/cn';

import { CodeSignInForm } from './CodeSignInForm';
import { PasswordSignInForm } from './PasswordSignInForm';
import { TestAccountNotice } from './TestAccountNotice';

export interface SignInScreenProps {
  messages: Messages;
  mobileExample: string;
  /** Shown only while the mock layer is armed — see `TestAccountNotice`. */
  testHint: { email: string; password: string } | null;
  /**
   * The page that sent the customer here, to land on once signed in — or `null`
   * for the homepage. Already allow-listed by the route (SEC-06).
   */
  returnTo: string | null;
}

type Method = 'password' | 'code';

/**
 * §11 offers TWO ways in, and this screen is where a customer chooses:
 *
 * ```
 * authenticate(email, password)     -> Session
 * authenticateByCode(mobile, code)  -> Session
 * ```
 *
 * They are not a primary and a fallback. In this market a customer reliably has
 * a mobile number and may well not use email, so the code path is a first-class
 * route in — which is why it is a visible choice rather than a "trouble signing
 * in?" link buried under the form.
 *
 * A11Y-01/A11Y-02: the switch is a real `radiogroup` of buttons, not two divs
 * with click handlers, so it is reachable and announced.
 */
export function SignInScreen({ messages, mobileExample, testHint, returnTo }: SignInScreenProps) {
  const t = messages.auth;
  const [method, setMethod] = useState<Method>('password');

  const methods: { id: Method; label: string }[] = [
    { id: 'password', label: t.methodPassword },
    { id: 'code', label: t.methodCode },
  ];

  return (
    <section className="page-shell max-w-sm py-12">
      <h1 className="text-fg text-2xl font-semibold">{t.signInHeading}</h1>
      <p className="text-fg-muted mt-2 text-sm">{t.signInBody}</p>

      {testHint === null ? null : <TestAccountNotice messages={messages} hint={testHint} />}

      <div role="radiogroup" aria-label={t.methodLabel} className="mt-6 flex gap-2">
        {methods.map((entry) => (
          <button
            key={entry.id}
            type="button"
            role="radio"
            aria-checked={method === entry.id}
            onClick={() => {
              setMethod(entry.id);
            }}
            className={cn(
              'rounded-card focus-visible:ring-brand-500 flex-1 border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none',
              method === entry.id
                ? 'border-brand-600 bg-brand-600 text-on-brand'
                : 'border-border text-fg hover:border-brand-600',
            )}
          >
            {entry.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {method === 'password' ? (
          <PasswordSignInForm messages={messages} returnTo={returnTo} />
        ) : (
          <CodeSignInForm messages={messages} mobileExample={mobileExample} returnTo={returnTo} />
        )}
      </div>
    </section>
  );
}
