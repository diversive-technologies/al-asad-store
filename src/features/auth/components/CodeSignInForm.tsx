'use client';

import { Button } from '@/components/ui/button';
import type { Messages } from '@/i18n/messages/en';

import { useCodeSignIn } from '../hooks/use-code-sign-in';
import { AuthRefusal } from './AuthRefusal';
import { CodeSignInFields } from './CodeSignInFields';

export interface CodeSignInFormProps {
  messages: Messages;
  mobileExample: string;
  /** Where to land once signed in — already allow-listed by the page (SEC-06). */
  returnTo: string | null;
}

/**
 * §11 `issueCode(mobile)` then `authenticateByCode(mobile, code)`.
 *
 * Two steps in one form rather than two screens (`CodeSignInFields`), with the
 * state in `useCodeSignIn`.
 *
 * §11's invariants that show up here: the code is single-use and expires, so a
 * refusal offers "send another" rather than leaving the customer stuck; and
 * `issueCode` reveals nothing, so the confirmation says a code has been sent
 * WITHOUT claiming the number is registered.
 */
export function CodeSignInForm({ messages, mobileExample, returnTo }: CodeSignInFormProps) {
  const t = messages.auth;
  const flow = useCodeSignIn(messages, returnTo);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void flow.submit();
      }}
      noValidate
      className="flex flex-col gap-4"
    >
      <CodeSignInFields flow={flow} messages={messages} mobileExample={mobileExample} />

      {/* A11Y-05 / ERR-04: both outcomes are announced. */}
      <p aria-live="polite" className="text-fg-muted text-xs empty:hidden">
        {flow.notice}
      </p>
      <AuthRefusal message={flow.refusal} />

      <Button type="submit" size="lg" isLoading={flow.isBusy}>
        {flow.isSent ? t.verifyCta : t.sendCodeCta}
      </Button>

      {!flow.isSent ? null : (
        <button
          type="button"
          onClick={() => {
            void flow.sendCode();
          }}
          className="text-fg-muted hover:text-fg text-xs underline"
        >
          {t.resendCode}
        </button>
      )}
    </form>
  );
}
