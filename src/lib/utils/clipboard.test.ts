import { afterEach, describe, expect, it, vi } from 'vitest';

import { copyText } from './clipboard';

/**
 * The smallest document the selection fallback touches — enough to answer
 * whether the `copy` command ran and what was selected when it did.
 */
function fakeDocument(copyAnswer: () => boolean) {
  const selected: string[] = [];
  const holder = { textContent: '', className: '', setAttribute: vi.fn(), remove: vi.fn() };
  const selection = { removeAllRanges: vi.fn(), addRange: vi.fn() };

  return {
    selected,
    holder,
    document: {
      body: { append: vi.fn() },
      getSelection: () => selection,
      createElement: () => holder,
      createRange: () => ({
        selectNodeContents: (node: { textContent: string }) => {
          selected.push(node.textContent);
        },
      }),
      execCommand: vi.fn(copyAnswer),
    },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('copying text', () => {
  it('uses the Clipboard API where the browser offers it', async () => {
    const writeText = vi.fn(() => Promise.resolve());
    vi.stubGlobal('navigator', { clipboard: { writeText } });

    await expect(copyText('https://store.example/p')).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith('https://store.example/p');
  });

  it('falls back to selecting the text and copying it when the API refuses', async () => {
    const fake = fakeDocument(() => true);
    vi.stubGlobal('navigator', { clipboard: { writeText: () => Promise.reject(new Error('no')) } });
    vi.stubGlobal('document', fake.document);

    await expect(copyText('https://store.example/p')).resolves.toBe(true);
    expect(fake.selected).toEqual(['https://store.example/p']);
    expect(fake.holder.remove).toHaveBeenCalled();
  });

  it('falls back the same way where there is no Clipboard API at all, as over plain http', async () => {
    const fake = fakeDocument(() => true);
    vi.stubGlobal('navigator', {});
    vi.stubGlobal('document', fake.document);

    await expect(copyText('link')).resolves.toBe(true);
  });

  it.each([
    ['answers false', () => false],
    [
      'throws',
      () => {
        throw new Error('not supported');
      },
    ],
  ])('says it did NOT copy when the copy command %s, and cleans up', async (_case, answer) => {
    const fake = fakeDocument(answer);
    vi.stubGlobal('navigator', {});
    vi.stubGlobal('document', fake.document);

    await expect(copyText('link')).resolves.toBe(false);
    expect(fake.holder.remove).toHaveBeenCalled();
  });

  it('says it did NOT copy where neither way exists, as on the server', async () => {
    vi.stubGlobal('navigator', {});
    vi.stubGlobal('document', undefined);

    await expect(copyText('link')).resolves.toBe(false);
  });
});
