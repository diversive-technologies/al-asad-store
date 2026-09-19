import { describe, expect, it } from 'vitest';

import { serializeJsonLd } from './json-ld';

/**
 * SEC-04 — the JSON-LD script is an XSS sink, and every value in it is served
 * content. These are the strings a hostile or careless catalogue edit could put
 * there; each must come out unable to end the script, and read back unchanged.
 */
const HOSTILE = [
  '</script><script>alert(1)</script>',
  '</SCRIPT >',
  '<!--<script>',
  '<img src=x onerror=alert(1)>',
  ']]>',
  '"},"@type":"Thing","x":"',
  'back\\slash and "quotes"',
  'line\u2028separator and paragraph\u2029separator',
  'Tom & Jerry &amp; &lt;b&gt;',
  'الاسد — کاٹن کی قمیض',
  '\u0000 control',
];

describe('serializeJsonLd', () => {
  it.each(HOSTILE)('reads %j back unchanged', (value) => {
    const document = { '@context': 'https://schema.org', name: value, nested: [{ note: value }] };

    expect(JSON.parse(serializeJsonLd(document))).toEqual(document);
  });

  it.each(HOSTILE)(
    'leaves nothing in %j that HTML or an old script parser reads specially',
    (value) => {
      const body = serializeJsonLd({ name: value });

      expect(body).not.toMatch(/[<>&\u2028\u2029]/);
      expect(body.toLowerCase()).not.toContain('</script');
      expect(body).not.toContain('<!--');
    },
  );

  it('escapes as JSON unicode sequences rather than dropping or entity-encoding', () => {
    expect(serializeJsonLd({ name: '</script>&' })).toBe('{"name":"\\u003c/script\\u003e\\u0026"}');
  });

  it('leaves ordinary text, and the keys a search engine reads, exactly as they were', () => {
    expect(
      serializeJsonLd({ '@type': 'Product', name: 'Boski waistcoat suit', price: '4500.00' }),
    ).toBe('{"@type":"Product","name":"Boski waistcoat suit","price":"4500.00"}');
  });

  it('drops a key whose value is undefined, as JSON does', () => {
    expect(serializeJsonLd({ name: 'x', availability: undefined })).toBe('{"name":"x"}');
  });
});
