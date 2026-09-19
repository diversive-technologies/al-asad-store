'use client';

import { useState } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { ROUTES } from '@/config/routes';
import { useLatchedSubmit } from '@/hooks/use-latched-submit';
import type { Messages } from '@/i18n/messages/en';
import { onDemandResolver } from '@/lib/utils/on-demand-resolver';

import { signUpAction } from '../actions';
import type { SignUpInput } from '../schemas/auth.schema';
import { AuthRefusal } from './AuthRefusal';
import { SignUpFields } from './SignUpFields';

/*
 * Deliberate code split (IMP-01a, PERF-10): the form's validation is fetched when
 * it is first focused rather than with the page (`onDemandResolver` has the
 * reasoning).
 */
const validation = onDemandResolver<SignUpInput>(() =>
  Promise.all([import('@hookform/resolvers/zod'), import('../schemas/auth.schema')]).then(
    ([{ zodResolver }, { signUpSchema }]) => zodResolver(signUpSchema),
  ),
);

export interface SignUpFormProps {
  messages: Messages;
  mobileExample: string;
  /**
   * The page that sent the customer to sign in or sign up, to land on once the
   * account exists — or `null` for the homepage. Allow-listed by the route (SEC-06).
   */
  returnTo: string | null;
}

/**
 * Registration. §11 owns accounts; this is the screen that asks for one.
 *
 * Four fields and a confirmation, which is the whole account (`SignUpFields`).
 * Nothing optional is asked for — a longer form here costs completions and every
 * extra field is one the customer has to be told why about.
 *
 * Unlike sign-in, a collision IS reported. §11's enumeration rule is about
 * AUTHENTICATION responses, and someone who cannot finish a sign-up without
 * being told why simply leaves.
 */
export function SignUpForm({ messages, mobileExample, returnTo }: SignUpFormProps) {
  const t = messages.auth;
  const router = useRouter();
  const [refusal, setRefusal] = useState<string | null>(null);

  const form = useForm<SignUpInput>({
    resolver: validation.resolver,
    defaultValues: { fullName: '', email: '', mobile: '', password: '', confirmPassword: '' },
  });

  // FORM-06: one submission at a time, released however validation went.
  const handleSubmit = useLatchedSubmit(form, async (input) => {
    setRefusal(null);
    const result = await signUpAction(input);

    if (!result.ok) {
      setRefusal(result.error.kind === 'CONFLICT' ? t.emailTaken : t.signUpFailed);
      return;
    }
    // Registering signs you in, so the customer goes on to where they were headed.
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
      <SignUpFields form={form} messages={messages} mobileExample={mobileExample} />

      <AuthRefusal message={refusal} />

      <Button type="submit" size="lg" isLoading={form.formState.isSubmitting}>
        {t.signUpCta}
      </Button>

      <p className="text-fg-muted text-center text-xs">
        {t.haveAccount}{' '}
        <Link href={ROUTES.signInFrom(returnTo)} className="hover:text-fg underline">
          {t.signInCta}
        </Link>
      </p>
    </form>
  );
}
