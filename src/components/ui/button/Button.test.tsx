import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { Button } from './Button';

/**
 * TEST-08 — F12: `isLoading` DISABLES the button, and a disabled button drops
 * the keyboard focus it holds — Place order, Show my order, Apply and Add to bag
 * each threw a keyboard user to the top of the page while in flight. `isBusy`
 * says the same thing and keeps the button, for a control whose handler already
 * refuses a second press.
 */

/** The attribute itself — the class list names `disabled:` variants too. */
const DISABLED = 'disabled=""';

describe('Button in flight', () => {
  it('stays enabled and says busy with `isBusy`', () => {
    const markup = renderToStaticMarkup(<Button isBusy>Place order</Button>);

    expect(markup).toContain('aria-busy="true"');
    expect(markup).not.toContain(DISABLED);
    expect(markup).toContain('animate-spin');
  });

  it('is disabled and busy with `isLoading`', () => {
    const markup = renderToStaticMarkup(<Button isLoading>Submit</Button>);

    expect(markup).toContain('aria-busy="true"');
    expect(markup).toContain(DISABLED);
  });

  it('is neither when idle', () => {
    const markup = renderToStaticMarkup(<Button>Submit</Button>);

    expect(markup).toContain('aria-busy="false"');
    expect(markup).not.toContain(DISABLED);
  });
});
