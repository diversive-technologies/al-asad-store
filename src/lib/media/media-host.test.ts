import { describe, expect, it } from 'vitest';

import { isMediaAddress, mediaAddressForWidth, mediaWidthFor, parseMediaHost } from './media-host';

const HOST = 'media.example.com';
const key = (width: number) => `https://${HOST}/products/lawn-01/front-${width}-1a2b3c4d.avif`;

describe('parseMediaHost', () => {
  it('accepts a bare host, with an optional port, lower-cased', () => {
    expect(parseMediaHost('Media.Example.com')).toBe('media.example.com');
    expect(parseMediaHost('localhost:9000')).toBe('localhost:9000');
  });

  it('refuses a scheme, a path, spaces and the empty value', () => {
    for (const bad of ['https://media.example.com', 'media.example.com/x', 'a b', '', '-x.com']) {
      expect(parseMediaHost(bad)).toBeNull();
    }
    expect(parseMediaHost(undefined)).toBeNull();
  });
});

describe('mediaWidthFor', () => {
  it('picks the smallest uploaded width that covers the request', () => {
    expect(mediaWidthFor(1)).toBe(480);
    expect(mediaWidthFor(480)).toBe(480);
    expect(mediaWidthFor(481)).toBe(960);
    expect(mediaWidthFor(960)).toBe(960);
    expect(mediaWidthFor(961)).toBe(1600);
    expect(mediaWidthFor(1600)).toBe(1600);
  });

  it('serves the widest when the request is larger than any upload', () => {
    expect(mediaWidthFor(3840)).toBe(1600);
  });
});

describe('mediaAddressForWidth', () => {
  it.each([
    [384, 480],
    [640, 960],
    [828, 960],
    [1080, 1600],
    [2048, 1600],
  ])('a request for %i px gets the %i file', (requested, served) => {
    expect(mediaAddressForWidth(key(1600), requested, HOST)).toBe(key(served));
  });

  it('keeps the hash and the frame name', () => {
    expect(mediaAddressForWidth(key(1600), 400, HOST)).toBe(
      'https://media.example.com/products/lawn-01/front-480-1a2b3c4d.avif',
    );
  });

  it('returns a local fixture image unchanged', () => {
    expect(mediaAddressForWidth('/products/x.avif', 640, HOST)).toBe('/products/x.avif');
  });

  it('returns an address on another host unchanged', () => {
    const other = 'https://elsewhere.example.com/products/a/front-1600-1a2b3c4d.avif';
    expect(mediaAddressForWidth(other, 640, HOST)).toBe(other);
  });

  it('returns a media-host address that does not match the pattern unchanged', () => {
    for (const odd of [
      `https://${HOST}/hero/poster-1a2b3c4d.webp`,
      `https://${HOST}/products/a/front-700-1a2b3c4d.avif`,
      `https://${HOST}/products/a/front-1600-xyz.avif`,
      `https://${HOST}/logo.svg`,
    ]) {
      expect(mediaAddressForWidth(odd, 640, HOST)).toBe(odd);
    }
  });

  it('returns everything unchanged when no media host is configured', () => {
    expect(mediaAddressForWidth(key(1600), 640, null)).toBe(key(1600));
  });

  it('does not rewrite a plain-http address on the media host', () => {
    const http = key(1600).replace('https:', 'http:');
    expect(mediaAddressForWidth(http, 640, HOST)).toBe(http);
  });
});

describe('isMediaAddress', () => {
  it('is true only for https on the media host', () => {
    expect(isMediaAddress(key(1600), HOST)).toBe(true);
    expect(isMediaAddress(key(1600).replace('https:', 'http:'), HOST)).toBe(false);
    expect(isMediaAddress('https://evil.example.com/a.avif', HOST)).toBe(false);
    expect(isMediaAddress('/products/x.avif', HOST)).toBe(false);
    expect(isMediaAddress(key(1600), null)).toBe(false);
  });
});
