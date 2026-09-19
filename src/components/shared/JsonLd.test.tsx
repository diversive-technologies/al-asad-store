import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { JsonLd } from './JsonLd';

/** SEC-04 — the script as the page carries it, with a served value trying to leave it. */
describe('JsonLd', () => {
  const hostile = '</script><script>alert(document.cookie)</script><!--';
  const markup = renderToStaticMarkup(<JsonLd data={{ '@type': 'Product', name: hostile }} />);

  it('writes one structured-data script, closed only by its own end tag', () => {
    expect(markup.startsWith('<script type="application/ld+json">')).toBe(true);
    expect(markup.match(/<\/script/gi)).toHaveLength(1);
    expect(markup.endsWith('</script>')).toBe(true);
    expect(markup).not.toContain('<!--');
  });

  it('carries the value intact for whoever parses the JSON', () => {
    const body = markup.slice('<script type="application/ld+json">'.length, -'</script>'.length);

    expect(JSON.parse(body)).toEqual({ '@type': 'Product', name: hostile });
  });
});
