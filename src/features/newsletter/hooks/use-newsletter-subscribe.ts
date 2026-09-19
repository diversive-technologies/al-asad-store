'use client';

import { useState, type FormEvent } from 'react';

import { useForm, type UseFormReturn } from 'react-hook-form';

import { useMessages } from '@/i18n/use-messages';
import type { ApiError } from '@/lib/api/errors';
import { onDemandResolver } from '@/lib/utils/on-demand-resolver';

import { subscribeToNewsletterAction } from '../actions';
import type { NewsletterSubscribeInput } from '../schemas/newsletter.schema';

/*
 * Deliberate code split (IMP-01a, PERF-10): this form is in the footer of every
 * route, and its validation is fetched when the field is first focused rather
 * than with each page (`onDemandResolver` has the reasoning).
 */
const validation = onDemandResolver<NewsletterSubscribeInput>(() =>
  Promise.all([import('@hookform/resolvers/zod'), import('../schemas/newsletter.schema')]).then(
    ([{ zodResolver }, { newsletterSubscribeSchema }]) => zodResolver(newsletterSubscribeSchema),
  ),
);

/** Starts the validation's download; the footer's stand-in calls it when its field is focused. */
export function warmNewsletterValidation(): void {
  validation.warmUp();
}

export interface NewsletterSubscribe {
  readonly form: UseFormReturn<NewsletterSubscribeInput>;
  /** The address is on the list, so the form gives way to the confirmation. */
  readonly isSubscribed: boolean;
  /** Sends the form; without an event when the press it answers was made on the stand-in. */
  readonly submit: (event?: FormEvent<HTMLFormElement>) => void;
  /** Starts the validation's download; called when the field is first focused. */
  readonly warmUp: () => void;
}

/**
 * Section 28.4's newsletter capture, as state — the form that draws it is
 * `NewsletterForm` (MOD-05).
 *
 * FORM-01/FORM-02: one schema through React Hook Form. ERR-02: the action returns
 * a Result, so a refusal is a value, mapped onto the field it is about (FORM-04)
 * or onto the form when it is not about the address at all.
 *
 * `initialEmail` is what was typed into the footer's stand-in before this form
 * arrived (`NewsletterSignup`), so nothing typed is lost when the form takes its
 * place.
 */
export function useNewsletterSubscribe(initialEmail = ''): NewsletterSubscribe {
  const t = useMessages();
  const [isSubscribed, setIsSubscribed] = useState(false);

  const form = useForm<NewsletterSubscribeInput>({
    resolver: validation.resolver,
    ...(initialEmail === '' ? {} : { defaultValues: { email: initialEmail } }),
  });

  function handleFailure(error: ApiError): void {
    // ERR-11: the backend's own message is never rendered; copy comes from SSOT-07.
    if (error.kind !== 'VALIDATION') {
      form.setError('root', { message: t.errors.network });
      return;
    }
    // FORM-04: server-side field errors map back onto the field that caused them.
    form.setError('email', { message: t.newsletter.invalidEmail });
  }

  async function onSubmit(input: NewsletterSubscribeInput): Promise<void> {
    const result = await subscribeToNewsletterAction(input);
    if (result.ok) setIsSubscribed(true);
    else handleFailure(result.error);
  }

  return {
    form,
    isSubscribed,
    submit: (event) => {
      void form.handleSubmit(onSubmit)(event);
    },
    warmUp: warmNewsletterValidation,
  };
}
