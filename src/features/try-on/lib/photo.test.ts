import { describe, expect, it } from 'vitest';

import type { TryOnOffer } from '../schemas/try-on.schema';
import { acceptAttribute, checkPhoto, maxPhotoMegabytes } from './photo';

const OFFER: TryOnOffer = {
  available: true,
  maxPhotoBytes: 8_000_000,
  acceptedFormats: ['image/jpeg', 'image/png', 'image/webp'],
};

describe('checkPhoto', () => {
  it('accepts a photo inside the offer', () => {
    const result = checkPhoto({ sizeBytes: 2_000_000, mimeType: 'image/jpeg' }, OFFER);

    expect(result.ok).toBe(true);
  });

  it('accepts the limit exactly, rejecting only above it', () => {
    expect(checkPhoto({ sizeBytes: 8_000_000, mimeType: 'image/png' }, OFFER).ok).toBe(true);
    expect(checkPhoto({ sizeBytes: 8_000_001, mimeType: 'image/png' }, OFFER).ok).toBe(false);
  });

  it('rejects an empty file before anything else', () => {
    const result = checkPhoto({ sizeBytes: 0, mimeType: 'image/jpeg' }, OFFER);

    expect(result).toEqual({ ok: false, error: 'EMPTY' });
  });

  it('rejects a format the backend did not offer', () => {
    const result = checkPhoto({ sizeBytes: 1_000, mimeType: 'image/avif' }, OFFER);

    expect(result).toEqual({ ok: false, error: 'WRONG_FORMAT' });
  });

  it('rejects a file that is not an image at all', () => {
    const result = checkPhoto({ sizeBytes: 1_000, mimeType: 'application/pdf' }, OFFER);

    expect(result).toEqual({ ok: false, error: 'WRONG_FORMAT' });
  });

  /*
   * The browser reports whatever the operating system said, and casing is not
   * guaranteed. Refusing over a capital letter would look identical, to the
   * customer, to refusing the wrong kind of file.
   */
  it('compares the type case-insensitively', () => {
    const result = checkPhoto({ sizeBytes: 1_000, mimeType: 'IMAGE/JPEG' }, OFFER);

    expect(result.ok).toBe(true);
  });

  /*
   * Order matters: a 20MB PDF is the wrong FORMAT, and telling someone to
   * compress it would send them to do something that could never work.
   */
  it('reports the wrong format ahead of the size when a file is both', () => {
    const result = checkPhoto({ sizeBytes: 20_000_000, mimeType: 'application/pdf' }, OFFER);

    expect(result).toEqual({ ok: false, error: 'WRONG_FORMAT' });
  });
});

describe('maxPhotoMegabytes', () => {
  it('reports whole decimal megabytes', () => {
    expect(maxPhotoMegabytes(OFFER)).toBe(8);
  });

  /*
   * Rounded DOWN. A limit quoted above the real one sends someone away to
   * compress a photo to a size that still gets refused.
   */
  it('rounds down rather than up', () => {
    expect(maxPhotoMegabytes({ ...OFFER, maxPhotoBytes: 8_900_000 })).toBe(8);
  });
});

describe('acceptAttribute', () => {
  it('builds the picker filter from the offer, not from a hard-coded list', () => {
    expect(acceptAttribute(OFFER)).toBe('image/jpeg,image/png,image/webp');
  });
});

/**
 * The entry is drawn whether or not the backend answered, so these cover the
 * case where it did not. Inventing a fallback ceiling would be a second copy of
 * a backend rule (DATA-13); not pre-checking is the honest alternative, and the
 * module still enforces either way.
 */
describe('checkPhoto with no offer', () => {
  it('accepts a file it has no limits to judge against', () => {
    expect(checkPhoto({ sizeBytes: 40_000_000, mimeType: 'image/heic' }, null).ok).toBe(true);
  });

  it('still refuses an empty file, which needs no limits to judge', () => {
    expect(checkPhoto({ sizeBytes: 0, mimeType: 'image/jpeg' }, null)).toEqual({
      ok: false,
      error: 'EMPTY',
    });
  });
});

describe('acceptAttribute with no offer', () => {
  it('narrows the picker to photographs without claiming which encodings', () => {
    expect(acceptAttribute(null)).toBe('image/*');
  });
});
