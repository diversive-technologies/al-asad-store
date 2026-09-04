# Progress — where the build actually is

State, not rules. `CLAUDE.md` says what the super-modules are and `docs/system-architecture.md`
says what the system does; neither is repeated here. This file answers one
question at the start of a session: **what is done, and what is next.**

Keep it current at the end of an iteration. A stale progress file is worse than
none, because it is believed.

Last updated: 2026-09-04. Last commit: `aca3d62` (tree dirty — see below).

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
- **Grid** — vertical stagger via the `staggered-grid` utility in `globals.css`,
  scaling 2 / 3 / 4 / 5 / 6 columns from mobile to 2560px.
- **Filter panel** — all six filters of section 28.1 with contextual facet
  counts, removable chips, Clear all and instant apply. Every control is a
  `<Link>`, so the panel is a Server Component shipping no JavaScript and every
  filter combination is a crawlable URL; `PriceFilter` is the single client leaf,
  because a range needs a submit rather than a navigation per keystroke.
- **Sort** — the four options of section 28.1, as links with `aria-current`.
  Relevance is offered only when a search term is present, matching the
  demotion `parseCatalogueQuery` already performs.

## M2 — what is left

1. **Type-ahead search** — plus the first `app/api/` BFF route. `suggest` and
   its schema exist; nothing calls them.
2. **Code lookup** — the typed read exists; no interface.
3. **Type-ahead on the header field** — it navigates on submit today; the
   suggestion dropdown belongs with the type-ahead work above.
4. **Filter drawer on small screens** — the rail currently stacks above the grid
   below `md`. A slide-over needs the focus-trapping dialog primitive A11Y-08
   requires, which M4 needs anyway for the bag panel; building it once there is
   why this was not hand-rolled now.

## Header and search

The header carries no primary navigation. Catalogue, Unstitched and Stitched
were three links resolving to one route with different filter state, and §30.5
wants a single canonical address for a listing. Garment type stays reachable
from the homepage category grid, and the whole listing from the
`CATALOGUE_ENTRY` section added in their place. The space they vacated is what
the search field expands into.

Search is one control in two states, not a link to `/search`: the icon morphs
into a field, and Enter or the submit button navigates. It lives in
`features/catalogue` and reaches the header as a slot from `app/layout.tsx`,
because `components/` may not import from `features/` (MOD-01) and it needs the
URL-state module.

Enter is handled explicitly rather than by the browser's implicit form
submission. Both paths call the same `runSearch`, so behaviour is identical —
but implicit submission is a *default action*, and default actions are exactly
what a programmatically driven field does not get, which left the Enter path
unverifiable. `preventDefault` stops the two ever both firing for one keystroke.

## Page width

`page-shell` caps at `--spacing-page-max` (160rem / 2560px). It used to cap at
`min(80rem, calc(125svh * 16 / 9))`, derived from the hero film's width back when
the film was height-driven. The film is now `inline-size: 100%`, so that term
could never bind and the 80rem froze every page at 1280px: a 2560px monitor
showed 640px of dead background down each side and product tiles no bigger than
on a laptop — 206px at every width from 1280 up.

Two rules follow from the fix and should not be undone casually:

- **Prose sets its own, much narrower cap** inside the shell (`max-w-3xl` on help
  pages, `max-w-sm` on sign-in). Line length is a readability limit, roughly 65–75
  characters, and it does not belong in the page container.
- **The filter rail sits on the gutter**, so it reads as pinned to the reading-start
  edge rather than floating in from a centred column. That is why the cap is
  160rem and not lower.

Measured after the change: 1440 → 4 columns at 246px, 1920 → 5 at 288px,
2560 → 6 at 343px, all at 100% of viewport width.

## Deliberate gaps — do not "fix" these

- **`/catalogue/[slug]` 404s.** That is the M3 product page. Left dead on purpose
  rather than stubbed.
- **Product imagery is synthetic.** Four colour-accurate AVIF fabric swatches
  cycled across 28 products, chosen after keyword photo services returned
  unusable results. This is the single biggest drag on how the catalogue reads
  and no card or grid change will fix it — it needs real photography.
- **Sign-in is a mock (D3).** No credentials are stored or validated.

## Uncommitted work

The progress-file reconciliation from `aca3d62`, the header rework, and its
follow-up fixes:

- `HeaderSearch` (the morphing field), the `header-search` utility and its two
  tokens; `Header` takes it as a slot and no longer renders `PrimaryNav`, which
  is deleted.
- `CATALOGUE_ENTRY` section kind: schema, `CatalogueEntrySection`, the renderer
  case, both barrels, and fixture copy in both locales.
- `nav.closeSearch` added; `nav.primaryLabel` removed with its only consumer.
- Lines removed from the listing rail too: the filter-group separators, and the
  rail's own scrollbar, which drew a full-height vertical rule down the side of
  the filters. The rail still scrolls; only the indicator went.
- Fixes on the field: the collapse animated as the reverse of the expansion
  rather than the field vanishing; the field given its own foreground so the
  close icon is not white-on-white over the hero in the light theme; and every
  border and focus line removed from it by operator instruction — the input's
  caret and the global outline on the two inner buttons still show keyboard
  focus, so only the container's own indicator went, which was drawn on every
  open regardless because the field autofocuses.

Verified: **typecheck, lint, 65 tests and the production build all pass.** The
search was exercised for open, focus, Enter, submit, Escape, click-outside,
focus restore and the reverse collapse, in both locales and over both a
transparent and a solid header.

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
- **An unlayered rule beats a layered one, whatever the specificity.** `@utility`
  output lands in `@layer utilities`, so a bare `*` selector written at the top
  level of `globals.css` overrides `.listing-layout > aside` inside a utility.
  Rules that override the global `*` scrollbar styling have to live beside it,
  outside the layer — this cost a debugging round when the compiled CSS looked
  perfectly correct and simply was not winning.
- **A `visibility` transition makes `focus()` a silent no-op.** A transition does
  not take effect until the next style recalculation, so an element merely
  *transitioning* to `visible` still computes as hidden — and focusing a hidden
  element does nothing, with no error. Neither `requestAnimationFrame` nor
  `flushSync` nor a forced reflow works around it. The fix is to delay
  `visibility` only on the way out (`visibility 0s linear 160ms` when hiding,
  `0s linear 0s` when showing), so the shown state switches instantly and stays
  focusable while the fade-out still reads.
- **Hiding a focused element moves focus to `<body>`.** Swapping two stacked
  controls means the one that was just clicked becomes hidden and is blurred by
  the browser, which will race any effect trying to move focus. Move focus in the
  handler after a `flushSync`, not from an effect.
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
