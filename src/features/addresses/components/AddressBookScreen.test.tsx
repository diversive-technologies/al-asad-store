import { createRef } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { ROUTES } from '@/config/routes';
import { accountKeyOf, SessionProvider } from '@/features/auth';
import { en } from '@/i18n/messages/en';
import { ur } from '@/i18n/messages/ur';
import { queryKeys } from '@/lib/api/query-keys';
import { formatTemplate } from '@/lib/utils/format';

import type { AddressBookError } from '../api/addresses-browser';
import { savedAddressSchema, type AddressBook } from '../schemas/address.schema';
import { AddressBookScreen } from './AddressBookScreen';
import { AddressEditor } from './AddressEditor';
import { SavedAddressOption } from './SavedAddressOption';

const SESSION = {
  displayName: 'Test Customer',
  email: 'customer@example.com',
  mobile: '03001234567',
};

const HOME = savedAddressSchema.parse({
  id: '00000000-0000-4000-8000-00000000a001',
  recipientName: 'Ayesha Khan',
  recipientMobile: '03001234567',
  line: '12 Example Street, Block A',
  city: 'Lahore',
  savedAt: '2026-09-17T10:00:00.000Z',
  isDefault: true,
});

const WORK = savedAddressSchema.parse({
  ...HOME,
  id: '00000000-0000-4000-8000-00000000a002',
  recipientName: 'Bilal Ahmed',
  line: '4 Canal Road, Gulberg',
  isDefault: false,
});

const BOOK: AddressBook = { addresses: [HOME, WORK] };

/**
 * The book's cache entry as a render would find it: READ (`book`), and then
 * whether the last read FAILED (`error`). A failed read after a good one keeps
 * the book — TanStack marks the query errored and leaves its data in place —
 * which is the state a refused change's follow-up read leaves behind.
 */
function clientHolding(book: AddressBook | undefined, error: AddressBookError | null) {
  // `retryOnMount: false`, so a render reads the state as seeded rather than as refetching.
  const client = new QueryClient({ defaultOptions: { queries: { retryOnMount: false } } });
  const key = queryKeys.account.addresses(accountKeyOf(SESSION));
  const query = client
    .getQueryCache()
    .build<AddressBook, AddressBookError>(client, { queryKey: key });

  query.setState({
    ...query.state,
    data: book,
    dataUpdatedAt: book === undefined ? 0 : Date.now(),
    error,
    errorUpdatedAt: error === null ? 0 : Date.now(),
    status: error === null ? 'success' : 'error',
    fetchStatus: 'idle',
  });
  return client;
}

function screenWith(book: AddressBook | undefined, error: AddressBookError | null): string {
  return renderToStaticMarkup(
    <QueryClientProvider client={clientHolding(book, error)}>
      <SessionProvider session={SESSION}>
        <AddressBookScreen messages={en} />
      </SessionProvider>
    </QueryClientProvider>,
  );
}

const SIGN_IN_HERE = `href="${ROUTES.signInFrom(ROUTES.accountAddresses).replaceAll('&', '&amp;')}"`;

/*
 * F3 — every refused change asks the server again. When that read failed too,
 * the whole book gave way to "try again in a moment" — the refusal went with it,
 * and a session that had ENDED was told to retry something that could never work.
 */
describe('the address book when a read fails', () => {
  it('keeps the book on screen when a read after it has been read fails', () => {
    const markup = screenWith(BOOK, { kind: 'UNREACHABLE' });

    expect(markup).toContain(HOME.recipientName);
    expect(markup).toContain(WORK.recipientName);
    expect(markup).toContain(en.account.addressAddCta);
    expect(markup).not.toContain(en.account.addressesUnavailable);
  });

  it('says the session has ended, and offers the way back in, beside the book', () => {
    const markup = screenWith(BOOK, { kind: 'SIGNED_OUT' });

    expect(markup).toContain(HOME.recipientName);
    expect(markup).toContain(en.account.addressesSignedOut);
    expect(markup).toContain(SIGN_IN_HERE);
  });

  it('says a book it could never read is out of reach, not empty', () => {
    const markup = screenWith(undefined, { kind: 'UNREACHABLE' });

    expect(markup).toContain(en.account.addressesUnavailable);
    expect(markup).not.toContain(en.account.addressesEmpty);
  });

  it('offers sign-in, not "try again", when the first read finds the session ended', () => {
    const markup = screenWith(undefined, { kind: 'SIGNED_OUT' });

    expect(markup).toContain(en.account.addressesGuestHeading);
    expect(markup).toContain(SIGN_IN_HERE);
    expect(markup).not.toContain(en.account.addressesUnavailable);
  });
});

/* F8 — A11Y-04: three cards used to read "Edit, Make default, Remove" three times. */
describe('the buttons on each card', () => {
  const markup = screenWith(BOOK, null);

  it.each([
    [en.account.addressEditLabel, HOME],
    [en.account.addressEditLabel, WORK],
    [en.account.addressRemoveLabel, HOME],
    [en.account.addressRemoveLabel, WORK],
    [en.account.addressMakeDefaultLabel, WORK],
  ])('name the address they act on (%s)', (label, address) => {
    const name = formatTemplate(label, { recipient: address.recipientName, line: address.line });
    expect(markup).toContain(`aria-label="${name}"`);
  });

  it('start with the word on screen, so a voice user can say what they see', () => {
    expect(en.account.addressEditLabel.startsWith(en.account.addressEdit)).toBe(true);
    expect(en.account.addressRemoveLabel.startsWith(en.account.addressRemove)).toBe(true);
    expect(en.account.addressMakeDefaultLabel.startsWith(en.account.addressMakeDefault)).toBe(true);
  });
});

/*
 * F4 — pressing "Add an address" replaces it with the form, so focus has to land
 * IN the form: its heading takes it, and only the page can put it there.
 */
describe('the open form', () => {
  it('has a heading the page can focus and the Tab key does not stop on', () => {
    const markup = renderToStaticMarkup(
      <QueryClientProvider client={new QueryClient()}>
        <AddressEditor
          editing={{ kind: 'NEW' }}
          editable={undefined}
          messages={en}
          onSave={() => Promise.resolve(true)}
          onCancel={() => undefined}
          headingRef={createRef()}
        />
      </QueryClientProvider>,
    );

    expect(markup).toContain(`<h2 tabindex="-1"`);
  });
});

/* F12 — I18N-01 / I18N-06: the checkout picker's separator is the language's own. */
describe('a saved address in the checkout picker', () => {
  it.each([
    ['English', en, `${HOME.line}, ${HOME.city}`],
    ['Urdu', ur, `${HOME.line}، ${HOME.city}`],
  ])('joins the line and the city in %s', (_language, messages, expected) => {
    const markup = renderToStaticMarkup(
      <SavedAddressOption
        address={HOME}
        isChosen={false}
        onChoose={() => undefined}
        messages={messages}
      />,
    );

    expect(markup).toContain(expected);
  });
});
