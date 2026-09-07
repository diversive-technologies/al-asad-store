'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ROUTES } from '@/config/routes';
import type { Messages } from '@/i18n/messages/en';

import { requestCodeAction, signInWithCodeAction } from '../actions';
import { Field } from './Field';

export interface CodeSignInFormProps {
  messages: Messages;
  mobileExample: string;
}

/**
 * §11 `issueCode(mobile)` then `authenticateByCode(mobile, code)`.
 *
 * Two steps in one form rather than two screens: the number stays on screen
 * while the code is typed, so someone who mistyped it can see that and fix it
 * without starting again.
 *
 * §11's invariants that show up here: the code is single-use and expires, so a
 * refusal offers "send another" rather than leaving the customer stuck; and
 * `issueCode` reveals nothing, so the confirmation says a code has been sent
 * WITHOUT claiming the number is registered.
 */
export function CodeSignInForm({ messages, mobileExample }: CodeSignInFormProps) {
  const t = messages.auth;
  const router = useRouter();

  const [mobile, setMobile] = useState('');
  const [code, setCode] = useState('');
  const [isSent, setIsSent] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [refusal, setRefusal] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  /*
   * D1 — the mock returns the code it "sent", because no SMS provider is wired
   * up and the path would otherwise be untestable. The real §11 returns void
   * and this stays null, which is why nothing here depends on it.
   */
  const [devCode, setDevCode] = useState<string | null>(null);

  async function sendCode(): Promise<void> {
    setIsBusy(true);
    setRefusal(null);

    const result = await requestCodeAction({ mobile });
    setIsBusy(false);

    if (!result.ok) {
      setRefusal(t.mobileInvalid);
      return;
    }

    setIsSent(true);
    setDevCode(result.value);
    setNotice(t.codeSent);
  }

  async function verify(): Promise<void> {
    setIsBusy(true);
    setRefusal(null);

    const result = await signInWithCodeAction({ mobile, code });
    setIsBusy(false);

    if (!result.ok) {
      // ERR-11: our copy. A wrong, expired and already-used code read the same,
      // because §11 does not distinguish them to the caller either.
      setRefusal(result.error.kind === 'RATE_LIMITED' ? t.tooManyAttempts : t.codeRefused);
      return;
    }

    router.push(ROUTES.home);
    router.refresh();
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void (isSent ? verify() : sendCode());
      }}
      noValidate
      className="flex flex-col gap-4"
    >
      <Field id="mobile" label={t.mobileLabel} hint={mobileExample}>
        {(aria) => (
          <Input
            {...aria}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={mobile}
            // Changing the number invalidates the step it belongs to.
            onChange={(event) => {
              setMobile(event.target.value);
              setIsSent(false);
              setNotice(null);
              setDevCode(null);
            }}
          />
        )}
      </Field>

      {!isSent ? null : (
        <Field
          id="code"
          label={t.codeLabel}
          hint={devCode === null ? undefined : `${t.testCode}: ${devCode}`}
        >
          {(aria) => (
            <Input
              {...aria}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(event) => {
                setCode(event.target.value);
              }}
            />
          )}
        </Field>
      )}

      {/* A11Y-05 / ERR-04: both outcomes are announced. */}
      <p aria-live="polite" className="text-fg-muted text-xs empty:hidden">
        {notice}
      </p>
      {refusal === null ? null : (
        <p role="alert" className="text-danger-500 text-sm">
          {refusal}
        </p>
      )}

      <Button type="submit" size="lg" isLoading={isBusy}>
        {isSent ? t.verifyCta : t.sendCodeCta}
      </Button>

      {!isSent ? null : (
        <button
          type="button"
          onClick={() => {
            void sendCode();
          }}
          className="text-fg-muted hover:text-fg text-xs underline"
        >
          {t.resendCode}
        </button>
      )}
    </form>
  );
}
