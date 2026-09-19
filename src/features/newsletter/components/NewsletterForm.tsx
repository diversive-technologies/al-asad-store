import { useEffect, useRef } from 'react';

import { useMessages } from '@/i18n/use-messages';

import { useNewsletterSubscribe } from '../hooks/use-newsletter-subscribe';
import type { NewsletterHandoff } from '../lib/handoff';
import { NewsletterFields } from './NewsletterFields';

export interface NewsletterFormProps {
  /** What the footer's stand-in held when this form took its place. */
  readonly handoff: NewsletterHandoff;
}

/**
 * Section 28.4 — newsletter capture.
 *
 * It holds form state, validates on the client and announces its own result;
 * the state is `useNewsletterSubscribe` and the markup `NewsletterFields`. It is
 * downloaded on demand and mounted by `NewsletterSignup`, inside that
 * component's client boundary, so it needs no directive of its own (MOD-06).
 *
 * When the stand-in was used before this arrived, the address typed there is
 * this form's starting value, focus comes back to the field, and a Subscribe
 * pressed there is sent from here — once: the latch holds it to one send,
 * because Strict Mode runs an effect twice.
 */
export function NewsletterForm({ handoff }: NewsletterFormProps) {
  const t = useMessages();
  const { form, isSubscribed, submit, warmUp } = useNewsletterSubscribe(handoff.email);
  const { errors, isSubmitting } = form.formState;
  const hasArrived = useRef(false);

  useEffect(() => {
    if (hasArrived.current) return;
    hasArrived.current = true;
    if (handoff.hadFocus) form.setFocus('email');
    if (handoff.wantsSubmit) submit();
  }, [handoff, form, submit]);

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
    <NewsletterFields
      field={{ ...form.register('email'), onFocus: warmUp }}
      onSubmit={submit}
      isSubmitting={isSubmitting}
      isInvalid={errors.email !== undefined}
      failure={errors.root?.message ?? null}
    />
  );
}
