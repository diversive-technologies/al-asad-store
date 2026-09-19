'use client';

import { useState, type RefObject } from 'react';

import { flushSync } from 'react-dom';

import type { Messages } from '@/i18n/messages/en';
import type { AddressDetail } from '@/lib/domain/address';

import type { AddressBookState } from './use-addresses';

/** Adding a new address, or correcting the one with this id. */
export type AddressEditing =
  { readonly kind: 'NEW' } | { readonly kind: 'ONE'; readonly id: string };

export interface AddressBookEditing {
  /** What the form is open on, or `null` when it is closed. */
  readonly editing: AddressEditing | null;
  /** What the last change did, for the `role="status"` line. */
  readonly done: string | null;
  readonly startAdding: () => void;
  readonly edit: (addressId: string) => void;
  readonly cancel: () => void;
  readonly remove: (addressId: string) => void;
  readonly makeDefault: (addressId: string) => void;
  /** Answers true once the book has taken it, and closes the form when it has. */
  readonly save: (address: AddressDetail) => Promise<boolean>;
}

/** Where focus lands: "Add an address" while the form is closed, its heading while open. */
export interface AddressBookLandings {
  readonly addButton: RefObject<HTMLButtonElement | null>;
  readonly editorHeading: RefObject<HTMLHeadingElement | null>;
}

/**
 * The managed book's own state: which form is open, what just happened, and
 * where focus goes afterwards (A11Y-05, WCAG 2.4.3).
 *
 * Every control that changes the book is REMOVED by its own success — a removed
 * card unmounts, "Add an address" gives way to the form, and the form closes on
 * save or cancel — and the browser then drops focus to `<body>`. So focus is put
 * somewhere deliberately, on whichever of the two LANDINGS exists: the form's
 * heading while it is open, "Add an address" while it is not. Exactly one of them
 * is mounted at a time, which is why "the one that is always there" used to fail:
 * it was never there while the form was open.
 *
 * Opening and closing the form go through `flushSync` for the reason
 * `useMoveToBag` does: the landing has to be IN the document before it can take
 * focus, and a state update is not flushed until later. The refs are the
 * screen's own, since a ref handed back inside this hook's answer would make every
 * field of it a ref read during render (react-hooks/refs).
 */
export function useAddressBookEditing(
  book: AddressBookState,
  messages: Messages,
  landings: AddressBookLandings,
): AddressBookEditing {
  const t = messages.account;
  const [editing, setEditing] = useState<AddressEditing | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const land = (): void => {
    (landings.editorHeading.current ?? landings.addButton.current)?.focus();
  };

  /** Opens or closes the form NOW, so the landing that follows exists to take focus. */
  const settle = (next: AddressEditing | null): void => {
    flushSync(() => {
      setEditing(next);
    });
    land();
  };

  const after = (note: string) => (ok: boolean) => {
    if (!ok) return;
    setDone(note);
    land();
  };

  return {
    editing,
    done,
    startAdding: () => {
      setDone(null);
      settle({ kind: 'NEW' });
    },
    edit: (addressId) => {
      settle({ kind: 'ONE', id: addressId });
    },
    cancel: () => {
      settle(null);
    },
    remove: (addressId) => {
      void book.remove(addressId).then(after(t.addressRemovedStatus));
    },
    makeDefault: (addressId) => {
      void book.makeDefault(addressId).then(after(t.addressDefaultStatus));
    },
    save: async (address) => {
      const saved = await book.save(address, editing?.kind === 'ONE' ? editing.id : undefined);
      if (!saved) return false;
      setDone(t.addressSavedStatus);
      settle(null);
      return true;
    },
  };
}
