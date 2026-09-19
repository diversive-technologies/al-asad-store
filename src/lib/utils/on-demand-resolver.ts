import type { FieldValues, Resolver } from 'react-hook-form';

/** A form's validation, downloaded on demand, and the way to start that early. */
export interface OnDemandResolver<TValues extends FieldValues> {
  /** FORM-01's resolver, for `useForm`; it waits for the validation on first use. */
  readonly resolver: Resolver<TValues>;
  /** Starts the download without waiting; the form calls it when first focused. */
  readonly warmUp: () => void;
}

/**
 * A React Hook Form resolver whose validation — the resolver package, the
 * form's schema, and with them Zod — is downloaded when the form is first used
 * rather than with the page.
 *
 * Why (IMP-01a, PERF-10): `zodResolver(schema)` imported statically puts Zod,
 * about 84 kB gzipped, in the first-load JavaScript of every page that draws a
 * form, although nothing is validated until somebody submits. The form asks for
 * the download when it is first focused (`warmUp`); a submit that beats it
 * waits for it, with the form already reporting that it is submitting.
 *
 * FORM-03 — a browser's check is an affordance, and every one of these forms is
 * checked again against the same schema where it lands (a Server Action or our
 * own BFF). So if the validation cannot be downloaded, the values go on as typed
 * and a bad one is refused there, rather than the form being left unable to
 * send anything.
 *
 * `load` is the caller's own `zodResolver(schema)` behind a dynamic import, so
 * the schema stays the form's single definition (FORM-01) and is typed exactly.
 */
export function onDemandResolver<TValues extends FieldValues>(
  load: () => Promise<Resolver<TValues>>,
): OnDemandResolver<TValues> {
  // DATA-03: a download that fails is a value, never a rejection.
  const loaded = (): Promise<Resolver<TValues> | null> =>
    load().then<Resolver<TValues> | null, null>(
      (resolver) => resolver,
      () => null,
    );

  return {
    resolver: async (values, context, options) => {
      const resolver = await loaded();
      return resolver === null ? { values, errors: {} } : resolver(values, context, options);
    },
    warmUp: () => {
      void loaded();
    },
  };
}
