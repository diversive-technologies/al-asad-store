'use client';

import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { CLIENT } from '@/config/client';
import type { Messages } from '@/i18n/messages/en';
import { formatTemplate } from '@/lib/utils/format';

import { useOrderLookup } from '../hooks/use-order-lookup';
import type { Order } from '../schemas/checkout.schema';

export interface OrderLookupProps {
  orderNumber: string;
  messages: Messages;
  /** The order, once the backend has matched the mobile number to it. */
  onFound: (order: Order) => void;
}

/**
 * §28.3 — an order this browser cannot show who is asking for.
 *
 * An order number runs in sequence, so it is never enough to read the name,
 * address and measurements behind it. When no account and no token here is
 * recognised, the page asks for the mobile number the order was placed with, and
 * the BACKEND compares it — this component never holds the order's mobile.
 *
 * The page looks exactly the same for a number that names no order: saying which
 * numbers exist would turn this form into a way of walking the sequence.
 */
export function OrderLookup({ orderNumber, messages, onFound }: OrderLookupProps) {
  const t = messages.order;
  const { form, notice, isPending, onSubmit, warmUp } = useOrderLookup(
    orderNumber,
    { notFound: t.lookupNotFound, failed: t.lookupFailed },
    onFound,
  );
  const example = CLIENT.market.mobile.example;

  return (
    <section className="page-shell max-w-sm py-16">
      <h1 className="text-fg text-2xl font-semibold">{t.lookupHeading}</h1>
      <p className="text-fg-muted mt-3 text-sm">{t.lookupBody}</p>

      {/* FORM-02: the browser's own validation is off; Zod is the source (FORM-01). */}
      <form onSubmit={onSubmit} onFocus={warmUp} noValidate className="mt-6 flex flex-col gap-4">
        <Field
          id="order-lookup-mobile"
          label={messages.checkout.mobileLabel}
          error={
            form.formState.errors.mobile === undefined
              ? undefined
              : formatTemplate(messages.checkout.mobileInvalid, { example })
          }
        >
          {(aria) => (
            <Input
              {...aria}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              /* D5: the example comes from the client profile, beside the pattern
                 that validates it, so the two cannot drift. */
              placeholder={example}
              {...form.register('mobile')}
            />
          )}
        </Field>

        {/* Busy but ENABLED — the latch in `useOrderLookup` refuses a second press. */}
        <Button type="submit" size="lg" isBusy={isPending}>
          {t.lookupSubmit}
        </Button>

        {/* A11Y-05: the answer is announced, not only shown. */}
        <p role="alert" className="text-fg text-sm empty:hidden">
          {notice}
        </p>
      </form>
    </section>
  );
}
