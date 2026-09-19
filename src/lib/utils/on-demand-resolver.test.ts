import { zodResolver } from '@hookform/resolvers/zod';
import type { ResolverOptions } from 'react-hook-form';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { onDemandResolver } from './on-demand-resolver';

/**
 * PERF-10 — a form's validation downloaded on first use rather than with the
 * page. What it must never do is change what the form accepts once it has
 * arrived, or leave a form unable to send when it cannot arrive (FORM-03: the
 * values are checked again where they land).
 */

const schema = z.object({ email: z.email() });
type Values = z.infer<typeof schema>;

const OPTIONS: ResolverOptions<Values> = { fields: {}, shouldUseNativeValidation: false };

describe('a resolver downloaded on demand', () => {
  it('judges exactly as the schema does once it has arrived', async () => {
    const { resolver } = onDemandResolver<Values>(() => Promise.resolve(zodResolver(schema)));

    const refused = await resolver({ email: 'not an address' }, undefined, OPTIONS);
    const accepted = await resolver({ email: 'amna@example.com' }, undefined, OPTIONS);

    expect(Object.keys(refused.errors)).toEqual(['email']);
    expect(accepted).toEqual({ values: { email: 'amna@example.com' }, errors: {} });
  });

  it('lets the values through unjudged when the validation cannot be downloaded', async () => {
    const { resolver } = onDemandResolver<Values>(() => Promise.reject(new Error('offline')));

    await expect(resolver({ email: 'not an address' }, undefined, OPTIONS)).resolves.toEqual({
      values: { email: 'not an address' },
      errors: {},
    });
  });

  it('starts the download when warmed, and a failed one is not a rejection', async () => {
    const load = vi.fn(() => Promise.reject(new Error('offline')));
    const { warmUp } = onDemandResolver<Values>(load);

    expect(load).not.toHaveBeenCalled();
    expect(() => {
      warmUp();
    }).not.toThrow();
    expect(load).toHaveBeenCalledTimes(1);

    // An unhandled rejection would fail the run after this test; let it surface.
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
});
