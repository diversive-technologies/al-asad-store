'use client';

import { useRef, useState, type FormEvent } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ROUTES } from '@/config/routes';
import type { Messages } from '@/i18n/messages/en';

import { signInWithPasswordAction } from '../actions';
import { passwordSignInSchema, type PasswordSignInInput } from '../schemas/auth.schema';
import { Field } from './Field';

/**
 * §11 `authenticate(email, password)`.
 *
 * FORM-01/FORM-02: one Zod schema, React Hook Form, `zodResolver`.
 *
 * Every failure renders the SAME sentence, and that is the point rather than
 * laziness: §11 requires that "authentication responses never reveal whether an
 * account exists". A form that said "no account with that email" for one case
 * and "wrong password" for another would answer the question an attacker is
 * actually asking.
 */
export function PasswordSignInForm({ messages }: { messages: Messages }) {
  const t = messages.auth;
  const router = useRouter();
  const [refusal, setRefusal] = useState<string | null>(null);
  // FORM-06, synchronously: `isSubmitting` only flips after a re-render.
  const inFlight = useRef(false);

  const form = useForm<PasswordSignInInput>({
    resolver: zodResolver(passwordSignInSchema),
    defaultValues: { email: '', password: '' },
  });

  async function onSubmit(input: PasswordSignInInput): Promise<void> {
    setRefusal(null);
    const result = await signInWithPasswordAction(input);

    if (!result.ok) {
      // ERR-11: our copy, never the upstream text (SEC-07).
      setRefusal(result.error.kind === 'RATE_LIMITED' ? t.tooManyAttempts : t.signInRefused);
      return;
    }

    // The session cookie is set; a refresh makes the server re-read it.
    router.push(ROUTES.home);
    router.refresh();
  }

  /*
   * FORM-06, and the `.finally` is load-bearing.
   *
   * An earlier version set the latch here and cleared it inside `onSubmit` —
   * which never runs when validation fails, so one mismatched password left the
   * form permanently stuck: the corrected submit was swallowed by a latch
   * nothing would ever release. `handleSubmit(...)()` resolves on every path,
   * valid or not, so clearing it there cannot be skipped.
   */
  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    if (inFlight.current) {
      event.preventDefault();
      return;
    }

    inFlight.current = true;
    void form
      .handleSubmit(onSubmit)(event)
      .finally(() => {
        inFlight.current = false;
      });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <Field
        id="email"
        label={t.emailLabel}
        error={form.formState.errors.email === undefined ? undefined : t.emailInvalid}
      >
        {(aria) => (
          <Input {...aria} type="email" autoComplete="email" {...form.register('email')} />
        )}
      </Field>

      <Field
        id="password"
        label={t.passwordLabel}
        error={form.formState.errors.password === undefined ? undefined : t.passwordTooShort}
      >
        {/* SEC-01: `current-password` so a manager fills it; never echoed back. */}
        {(aria) => (
          <Input
            {...aria}
            type="password"
            autoComplete="current-password"
            {...form.register('password')}
          />
        )}
      </Field>

      {refusal === null ? null : (
        // A11Y-05 / ERR-04: announced, not only shown.
        <p role="alert" className="text-danger-500 text-sm">
          {refusal}
        </p>
      )}

      <Button type="submit" size="lg" isLoading={form.formState.isSubmitting}>
        {t.signInCta}
      </Button>

      <div className="flex justify-between text-xs">
        <Link href={ROUTES.forgotPassword} className="text-fg-muted hover:text-fg underline">
          {t.forgotPassword}
        </Link>
        <Link href={ROUTES.signUp} className="text-fg-muted hover:text-fg underline">
          {t.noAccount}
        </Link>
      </div>
    </form>
  );
}
