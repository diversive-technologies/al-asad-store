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
| M2 | Catalogue | **Feature-complete** except the small-screen filter drawer, which waits on M4. |
| M3 | Product page | **In progress** — contract, mock, route and shell done; extras remain. |
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
- **Type-ahead** — `app/api/suggest/route.ts` is the first BFF (DATA-08), and it
  exists because `apiRequest` is `server-only` while the type-ahead runs on
  keystrokes. It proxies and nothing else. The header field is a full ARIA
  combobox: debounced query through TanStack Query, `aria-activedescendant`
  without focus ever leaving the input, wrapping arrow keys, Escape dismissing
  the list before the field, and pointer selection on `mousedown` so it beats
  the blur.
- **Code lookup** — `/search` runs `byCode` alongside the search (PERF-02) and
  surfaces an exact match above the results. The client never decides what a
  code LOOKS like — that is the backend's rule (DATA-13); it only declines terms
  that cannot be one, i.e. anything with whitespace. One availability request
  covers the grid and the match together.
  Relevance is offered only when a search term is present, matching the
  demotion `parseCatalogueQuery` already performs.

## M3 — what is built

- **Contract** — `product-detail.schema.ts` (§12 `getProduct`) and
  `piece-availability.schema.ts`. The product projection carries NO quantity, per
  §12; stock is a separate live read at `(piece, size)` granularity, which is how
  §13 keys inventory. The schema asserts the §6.1 invariant — SIMPLE ⟹ one piece,
  SET ⟹ two or more — so a backend that breaks it surfaces as a handled contract
  violation rather than a buy box with nothing to override.
- **Readers** — `fetchProduct` (404 → `ok(null)` so the route can render
  `notFound()`), `fetchProductAvailability` (`revalidate: 0`).
- **Mock** — `product-detail-db.ts`, derived from the same `CATALOGUE` records
  the listing uses, plus two MSW handlers.
- **Route** — `/catalogue/[slug]` with per-product metadata, `loading` and
  `error`. This was the last dead link.
- **Shell** — gallery with thumbnails, and the buy box branching on the DECLARED
  type: SIMPLE gets one selector, SET gets the unified selector plus the
  per-piece override panel. Selection logic is pure and covered by 21 tests.
- **Fabric Calculator (§25)** — the second BFF route, `/api/fabric-calculator`.
  The interface holds NO requirement table and does no subtraction: §25 makes
  that a backend module, and the comfort margin separating "comfortable" from
  "just enough" is a tunable the operator owns. Eligibility is the backend's
  answer too — the product payload carries `fabricCalculator: offer | null`, so
  nothing infers it from `isUnstitched`.

## M3 — what is left

Notify Me on sold-out sizes, size guides, WhatsApp and copy-link sharing,
you-may-also-like, and the gallery's desktop magnifier and mobile
tap-to-fullscreen. None is started; none is faked.

## M2 — what is left

Only one item, and it is blocked rather than pending:

1. **Filter drawer on small screens** — the rail currently stacks above the grid
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
- **The code match shows a card, not a redirect.** Jumping straight to the
  product is the natural behaviour and is what M3 should switch this to; today
  `/catalogue/[slug]` does not exist, so the exact match is surfaced as a card
  above the results instead.
- **Suggestion rows search, they do not open the product.** Selecting a product
  in the type-ahead runs a search for its name rather than navigating to
  `/catalogue/[slug]`, which is M3 and would 404. `toSuggestionOptions` is where
  that flips when M3 lands, and it is covered by a test that says so.


- **`/catalogue/[slug]` 404s.** That is the M3 product page. Left dead on purpose
  rather than stubbed.
- **Product imagery is synthetic.** Four colour-accurate AVIF fabric swatches
  cycled across 28 products, chosen after keyword photo services returned
  unusable results. This is the single biggest drag on how the catalogue reads
  and no card or grid change will fix it — it needs real photography.
- **Sign-in is a mock (D3).** No credentials are stored or validated.

## Uncommitted work

The Fabric Calculator (§25):

- Contract, endpoint, `evaluate-fabric` reader, the `/api/fabric-calculator` BFF
  route, a browser read, and the `FabricCalculator` panel.
- The requirement table lives in the MOCK backend, not the frontend.
- `catalogue-db` metreage now varies across unstitched products. It did not
  before: unstitched only occurs where `index % 3 === 0`, so every such product
  had exactly 2.5m and the `COMFORTABLE` verdict was **unreachable in the running
  store** — a feature outcome nobody could ever screenshot.

Verified: **typecheck, lint, 109 tests and the production build all pass.** All
three §25 verdicts were exercised through the BFF and through the UI
(`COMFORTABLE`, `JUST_ENOUGH`, `INSUFFICIENT`), an unknown style returns 502
rather than an invented answer, and the panel is absent on a stitched product.

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
- **`div#S:0` is React's streaming staging container, not a duplicate render.**
  It carries `hidden` + `display: none`, so it is invisible and out of the
  accessibility tree — but `querySelectorAll` counts it, which makes every
  element on a streamed page look duplicated. Scope DOM counts to `main`, or
  check for the `hidden` ancestor before believing a duplication bug.
- **Page-subtree client components hydrate only on a real user event.** React's
  selective hydration means a scripted `.click()` from the devtools bridge finds
  no fiber and does nothing, while the layout's components (the header) are
  already live. Do not conclude a page is broken from that — drive it with a real
  pointer click before believing it.
- **There are TWO search fields.** `HeaderSearch` in the bar, and `SearchField`
  on `/search` — the one with its own "Search" button. Styling feedback about
  "the search bar" has to be matched to the right one first; several rounds of
  fixes went to the header while the report was about the results page.
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
