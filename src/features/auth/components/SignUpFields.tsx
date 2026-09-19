'use client';

import type { UseFormReturn } from 'react-hook-form';

import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import type { Messages } from '@/i18n/messages/en';

import type { SignUpInput } from '../schemas/auth.schema';
import { SignUpPasswordFields } from './SignUpPasswordFields';

export interface SignUpFieldsProps {
  form: UseFormReturn<SignUpInput>;
  messages: Messages;
  mobileExample: string;
}

/**
 * The account, as the boxes that ask for it: a name to greet them by, an email to
 * authenticate with, a mobile for codes and order updates, and a password typed
 * twice (`SignUpPasswordFields`). FORM-05 through `Field`; every error is our copy.
 */
export function SignUpFields({ form, messages, mobileExample }: SignUpFieldsProps) {
  const t = messages.auth;
  const { errors } = form.formState;

  return (
    <>
      <Field id="fullName" label={t.nameLabel} error={errors.fullName ? t.nameInvalid : undefined}>
        {(aria) => <Input {...aria} autoComplete="name" {...form.register('fullName')} />}
      </Field>

      <Field
        id="signup-email"
        label={t.emailLabel}
        error={errors.email ? t.emailInvalid : undefined}
      >
        {(aria) => (
          <Input {...aria} type="email" autoComplete="email" {...form.register('email')} />
        )}
      </Field>

      <Field
        id="signup-mobile"
        label={t.mobileLabel}
        hint={mobileExample}
        error={errors.mobile ? t.mobileInvalid : undefined}
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

      <SignUpPasswordFields form={form} messages={messages} />
    </>
  );
}
