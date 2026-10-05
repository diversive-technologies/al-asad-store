'use client';

import { useState } from 'react';

import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { useLatchedSubmit } from '@/hooks/use-latched-submit';
import type { Messages } from '@/i18n/messages/en';
import { onDemandResolver } from '@/lib/utils/on-demand-resolver';

import { confirmPasswordResetAction } from '../actions';
import { resetConfirmOutcomeOf } from '../lib/auth-failure';
import type { NewPasswordInput } from '../schemas/auth.schema';
import { AuthRefusal } from './AuthRefusal';
import { PasswordResetDone } from './PasswordResetDone';
import { ResetLinkExpired } from './ResetLinkExpired';

/*
 * Deliberate code split (IMP-01a, PERF-10): the form's validation is fetched when
 * it is first focused rather than with the page (`onDemandResolver` has the
 * reasoning).
 */
const validation = onDemandResolver<NewPasswordInput>(() =>
  Promise.all([import('@hookform/resolvers/zod'), import('../schemas/auth.schema')]).then(
    ([{ zodResolver }, { newPasswordSchema }]) => zodResolver(newPasswordSchema),
  ),
);

export interface PasswordResetConfirmFormProps {
  readonly messages: Messages;
  /**
   * The token from the link, already checked to be 64 hex characters by the page.
   * It is a one-time secret: it is sent once, in a POST body, and never rendered,
   * logged or put in a URL by anything here (SEC-01).
   */
  readonly token: string;
}

type Step = 'FORM' | 'DONE' | 'EXPIRED';

/**
 * F-03 — choosing a new password from a reset email.
 *
 * Four things can come back and each is said as what it is: it worked (and the
 * customer is sent to sign in, not signed in), the link is no good (and the way
 * on is another link), they have tried too often (the store's usual wait), or the
 * store could not be reached (try the same form again — nothing was changed).
 */
export function PasswordResetConfirmForm({ messages, token }: PasswordResetConfirmFormProps) {
  const t = messages.auth;
  const [step, setStep] = useState<Step>('FORM');
  const [refusal, setRefusal] = useState<string | null>(null);

  const form = useForm<NewPasswordInput>({
    resolver: validation.resolver,
    defaultValues: { password: '', confirmPassword: '' },
  });

  const handleSubmit = useLatchedSubmit(form, async (input) => {
    setRefusal(null);
    const outcome = resetConfirmOutcomeOf(await confirmPasswordResetAction({ ...input, token }));

    switch (outcome) {
      case 'DONE':
        setStep('DONE');
        break;
      case 'EXPIRED':
        setStep('EXPIRED');
        break;
      case 'RATE_LIMITED':
        setRefusal(t.tooManyAttempts);
        break;
      case 'INVALID':
        form.setError('password', { message: t.passwordTooShort });
        break;
      case 'UNREACHABLE':
        setRefusal(messages.errors.network);
        break;
    }
  });

  if (step === 'DONE') return <PasswordResetDone messages={messages} />;
  if (step === 'EXPIRED') return <ResetLinkExpired messages={messages} takeFocus />;

  const { errors } = form.formState;

  return (
    <form
      onSubmit={handleSubmit}
      onFocus={validation.warmUp}
      noValidate
      className="flex flex-col gap-4"
    >
      <Field
        id="reset-password"
        label={t.newPasswordLabel}
        hint={t.passwordHint}
        error={errors.password ? t.passwordTooShort : undefined}
      >
        {/* SEC-01: `new-password` so a manager offers to generate one. */}
        {(aria) => (
          <Input
            {...aria}
            type="password"
            autoComplete="new-password"
            {...form.register('password')}
          />
        )}
      </Field>

      <Field
        id="reset-confirm-password"
        label={t.confirmPasswordLabel}
        error={errors.confirmPassword ? t.passwordsDiffer : undefined}
      >
        {(aria) => (
          <Input
            {...aria}
            type="password"
            autoComplete="new-password"
            {...form.register('confirmPassword')}
          />
        )}
      </Field>

      <AuthRefusal message={refusal} />

      <Button type="submit" size="lg" isLoading={form.formState.isSubmitting}>
        {t.resetConfirmCta}
      </Button>
    </form>
  );
}
