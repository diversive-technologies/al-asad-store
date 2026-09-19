import type { ReactNode } from 'react';

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { onDemandPart } from '@/hooks/use-on-demand';
import { en, type Messages } from '@/i18n/messages/en';
import { ur } from '@/i18n/messages/ur';
import { MessagesProvider } from '@/i18n/use-messages';

import { OnDemand } from './OnDemand';
import { OnDemandFailure } from './OnDemandFailure';

function render(node: ReactNode, messages: Messages = en): string {
  return renderToStaticMarkup(<MessagesProvider value={messages}>{node}</MessagesProvider>);
}

/**
 * TEST-08 — what stands in the place of a part whose code could not be
 * downloaded. It used to be nothing of the part's own: `next/dynamic` threw to
 * the nearest error boundary, which replaced the studio, or the whole store.
 */
describe('the notice in place of a part that could not be downloaded', () => {
  it.each<[string, Messages]>([
    ['English', en],
    ['Urdu', ur],
  ])('says so as an alert, with a real Try again button, in %s', (_language, messages) => {
    const markup = render(<OnDemandFailure onRetry={() => undefined} />, messages);

    expect(markup).toContain(`<p role="alert"`);
    expect(markup).toContain(messages.common.partUnavailable);
    expect(markup).toMatch(
      new RegExp(`<button [^>]*type="button"[^>]*>${messages.common.retry}</button>`),
    );
  });

  it('offers another way on beside Try again, when the surface has one', () => {
    const markup = render(
      <OnDemandFailure onRetry={() => undefined}>
        <button type="button">Back to the fields</button>
      </OnDemandFailure>,
    );

    expect(markup).toContain('Back to the fields');
  });
});

describe('a part drawn on demand', () => {
  it('stands in with what the surface asked for until it has arrived — on the server as well', async () => {
    const part = onDemandPart(() => Promise.resolve('the review'));
    await part.get();

    // The server has downloaded nothing, so a hydrating page draws what it drew.
    const markup = render(
      <OnDemand part={part} loading={<p>Loading…</p>}>
        {(arrived) => <p>{arrived}</p>}
      </OnDemand>,
    );

    expect(markup).toBe('<p>Loading…</p>');
  });
});
