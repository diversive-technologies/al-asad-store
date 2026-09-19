/**
 * ERR-09 — every fetching segment has a loading state.
 * NEXT-14 — the skeleton approximates the final layout's dimensions so that
 * replacing it does not shift the page.
 *
 * It lives in the `(home)` route group so that it is the HOMEPAGE's skeleton and
 * nobody else's. At `app/loading.tsx` it wrapped every route without one of its
 * own, so opening the saved items, sign-up or password reset flashed a
 * screen-tall hero placeholder that was then replaced by a narrow form (PERF-08).
 *
 * It mirrors the real shape: a full-bleed hero pulled up under the fixed bar,
 * then the first rail inside the shared content shell. A narrow centred column
 * here would collapse into a full-width hero and move everything below it.
 */
export default function HomeLoading() {
  return (
    <div aria-hidden>
      <div className="hero-frame bg-surface-muted -mt-header animate-pulse" />

      <div className="page-shell flex flex-col gap-4 py-12">
        <div className="bg-surface-muted rounded-card h-6 w-48 animate-pulse" />
        <div className="flex gap-4">
          <div className="bg-surface-muted rounded-card aspect-[4/5] w-44 animate-pulse sm:w-56" />
          <div className="bg-surface-muted rounded-card aspect-[4/5] w-44 animate-pulse sm:w-56" />
          <div className="bg-surface-muted rounded-card aspect-[4/5] w-44 animate-pulse sm:w-56" />
          <div className="bg-surface-muted rounded-card aspect-[4/5] w-44 animate-pulse sm:w-56" />
        </div>
      </div>
    </div>
  );
}
