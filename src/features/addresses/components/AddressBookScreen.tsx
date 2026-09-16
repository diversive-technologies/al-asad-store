'use client';

import { useRef, useState } from 'react';

import { Button, ButtonLink } from '@/components/ui/button';
import { ROUTES } from '@/config/routes';
import { useSession } from '@/features/auth';
import type { Messages } from '@/i18n/messages/en';
import type { AddressDetail } from '@/lib/domain/address';

import { useAddresses } from '../hooks/use-addresses';
import { addressRefusal } from '../lib/address-refusal';
import { AddressCard } from './AddressCard';
import { AddressForm } from './AddressForm';

/** Nothing open, adding a new one, or correcting the one with this id. */
type Editing =
  | { readonly kind: 'NONE' }
  | { readonly kind: 'NEW' }
  | { readonly kind: 'ONE'; readonly id: string };

export interface AddressBookScreenProps {
  messages: Messages;
}

/**
 * §28.3's address book, managed.
 *
 * A CLIENT screen, unlike the rest of the account area, and deliberately on its
 * OWN page rather than inside `/account`: this one has a form, and `/account`
 * is a page somebody opens to read. Keeping the writing here leaves that page
 * shipping no JavaScript at all.
 *
 * It is offered only to a SIGNED-IN customer, because §2.1 gives saved
 * addresses to the Customer and withholds them from the Visitor. A guest still
 * checks out (§28.2); they type the address, which is what they would do here.
 */
export function AddressBookScreen({ messages }: AddressBookScreenProps) {
  const t = messages.account;
  const { isSignedIn } = useSession();
  const book = useAddresses();
  const [editing, setEditing] = useState<Editing>({ kind: 'NONE' });
  const [done, setDone] = useState<string | null>(null);
  /*
   * A11Y-05 — where focus goes after a change.
   *
   * Every control that changes the book is REMOVED by its own success: a
   * removed card unmounts, and the form closes on save. The browser then drops
   * focus to `<body>`, so the next Tab starts at the top of the document. This
   * is the one control that is always there to take it.
   */
  const addButton = useRef<HTMLButtonElement>(null);

  const after = (note: string) => (ok: boolean) => {
    if (!ok) return;
    setDone(note);
    addButton.current?.focus();
  };

  if (!isSignedIn) {
    return (
      <div className="flex flex-col items-start gap-3 py-16">
        <h2 className="text-fg text-lg font-medium">{t.addressesGuestHeading}</h2>
        <p className="text-fg-muted">{t.addressesGuestBody}</p>
        <ButtonLink href={ROUTES.signIn} variant="primary">
          {messages.auth.signInCta}
        </ButtonLink>
      </div>
    );
  }

  if (!book.isReady) {
    return <p className="text-fg-muted py-16 text-sm">{messages.common.loading}</p>;
  }

  /* The book is on file and could not be READ. Said as such: telling a customer
     they have no saved addresses because a request failed is a lie about their
     own record. */
  if (book.isUnreadable) {
    return <p className="text-fg-muted py-16 text-sm">{t.addressesUnavailable}</p>;
  }

  const editable =
    editing.kind === 'ONE' ? book.addresses.find((a) => a.id === editing.id) : undefined;

  return (
    <div className="flex flex-col gap-6">
      {book.addresses.length === 0 ? (
        <p className="text-fg-muted">{t.addressesEmpty}</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {book.addresses.map((address) => (
            <AddressCard
              key={address.id}
              address={address}
              messages={messages}
              isBusy={book.isChanging}
              onEdit={() => {
                setEditing({ kind: 'ONE', id: address.id });
              }}
              onRemove={() => {
                void book.remove(address.id).then(after(t.addressRemovedStatus));
              }}
              onMakeDefault={() => {
                void book.makeDefault(address.id).then(after(t.addressDefaultStatus));
              }}
            />
          ))}
        </ul>
      )}

      {/* A11Y-05 / ERR-04: a refusal is announced, not only shown. */}
      <p role="alert" className="text-danger-500 text-sm empty:hidden">
        {book.failure === null ? null : addressRefusal(book.failure, t)}
      </p>

      {/*
       * A11Y-05 — what just happened, said out loud. A removed card simply
       * vanishes and a changed default simply moves; a screen-reader user was
       * told neither. `role="status"` rather than `alert`, because none of
       * these interrupts anything.
       */}
      <p role="status" className="text-fg-muted text-sm empty:hidden">
        {done}
      </p>

      {editing.kind === 'NONE' ? (
        <div>
          <Button
            ref={addButton}
            type="button"
            onClick={() => {
              setDone(null);
              setEditing({ kind: 'NEW' });
            }}
          >
            {t.addressAddCta}
          </Button>
        </div>
      ) : (
        <div className="border-border rounded-card flex flex-col gap-4 border p-4">
          <h2 className="text-fg text-lg font-medium">
            {editing.kind === 'NEW' ? t.addressAddHeading : t.addressEditHeading}
          </h2>
          <AddressForm
            /*
             * KEYED, and it is load-bearing. `AddressForm` hands `initial` to
             * `useForm` as `defaultValues`, which React Hook Form reads once at
             * mount — and both branches of this ternary render the same element
             * at the same position, so pressing Edit on a SECOND address while
             * the form was open reconciled it in place and left the FIRST
             * address's four values on screen. Saving then wrote them over the
             * second address, which left the book holding two identical entries
             * and the real one reachable only in history.
             */
            key={editing.kind === 'ONE' ? editing.id : 'new'}
            messages={messages}
            /* A correction carries the address's own id, so the book gives it a
               new VERSION rather than a second entry (D6). */
            initial={editable === undefined ? undefined : detailOf(editable)}
            onSave={async (address) => {
              const saved = await book.save(
                address,
                editing.kind === 'ONE' ? editing.id : undefined,
              );
              if (saved) setEditing({ kind: 'NONE' });
              /* The form is gone by the time this runs, so focus has to be put
                 somewhere deliberately rather than left on an unmounted node. */
              after(t.addressSavedStatus)(saved);
              return saved;
            }}
            onCancel={() => {
              setEditing({ kind: 'NONE' });
            }}
          />
        </div>
      )}
    </div>
  );
}

/** The four fields the form edits, without the book's own bookkeeping. */
function detailOf(address: AddressDetail): AddressDetail {
  return {
    recipientName: address.recipientName,
    recipientMobile: address.recipientMobile,
    line: address.line,
    city: address.city,
  };
}
