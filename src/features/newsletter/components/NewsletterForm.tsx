'use client';

import { useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useMessages } from '@/i18n/use-messages';
import type { ApiError } from '@/lib/api/errors';

import { subscribeToNewsletterAction } from '../actions';
import {
  newsletterSubscribeSchema,
  type NewsletterSubscribeInput,
} from '../schemas/newsletter.schema';

/**
 * Section 28.4 — newsletter capture.
 *
 * PERF-01: this is the only client component in the footer, and it earns the
 * boundary — it holds form state, validates on the client, and announces its
 * own result.
 */
export function NewsletterForm() {
  const t = useMessages();
  const [isSubscribed, setIsSubscribed] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<NewsletterSubscribeInput>({
    resolver: zodResolver(newsletterSubscribeSchema),
  });

  function handleFailure(error: ApiError): void {
    // ERR-11: the backend's own message is never rendered; copy comes from SSOT-07.
    if (error.kind !== 'VALIDATION') {
      setError('root', { message: t.errors.network });
      return;
    }
    // FORM-04: server-side field errors map back onto the field that caused them.
    setError('email', { message: t.newsletter.invalidEmail });
  }

  async function onSubmit(input: NewsletterSubscribeInput): Promise<void> {
    // ERR-02: the action returns a Result; the failure path is a value.
    const result = await subscribeToNewsletterAction(input);

    if (!result.ok) {
      handleFailure(result.error);
      return;
    }

    setIsSubscribed(true);
  }

  if (isSubscribed) {
    return (
      <div className="flex flex-col gap-2">
        <h2 className="text-fg text-sm font-semibold">{t.newsletter.heading}</h2>
        {/* A11Y-05: the outcome is announced, not just shown. */}
        <p role="status" className="text-fg-muted text-sm">
          {t.newsletter.successMessage}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-2">
      <h2 className="text-fg text-sm font-semibold">{t.newsletter.heading}</h2>
      <p className="text-fg-muted text-sm">{t.newsletter.body}</p>

      {/* FORM-05: the label is programmatically associated with the input. */}
      <label htmlFor="newsletter-email" className="sr-only">
        {t.newsletter.emailLabel}
      </label>

      <div className="flex gap-2">
        <Input
          id="newsletter-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder={t.newsletter.emailPlaceholder}
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? 'newsletter-email-error' : undefined}
          {...register('email')}
        />
        {/* FORM-06: disabled and aria-busy in flight, so double submission cannot happen. */}
        <Button type="submit" isLoading={isSubmitting} className="shrink-0">
          {t.newsletter.subscribeCta}
        </Button>
      </div>

      {errors.email ? (
        <p id="newsletter-email-error" role="alert" className="text-danger-500 text-sm">
          {t.newsletter.invalidEmail}
        </p>
      ) : null}

      {errors.root ? (
        <p role="alert" className="text-danger-500 text-sm">
          {errors.root.message}
        </p>
      ) : null}
    </form>
  );
}
