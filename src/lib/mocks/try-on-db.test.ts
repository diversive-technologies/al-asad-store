import sharp from 'sharp';
import { beforeEach, describe, expect, it } from 'vitest';

import { CATALOGUE } from './catalogue-db';
import {
  correctWhiteBalance,
  findTryOnProduct,
  generateTryOn,
  resetTryOnSessions,
  tryOnOffer,
  tryOnSessions,
} from './try-on-db';

/**
 * Architecture §24's invariants, tested rather than asserted in a comment.
 *
 * The two that matter most are the ones a later edit could quietly break: that
 * the module retains nothing of the customer's photograph, and that with no
 * provider configured it reports unavailable instead of pretending.
 *
 * There is deliberately no test of a SUCCESSFUL generation here. Success
 * requires a real provider and a real credential, and a test that stubbed the
 * port to return a canned image would be asserting that the stub works. The
 * live path is exercised against the running store instead.
 */

/** A small scene with two tones, so grey-world has something to work on. */
async function scene(): Promise<Buffer> {
  const base = sharp({
    create: { width: 64, height: 64, channels: 3, background: { r: 120, g: 120, b: 120 } },
  });

  const patch = await sharp({
    create: { width: 32, height: 64, channels: 3, background: { r: 168, g: 168, b: 168 } },
  })
    .png()
    .toBuffer();

  return base
    .composite([{ input: patch, left: 0, top: 0 }])
    .jpeg()
    .toBuffer();
}

async function channelMeans(image: Buffer): Promise<number[]> {
  const { channels } = await sharp(image).stats();
  return channels.slice(0, 3).map((channel) => channel.mean);
}

function spread(means: number[]): number {
  return Math.max(...means) - Math.min(...means);
}

describe('tryOnOffer — §24 isAvailable()', () => {
  /*
   * The default state of this repository, and the one §28.5 describes: the
   * whole interface is built and no provider is connected. It has to be
   * reported honestly, because the alternative is a button that cannot work.
   */
  it('reports unavailable when no provider is configured and no sample is offered', () => {
    expect(tryOnOffer({ sampleWhenUnconfigured: false }).available).toBe(false);
  });

  /*
   * The offer and the generation must never disagree. A panel told the feature
   * was off, which then produced an image, is a worse state than either.
   */
  it('reports available when the sample is what a generation will return', () => {
    expect(tryOnOffer({ sampleWhenUnconfigured: true }).available).toBe(true);
  });

  /*
   * The limits are stated even while unavailable. They are the backend's rules,
   * and a client that had to hard-code a fallback ceiling would be holding a
   * second copy of one (DATA-13).
   */
  it('still states the upload constraints it enforces', () => {
    const offer = tryOnOffer({ sampleWhenUnconfigured: false });

    expect(offer.maxPhotoBytes).toBeGreaterThan(0);
    expect(offer.acceptedFormats.length).toBeGreaterThan(0);
  });

  /*
   * The catalogue is stored as AVIF and the provider does not accept it.
   * Offering it would take a photo this module could then never use.
   */
  it('does not offer a format the provider cannot read', () => {
    expect(tryOnOffer({ sampleWhenUnconfigured: false }).acceptedFormats).not.toContain(
      'image/avif',
    );
  });
});

describe('correctWhiteBalance — the §24 correction step', () => {
  it('neutralises a warm cast', async () => {
    const neutral = await scene();

    // A tungsten-lit room, approximately: red lifted, blue suppressed.
    const cast = await sharp(neutral).linear([1.25, 1.0, 0.72], [0, 0, 0]).jpeg().toBuffer();

    const before = spread(await channelMeans(cast));
    const corrected = await correctWhiteBalance({ bytes: cast, mimeType: 'image/jpeg' });

    expect(corrected).not.toBeNull();
    if (corrected === null) return;

    const after = spread(await channelMeans(Buffer.from(corrected.bytes)));

    expect(before).toBeGreaterThan(30);
    expect(after).toBeLessThan(2);
  });

  it('normalises to a format the provider accepts', async () => {
    const corrected = await correctWhiteBalance({ bytes: await scene(), mimeType: 'image/jpeg' });

    expect(corrected?.mimeType).toBe('image/jpeg');
  });

  /*
   * A phone photograph is several times larger on its long edge than the model
   * uses, and the difference is paid for in latency on a connection §30.1 is
   * explicitly sensitive about.
   */
  it('caps the long edge before anything is sent', async () => {
    const large = await sharp({
      create: { width: 3000, height: 2000, channels: 3, background: { r: 90, g: 110, b: 130 } },
    })
      .jpeg()
      .toBuffer();

    const corrected = await correctWhiteBalance({ bytes: large, mimeType: 'image/jpeg' });
    const metadata = await sharp(Buffer.from(corrected?.bytes ?? new Uint8Array())).metadata();

    expect(Math.max(metadata.width ?? 0, metadata.height ?? 0)).toBeLessThanOrEqual(1024);
  });

  /*
   * ERR-05(1): sharp reports an unreadable image by throwing, and the throw must
   * become a value here rather than escaping into the request.
   */
  it('returns null for bytes that are not an image, rather than throwing', async () => {
    const result = await correctWhiteBalance({
      bytes: new TextEncoder().encode('not a photograph'),
      mimeType: 'image/jpeg',
    });

    expect(result).toBeNull();
  });
});

describe('findTryOnProduct', () => {
  it('finds a product by id', () => {
    const record = CATALOGUE[0];
    expect(record).toBeDefined();
    if (record === undefined) return;

    expect(findTryOnProduct(record.id)?.id).toBe(record.id);
  });

  it('returns null for an id the catalogue does not hold', () => {
    expect(findTryOnProduct('no-such-product')).toBeNull();
  });
});

