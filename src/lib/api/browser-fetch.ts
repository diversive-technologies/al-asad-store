/** Methods that change nothing on the server, so sending one costs nothing if its answer is lost. */
const SAFE_METHODS: ReadonlySet<string> = new Set(['GET', 'HEAD']);

/** The response, or `null` when none came; the contract, or `null` when it could not be downloaded. */
export type ContractedResponse<TContract> = readonly [Response | null, TContract | null];

/**
 * A browser call to our own BFF, together with the schema module that will
 * validate its answer.
 *
 * Why the schema arrives WITH the call rather than with the page (IMP-01a,
 * PERF-10): a schema imported statically by a Client Component is first-load
 * JavaScript, and every schema brings Zod — about 84 kB gzipped in this build.
 * For a read the root layout makes on every page (the bag's count, the saved
 * list), and for one a control makes only when pressed (a card's quick add),
 * that is a download the page waits for before it can hydrate.
 *
 * A READ fetches both at once: started beside the request, the schema is ready
 * by the time the body is, and a read whose schema could not be downloaded
 * changed nothing, so asking again is harmless.
 *
 * A WRITE is sent only once its schema is here. Sent beside it, a write the
 * server APPLIED came back unreadable whenever the schema's download failed —
 * reported as failed, so the customer pressed again and the bag held two, or
 * an address was saved twice. The cost is the first write of a visit waiting
 * for the schema before it is sent rather than beside it; it waited for it
 * before its answer could be read anyway, and every write after finds it here.
 *
 * ERR-05(1) / DATA-03 — neither half ever rejects. A request that could not be
 * sent, or a schema module that could not be downloaded, comes back as `null`,
 * and the caller turns it into the failure its own error union names. A write
 * whose schema could not be downloaded comes back `[null, null]`: it was never
 * sent, so "try again" is the truth.
 */
export function fetchWithContract<TContract>(
  input: string | URL,
  init: RequestInit,
  loadContract: () => Promise<TContract>,
): Promise<ContractedResponse<TContract>> {
  const contract = loadContract().then<TContract | null, null>(
    (loaded) => loaded,
    () => null,
  );
  const send = (): Promise<Response | null> =>
    fetch(input, init).then<Response | null, null>(
      (response) => response,
      () => null,
    );

  if (SAFE_METHODS.has((init.method ?? 'GET').toUpperCase())) {
    return Promise.all([send(), contract]);
  }

  return contract.then<ContractedResponse<TContract>>((loaded) =>
    loaded === null ? [null, null] : send().then((response) => [response, loaded]),
  );
}
