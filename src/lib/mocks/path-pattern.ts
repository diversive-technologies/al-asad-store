/**
 * D1 — an MSW route pattern built from the SAME endpoint builder the client uses,
 * so the mock and the client cannot disagree about a path's shape (SSOT-04).
 *
 * The builders encode every id they are given (SEC-02), which would turn a
 * `:cartId` placeholder into `%3AcartId`. So each builder is called with a marker
 * made only of characters encoding leaves alone, and the marker is then swapped
 * for MSW's `:name` parameter.
 */
export function pathPattern(build: (...segments: string[]) => string, ...names: string[]): string {
  const marker = (name: string): string => `__param_${name}__`;
  const built = build(...names.map(marker));
  return names.reduce((path, name) => path.replace(marker(name), `:${name}`), built);
}
