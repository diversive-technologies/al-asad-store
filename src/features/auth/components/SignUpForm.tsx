'use client';

import { useRef, useState, type FormEvent } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { ROUTES } from '@/config/routes';
import type { Messages } from '@/i18n/messages/en';

import { signUpAction } from '../actions';
import { signUpSchema, type SignUpInput } from '../schemas/auth.schema';

export interface SignUpFormProps {
  messages: Messages;
  mobileExample: string;
}

/**
 * Registration. §11 owns accounts; this is the screen that asks for one.
 *
 * Four fields and a confirmation, which is the whole account: a name to greet
 * them by, an email to authenticate with, a mobile for codes and order updates,
 * and a password. Nothing optional is asked for — a longer form here costs
 * completions and every extra field is one the customer has to be told why
 * about.
 *
 * Unlike sign-in, a collision IS reported. §11's enumeration rule is about
 * AUTHENTICATION responses, and someone who cannot finish a sign-up without
 * being told why simply leaves.
 */
export function SignUpForm({ messages, mobileExample }: SignUpFormProps) {
  const t = messages.auth;
  const router = useRouter();
  const [refusal, setRefusal] = useState<string | null>(null);
  const inFlight = useRef(false);

  const form = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      fullName: '',
      email: '',
      mobile: '',
      password: '',
      confirmPassword: '',
    },
  });

  const { errors } = form.formState;

  async function onSubmit(input: SignUpInput): Promise<void> {
    setRefusal(null);
    const result = await signUpAction(input);

    if (!result.ok) {
      setRefusal(result.error.kind === 'CONFLICT' ? t.emailTaken : t.signUpFailed);
      return;
    }

    // Registering signs you in, so there is nowhere to send them but onward.
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
        id="fullName"
        label={t.nameLabel}
        error={errors.fullName === undefined ? undefined : t.nameInvalid}
      >
        {(aria) => <Input {...aria} autoComplete="name" {...form.register('fullName')} />}
      </Field>

      <Field
        id="signup-email"
        label={t.emailLabel}
        error={errors.email === undefined ? undefined : t.emailInvalid}
      >
        {(aria) => (
          <Input {...aria} type="email" autoComplete="email" {...form.register('email')} />
        )}
      </Field>

      <Field
        id="signup-mobile"
        label={t.mobileLabel}
        hint={mobileExample}
        error={errors.mobile === undefined ? undefined : t.mobileInvalid}
      >
        {(aria) => (
          <Input
            {...aria}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            {...form.register('mobile')}
          />
        )}
      </Field>

      <Field
        id="signup-password"
        label={t.passwordLabel}
        hint={t.passwordHint}
        error={errors.password === undefined ? undefined : t.passwordTooShort}
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
        id="confirmPassword"
        label={t.confirmPasswordLabel}
        error={errors.confirmPassword === undefined ? undefined : t.passwordsDiffer}
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

      {refusal === null ? null : (
        <p role="alert" className="text-danger-500 text-sm">
          {refusal}
        </p>
      )}

      <Button type="submit" size="lg" isLoading={form.formState.isSubmitting}>
        {t.signUpCta}
      </Button>

      <p className="text-fg-muted text-center text-xs">
        {t.haveAccount}{' '}
        <Link href={ROUTES.signIn} className="hover:text-fg underline">
          {t.signInCta}
        </Link>
      </p>
    </form>
  );
}
