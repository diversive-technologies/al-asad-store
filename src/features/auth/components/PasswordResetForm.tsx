'use client';

import { useState, type FormEvent } from 'react';

import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ROUTES } from '@/config/routes';
import type { Messages } from '@/i18n/messages/en';

import { requestPasswordResetAction } from '../actions';
import { Field } from './Field';

/**
 * §11 `resetPassword(email) -> void`.
 *
 * It always says the same thing. §11 requires that authentication responses
 * never reveal whether an account exists, and a reset form that behaved
 * differently for an unknown address would answer precisely that — it is the
 * easiest account-enumeration oracle to leave lying around, because it feels
 * helpful to say "we have no account for that".
 */
export function PasswordResetForm({ messages }: { messages: Messages }) {
  const t = messages.auth;
  const [email, setEmail] = useState('');
  const [isSent, setIsSent] = useState(false);
  const [isBusy, setIsBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setIsBusy(true);

    await requestPasswordResetAction({ email });

    setIsBusy(false);
    setIsSent(true);
  }

  if (isSent) {
    return (
      <div className="flex flex-col gap-4">
        {/* A11Y-05: the outcome is announced, not just rendered. */}
        <p role="status" className="text-fg text-sm">
          {t.resetSent}
        </p>
        <Link href={ROUTES.signIn} className="text-fg-muted hover:text-fg text-sm underline">
          {t.backToSignIn}
        </Link>
      </div>
    );
  }

  return (
    <form
      onSubmit={(event) => {
        void submit(event);
      }}
      noValidate
      className="flex flex-col gap-4"
    >
      <Field id="reset-email" label={t.emailLabel}>
        {(aria) => (
          <Input
            {...aria}
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
            }}
          />
        )}
      </Field>

      <Button type="submit" size="lg" isLoading={isBusy}>
        {t.resetCta}
      </Button>

      <Link href={ROUTES.signIn} className="text-fg-muted hover:text-fg text-center text-xs underline">
        {t.backToSignIn}
      </Link>
    </form>
  );
}
