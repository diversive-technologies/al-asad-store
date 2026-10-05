import { maskPersonalData } from './redact';

/**
 * F-08 — the seam between the logger and the error tracker.
 *
 * `log.ts` is imported all over the storefront and must not know that a tracker
 * exists, still less carry its SDK into a bundle (TD-11: no Sentry code ships to
 * the browser). So the logger reports through THIS module, which holds a function
 * the server installs at start-up (`instrumentation.ts` → `init-error-tracking`)
 * and which does nothing until then — in tests, in development with no DSN, and in
 * the browser.
 *
 * The installed function lives on `globalThis` under a registered symbol rather
 * than in a module variable. A Next server holds a separate copy of a module per
 * bundle layer, and the copy `register()` installs into is not necessarily the
 * copy a Route Handler imports; a global is the one thing they share.
 */

export type ReportLevel = 'error' | 'warning';

export interface ErrorReport {
  readonly level: ReportLevel;
  /** The boundary that logged it, e.g. `api:checkout:place` — a tag, never free text. */
  readonly context: string;
  /** Already masked of emails and telephone numbers. */
  readonly message: string;
}

export type ErrorReporter = (report: ErrorReport) => void;

const SLOT = Symbol.for('alasad.errorReporter');

function isReporter(value: unknown): value is ErrorReporter {
  return typeof value === 'function';
}

/** Installs the tracker's function, or removes it with `null`. */
export function installErrorReporter(reporter: ErrorReporter | null): void {
  Reflect.set(globalThis, SLOT, reporter ?? undefined);
}

/**
 * Sends one logged problem to the tracker, if one is installed.
 *
 * Masks first, so no caller has to remember to. NEVER throws and never waits: a
 * tracker that is down must not turn a logged error into a second one in the
 * request that logged it.
 */
export function reportToTracker(level: ReportLevel, context: string, message: string): void {
  const reporter: unknown = Reflect.get(globalThis, SLOT);
  if (!isReporter(reporter)) return;

  // ERR-05(1): the reporter is third-party code; its failure stops here.
  try {
    reporter({
      level,
      context: maskPersonalData(context),
      message: maskPersonalData(message),
    });
  } catch {
    // Deliberately empty: there is nowhere better to report a failure to report.
  }
}
