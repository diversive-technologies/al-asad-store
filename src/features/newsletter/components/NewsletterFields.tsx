import type { FormEvent, InputHTMLAttributes, Ref } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useMessages } from '@/i18n/use-messages';

const EMAIL_ID = 'newsletter-email';
const EMAIL_ERROR_ID = 'newsletter-email-error';

/** How the address field is wired: React Hook Form's `register`, or the stand-in's own. */
export interface NewsletterFieldBinding extends InputHTMLAttributes<HTMLInputElement> {
  readonly ref?: Ref<HTMLInputElement>;
}

export interface NewsletterFieldsProps {
  readonly field: NewsletterFieldBinding;
  readonly onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  readonly isSubmitting: boolean;
  /** The address was refused, by the check here or by the action. */
  readonly isInvalid: boolean;
  /** A failure that is not about the address; `null` when there is none. */
  readonly failure: string | null;
  /** The customer is reaching for the form: a pointer over it, a touch, focus inside it. */
  readonly onReach?: (() => void) | undefined;
}

/**
 * Section 28.4's newsletter form as it is DRAWN, and nothing else: the heading,
 * the one field, the button and what went wrong.
 *
 * It exists apart from its state because two components draw it — the form
 * (`NewsletterForm`, React Hook Form) and the stand-in the footer shows until
 * the form has been downloaded (`NewsletterSignup`) — and the two must draw
 * exactly the same thing (PD-01), so the swap between them is invisible.
 * Rendered inside their client boundary, so it needs no directive (MOD-06).
 *
 * FORM-05: the label is programmatically associated with the input, and the
 * field names its error when there is one. FORM-06: the button is busy and
 * disabled while a submission is in flight (`isLoading`).
 */
export function NewsletterFields({
  field,
  onSubmit,
  isSubmitting,
  isInvalid,
  failure,
  onReach,
}: NewsletterFieldsProps) {
  const t = useMessages();

  return (
    <form
      onSubmit={onSubmit}
      onPointerEnter={onReach}
      onTouchStart={onReach}
      onFocus={onReach}
      noValidate
      className="flex flex-col gap-2"
    >
      <h2 className="text-fg text-sm font-semibold">{t.newsletter.heading}</h2>
      <p className="text-fg-muted text-sm">{t.newsletter.body}</p>

      <label htmlFor={EMAIL_ID} className="sr-only">
        {t.newsletter.emailLabel}
      </label>

      <div className="flex gap-2">
        <Input
          id={EMAIL_ID}
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder={t.newsletter.emailPlaceholder}
          aria-invalid={isInvalid}
          aria-describedby={isInvalid ? EMAIL_ERROR_ID : undefined}
          {...field}
        />
        <Button type="submit" isLoading={isSubmitting} className="shrink-0">
          {t.newsletter.subscribeCta}
        </Button>
      </div>

      {isInvalid ? (
        <p id={EMAIL_ERROR_ID} role="alert" className="text-danger-500 text-sm">
          {t.newsletter.invalidEmail}
        </p>
      ) : null}

      {failure === null ? null : (
        <p role="alert" className="text-danger-500 text-sm">
          {failure}
        </p>
      )}
    </form>
  );
}
