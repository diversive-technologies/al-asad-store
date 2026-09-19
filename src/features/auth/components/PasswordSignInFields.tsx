'use client';

import type { UseFormReturn } from 'react-hook-form';

import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import type { Messages } from '@/i18n/messages/en';

import type { PasswordSignInInput } from '../schemas/auth.schema';

export interface PasswordSignInFieldsProps {
  form: UseFormReturn<PasswordSignInInput>;
  messages: Messages;
}

/** The email and password boxes of §11 `authenticate`, wired through `Field` (FORM-05). */
export function PasswordSignInFields({ form, messages }: PasswordSignInFieldsProps) {
  const t = messages.auth;
  const { errors } = form.formState;

  return (
    <>
      <Field id="email" label={t.emailLabel} error={errors.email ? t.emailInvalid : undefined}>
        {(aria) => (
          <Input {...aria} type="email" autoComplete="email" {...form.register('email')} />
        )}
      </Field>

      <Field
        id="password"
        label={t.passwordLabel}
        error={errors.password ? t.passwordTooShort : undefined}
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
    </>
  );
}