describe('generateTryOn — with no provider connected', () => {
  beforeEach(() => {
    resetTryOnSessions();
  });

  it('reports unavailable naming the reason, and never a broken image', async () => {
    const record = CATALOGUE[0];
    expect(record).toBeDefined();
    if (record === undefined) return;

    const outcome = await generateTryOn(
      record,
      { bytes: await scene(), mimeType: 'image/jpeg' },
      { sampleWhenUnconfigured: false },
    );

    expect(outcome).toEqual({ status: 'UNAVAILABLE', reason: 'PROVIDER_DISABLED' });
  });

  /**
   * §24: "No customer photograph is written to storage, backup or log at any
   * point", and the module owns "ephemeral session records only".
   *
   * This is the test that guards it. The record is compared by its complete key
   * set rather than by checking a couple of fields are absent — an edit that
   * starts keeping the photograph, or "just the result, for debugging", adds a
   * key and fails here rather than shipping.
   */
  it('keeps a session record that has nowhere to put an image', async () => {
    const record = CATALOGUE[0];
    expect(record).toBeDefined();
    if (record === undefined) return;

    await generateTryOn(
      record,
      { bytes: await scene(), mimeType: 'image/jpeg' },
      { sampleWhenUnconfigured: false },
    );

    const sessions = tryOnSessions();
    expect(sessions).toHaveLength(1);

    const session = sessions[0];
    expect(session).toBeDefined();
    if (session === undefined) return;

    expect(Object.keys(session).sort()).toEqual(['id', 'outcome', 'productId', 'startedAt']);
    expect(session.outcome).toBe('PROVIDER_DISABLED');
    expect(session.productId).toBe(record.id);
  });
});

/**
 * SEC-03 — the browser checks the same two things, and that check is an
 * affordance rather than protection. These assert the module refuses
 * independently, which is what makes it the enforcement point.
 *
 * A malformed request is refused BEFORE the module asks whether a provider is
 * connected, which is both correct — "that is a PDF" is more use to a caller
 * than "unavailable" — and what makes these assert something. Checked the other
 * way round they would pass on the disabled answer alone, without the
 * enforcement existing at all.
 */
describe('generateTryOn — server-side enforcement of the offer', () => {
  beforeEach(() => {
    resetTryOnSessions();
  });

  it('refuses a photograph above the advertised ceiling', async () => {
    const record = CATALOGUE[0];
    expect(record).toBeDefined();
    if (record === undefined) return;

    const oversized = new Uint8Array(
      tryOnOffer({ sampleWhenUnconfigured: false }).maxPhotoBytes + 1,
    );
    const outcome = await generateTryOn(
      record,
      { bytes: oversized, mimeType: 'image/jpeg' },
      { sampleWhenUnconfigured: true },
    );

    expect(outcome).toEqual({ status: 'PHOTO_REJECTED' });
    expect(tryOnSessions()[0]?.outcome).toBe('PHOTO_REJECTED');
  });

  it('refuses a format it never offered', async () => {
    const record = CATALOGUE[0];
    expect(record).toBeDefined();
    if (record === undefined) return;

    const outcome = await generateTryOn(
      record,
      { bytes: new TextEncoder().encode('%PDF-1.4'), mimeType: 'application/pdf' },
      { sampleWhenUnconfigured: true },
    );

    expect(outcome).toEqual({ status: 'PHOTO_REJECTED' });
  });
});

/**
 * The DEMO placeholder, and the properties that keep it from lying.
 *
 * It exists so the interface can be shown before the external service does, and
 * the risk of a placeholder is always that it becomes indistinguishable from
 * the real thing. Two things stop that here: the session records it as SAMPLE
 * rather than READY, so the module's own history never claims a generation
 * happened; and the enforcement above still runs, so the sample is not a way
 * round the checks.
 */
describe('generateTryOn — the sample placeholder', () => {
  beforeEach(() => {
    resetTryOnSessions();
  });

  it('answers with an image, and records it as a sample rather than a generation', async () => {
    const record = CATALOGUE[0];
    expect(record).toBeDefined();
    if (record === undefined) return;

    const outcome = await generateTryOn(
      record,
      { bytes: await scene(), mimeType: 'image/jpeg' },
      { sampleWhenUnconfigured: true },
    );

    expect(outcome.status).toBe('READY');
    if (outcome.status !== 'READY') return;

    // The contract's own rule: an image comes back inline, never as a link to
    // something stored (§24).
    expect(outcome.image.dataUrl.startsWith('data:image/')).toBe(true);
    expect(outcome.image.widthPx).toBeGreaterThan(0);
    expect(outcome.image.heightPx).toBeGreaterThan(0);

    const session = tryOnSessions()[0];
    expect(session?.outcome).toBe('SAMPLE');

    // And it still has nowhere to put a photograph.
    expect(Object.keys(session ?? {}).sort()).toEqual(['id', 'outcome', 'productId', 'startedAt']);
  }, 15_000);

  /*
   * The placeholder must not become a way round the module's own rules: a file
   * it would refuse with a provider connected is refused without one too.
   */
  it('does not let the sample bypass the enforcement', async () => {
    const record = CATALOGUE[0];
    expect(record).toBeDefined();
    if (record === undefined) return;

    const outcome = await generateTryOn(
      record,
      { bytes: new TextEncoder().encode('not a photograph'), mimeType: 'image/jpeg' },
      { sampleWhenUnconfigured: true },
    );

    // Decodable-image check, which the sample path runs exactly as the real one does.
    expect(outcome).toEqual({ status: 'PHOTO_REJECTED' });
  });
});
