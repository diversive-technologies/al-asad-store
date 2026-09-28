import { describe, expect, it } from 'vitest';

import { firstImagePart, missingImageDetail, providerResponseSchema } from './provider.schema';

/**
 * §24 — the image model's reply, parsed not trusted. What is pinned is the two
 * things a failed generation used to lose: WHICH image is the answer when a
 * thinking model returns its drafts too, and WHY there was no image at all —
 * the difference between a refused photograph and a broken key, which on a
 * deployment had looked identical and logged nothing.
 */

const DRAFT = Buffer.from('draft').toString('base64');
const FINAL = Buffer.from('final').toString('base64');

function parse(payload: unknown) {
  return providerResponseSchema.parse(payload);
}

describe('firstImagePart', () => {
  it('takes the finished image and passes over a thinking model’s draft', () => {
    const payload = parse({
      candidates: [
        {
          content: {
            parts: [
              { inlineData: { mimeType: 'image/png', data: DRAFT }, thought: true },
              { inlineData: { mimeType: 'image/png', data: FINAL } },
            ],
          },
        },
      ],
    });

    expect(Buffer.from(firstImagePart(payload)?.bytes ?? []).toString()).toBe('final');
  });

  it('answers a reply with only drafts and commentary as carrying no image', () => {
    const payload = parse({
      candidates: [
        {
          content: {
            parts: [{}, { inlineData: { mimeType: 'image/png', data: DRAFT }, thought: true }],
          },
        },
      ],
    });

    expect(firstImagePart(payload)).toBeNull();
  });
});

describe('missingImageDetail', () => {
  it.each([
    [
      'a request blocked before any candidate',
      { promptFeedback: { blockReason: 'PROHIBITED_CONTENT' } },
      'request blocked: PROHIBITED_CONTENT',
    ],
    [
      'a candidate the safety filter stopped',
      { candidates: [{ finishReason: 'IMAGE_SAFETY' }] },
      'no image, finishReason IMAGE_SAFETY',
    ],
    [
      'a reply that says nothing about why',
      { candidates: [{ content: { parts: [] } }] },
      'no image in the response',
    ],
  ])('names %s', (_case, payload, detail) => {
    expect(missingImageDetail(parse(payload))).toBe(detail);
  });
});
