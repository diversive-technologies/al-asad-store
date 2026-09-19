'use client';

import { useRef } from 'react';

import { Button } from '@/components/ui/button';
import { useSession } from '@/features/auth';
import type { Messages } from '@/i18n/messages/en';

import { useAddressBookEditing } from '../hooks/use-address-book-editing';
import { useAddresses } from '../hooks/use-addresses';
import { AddressBookRefusal } from './AddressBookRefusal';
import { AddressBookSignedOut } from './AddressBookSignedOut';
import { AddressCardList } from './AddressCardList';
import { AddressEditor } from './AddressEditor';

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
 *
 * What is open and where focus goes after a change is `useAddressBookEditing`;
 * `addButton` and `editorHeading` are the two places it can land.
 * What just happened is said in a `role="status"` line: a removed card simply
 * vanishes and a changed default simply moves, and a screen-reader user was told
 * neither — `status` rather than `alert`, because none of these interrupts.
 */
export function AddressBookScreen({ messages }: AddressBookScreenProps) {
  const t = messages.account;
  const { isSignedIn } = useSession();
  const book = useAddresses();
  const addButton = useRef<HTMLButtonElement>(null);
  const editorHeading = useRef<HTMLHeadingElement>(null);
  const page = useAddressBookEditing(book, messages, { addButton, editorHeading });
  const { editing } = page;

  if (!isSignedIn) return <AddressBookSignedOut messages={messages} />;
  if (!book.isReady) {
    return <p className="text-fg-muted py-16 text-sm">{messages.common.loading}</p>;
  }
  /* On file and never READ: "no saved addresses" would be a lie about their own
     record. An ENDED session is said as that, with the way back in. */
  if (book.isUnreadable) {
    if (book.hasSessionEnded) return <AddressBookSignedOut messages={messages} />;
    return <p className="text-fg-muted py-16 text-sm">{t.addressesUnavailable}</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <AddressCardList
        addresses={book.addresses}
        messages={messages}
        isBusy={book.isChanging}
        onEdit={page.edit}
        onRemove={page.remove}
        onMakeDefault={page.makeDefault}
      />

      <AddressBookRefusal
        failure={book.hasSessionEnded ? 'SIGNED_OUT' : book.failure}
        messages={messages}
      />
      <p role="status" className="text-fg-muted text-sm empty:hidden">
        {page.done}
      </p>

      {editing === null ? (
        <div>
          <Button ref={addButton} type="button" onClick={page.startAdding}>
            {t.addressAddCta}
          </Button>
        </div>
      ) : (
        <AddressEditor
          editing={editing}
          editable={
            editing.kind === 'ONE' ? book.addresses.find((a) => a.id === editing.id) : undefined
          }
          messages={messages}
          onSave={page.save}
          onCancel={page.cancel}
          headingRef={editorHeading}
        />
      )}
    </div>
  );
}
