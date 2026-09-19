'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { ROUTES } from '@/config/routes';
import type { Messages } from '@/i18n/messages/en';

import { requestCodeAction, signInWithCodeAction } from '../actions';
import { authRefusal } from '../lib/auth-failure';

export interface CodeSignIn {
  readonly mobile: string;
  readonly code: string;
  /** A code has been asked for this number, so the form is on its second step. */
  readonly isSent: boolean;
  readonly isBusy: boolean;
  /** What was just done, announced politely; `null` before a code is sent. */
  readonly notice: string | null;
  readonly refusal: string | null;
  /**
   * D1 — the mock returns the code it "sent", because no SMS provider is wired up
   * and the path would otherwise be untestable. The real §11 returns void and this
   * stays null, which is why nothing depends on it.
   */
  readonly devCode: string | null;
  /** Changing the number invalidates the step it belongs to. */
  readonly changeMobile: (value: string) => void;
  readonly changeCode: (value: string) => void;
  readonly sendCode: () => Promise<void>;
  /** The form's one submit: send a code, or sign in with the one sent. */
  readonly submit: () => Promise<void>;
}

/** The code step, once reached: what the mock handed back, if anything. */
interface SentStep {
  readonly devCode: string | null;
}

/**
 * §11 `issueCode(mobile)` then `authenticateByCode(mobile, code)`, as state — the
 * form that draws it is `CodeSignInForm` (MOD-05).
 *
 * A refusal is said in the step's own words, and an outage is said as one: a
 * failed code request used to answer "Enter a valid mobile number" whatever went
 * wrong, including a store that could not be reached (`authRefusal`).
 */
export function useCodeSignIn(messages: Messages, returnTo: string | null): CodeSignIn {
  const t = messages.auth;
  const router = useRouter();
  const [mobile, setMobile] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState<SentStep | null>(null);
  const [refusal, setRefusal] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  async function sendCode(): Promise<void> {
    setIsBusy(true);
    setRefusal(null);
    const result = await requestCodeAction({ mobile });
    setIsBusy(false);

    if (result.ok) setSent({ devCode: result.value });
    else setRefusal(authRefusal(result.error, t.mobileInvalid, messages));
  }

  async function verify(): Promise<void> {
    setIsBusy(true);
    setRefusal(null);
    const result = await signInWithCodeAction({ mobile, code });
    setIsBusy(false);

    if (!result.ok) {
      // A wrong, expired and already-used code read the same, because §11 does
      // not distinguish them to the caller either.
      setRefusal(authRefusal(result.error, t.codeRefused, messages));
      return;
    }
    router.push(returnTo ?? ROUTES.home);
    router.refresh();
  }

  return {
    mobile,
    code,
    isSent: sent !== null,
    isBusy,
    notice: sent === null ? null : t.codeSent,
    refusal,
    devCode: sent?.devCode ?? null,
    changeMobile: (value) => {
      setMobile(value);
      setSent(null);
    },
    changeCode: setCode,
    sendCode,
    submit: () => (sent === null ? sendCode() : verify()),
  };
}
