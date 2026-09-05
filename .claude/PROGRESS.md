# Progress — where the build actually is

State, not rules. `CLAUDE.md` says what the super-modules are and `docs/system-architecture.md`
says what the system does; neither is repeated here. This file answers one
question at the start of a session: **what is done, and what is next.**

Keep it current at the end of an iteration. A stale progress file is worse than
none, because it is believed.

Last updated: 2026-09-05. Last commit: `29cd1f7` (tree dirty — see below).

---

## Super-module status

| # | Super-module | Status |
| --- | --- | --- |
| M1 | Landing page + foundation | **Done.** Committed. |
| M2 | Catalogue | **Feature-complete** except the small-screen filter drawer, which waits on M4. |
| M3 | Product page | **In progress** — contract, mock, route and shell done; extras remain. |
| M4 | Bag & reservation | **Core done.** Reservations, panel, quantity, remove, promo code. |
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

1. **Filter drawer on small screens** — the rail still stacks above the grid
   below `md`. **No longer blocked:** `components/ui/dialog/SlideOver.tsx` now
   exists and takes a `side` prop for exactly this. It is a small piece of work
   whenever it is picked up.

## M4 — what is built

- **The §7.1 transaction, for real** — `src/lib/mocks/bag-reservations.ts`.
  Sorted lock order, an all-or-nothing check across every piece before any row
  is written, `Unavailable(piece)` naming the piece AND size that failed,
  existing holds refreshed rather than stacked, immediate release on removal,
  and §7.3 read-time expiry. **15 tests**, including the one that matters most:
  a SET that fails on its last piece leaves NO reservation behind.
- **A real stock ledger.** `product-detail-db` now holds `on_hand` per
  `(piece, size)` — §13's key — and the availability overlay reads from it,
  subtracting active reservations. Taking the last unit makes a size read sold
  out for everyone, with no job having run. Previously stock was a status
  pattern with no number, so `Unavailable` could never actually fire.
- **Contract** — `bag.schema.ts`. Every money figure arrives computed, the line
  total included; `Ok | Unavailable(piece)` is a discriminated union; and the
  summary carries NO cart id, because the id is a capability that stays in the
  httpOnly cookie.
- **BFF** — `/api/bag`, `/api/bag/lines/[lineId]`, `/api/bag/code`. The third,
  fourth and fifth BFF routes, and the first that attach a credential: the cart
  id is read from an httpOnly cookie the browser cannot see or forge.
- **Dialog primitive** — `components/ui/dialog/SlideOver.tsx`, on the native
  `<dialog>` element with `showModal()`. No dependency added: the platform gives
  the focus trap, Escape, focus restore, top layer and inert background that
  A11Y-08 requires.
- **Panel** — slide-in, per-piece size display, quantity, remove with inline
  confirmation, promotional code, free-delivery progress, and the hold's expiry
  time.
- **Add to bag** works from the product page, and the header shows a live count.
- **"Held for you until…" explains itself.** The bare time was ambiguous — a
  customer could not tell whether the items were reserved, whether they would
  quietly go out of stock, or whether they would leave the bag. An info button
  beside it opens a popover answering all three, plus the fact that editing the
  bag renews the hold. Built on the native popover API in
  `components/ui/popover/`, for the same reason `SlideOver` uses `<dialog>`: the
  platform ships the primitive, so no dependency was added.

## M4 — what is left

Checkout is M5 and the button says so. `moveToWishlist` is M6. The `/bag` page
is still the empty-state placeholder — the panel is the working surface, and the
full page should render the same summary next.

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


- **Product imagery is now the client's own.** Fourteen photographs in
  `public/products/`, converted to 4:5 AVIF from the originals kept in
  `assets/photography/`. See "Photography" below for what this changed and what
  is still missing.
- **Sign-in is a mock (D3).** No credentials are stored or validated.
- **Carts live in memory.** A dev-server restart empties every bag and releases
  every hold. That is the mock standing in for a database, not a design. The
  BFF's add path recovers from it: a cookie naming a cart the backend no longer
  has is discarded and replaced once, rather than failing forever.

## Photography

