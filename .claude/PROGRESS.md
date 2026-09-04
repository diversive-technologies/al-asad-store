# Progress — where the build actually is

State, not rules. `CLAUDE.md` says what the super-modules are and `docs/system-architecture.md`
says what the system does; neither is repeated here. This file answers one
question at the start of a session: **what is done, and what is next.**

Keep it current at the end of an iteration. A stale progress file is worse than
none, because it is believed.

Last updated: 2026-09-04. Last commit: `aec24cb`.

---

## Super-module status

| # | Super-module | Status |
| --- | --- | --- |
| M1 | Landing page + foundation | **Done.** Committed. |
| M2 | Catalogue | **In progress** — see below. |
| M3 | Product page | Not started. |
| M4 | Bag & reservation | Not started. `app/bag/` is a placeholder route only. |
| M5 | Checkout | Not started. |
| M6 | Real auth & account | Deferred by D3. |

## M2 — what is built

- **Contract** — `src/features/catalogue/schemas/search.schema.ts`: `SORT_OPTIONS`,
  `FACET_KEYS`, `resultPageSchema` (`facets` nullable, the single representation
  of a degraded index), `catalogueQuerySchema`, `suggestionsSchema`.
- **URL state** — `src/features/catalogue/lib/search-params.ts`, 21 tests. Pure
  URL↔query. Two load-bearing properties: total parsing never throws, and
  serialisation is canonical (defaults omitted, values sorted). Domain rules:
  relevance is demoted without a term, an inverted price range is swapped, any
  filter change resets to page 1 and paging does not.
- **Mock** — `src/lib/mocks/catalogue-db.ts` (28 deterministic products) and
  `catalogue-search.ts`, 19 tests. Facet counts are contextual: each facet is
  counted with all *other* filters applied but not its own.
- **Routes** — `/catalogue`, `/search`, `/help/[slug]`, `/bag`, each with its own
  `loading.tsx` and `error.tsx`.
- **Product card** — persistent strip (name + price, fabric · colour + was-price)
  plus a `motion` hover reveal carrying piece count, metreage and the quick
  action. Client Component; the PERF-01 cost is documented in the file.
- **Grid** — vertical stagger via the `staggered-grid` utility in `globals.css`.

## M2 — what is left

1. **Filter panel** — six groups, contextual facet counts, chips, clear-all,
   instant apply. The URL-state module and the mock already support all of it;
   nothing is wired to the interface yet.
2. **Type-ahead search** — plus the first `app/api/` BFF route.
3. **Code lookup** — the typed read exists; no interface.

## Deliberate gaps — do not "fix" these

- **`/catalogue/[slug]` 404s.** That is the M3 product page. Left dead on purpose
  rather than stubbed.
- **Product imagery is synthetic.** Four colour-accurate AVIF fabric swatches
  cycled across 28 products, chosen after keyword photo services returned
  unusable results. This is the single biggest drag on how the catalogue reads
  and no card or grid change will fix it — it needs real photography.
- **Sign-in is a mock (D3).** No credentials are stored or validated.

## Uncommitted work

A commit was proposed and not answered, so per `GIT.md` §4 the next prompt must
cover **everything** below, not just the most recent change:

- `app/help/`, `app/bag/`, `fetch-page.ts`, `page.schema.ts`, `pages-db.ts`,
  `endpoints.ts` — the routes that killed the 404s on every header link.
- Per-route `loading.tsx` / `error.tsx` for catalogue and search,
  `ListingSkeleton.tsx`, and the `data-hero` marker in `HeroVideoSection.tsx` —
  the fix for the black header flash during navigation.
- `catalogue-db.ts` — every product now has a hover image (half of them did not,
  which made hovering look broken rather than varied).
- `ProductCard.tsx` redesign, the `motion` dependency, `product.singleLabel` in
  both locales.
- `ProductGrid.tsx` + `globals.css` — mosaic replaced by the vertical stagger.
- `.claude/skills/nextjs-guidelines/SKILL.md` — description shortened under the
  registration cap (see below).
- `.claude/PROGRESS.md` (this file) and the `CLAUDE.md` section that imports it.

Proposed message:

```
Fix dead links with help and bag routes, add per-route loading and error boundaries scoped by a hero marker, give every product a hover image, redesign the product card with a persistent detail strip and motion hover reveal, replace the mosaic grid with a vertical stagger, shorten the guidelines skill description under the registration cap, and add an imported progress file
```

Verification at the time of writing: **typecheck, lint, 52 tests and the
production build all pass.**

---

## Things that cost time once and should not cost it twice

- **Skill descriptions have a registration cap near 512 characters.** Over it,
  the skill is silently dropped — no error, it simply never appears. This was
  hiding `nextjs-guidelines` itself, meaning the BINDING rulebook was not
  auto-triggering. Keep every `description:` under ~500 characters.
- **MSW dies on hot reload** unless it is a module-scoped singleton in `node.ts`
  with `ensureMockServer()` called from the root layout per request. A
  `globalThis` cache made it worse, not better.
- **Locale must be a query param, not `Accept-Language`.** Next's data cache is
  not keyed on that header, so both locales collided in one cache entry.
- **`overflow-x: clip`, never `hidden`,** on the hero ambient wrapper — `hidden`
  forces the other axis to `auto` and kills the intended downward spill.
- **Breakpoint resets must match the specificity they override.** `& > *` is
  (0,1,0) and cannot undo `& > *:nth-child(2n)` at (0,2,0); media queries add no
  specificity. Reset with `:nth-child(n)`.
- **React delegates `onMouseEnter` through `mouseover`/`mouseout`.** A synthetic
  `mouseenter` event proves nothing — test hover with a real pointer move.
- **The preview pane throttles `requestAnimationFrame` while hidden,** so
  animations read as stuck at their initial values. Force a screenshot before
  measuring anything animated, and before any layout read.
- **`typedRoutes` is off** on purpose: it is incompatible with backend-supplied
  hrefs.

## Commands

```bash
npm run dev
```

```bash
npm run typecheck && npm run lint && npm run test && npm run build
```
