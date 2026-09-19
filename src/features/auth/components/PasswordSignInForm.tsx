'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { ROUTES } from '@/config/routes';
import { useLatchedSubmit } from '@/hooks/use-latched-submit';
import type { Messages } from '@/i18n/messages/en';
import { onDemandResolver } from '@/lib/utils/on-demand-resolver';

import { signInWithPasswordAction } from '../actions';
import { authRefusal } from '../lib/auth-failure';
import type { PasswordSignInInput } from '../schemas/auth.schema';
import { AuthRefusal } from './AuthRefusal';
import { PasswordSignInFields } from './PasswordSignInFields';

/*
 * Deliberate code split (IMP-01a, PERF-10): the form's validation is fetched when
 * it is first focused rather than with the page (`onDemandResolver` has the
 * reasoning).
 */
const validation = onDemandResolver<PasswordSignInInput>(() =>
  Promise.all([import('@hookform/resolvers/zod'), import('../schemas/auth.schema')]).then(
    ([{ zodResolver }, { passwordSignInSchema }]) => zodResolver(passwordSignInSchema),
  ),
);

export interface PasswordSignInFormProps {
  messages: Messages;
  /** Where to land once signed in — already allow-listed by the page (SEC-06). */
  returnTo: string | null;
}

/**
 * §11 `authenticate(email, password)`.
 *
 * FORM-01/FORM-02: one Zod schema, React Hook Form, `zodResolver`.
 *
 * Every REFUSAL renders the same sentence, and that is the point rather than
 * laziness: §11 requires that "authentication responses never reveal whether an
 * account exists". A form that said "no account with that email" for one case
 * and "wrong password" for another would answer the question an attacker is
 * actually asking. A store that could not be reached is not a refusal, though,
 * and says so (`authRefusal`) rather than telling the customer their details
 * were wrong.
 */
export function PasswordSignInForm({ messages, returnTo }: PasswordSignInFormProps) {
  const t = messages.auth;
  const router = useRouter();
  const [refusal, setRefusal] = useState<string | null>(null);

  const form = useForm<PasswordSignInInput>({
    resolver: validation.resolver,
    defaultValues: { email: '', password: '' },
  });

  // FORM-06: one submission at a time, released however validation went.
  const handleSubmit = useLatchedSubmit(form, async (input) => {
    setRefusal(null);
    const result = await signInWithPasswordAction(input);

    if (!result.ok) {
      setRefusal(authRefusal(result.error, t.signInRefused, messages));
      return;
    }
    // The session cookie is set; a refresh makes the server re-read it.
    router.push(returnTo ?? ROUTES.home);
    router.refresh();
  });

  return (
    <form
      onSubmit={handleSubmit}
      onFocus={validation.warmUp}
      noValidate
      className="flex flex-col gap-4"
    >
      <PasswordSignInFields form={form} messages={messages} />

      <AuthRefusal message={refusal} />

      <Button type="submit" size="lg" isLoading={form.formState.isSubmitting}>
        {t.signInCta}
      </Button>

      <div className="flex justify-between text-xs">
        <Link href={ROUTES.forgotPassword} className="text-fg-muted hover:text-fg underline">
          {t.forgotPassword}
        </Link>
        {/* The way back travels on to sign-up, so creating an account returns too. */}
        <Link href={ROUTES.signUpFrom(returnTo)} className="text-fg-muted hover:text-fg underline">
          {t.noAccount}
        </Link>
      </div>
    </form>
  );
}