The client is **Al-Asad Collections**, and the store sells **menswear**, not the
women's lawn suits the fixture had been assuming. Sixteen photographs arrived;
fourteen are product shots and two are marketing collateral.

What that forced, beyond dropping the files in:

- **The fixture vocabulary was womenswear and had to change with the pictures.**
  Lawn / chiffon / cambric became wash-n-wear / boski / karandi / cotton; rose
  and sage became the twelve colours actually photographed. A filter reading
  "Chiffon · Rose" over a photograph of a maroon waistcoat is not a cosmetic
  mismatch, it is a lying card.
- **Colour is now READ FROM the photograph, not computed from the index.**
  `PHOTOGRAPHY` in `catalogue-db.ts` is the table; anything a customer can see in
  the picture comes from there, and only what the picture does not settle
  (fabric, work type, price, date) is still generated.
- **Piece counts follow the garment.** A waistcoat suit is the three-piece SET
  the domain model exists for — waistcoat, kameez, shalwar, each sized on its
  own — and a kameez shalwar is two. `PIECE_NAMES` is keyed by garment, because
  position 0 is "Waistcoat" in one and "Kameez" in the other.
- **28 products over 14 photographs**, each garment offered in two cloths. The
  two instances never disagree about colour, because both read it from the photo.
- **`hoverImageUrl` is null everywhere.** One shot per garment is what exists,
  and pointing the hover at a different garment is worse than no hover.
- The sold-out overlay named "Dupatta", a piece no menswear set has. Now Shalwar,
  the one piece both SET garments share.

Copy that contradicted the new catalogue was updated with it: hero headline,
meta description, search placeholder, the fabric glossary, the care guide and
the size guide, in both locales.

**Still missing, and not faked:**

- **No cloth photography.** The unstitched line (the adult kurta) shows a
  stitched example, because no photograph of fabric on the bolt exists yet.
- **One frame per garment.** No second angles, no detail shots, so the gallery
  renders a single image and hides its thumbnail strip.
- **The two brand pieces are unused** — `assets/photography/brand-poster-lion.jpeg`
  carries the gold lion crest and would make a real logo and favicon; both it and
  `brand-banner-rust.jpeg` have a phone number burned into them, so neither is
  usable as-is.

## Uncommitted work — M4

The bag and its reservations, as described above.

Verified: **typecheck, lint, 124 tests and the production build all pass.**
Exercised in the running store with real pointer clicks: a three-piece SET added
at size M shows `Waistcoat · M / Kameez · M / Shalwar · M` in the panel; the
quantity control reprices the line; `EID10` applies −Rs 700 on Rs 6,998 for a
Rs 6,548 total; raising the quantity past the shelf returns
`UNAVAILABLE / Waistcoat / M` rather than a generic refusal; and holding all
eight units flips M to **Sold out** on the product page for every piece — §7.3
read-time exclusion, with no sweeper involved.

The info popover was verified open, readable and correctly layered ABOVE the
modal bag panel, and its close button dismisses the popover while leaving the
bag open. **Escape could not be exercised** — see the note below.

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
- **MSW handlers that read a body MUST `request.clone().json()`.** MSW walks its
  handler list to find a match, and a resolver that reads the body consumes the
  stream — the next handler to touch the same request throws `Body is unusable`
  and the whole lookup fails as a 502. Three bag writes collided on this.
- **The preview harness swallows `Escape`.** It reaches neither a modal
  `<dialog>` nor an open popover, even with focus inside them, so that dismissal
  path cannot be verified from here — it needs a human keypress. Do not conclude
  the handler is broken from an automated Escape doing nothing.
- **`sharp` is present** (Next pulls it in), so image conversion needs no new
  dependency — but a script run from the scratchpad cannot resolve it. Require it
  by absolute path out of the project's `node_modules`.
- **A two-panel composite defeats `sharp.strategy.attention`:** it straddled the
  seam and produced a crop that was half one panel. Extract the panel first, then
  resize.
- **The Read tool does not render AVIF.** To look at converted output, composite
  a contact sheet as JPEG and read that instead — one image, one look.

## Commands

```bash
npm run dev
```

```bash
npm run typecheck && npm run lint && npm run test && npm run build
```
