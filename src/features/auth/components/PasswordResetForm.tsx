'use client';

import { useState } from 'react';

import Link from 'next/link';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { ROUTES } from '@/config/routes';
import { useLatchedSubmit } from '@/hooks/use-latched-submit';
import type { Messages } from '@/i18n/messages/en';
import { onDemandResolver } from '@/lib/utils/on-demand-resolver';

import { requestPasswordResetAction } from '../actions';
import { resetOutcomeOf } from '../lib/auth-failure';
import type { PasswordResetInput } from '../schemas/auth.schema';
import { AuthRefusal } from './AuthRefusal';
import { PasswordResetSent } from './PasswordResetSent';

/*
 * Deliberate code split (IMP-01a, PERF-10): the form's validation is fetched when
 * it is first focused rather than with the page (`onDemandResolver` has the
 * reasoning).
 */
const validation = onDemandResolver<PasswordResetInput>(() =>
  Promise.all([import('@hookform/resolvers/zod'), import('../schemas/auth.schema')]).then(
    ([{ zodResolver }, { passwordResetSchema }]) => zodResolver(passwordResetSchema),
  ),
);

export interface PasswordResetFormProps {
  messages: Messages;
}

/**
 * §11 `resetPassword(email) -> void`.
 *
 * Whatever the backend answers, it says the same thing. §11 requires that
 * authentication responses never reveal whether an account exists, and a reset
 * form that behaved differently for an unknown address would answer precisely
 * that — it is the easiest account-enumeration oracle to leave lying around,
 * because it feels helpful to say "we have no account for that".
 *
 * FORM-01/FORM-02: the schema is the action's own, through React Hook Form. The
 * form used to be a hand-rolled `useState` field that ignored the action's
 * validation result, so an empty box or "abc" was told a link was on its way.
 * Neither an invalid address nor a store that could not be reached is an answer
 * about any account, so both are said as what they are (`resetOutcomeOf`).
 */
export function PasswordResetForm({ messages }: PasswordResetFormProps) {
  const t = messages.auth;
  const [isSent, setIsSent] = useState(false);
  const [refusal, setRefusal] = useState<string | null>(null);

  const form = useForm<PasswordResetInput>({
    resolver: validation.resolver,
    defaultValues: { email: '' },
  });

  const handleSubmit = useLatchedSubmit(form, async (input) => {
    setRefusal(null);
    const outcome = resetOutcomeOf(await requestPasswordResetAction(input));

    if (outcome === 'SENT') setIsSent(true);
    else if (outcome === 'INVALID') form.setError('email', { message: t.emailInvalid });
    else setRefusal(messages.errors.network);
  });

  if (isSent) return <PasswordResetSent messages={messages} />;

  return (
    <form
      onSubmit={handleSubmit}
      onFocus={validation.warmUp}
      noValidate
      className="flex flex-col gap-4"
    >
      <Field
        id="reset-email"
        label={t.emailLabel}
        error={form.formState.errors.email ? t.emailInvalid : undefined}
      >
        {(aria) => (
          <Input {...aria} type="email" autoComplete="email" {...form.register('email')} />
        )}
      </Field>

      <AuthRefusal message={refusal} />

      <Button type="submit" size="lg" isLoading={form.formState.isSubmitting}>
        {t.resetCta}
      </Button>

      <Link
        href={ROUTES.signIn}
        className="text-fg-muted hover:text-fg text-center text-xs underline"
      >
        {t.backToSignIn}
      </Link>
    </form>
  );
}
