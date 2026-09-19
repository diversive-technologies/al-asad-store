'use client';

import type { UseFormReturn } from 'react-hook-form';

import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import type { Messages } from '@/i18n/messages/en';

import type { SignUpInput } from '../schemas/auth.schema';

export interface SignUpPasswordFieldsProps {
  form: UseFormReturn<SignUpInput>;
  messages: Messages;
}

/**
 * The new password, twice. The confirmation exists to catch a typo and never
 * leaves the browser (SEC-01); a mismatch is reported on the confirm box, beside
 * the thing that has to change.
 */
export function SignUpPasswordFields({ form, messages }: SignUpPasswordFieldsProps) {
  const t = messages.auth;
  const { errors } = form.formState;

  return (
    <>
      <Field
        id="signup-password"
        label={t.passwordLabel}
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
        id="confirmPassword"
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
    </>
  );
}
