'use client';

import { useEffect, useId } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { useLatchedSubmit } from '@/hooks/use-latched-submit';
import { useMessages } from '@/i18n/use-messages';
import { formatTemplate } from '@/lib/utils/format';

import {
  backInStockEmailFormSchema,
  type BackInStockEmailInput,
} from '../schemas/back-in-stock.schema';
import type { SoldOutSize } from '../types';

export interface BackInStockEmailFormProps {
  /** The sold-out size this address is for. */
  size: SoldOutSize;
  /** Sends the address; answers false when it was refused, so it goes back on the field. */
  onSend: (email: string) => Promise<boolean>;
  onCancel: () => void;
}

/**
 * The address a guest is written to when a sold-out size is back — and the one
 * an account with no address on file is asked for.
 *
 * FORM-01 / FORM-02 — one schema, the contract's own address rule, through React
 * Hook Form. FORM-03 — that is an affordance: the backend checks the address
 * again, and a refusal it sends comes back onto this field (FORM-04).
 *
 * FORM-06 — `useLatchedSubmit` makes a second submission impossible while one is
 * in flight. The button is `aria-busy` rather than disabled, because a disabled
 * button drops the keyboard focus it holds — the studio's Check and Save buttons
 * were fixed for exactly that.
 *
 * The form opens on a press, so the one thing it asks for takes focus — and again
 * when the size changes, because pressing another sold-out size re-aims this same
 * open form and keeps the address already typed.
 *
 * Nothing here says whether an address belongs to an account, and nothing here
 * suggests one should (§11).
 */
export function BackInStockEmailForm({ size, onSend, onCancel }: BackInStockEmailFormProps) {
  const messages = useMessages();
  const t = messages.backInStock;
  const id = useId();
  const leadId = `${id}-lead`;

  const form = useForm<BackInStockEmailInput>({
    resolver: zodResolver(backInStockEmailFormSchema),
    defaultValues: { email: '' },
  });

  const handleSubmit = useLatchedSubmit(form, async ({ email }) => {
    const isAccepted = await onSend(email);
    if (!isAccepted) form.setError('email', { message: t.invalidEmail }, { shouldFocus: true });
  });

  // DOM focus is the external system (STATE-04); see above for why it re-runs.
  useEffect(() => {
    form.setFocus('email');
  }, [form, size.id]);

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      aria-labelledby={leadId}
      className="flex flex-col gap-3"
    >
      <p id={leadId} className="text-fg text-sm">
        {formatTemplate(t.formLead, { size: size.label })}
      </p>

      <Field
        id={`${id}-email`}
        label={t.emailLabel}
        hint={t.emailHint}
        error={form.formState.errors.email === undefined ? undefined : t.invalidEmail}
      >
        {(aria) => (
          <Input
            {...aria}
            type="email"
            inputMode="email"
            autoComplete="email"
            {...form.register('email')}
          />
        )}
      </Field>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" aria-busy={form.formState.isSubmitting}>
          {t.submit}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          {messages.common.cancel}
        </Button>
      </div>
    </form>
  );
}
