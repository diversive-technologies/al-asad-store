'use client';

import type { RefObject } from 'react';

import type { Messages } from '@/i18n/messages/en';
import type { AddressDetail } from '@/lib/domain/address';

import type { AddressEditing } from '../hooks/use-address-book-editing';
import { detailOf } from '../lib/address-detail';
import type { SavedAddress } from '../schemas/address.schema';
import { AddressForm } from './AddressForm';

export interface AddressEditorProps {
  editing: AddressEditing;
  /** The address being corrected, when it is still in the book. */
  editable: SavedAddress | undefined;
  messages: Messages;
  onSave: (address: AddressDetail) => Promise<boolean>;
  onCancel: () => void;
  /** Takes focus when the form opens, so a keyboard user lands IN it (A11Y-05). */
  headingRef: RefObject<HTMLHeadingElement | null>;
}

/**
 * The open form under the book: its heading, and the form for what is being edited.
 *
 * The heading is focusable by the page and never in the tab order (`tabIndex
 * -1`): pressing "Add an address" — which the form replaces — or a card's Edit
 * puts focus here, where the form begins.
 */
export function AddressEditor({
  editing,
  editable,
  messages,
  onSave,
  onCancel,
  headingRef,
}: AddressEditorProps) {
  const t = messages.account;

  return (
    <div className="border-border rounded-card flex flex-col gap-4 border p-4">
      <h2 ref={headingRef} tabIndex={-1} className="text-fg text-lg font-medium">
        {editing.kind === 'NEW' ? t.addressAddHeading : t.addressEditHeading}
      </h2>
      <AddressForm
        /*
         * KEYED, and it is load-bearing. `AddressForm` hands `initial` to `useForm`
         * as `defaultValues`, which React Hook Form reads once at mount — so
         * pressing Edit on a SECOND address while the form was open reconciled it
         * in place and left the FIRST address's four values on screen. Saving then
         * wrote them over the second address, which left the book holding two
         * identical entries and the real one reachable only in history.
         */
        key={editing.kind === 'ONE' ? editing.id : 'new'}
        messages={messages}
        /* A correction carries the address's own id, so the book gives it a new
           VERSION rather than a second entry (D6). */
        initial={editable === undefined ? undefined : detailOf(editable)}
        onSave={onSave}
        onCancel={onCancel}
      />
    </div>
  );
}
