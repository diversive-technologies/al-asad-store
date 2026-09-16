# Progress — where the build actually is

State, not rules. `CLAUDE.md` says what the super-modules are and `docs/system-architecture.md`
says what the system does; neither is repeated here. This file answers one
question at the start of a session: **what is done, and what is next.**

Keep it current at the end of an iteration. A stale progress file is worse than
none, because it is believed.

Last updated: 2026-09-16, on `main`, with account plan phases 1 to 3 done — a
saved profile read back into the studio, `/account`, and the saved items moved off
the browser and onto the account — and with all six Made-to-Measure plan phases done
— the client's order, the list served as content, a real save with a review, the
tailor's-card path, finishing choices that decide what is asked, and the tailor's
rules as rows. Every rule row, bound and card convention is FIXTURE until the
client's written list arrives; the machinery around them is built.
The 3D experiment is kept, unmerged, on branch `3d-model` at `62363d3`. Nothing
is pushed: `main` is ahead of `origin/main`.

Phases 1 and 2 of the account plan are done: a saved measurement profile can be
READ back and the studio offers it — including across garment styles, since every
style is composed from the same point rows — and `/account` now shows what is on
file, for a guest as well as a signed-in customer.

A by-hand pass over every use case on a desktop and a phone (`TESTING-USE-CASES.md`)
then found five layout faults, led by a product page that was 81px wider than every
phone screen. All five are fixed — see "Phone layout" below. The test log carries the
customer-facing account; this file carries what is worth not learning twice.

---

## Super-module status

| # | Super-module | Status |
| --- | --- | --- |
| M1 | Landing page + foundation | **Done.** Committed. |
| M2 | Catalogue | **Feature-complete** except the small-screen filter drawer, which waits on M4. |
| M3 | Product page | **In progress** — contract, mock, route and shell done; extras remain. |
| M4 | Bag & reservation | **Core done.** Reservations, panel, quantity, remove, promo code. |
| M5 | Checkout | **Core done.** Quote, single-page checkout, §7.2 placement, confirmation. |
| M6 | Real auth & account | **Auth screens built** against §11's shape; account area still deferred. |
| USP1 | Try-On (§24) | **Interface complete, provider unconnected** — which is exactly §28.5. See below. |
| USP2 | Made-to-Measure (§34) | **Measurement atelier rebuilt as GARMENT FLATS**, now on `main` — the 3D figure and `three` are gone (kept on branch `3d-model`). Kameez, shalwar and waistcoat as SVG line art, each measurement marked on the drawing it is taken from. Four ways in are built — a header call to action on every page, a homepage stage, a buy-box fork and a bag nudge. The list is served as content (plan Phase 2) and measurements are SAVED — after a server check and a review, append-only, to the mock (plan Phase 3) — and collar, ban and cuff choices decide which points are asked (plan Phase 5). A customer can copy a tailor's card instead, with the card's photo shown beside the form and never sent (plan Phase 4, FIXTURE conventions). The tailor's rules are rows on the server (plan Phase 6): a rule that REFUSES, and a rule that only ASKS — a quiet note under the field offering "Measure again" or "Keep my number", with what the customer keeps recorded against the rule by name. |

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
  plus a `motion` hover reveal carrying piece count and metreage. It now also
  carries three real controls:
  - a **wishlist heart** (`hooks/use-wishlist.ts`, localStorage — see the gap
    note below);
  - a **quick add**: the bag button opens a size tray that asks
    `/api/quick-add` at that moment, and choosing a size adds the product with
    ONE size applied to every piece;
  - a **frame carousel**: hover advances through the product's photographs
    every 2.5s, arrows step and wrap, dots show position. Using an arrow PINS
    the frame — the automatic advance stops for the rest of that hover, because
    someone who steered to a frame is looking at that frame. Leaving the card
    clears the pin and returns to the first image.

    On TOUCH there are no arrows at all — the card is SWIPED. This is the arrows
    ONLY: the heart and the quick add beside them are DRAWN on a touch device
    instead (see "Phone layout" below), because the difference is whether the
    control has a replacement. A phone has no
    hover, so an arrow revealed by hover is an arrow that does not exist there;
    drawing them permanently instead put two circles over every photograph in
    the grid, which is a worse answer than the gesture people already have for
    pictures. `(hover: none)` hides them AND takes their pointer events, because
    an element at `opacity: 0` still eats taps — without that each card kept two
    invisible 28px hit zones on the edges of its own photograph. `:focus-visible`
    restores both, so a tablet with a keyboard can still reach them.

    The swipe judges the gesture ONCE, at `touchend`: 40px minimum, and rejected
    outright if the vertical movement is larger, so scrolling the page past a
    card never turns a frame. Nothing is prevented during the move, which is
    what leaves the page free to scroll under the finger. It mirrors under RTL,
    read from the document at event time rather than from a prop. A completed
    swipe sets a latch that `onClickCapture` spends: the whole image is an
    anchor, and without it every swipe would also open the product.

    This is why the link overlay is now a CHILD of `ProductCardFrames` rather
    than its sibling — a touch that lands on the anchor bubbles only to the
    anchor's own ancestors, so as a sibling the overlay swallowed every gesture
    before the carousel could see it.

  The card's `<Link>` is an OVERLAY rather than a wrapper, because a `<button>`
  inside an `<a>` is invalid HTML whose clicks navigate before their own handler
  runs. Every control sits above it on its own z-index.
- **Grid** — uniform rows via the `product-grid` utility, scaling
  **2 / 3 / 4 / 6** columns from mobile to 2560px. The vertical stagger is gone
  by operator decision; §28.1's one line asking for a "repeating asymmetric
  grid" is knowingly not met.

  **5 columns went with it, and that is the load-bearing part.** Every column
  count must divide `DEFAULT_PAGE_SIZE` exactly, or a page ends on a part-filled
  row while its next products sit on page 2 — a hole in the grid with stock
  behind it. 24 / 5 = 4.8, so from 1920px every page showed four tiles in its
  last row. 24 divides by 1, 2, 3, 4 and 6. `GRID_COLUMN_COUNTS` in
  `features/catalogue/lib/grid-columns.ts` is the authoritative list and
  `grid-columns.test.ts` asserts the division, so a count that does not divide
  fails the suite instead of appearing as a gap on one monitor width.

  Measured after: 1280 → 4 columns at 206px, 1920 → 4 at 366px, 2560 → 6 at
  343px, every row full at all three.
- **Small screens choose their own density.** Below 48rem a `radiogroup` beside
  Filters offers 1, 2 or 3 columns, on the pattern the operator pointed at on
  Monark. Desktop is deliberately NOT offered the choice: there is one right
  answer at each width and the breakpoints give it.

  The preference is a **cookie**, not localStorage, for the reason the theme is:
  the server can read a cookie, so the first paint is already correct — verified
  by fetching the page's own HTML and finding `data-grid-columns="3"` in the
  server's markup. localStorage would have rendered the default grid and
  relaid every tile once an effect ran. `GridColumnsScope` is a client wrapper
  around SERVER-rendered children, so the filter panel, the grid and every card
  inside it ship no extra JavaScript.

  The CSS override is bounded to `max-width: 47.9375rem`, so a cookie set on a
  phone cannot follow the customer to a desktop and overrule the breakpoints —
  checked with a `3` cookie at 1280px, which still renders 4 columns.
- **A narrow card stacks its name over its price**, via a CONTAINER query on the
  card rather than a media query — what decides it is the card's width, and the
  same card appears in the grid, the search panel and a rail at different widths
  for one viewport. At 3-up on a 375px screen a tile is 104px and the name was
  truncating to "Pl…"; stacked it gets the whole tile. It improves the 2-up
  default too: "Plain Waistcoat Suit" used to truncate and now fits.
- **Filter panel** — all six filters of section 28.1 with contextual facet
  counts, removable chips, Clear all and instant apply. Every control is a
  `<Link>`, so the panel is a Server Component shipping no JavaScript and every
  filter combination is a crawlable URL; `PriceFilter` is the single client leaf,
  because a range needs a submit rather than a navigation per keystroke.

  **There is no rail at any width** — it is a Filters button and a drawer on
  desktop exactly as on a phone, by operator decision. The rail bought one tap
  and cost a fixed 16rem on every listing, which is a sixth of a 1536px page
  spent on controls that are empty most of the time. Removing it also removed
  the DUPLICATE render: `FilterPanel` used to be built twice, once per surface.
  Tiles at 1440px went from 246px to 318px, and four columns now start at 64rem
  rather than 80rem because no rail takes 16rem out of the row.

  `FilterChips` still sits under the toolbar, so what is applied stays visible
  and removable without opening anything — the part of the rail worth keeping,
  at no width.
- **Every native popover animates, from one definition.** `popover-animated` in
  `globals.css` carries the fade, the 0.4rem rise, the 0.98 scale and — the
  subtle part — the `display` / `overlay` `allow-discrete` plumbing and the
  `@starting-style`. The sort menu, the bag's "held for you" explanation and the
  account menu all wear it, so there is one implementation rather than three
  (PD-01).
- **The bag and the filter drawer travel identically** — `slide-over-motion`,
  220ms, each from its own edge. The direction is ONE custom property,
  `--slide-from`, set on `slide-over` and flipped by `slide-over-start` and two
  `[dir='rtl']` rules; it replaced four sign-flipped translate blocks.

  The bag briefly had a fade of its own, after being reported as appearing
  part-way out from the edge and snapping home. Three attempts to fix that as a
  timing problem changed nothing, and it was only settled by REMOVING the
  transition entirely — the operator's suggestion — which showed the panel was
  otherwise correct. The operator then asked for the two to match, so there is
  one implementation again. If the jump returns it is now a clean question:
  identical code and CSS on two surfaces, one of them wrong.
- **The search panel's exit was broken, and had been.** Both states named the
  same animation, with the closing one adding `reverse`. Changing only
  `animation-direction` does NOT restart an animation — the NAME is what the
  browser keys on — so the entry animation, finished long before and held by
  `fill: both`, simply re-evaluated at its reversed end state and the panel
  vanished instantly. It opened beautifully and closed as if the transition had
  been forgotten. `search-overlay-out` is a second name, so a second animation
  starts; verified `running` rather than finished on close.
- **Both toolbar surfaces animate in AND out.** The drawer only ever animated on
  the way out: a `<dialog>` is `display: none` until it opens, and a transition
  cannot run on the first frame an element is rendered, so it snapped open and
  glided shut. `@starting-style` supplies the missing previous value — the
  backdrop fades and the panel slides over 220ms in both directions now.

  The sort popover had no transition at all. It fades, lifts 0.4rem and scales
  from 0.98 over 160ms, and the chevron turns over while it is open — driven by
  `:has(+ .sort-panel:popover-open)`, so there is still no class to toggle and
  still no JavaScript. `display` and `overlay` are transitioned with
  `allow-discrete`; the second is the load-bearing one, because without it the
  panel leaves the TOP LAYER the instant it closes and the exit animation plays
  somewhere nobody can see.

  Verified by driving the transitions by hand, the pane's clock being frozen:
  entry invisible at 0ms, part-faded and still rising at 80ms, settled at 160ms;
  the drawer off-screen at 0ms, halfway at 110ms, seated at 220ms; and all five
  exit transitions present on the popover once the entry is allowed to finish.

  A11Y-10 throughout: reduced motion keeps the fades — something appearing from
  nothing is harder to follow than something that arrives — and drops the travel.
- **Listing head** — title, product count and both controls in ONE grid that
  lays itself out differently at the two sizes rather than being written twice.
  A phone keeps exactly what it had: title and count on the first row, the
  controls spread across the second. From 64rem it collapses to a SINGLE row —
  title at the reading start, then count, Filters and Sort at the end — because
  the two-row version was mostly empty on a wide screen: a heading alone on one
  line, two small buttons alone on the next, a page-width of nothing between
  them. Measured 90px of head height down to 38px at 1440px.

  `grid-template-areas`, not flexbox, and that is the whole reason it works: the
  count has to move BETWEEN groups — beside the title on a phone, beside the
  controls on a desktop — and wrapping only ever pushes the next item onto the
  next line in source order.
- **Sort** — the four options of section 28.1 as a DROPDOWN, not an open row of
  pills. The row spent a whole toolbar line on three choices nobody had made and
  wrapped onto a second line on a phone; collapsed, the toolbar says what the
  order IS and offers to change it.

  It is still a **Server Component shipping no JavaScript**: the panel is a
  native `popover` reached by `popoverTarget`, so the top layer, light-dismiss,
  `Escape` and focus return come from the platform and work before hydration.
  The options stay `<a>` elements, so every sort is still a crawlable URL and
  the `<select>` keyboard trap is still avoided.

  Two details are load-bearing. It is placed with CSS ANCHOR positioning
  (`anchor-name` / `position-anchor`) because a top-layer element's containing
  block is the viewport — `position: absolute` has nothing to hang from — with an
  `@supports not` fallback that pins it under the header rather than letting the
  UA centre it. And the panel is KEYED on the canonical query string: Next
  navigates on the client, so the element survived and the menu stayed open over
  the re-ordered grid; a new key unmounts it, which is how the platform closes a
  popover anyway.

  Below 40rem the "Sort by" prefix is hidden — it was the ~55px that made the
  toolbar wrap at 375px — and an `aria-label` states the full name, because
  `display: none` takes the prefix out of the accessibility tree too.
- **Type-ahead** — a product row opens that product; a term row runs a search.
  `SuggestionOption` carries a typed `destination` union rather than a bare
  search term, so the two cannot be confused. `app/api/suggest/route.ts` is the
  first BFF (DATA-08), and it
  exists because `apiRequest` is `server-only` while the type-ahead runs on
  keystrokes. It proxies and nothing else. The header field is a full ARIA
  combobox: debounced query through TanStack Query, `aria-activedescendant`
  without focus ever leaving the input, wrapping arrow keys, Escape dismissing
  the list before the field, and pointer selection on `mousedown` so it beats
  the blur.
- **Code lookup** — `/search` runs `byCode` alongside the search (PERF-02) and
  REDIRECTS to the product on an exact match, before the availability read,
  because someone typing `AA-1004` off a WhatsApp message has already chosen.
  `CodeMatch` was deleted with the compromise it existed for. The client never decides what a
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

## Card-level single entity — the operator's rule

A catalogue card always sells a product as ONE entity: one unified size, applied
to every piece. The SET model is untouched — `product_type` is still declared,
the fixture still holds two- and three-piece suits, the piece-count filters and
the product page's per-piece override panel all still work. What changed is that
a grid tile is no longer where someone sizes a waistcoat differently from its
shalwar.

`lib/quick-add.ts` holds the one rule that follows: the sizes a card may offer
are the INTERSECTION across pieces, because offering M when the shalwar has none
produces an add the §7.1 transaction refuses — a button that looks live and
fails. §30.2 still holds: an unknown availability is not sold out.

## M2 — what is left

Nothing. The **filter drawer** landed: below 64rem the rail is hidden and the
same `FilterPanel` renders inside a `SlideOver` opening from `inline-start`,
behind a Filters button carrying a count of what is applied. The panel is
rendered twice — once for the rail, once for the drawer — which is the price of
keeping it a Server Component on both surfaces; `PriceFilter` now generates its
ids with `useId` so the two copies cannot collide.

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

`moveToWishlist` is M6. The `/bag` page now renders the real bag: both it and
the panel share `BagContents`, so there is one implementation of a line, its
quantity control and the hold explanation.

## M5 — what is built

**The store can take an order.** Browse → product → bag → checkout → confirmed.

- **The §7.2 transaction** — `src/lib/mocks/checkout-db.ts`, with both rollback
  paths real: a lapsed hold returns `RESERVATION_EXPIRED` **naming the items**,
  and a total that moved returns `PRICE_CHANGED` carrying the new one, because
  "prices are never silently changed under a customer at payment". Reservations
  become allocations under the `allocated <= on_hand` guard, the cart is
  discarded on commit so a refresh cannot place it twice, and steps 7–8 stay
  outside the transaction. **10 tests.**
- **`allocated` is now a real column.** `bag-reservations.ts` tracks it beside
  the holds, and every availability read subtracts both — a unit sold this
  morning is as unavailable as one in somebody's bag.
- **No conditional per payment method, anywhere.** §3.1 forbids it, so the four
  methods are a LIST from `quote()`, each carrying its own label, description and
  availability, and the interface renders the list. A fifth method is a
  configuration entry in Java and changes no file here. `nextStep` was a sixth
  field — a per-method sentence for the confirmation screen — and went with the
  confirmation step itself; see M5's remaining work below.
- **The COD cap is server-side.** `quote()` returns Cash on Delivery disabled
  with a reason above the cap, and `place()` refuses it again — a client that
  never called `quote` is still refused, which is what §17 means by "never only
  in the interface".
- **Single page** (§28.2), guest checkout, React Hook Form + `zodResolver`,
  delivery options, gift wrapping with a message, and a sticky order summary.
- **The order number is the address** — `/order/[orderNumber]`, bookmarkable and
  shareable, which is how §28.3 will track a guest order.

## M5 — what is left

The payment gateway itself: the mock has no gateway to call, so `AUTHORIZED` is
stated rather than obtained.

**Order tracking and the confirmation step are OUT of the MVP** by operator
decision, not pending. The confirmation page no longer carries a "what happens
next" section and no longer promises that an order can be tracked — there is no
flow behind either, and copy that describes one would be a promise nothing can
keep. `nextStep` was removed from the order contract with it, and the payment
guide's promise that Cash on Delivery is "confirmed by SMS before dispatch" went
with it for the same reason. §6.6's per-method order and payment STATES are
untouched; the interface simply does not narrate them.

The page leads instead with a **staged CSS mark**, on the shape of the Lottie
"order placed" the operator linked: a disc that pops in, a ring drawn around it
by `stroke-dashoffset`, the tick drawn last, and eight rays bursting outward as
it lands. It runs **1.4s and starts 120ms late** — deliberately. The first
version finished in 0.78s with no delay, which put it over before the eye had
crossed the page from the navigation, and the operator reported seeing "just the
same tick". An animation nobody catches is indistinguishable from none.

Verified by driving the animation timeline by hand — the preview pane's clock is
frozen, so `Animation.currentTime` was set directly: empty at 0ms, disc alone at
400ms, ring complete with the tick half-drawn at 760ms, rays out at 920ms, whole
mark at 1000ms. Text is plain server-rendered markup; only decoration animates,
so nothing repeats the blank-page bug below.

## Search — the full-width panel

Rebuilt to the Gymshark pattern the operator asked for. It is a `<dialog>`
sheet dropping from the top, not a dropdown: it holds four real product cards
with photography, price, wishlist and quick add, and a field-width menu has
nowhere to put them.

- **The panel is never empty.** Before a keystroke it shows TRENDING SEARCHES
  and BEST SELLERS with a View all; after one, SUGGESTIONS and PRODUCTS with
  `View all "term"`. Same two-column shape either way, so nothing jumps when the
  first character lands.
- **The typed fragment is emboldened inside each suggestion** — `**Bos**ki`.
  That is what makes a row read as "your search, continued" rather than an
  unrelated word, and it is why the suggestions are query REFINEMENTS rather
  than product names.
- **The cards are `ProductCard`**, not a reduced copy, so the hover frames, the
  heart and the quick-add size tray all work inside the panel for free (PD-01).
- `suggest('')` used to short-circuit in `api/suggest.ts` — correct while this
  was a dropdown, wrong now: what fills an empty panel is the BACKEND's answer
  to the empty query, and deciding here that it is nothing would overrule it
  (DATA-13). The test that pinned the old behaviour was rewritten to pin the new.

**Not copied: the star ratings.** §28.6 defers reviews — "a review system with
nothing in it is worse than none" — so there is no rating to show and inventing
one would be a fabricated number on a product card.

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

## Hero — one screen, edge to edge

The film COVERS the hero box (`object-cover`, anchored to the top), and
`hero-frame` caps that box at one screen (`100svh`): exactly one screen in
portrait, and 16:9 at full width in landscape until that would pass the fold. So
the film reaches both side edges at every size and never runs past the first
screen. `svh` rather than `vh`, so "one screen" is the screen with the mobile
browser's toolbar SHOWING.

It used to be a 16:9 stage sized from the box's HEIGHT, with the landscape cap at
125svh. That put the hero past the fold, and left bands at the sides, on anything
wider than 16:9 — and most desktop browser viewports ARE wider than 16:9 once the
browser's own chrome comes off the screen: a 1080p monitor gives about 1920×950.
An **ambient glow** existed to fill those bands — a canvas sampling the playing
frame four times a second, blurred and spilled 7.5rem past the film. It is gone,
with its sampler, the `hero-ambient` utility, the `--spacing-ambient-spill` token
and the `--color-media-band` token that coloured the bands.

`object-top` is deliberate. On a wide screen the crop comes off the BOTTOM,
because the subject's head sits near the top of the frame, and the caption and its
scrim are at the bottom anyway. Checked on a 2560×1080 screenshot: head intact.

Measured before and after — hero height in px, and whether the film reached both
side edges:

| Viewport | Before | After |
| --- | --- | --- |
| 390×844 phone | 844, edges ✓ | 844, edges ✓ |
| 844×390 landscape phone | not measured | 390, edges ✓ |
| 768×1024 tablet | 1024, edges ✓ | 1024, edges ✓ |
| 1024×768 | 576, edges ✓ | 576, edges ✓ |
| 1366×768 laptop | 769 — 1px past the fold | 768, edges ✓ |
| 1920×950 (1080p monitor, real browser) | 1080 by the old rule, not measured — 130px past | 950, edges ✓ |
| 1440×900 | 810, edges ✓ | 810, edges ✓ |
| 1920×1080 | 1080, edges ✓ | 1080, edges ✓ |
| 2560×1440 | not measured | 1440, edges ✓ |
| 2560×1080 ultrawide | **1350 — 270px past, 80px bands each side** | 1080, edges ✓ |

At every size after the change the headline stays inside the hero and there is no
horizontal scroll.

## Auth — what is built

Sign-in, sign-up and password reset, built against architecture §11's exposed
operations rather than invented:

```
authenticate(email, password)      -> Session
authenticateByCode(mobile, code)   -> Session
issueCode(mobile)                  -> void
resetPassword(email)               -> void
```

**Both ways in are first-class.** §11 offers password and mobile-code, and in
this market a customer reliably has a number and may not use email — so the
choice is a visible `radiogroup`, not a "trouble signing in?" link.

§11's invariants are MODELLED in `lib/mocks/auth-db.ts`, not assumed, and **11
tests** pin them:

- **No account enumeration.** A wrong password, an unknown email and a locked
  account return the identical refusal. The password-reset screen says the same
  sentence whatever happened — it is the easiest enumeration oracle to leave
  lying around, because saying "we have no account for that" feels helpful.
- **Codes are single-use and expire** (5 minutes). A spent code is refused.
- **Failed attempts are rate-limited per identifier**, and the lockout applies
  even to a subsequently correct password — the limit is on the identifier, not
  on whether this attempt would have worked.
- **Registration DOES report a collision**, and the asymmetry is deliberate:
  §11's rule governs authentication responses, and a sign-up that refused
  without saying why loses the customer.

The header now shows who is signed in and offers a way out, which it did not
before — it claimed "Sign in" in every state. It is a USER ICON beside the other
header glyphs, and clicking it opens a native popover with the name, email and
mobile plus a sign-out button; signed out, the same icon links to sign-in.

## Wishlist — what is built

- **Contract** — `ENDPOINTS.catalogue.byIds`, several product projections in one
  read. A missing id is ABSENT rather than a 404: a product withdrawn since it
  was saved is an expected outcome of this read, not a failure of it. The order
  of the response follows the order asked for, because a saved list's sequence
  belongs to its owner.
- **BFF** — `/api/products`, the sixth. It exists because the saved-items page
  is a CLIENT screen — it renders the catalogue's own card — so the ids are in
  the browser while `apiRequest` is `server-only`, and it aggregates the cached
  projection with the live availability overlay that §8.2 keeps separate. Ids
  are capped at 100 (SEC-02: the length is untrusted input).
- **The list itself is the ACCOUNT's** since plan Phase 3 — see "the wishlist,
  moved to the account" below. It is no longer per-browser.
- **`features/catalogue/contract.ts`** — a second, CLIENT-SAFE barrel, on the
  precedent the bag already set (STRUCT-06). The main barrel re-exports
  `CatalogueScreen`, which reaches `next/headers` through
  `grid-columns.server.ts`; a Client Component importing it fails the build
  outright. This was found by the wishlist page 500ing, not by reading.

## Try-On (USP 1) — what is built

Architecture §24, and §28.5 already said where it stops: "the `TryOnProvider`
port, the upload flow, guidance screens, white-balance correction, deletion
guarantees and the unavailable state are all built in Release 1. The adapter to
the external service is connected when that service is ready." All of that is
built, and the adapter is written too — it simply has no credential.

**The provider sits behind the MOCK, not in the BFF, and that is the load-bearing
decision.** §24 puts the port inside the Java module. Calling an image model from
a Next Route Handler would look equivalent and would not be: it would put the
storefront on the provider's critical path, give the browser a credential-bearing
surface the real architecture does not have, and teach the interface a shape Java
will never serve — the trap D1 names. So the seam is `lib/mocks/try-on-provider.ts`,
where module 14 will sit. When Java takes over, that file and `try-on-db.ts` are
deleted together and nothing above them changes: not the contract, not the BFF,
not one line of interface.

```
TryOnPanel → POST /api/try-on → generateTryOn() → apiRequest → [MSW = module 14]
                                                                 ├ white balance
                                                                 └ TryOnProvider ← the seam
```

- **It shows appearance, never fit — the operator's rule.** A generated image
  cannot know whether this customer takes a small or a large, so rendering a
  garment as tight or loose would invent a fact and be read as a sizing promise.
  This is why §24's signature takes no size, why nothing upstream sends one, why
  the model is instructed not to exaggerate drape, and why `fitNotice` sits
  ABOVE the button and again beside the result rather than in small print. Fit
  questions belong to the size guide and the Fabric Calculator.
- **No `colour_id` is sent, and that is not an omission.** §6.2 holds colour as
  three DISPLAY fields on the piece — `displayName`, `description`, `hex` — with
  no identifier. There is no colour id in the projection to send, so the product
  determines its own colourway and the backend resolves it (DATA-13). The day the
  catalogue grows selectable colourways, the field joins the schema.
- **The unavailable state is reached honestly, not simulated.** No API key means
  `isConfigured()` is false and `isAvailable()` answers false — the repository's
  default and the state §28.5 describes. *Superseded in the interface:* the product
  page used to draw no try-on button in that state; it now always draws the entry
  (see "The interface, after the operator saw it" below), and the panel is what
  reports the feature unavailable.
- **Absence WAS the unavailable state** — superseded the same way. The reasoning
  was that a button opening a panel to announce the feature is off is a control
  that cannot do its job. The panel's three
  unavailable sentences — disabled, failed, timed out — exist for the real race:
  the offer caches for 60s, so a provider that drops after it was read leaves a
  live button that must fail in words rather than spin forever.
- **White balance is real, and it earns its place in THIS market.** Grey-world
  via `sharp`: channel means are equalised, undoing the cast of the light the
  photo was taken under. Ethnic apparel is bought on colour and most photographs
  are taken under warm tungsten or green fluorescent light, so an uncorrected
  photo drags the garment's rendered colour toward the room — turning a bottle
  green waistcoat olive and making the try-on lie about the one attribute the
  customer opened it to check. A test asserts channel spread > 30 before and < 2
  after. `rotate()` applies EXIF orientation, or every phone portrait arrives
  sideways.
- **Deletion is guaranteed by never writing.** The photograph is a local
  `Uint8Array` for one function call, referenced by nothing that outlives it: no
  disk, no cache, no module map, no log line. There is no delete step because
  there is no stored copy — the strongest form of the guarantee and the only one
  a reader can verify by looking. §24 permits "ephemeral session records only",
  and `TryOnSession` has no field capable of holding an image; a test compares
  its COMPLETE key set, so an edit that starts keeping "just the result, for
  debugging" fails the suite rather than shipping.
- **The limits come from the backend.** `isAvailable()` carries `maxPhotoBytes`
  and `acceptedFormats` alongside the boolean — a deliberate widening of §24's
  bare signature, because a client that hard-coded a ceiling would hold a second
  copy of a backend rule (DATA-13). The browser checks them as an AFFORDANCE
  (saving a doomed 20MB upload on a mobile connection) and the module checks
  them again as the ENFORCEMENT point (SEC-03).
- **AVIF is deliberately not offered** even though the whole catalogue is stored
  in it: the provider does not accept AVIF, so offering it would take a photo the
  module could then never use. The garment shot is converted AVIF→JPEG before it
  is sent, which is required rather than tidy.
- **Seventh BFF**, `app/api/try-on`. It proxies and nothing else, never logs the
  body, and is the first route to carry a SEC-08 origin check — see the note
  under uncommitted work about the six that do not.

### The interface, after the operator saw it

Three things changed once it was on screen, and all three were the operator's
call rather than a refinement of mine.

- **The entry is ALWAYS drawn.** It used to hide itself whenever the backend
  reported no provider, on the reasoning that a control which cannot work should
  not be offered. That is right for an ordinary feature and wrong for a headline
  one: a version of the page with no trace of the try-on cannot be shown,
  demonstrated or reviewed, and "0 try-on buttons" was reported as a success when
  it was the thing making the USP invisible.
- **A centred `Dialog`, not the edge drawer.** `components/ui/dialog/Dialog.tsx`,
  sharing its `<dialog>` lifecycle with `SlideOver` through `use-native-dialog.ts`
  rather than copying it (PD-01). A drawer suits a list you scan down; one task
  with one thing to look at belongs in the middle of the screen.
- **A real waiting state**, `TryOnLoading.tsx` plus four keyframe animations in
  `globals.css`: the photograph developing from grey to colour, a light sweeping
  down it, an indeterminate bar, and three captions crossfading on a 6s cycle.
  The captions are sequenced by three offset `animation-delay` values and nothing
  else — no timer, no interval, no phase state — and they are `aria-hidden`,
  because pushing three rotating strings through a live region would interrupt a
  screen-reader user every two seconds for the length of the wait.

  Verified by driving the timeline by hand, the pane's clock being frozen:
  "Reading your photo" at 600ms, "Matching the colour" at 2600ms, "Placing the
  piece" at 4600ms, with the bar travelling and the photo's grayscale moving
  0.40 → 0.70 → 0.40 across the same samples.

**The SAMPLE result is a placeholder and is labelled as one in three places.**
With no provider connected, `generateTryOn` answers with the garment's own
catalogue photograph after a 2.6s pretend delay. It shows the model the piece
was shot on, NOT the customer, so it is a stand-in for a demonstrable interface
rather than a generated image.

Three things stop it quietly becoming the real thing. The session records it as
`SAMPLE` rather than `READY`, so the module's own history never claims a
generation happened. The policy is PASSED IN (`sampleWhenUnconfigured`) rather
than read inside the module, which is what keeps both branches testable in one
process — an env read inside would only ever be one value per run, and §28.5's
honest unavailable path is the one that must not rot. And the enforcement still
runs first, so the sample is not a way round the size and format checks.

`tryOnOffer()` takes the same policy, because the two answers have to agree: a
panel told the feature was off which then produced an image is a worse state
than either alone. `TRY_ON_SAMPLE_RESULT=disabled` turns it off without a
provider; a configured provider ignores it entirely.

### What is left

**A real generation.** Everything was exercised live with a placeholder key —
guidance, picker, client rejection of AVIF, preview, white-balance correction on
a real 268KB photo, the garment conversion, a genuine HTTPS call to the provider,
its refusal, and the failure copy — but a successful image needs a real
`TRY_ON_PROVIDER_API_KEY` in `.env.local`. Adding one is the whole switch-on:
no code change, no release. Generations are metered and billed.

The prompt itself is unproven against real output and should be expected to need
tuning once someone can see results.

## D6 append-only — what changed in the tree

Operator decision, applied across the mock layer and the API surface. CLAUDE.md
carries the rule; this is where it landed.

- **No `DELETE` anywhere.** `http.delete` and `method: 'DELETE'` return zero
  matches in `src/` and `app/`. The two that existed became POSTs to `/removal`
  sub-resources: `ENDPOINTS.bag.lineRemoval`, `ENDPOINTS.bag.codeRemoval`, and
  the BFF equivalents at `app/api/bag/lines/[lineId]/removal` and
  `app/api/bag/code/removal`.
- **`bag-reservations.ts` is now a ledger.** Every row carries
  `ACTIVE | RELEASED | EXPIRED | ALLOCATED` plus `settledAt`; `release`,
  `releaseCart` and `allocate` settle rows instead of splicing them, and
  `sweepExpired` MOVES non-active rows into an `ARCHIVE` array rather than
  dropping them — which is what keeps the hot table small AND keeps the history.
- **`isActive` is the load-bearing function.** It checks status AND expiry.
  Deletion used to do half of that implicitly, and getting it wrong UNDERSELLS
  silently rather than overselling.
- **`reserve` only refreshes an ACTIVE row.** A settled one is history: re-adding
  a line the customer removed starts a NEW hold rather than resurrecting the
  released one, so the removal survives.
- **`bag-db.ts`** marks lines removed (`CUSTOMER` or `EXPIRED`) and keeps a
  `CodeEvent[]` per cart, so applying a second code lifts the first rather than
  overwriting it. `summaryFor` returns the ACTIVE projection, so the customer
  sees exactly what they saw before.
- **`discardCart` became `convertCart(cartId, orderNumber)`.** A converted cart
  still exists but stops answering as a bag — `summaryFor` returns null, the
  handler answers 404, and the BFF already renders that as an empty bag. Zero
  interface change.
- **Four tests pin the guarantee** in `bag-db.test.ts` (`D6 provenance`): a
  removed line stays on file with its reason, its reservations read `RELEASED`
  while the stock is genuinely free again, superseded codes are both kept, and a
  settled reservation is archived rather than deleted.

Verified: **typecheck, lint and 198 tests pass**, and the bag was **exercised by
hand in the running store** — adding a three-piece SET and then removing the line
empties the bag and frees the size again on the product page, which is the whole
`POST /api/bag/lines/{lineId}/removal` path across the real HTTP boundary. That
is the part the tests cannot reach, since they stop at the mock layer.

The production build has still NOT been run against this change.

## Made-to-Measure (USP 2) — what is built

Architecture §34, amended by §34.6a. The **measurement atelier** at `/stitched`,
public and usable without buying anything.

**The customer measures a GARMENT, not a body**, and that single decision is what
the whole page is shaped by. §34.8 already made *copy a garment you already own*
the Release 1 path; the operator confirmed it is the one to build. Somebody
measuring a kameez they already own needs no second person, no guess at ease, and
copies a fit they have already approved — so the drawing that helps is a picture
of the garment, not of a torso.

**`three` is GONE, and with it the `BASE-01` / `PERF-10` override.** The previous
pass put a real 3D mesh on this route at ~1.5 MB for `three`'s core chunk alone.
The operator's reason for removing it is the market: 3D rendering is a hard ask
on a slow connection, and the store sells no Western clothing, so the variety a
general 3D figure buys is variety nobody needs. The whole application's client
JavaScript is now **1.48 MB across 29 chunks**, the largest of them 367 kB — less
in total than the one chunk that was deleted. `grep` for `THREE` or
`WebGLRenderer` in the built output returns nothing.

**The 3D version is not deleted — it lives on branch `3d-model`** (`62363d3`),
forked from `main` before the flats were fast-forwarded in, so nothing was
rewritten. That branch still lists `three` in `package.json`, but the
`node_modules` on this machine no longer has it: run `npm install` after checking
it out, or `/stitched` will not build there.

- **Three flats, drawn as tailor's patterns** — `lib/garment-drawings.ts`. Kameez
  (band collar, placket, buttons, tapered sleeves with cuffs, A-line body, side
  slits), shalwar (wide belt with the cloth gathered onto it, a nala, drape
  falling through the leg, curved inseams and a hard taper to a cuffed paincha),
  waistcoat (scooped armholes, deep V, welt pockets, pointed hem). Each is a
  closed silhouette plus detail strokes in its own viewBox.

  **The shalwar took five passes, and only one of them fixed the real thing.** The
  one number that was ever wrong is where the CROTCH sits. At 57%, and again at
  44%, the legs came out shorter than the block above them, which no human is,
  and it read as clown trousers. Rounder inseams, a drafted waist, a schematic
  pared back to straight lines — all of it was tried while that number stayed
  wrong. The draft has it: crotch depth is one third of the hip below the waist,
  about 13 in on a 40 in shalwar, so the block above is 74 units here against 152
  of leg — near enough the 1:2 a person actually is.

  **A shalwar is WIDE, and the drawing has to say so.** The pared-back schematic
  was correct in outline and read as a trouser; the operator's call was to go back
  to the drafted version. Four things carry the fullness and all four earn their
  place: a wide belt with the cloth GATHERED onto it, the nala hanging out of the
  centre front, the drape falling on down the leg, and inseams that CURVE, because
  the garment holds far more cloth than the leg needs.

  **The fullness lives in the INNER angle, not in the outer taper.** The outer
  sides are PERFECTLY VERTICAL — one line from waist to ankle, no taper and no
  kink at the hip — so the silhouette is a rectangle with a wide curved V cut out
  of the bottom, and every bit of shaping is on the inside. The paincha is held at
  28 units whatever the splay does: it is a measurement, not a consequence of the
  drawing, and widening the ankle to suit a wider stance would be the picture
  telling a lie about a number the customer types in.

  **The gusset is deliberately not drawn.** It is real construction — a square set
  on point at the crotch — and it was tried both ways: as a closed diamond it sits
  in open cloth and reads as an applied patch, and as its two lower seams alone it
  reads as a chevron pointing at nothing. It is an inside seam on a front view and
  no measurement is taken from it.

  **Gathers and drape folds must not start at the same height.** Run together from
  the band, twelve strokes at four different lengths read as a picket fence rather
  than as cloth. The gathers are short and even; the folds pick up below them.

- **THE SHAPE OF A MARK IS ITS ARITHMETIC.** This is the load-bearing rule and it
  survives from the 3D work intact — only now it is drawn rather than modelled.
  A **RING** is an ellipse: measured ACROSS the flat garment and DOUBLED, because
  the garment is folded in half on the table. A **SPAN** is an arrow: read
  straight off the tape. On a flat both would otherwise be a horizontal line
  across the same cloth, and confusing them is the commonest measuring error
  there is. The readout shows both figures as they are entered — `21 in across →
  42 in around` — so nobody types a circumference they guessed at. The record
  stays the circumference (§34.7), and the field bounds are HALVED back from it
  before they are shown.

- **A cuff is not horizontal, so nor is the ring on it.** `rotate` on a RING is
  what keeps the ellipse following the cuff seam instead of crossing it.

- **Marks are real buttons over the drawing** (A11Y-01), positioned by percentage,
  each with an `sr-only` name; the SVG itself is `aria-hidden`, because it repeats
  what the fields already say. Clicking a mark focuses its field, focusing a field
  marks the drawing, and a jump link in the error summary does both **and**
  switches the garment.

- **A mark sits ON the thing measured, not at the middle of the garment.** A ring
  is anchored at its outer extremity and a span a third of the way along. The
  midpoint of a chest or a shoulder is the centre front, which is the busiest line
  on every one of these drawings — a dot there lands among the placket buttons and
  is taken for one. `garments.test.ts` asserts a minimum separation between every
  pair of marks on a garment, so a coordinate edit that puts two 36px hit areas on
  top of each other fails the suite instead of shipping.

- **The form does not scold.** Nothing goes red until the customer tries to save,
  and a failed submit focuses the SUMMARY rather than the first bad field — with
  thirteen required measurements, landing in one empty box says nothing about the
  other twelve. React Hook Form's `shouldFocusError` had to be turned OFF for
  that: it focuses the first errored field by default and runs after the effect,
  so it silently won.

- **One rule for "measured", in one place.** `lib/entries.ts` decides what counts,
  and the marks, the progress counter and the validation all read it — otherwise a
  value can light a mark, tick the counter, and then fail on submit.

- **It follows the page theme with no second lighting set.** Line art has no
  ground of its own: the strokes are `--color-fg` and simply invert. That is the
  whole of what the 3D version needed two lighting rigs and a bloom pass for.

- **48 tests** (vitest, after plan Phase 1) across `garments`, `measurement-set`,
  `conversion`, `entries` and `units`, covering the doubling,
  the round-trip, the bounds being stated on the stored figure, every annotation
  falling inside its own viewBox, the anchor rules, and the mark separation.

Verified: **typecheck, lint, 235 tests and the production build all pass**, with
`/stitched` in the build output. Measured in the running store rather than
eyeballed: tabbing through five empty fields leaves **0** invalid fields and **0**
alert nodes; submitting empty gives **13** invalid fields, the summary heading,
**13** jump links, and focus on the summary; typing 21 into the kameez chest reads
`21 in across → 42 in around` and the toggle round-trips it to 56 cm and back;
clicking the sleeve mark focuses `kameezSleeve`; the thigh jump link switches the
drawing to the shalwar; and the page renders correctly light, dark, at 1440px and
at 390px. Urdu was checked at `dir="rtl"` — every string, `13 میں سے 1 ناپ لیے گئے`,
and the readout as `21 انچ آر پار ← 42 انچ گھیر`.

## Made-to-Measure — entry points

The studio used to exist with nothing pointing at it. There are four ways in
now, each checked in the running store:

- **A header call to action on every page** — a GOLD "Stitched to size" pill
  beside search. It is a deliberate exception to "the header carries no
  navigation": that rule is against three links to one listing, and this is the
  only way into a different feature. Gold rather than jade, because gold is the
  studio's own mark — the rings on the drawings are stroked in it — and jade is
  what everything else in the store is sold with. It is a plain `next/link`, not
  `ButtonLink`: the button primitive's small size is 32px tall and the bar's icon
  controls are 36px, so it sat on a different line from its neighbours, which is
  what "not sitting inside" was. All four controls are now 36×36 at one top;
  below `sm` it is a 36px square with a 20px ruler and the label kept `sr-only`,
  so the accessible name survives.
- **A homepage stage**, `STITCHING_ENTRY`, directly under the hero on a
  `brand-700` band. Its picture is the store's own drawing instead of a stock
  photograph: the studio's three garment flats (`GarmentMark`, reached through
  the static-only `made-to-measure/contract` barrel so the homepage does not pull
  in the studio's client boundary), each carrying one gold ring. The steps are
  gold numerals rather than digits in bordered pills, and the button is the new
  `onBrand` variant — `secondary` inverts to a dark grey box on this band in dark
  mode. **The eyebrow is gone at the SCHEMA**, not only in the markup: a kicker
  above a heading is banned by the design floor, and a contract still demanding
  one invites it back. One flat below `md`, because three in a phone's column is
  about 106px each.
- **A fork in the buy box**, directly under Add to bag, because that is where a
  customer who cannot find their size is already looking. Drawn only when the
  product carries a backend-declared `stitching` offer (`null`, or since plan
  Phase 2 `{ garmentStyle, leadTimeDays }` — the studio's own style offer), so the
  interface never decides which garments the workshop will cut (DATA-13), and the
  fork opens the studio on that style's list. It is NO LONGER A
  CARD — border, radius, padding and filled disc are gone, because the buy box
  around it has no containers and the box read as a sticker on the page.
- **A bag nudge**, now `StitchingNudge` — extracted because `BagContents` was past
  MOD-03's soft ceiling. Same shape as the fork. A standing invitation,
  deliberately NOT a claim about any line, since a bag line carries no stitching
  offer. The dashed grey box is gone: that is the drop-zone idiom and it read as a
  placeholder. Stacked, the question gets the full width and fits one line at
  390px, where it used to wrap to three.

**The measure line** is what the fork and the nudge carry instead of a border: a
1px gold rule dashed 4 on, 3.5 off — the studio ring's own dash, unrolled
straight. A repeating gradient rather than a dashed border, because a border's
dash phase cannot be moved; on hover or keyboard focus the tape advances two dash
periods and rests. The direction flips under RTL through `--measure-march`, and
the motion exists only under `prefers-reduced-motion: no-preference`.

**Gold is a mark, never a voice.** `accent-500` as TEXT measured 2.29:1 on the
light surface, and the fork's old `text-brand-600` call to action measured
**2.82:1** on the dark one — a real A11Y-07 failure. Gold now appears only as
stroke, rule, a fill behind dark text (`--color-on-accent`) and numerals on the
jade band; every link-like line is `text-fg` plus an underline.

Verified in the running store:

| Check | Result |
| --- | --- |
| Stage contrast, light | heading 9.0, body 7.62, gold numerals 5.23, button 9.0 |
| Stage body, dark | 7.57 |
| Header call to action | 10.27 |
| Fork call to action | 16.94 light, 16.45 dark — was 2.82 |
| Fork body | 5.35 light |
| Header, 1440 and 390 | four controls, all 36×36, one top |
| Stage, 1440 | three flats at 300px each; the waistcoat 0.77× the kameez's height, as its viewBox says; strokes 1.25px and not scaling |
| Stage, 390 | one flat, 208px wide; the band 899px tall, down from 1053; no horizontal scroll |
| Bag, 390 | nudge 342px wide, no border or padding, question on one line |
| RTL | flats swap order and do NOT mirror; chevrons turn 180°; the march runs −15px |
| Focus on the jade band | ring resolves to `--color-on-brand`; the global `brand-500` ring there would be jade on jade |
| Reduced motion | the march exists only under `no-preference`, confirmed in the compiled CSS |

**Not observable from here: the march's feel.** The pane's animation clock is
frozen, so the rule and its keyframes were confirmed present and the motion
itself needs a human hover.

**typecheck, lint, 235 tests and the production build pass.**

## Made-to-Measure — focus mode on a phone

Operator report: on a phone, choosing a field hid the guide. Stacked, the drawing
is pinned to the top and the form scrolls up OVER it, so the drawing was covered
at exactly the moment somebody reached a field and needed it.

Below 64rem — every stacked layout, so phones and portrait tablets; the split
layout is untouched — an active measurement now turns the studio into one fixed
sheet under the bar: that field and a stepper (Previous · n of 13 · Next · Done)
at the top, the drawing and its caption filling the rest.

- **Every other field is visually hidden, NOT removed.** They stay in the tab
  order, so Tab and a phone keyboard's own next-field arrows still move through
  the set and focus mode follows. `form.setFocus` on a `display: none` input is
  also a silent no-op, which would have broken both the stepper and the marks.
- **Return moves to the next measurement** instead of submitting a form whose
  other twelve fields are out of sight; on the last one it leaves focus mode.
  Escape leaves too — unverifiable here, since the harness swallows Escape.
- **Done hands focus to the field's ROW** (`tabIndex -1`) and scrolls it into
  view. Focusing the input instead would reopen the keyboard, and focus mode with
  it.
- **Placed from `visualViewport`, not `dvh`.** A phone keyboard covers the page
  without shrinking `100dvh` — iOS never resizes for it, and Chrome on Android
  stopped at 108 — and iOS then PANS the visible area down the layout. The sheet
  takes its height (`--mm-visible`) and its top (`--mm-top`) from the shared
  `useVisibleHeight` / `useVisibleTop`, both `null` while the reader has
  pinch-zoomed so that a zoom still magnifies. The page beneath is locked while
  the sheet is up.
- **The breakpoint exists once, in the stylesheet.** `useFocusMode` decides focus
  mode is on by whether the stepper is drawn, so no second copy of 64rem can
  drift.
- **`z-sheet` (800)** joins the z-index scale, under `z-header`.
- **A pointer activates a field on its CLICK, not on focus** — see the ghost-click
  note under "Things that cost time". The press is recorded by a NATIVE
  `pointerdown` listener registered as the module loads, because on a page fresh
  from the server the studio's first press never reached React's handler. Verified
  with an event log on a fresh load: press, focus and click all on Chest, focus
  mode switching on only after the click.

Verified at 390×844 in the running store: tapping Chest activates Chest; one
field shown; the sheet 780px tall under the 64px bar, the drawing 342×484 and the
caption ending at 832px; Return moved Shoulder → Chest with no submit and no error
summary; Next moved on; Done brought back all 13 fields with focus on the row and
the row in view; the drawing's Shoulder mark opened "1 of 13" with Previous
disabled; title, tabs and Save hidden; no horizontal scroll. At 390×480 — about
what a phone leaves with its keyboard up — everything still fits; the drawing is
held at a 7rem floor, below which the sheet scrolls rather than lose the guide.
At 1440 nothing changes: grid layout, sticky stage, stepper not drawn, and Save
still submits (13 invalid, focus on the summary).

**An adversarial review found nine real defects, all fixed** (three lenses, each
finding checked by an independent skeptic; two further claims were refuted):

- A press that turned into a scroll left a "pressed" flag set for good, after which
  the keyboard's next-field arrow landed in a field without showing it, and the
  customer typed into a field they could not see. The press is now remembered by
  TIME and spent by the focus it causes; and in focus mode whichever measurement
  input takes focus becomes the one shown, whatever any flag says.
- With the keyboard up, iOS pans the visible area and would have carried the sheet
  off the top. It is now placed from `visualViewport.offsetTop` too, with the page
  beneath locked.
- The studio's inputs were 14px, so iOS zoomed in on focus — cropping the sheet
  sideways, and `height × scale` then made it taller than the screen. Stacked, the
  inputs are 16px, and the scale arithmetic is gone.
- Tab past Done went to footer links hidden under the sheet, with focus mode still
  on. Focus leaving the sheet now ends focus mode.
- Return in a field other than the active one fell through to implicit submission
  with Save and the error summary out of sight. Return from any measurement field
  now steps.
- Short and sideways screens starved the drawing. The generic caption line goes in
  focus mode — the field's hint and the "across → around" readout carry it — an
  empty caption plate is hidden, the stepper is `sm`, and a phone on its side puts
  the field and the drawing side by side.

Re-verified in the running store: the drawing at 390×844 is 342×557 (was 484 tall);
Tab moves the shown field; a press followed two seconds later by keyboard focus
activates the field; Tab past Done lands on the footer's first link with focus mode
off and the page unlocked; at 844×390 the field sits beside the drawing; inputs are
16px; no horizontal scroll anywhere.

**Not verifiable here: the on-screen keyboard itself.** The visual-viewport
sizing, and Previous/Next keeping the keyboard up (`onMouseDown` preventDefault),
need a real phone.

## Made-to-Measure — plan Phase 1: the client's order

The plan is `.claude/working-docs/made-to-measure-plan.md`, approved for full
implementation on 11 September 2026; its build-status table is the place to look
for where the phases stand. The architecture changes it needs are PROPOSED in
`made-to-measure-amendment-2.md` and are **not** in `system-architecture.md` —
the code implements them ahead of that decision.

- **The client's order.** Kameez Length, Sleeve, Shoulder, Neck, Chest, Hem, then
  Cuff; shalwar Length, Poncha, then Waist and Thigh; the waistcoat after. The
  eight the client listed are required and everything else is optional and says
  so. The fields, the stepper, Tab and the error list all walk the one order, and
  `measurement-set.test.ts` pins the client's eight.
- **Three facts per point, kept apart.** `kind` (GIRTH | LENGTH | WIDTH) decides
  only the drawn shape; `enteredAs` (HALF | FULL) decides the arithmetic; `basis`
  (GARMENT | BODY) says what the number describes. The doubling used to follow the
  drawn ring, which refused the client's own card figures and could not express a
  neck. The hint and the readout follow the arithmetic: "19.5 in across → 39 in
  around" for a half, "15.5 in around" for a full neck, and a full girth is never
  told "we double it".
- **Neck is a field with no mark.** A GIRTH read in full on the opened band,
  13–20 in. The front view cannot show a neck truthfully — a line across the
  fastened band pictures half of one — so the mark waits for a drawing of the
  band laid open, and `GarmentFlat`, the anchors and the separation test skip a
  point with no mark.
- **One conversion order**, in `lib/conversion.ts`: multiply into millimetres,
  double if half, round ONCE. Rounding first had made 19.5 across 990 mm and 39
  around 991 mm. `enteredBounds` states the range a field accepts, rounded INWARD
  so the printed range never admits a value the field refuses; the schema, the
  progress count, the marks and the error text all ask `acceptsEntry`.
- **Typed values are never rewritten.** Inches show two decimals and centimetres
  one; a unit switch converts FROM what was typed (`useUnitConversion`), so 18.25
  goes to 46.4 cm and comes back as exactly 18.25 — verified in the store.
- **The fixture moved to `lib/measurement-set.ts`** — and in Phase 2 on into the
  mock backend, leaving that file as pure queries over a served list. Four new
  fields on fourteen points would have taken `garments.ts` past its 300-line
  ceiling; it now holds only the per-point arithmetic.
- **One KNOWN OVERLAP, named in a test: the shalwar waist** (650–1800 mm). On a
  nala shalwar the nefa gathers on the cord, and a gathered and a spread reading
  both fall in range; the instruction says to loosen the nala and spread the nefa
  flat, and the client is asked which shalwar they sew. Every other half point's
  maximum is under twice its minimum: the cuff narrowed to 180–305 mm, the hem to
  a 1790 mm ceiling, and the poncha's minimum rose from 200 to 330 mm — 200 was an
  opening no foot passes through, and was the only thing making it overlap.
- **A unit switch never makes an accepted figure refused.** The display rounds to
  nearest while the bounds round inward, so a figure ON a limit crossed it — a
  33 cm neck showed as 12.99 in beside a 13 in minimum, on 11 of the 14 points.
  `showAccepted` shows such a figure at the limit it sits on, one display step
  away; a test walks every accepted value of every point in both directions.
- **The studio's Urdu needs a native tailor's review before any demo.** The thigh
  instruction had carried a misspelling with an obscene reading (fixed), and the
  shalwar instructions named the cord where they meant the nefa (fixed).
- **Honest copy.** The page no longer says "we will cut" or "we will show you
  every measurement again before you pay", and the button checks rather than
  saves — there is no save, order or payment behind it yet.
- **Deviation from the plan:** the stepper's "n of 14" still counts every point,
  because it is a position in the walk; only the progress count is required-only.

**Demo caveat:** this is the copy-a-garment path, so the client's own "teera 8.5"
is still refused — a garment's shoulder is taken whole. The tailor's-card path is
Phase 4.

Verified, after the review's fixes: typecheck, lint, **259 tests** (52 in this
feature) and the production build pass. A 33 cm neck and a 75 cm chest switched
to inches read 13 and 29.52, still counted, and came back as exactly 33 and 75.
In the running store at 1440px: the fields in the client's order with "(optional)"
labels, no neck mark, "0 of 8 required measurements taken", the chest and neck
readouts above, 18.25 / 19.5 / 15.5 surviving inches → centimetres → inches, and a
submit with only the eight required fields filled passing with no error. In Urdu
the page is `dir="rtl"`, with "کف (اختیاری)", the neck instruction and
"8 میں سے 0 ضروری ناپ لیے گئے".

## Made-to-Measure — plan Phase 2: the list served as content

The studio no longer holds a measurement list. It reads three things from the
backend — mocked at the HTTP boundary like everything else (D1) — and editing a
data row changes the form without touching a component.

- **Three reads** (`api/fetch-studio.ts`), all content, all cached with tags: the
  style offers (`madeToMeasure.styles`), one style's list (`madeToMeasure.set`,
  `?style=`, a 404 becoming `ok(null)`), and the wording by id for every style in
  one language (`localisation.measurementCopy`, `?locale=`). The mock is
  `src/lib/mocks/measurement-sets-db.ts`: KAMEEZ_SHALWAR (11 points) and
  WAISTCOAT_SUIT (14, the waistcoat required), at 7 and 10 days — FIXTURE.
- **The contract refuses what the studio cannot use** — a point or piece declared
  twice, a piece resuming after another has begun, a point on an undeclared piece,
  a minimum not below its maximum, a half on anything but a girth, a ring on a
  length or a span on a girth, a drawing the storefront does not have, an id that
  is not a plain code, an empty list.
- **What parses but cannot be drawn is degraded, not refused.** `lib/marks.ts`
  drops a shape outside its drawing, or within 24 units of an earlier mark on the
  same garment, and logs it once (`logContentIssue`); the field still works. A
  point with no WORDS is refused — a field with no name cannot be filled — so
  `joinCopy` names the ids and the page shows its unavailable state.
- **A style is an address.** `/stitched?style=WAISTCOAT_SUIT`. A bare, stale or
  malformed address opens the FIRST style offered, so no style is named in code
  (D5). `StyleChooser` is two links with `aria-current`, hidden in focus mode. The
  navigation stays on the client and the studio stays mounted, so every figure
  typed survives a switch; a chosen point or garment the new list lacks falls back.
- **The split MOD-03 asked for:** `useMeasurementForm` (form, unit, submit, summary
  focus), `MeasurementStage` (the drawing side), `MeasurementPanel` (the form
  side). Every lib function and hook takes the list as an argument.
- **The homepage emblem is picture data** — each drawing declares its own
  `emblem` — so the homepage makes no read for it. `EMBLEM_RING`, `measurementById`
  and the barrel's list exports are gone, and `GarmentId` is `DrawingId`.
- **The product page's offer IS the studio's offer**: `stitchingOfferSchema` is
  `styleOfferSchema`, through the contract barrel, and the fork opens the style the
  product is cut as. A boy's kurta carries no offer, because every served bound is
  an adult's.
- **The message files lose the measurement wording** (it is served now) and gain
  `styleLabel` and `unavailable`.
- **Two defects found in the store, fixed:** the error summary read "Shoulder …
  Shoulder" on a suit — it is grouped by garment now; and "every figure is within
  range" would have survived a switch to a style with empty required fields —
  `isReviewing` is derived, so it holds only while it is true.
- `/stitched` has its own `loading.tsx` (a skeleton on the studio's own grid) and
  `error.tsx`.

**A four-lens review (correctness, the rulebook, usability, the plan) found real
defects, all fixed:**

- **A unit switch skipped figures kept from another style**, so a 20 in waistcoat
  chest came back as "20" beside "cm", counted as nothing, and a second switch
  rewrote it for good. `lib/unit-switch.ts` now converts every figure the form
  holds; verified in the store — 20 in kept across a switch to the kameez shalwar
  and to centimetres came back as 50.8 cm, still counted.
- **A one-piece kurta opened the kameez shalwar list** and was asked for a shalwar
  it was not buying. A KURTA list is served; a test holds every product's list to
  as many garments as the product has pieces.
- **A point chosen on one list came back chosen** when that list returned, which
  on a phone locked the page into an empty focus mode. A new list now resets the
  choice while rendering.
- A turned ring was checked for "inside its drawing" unturned; the contract let
  through a garment with nothing to measure and a style offered twice; a style
  with no NAME in one language took the whole page down (it is now left out and
  reported); a unit switch left stale errors (they are judged again); "every
  figure is within range" could hold beside a kept out-of-range figure.
- **Rules:** a hook body at 79 lines against MOD-03's 60 (the submit logic is now
  `useSummarySubmit`); three components over 7 props (messages come from
  `useMessages()`); the offer schema used by two features promoted to
  `lib/domain/style-offer.ts` (STRUCT-05) and the product read tagged
  `made-to-measure` too; capitals on served garment names (I18N-09); an `as` cast,
  template-literal classes, inline prop types, an untyped schema builder, a
  duplicated unit suffix, the mock file past 300 lines (now split into lists and
  words).
- **Usability:** gold focus rings at about 1.7:1 are the store's jade ring now; a
  style switch has a pending state, a polite announcement ("Waistcoat suit: 14
  measurements to take.") and a line saying figures are kept; the style choice is
  an underlined strip, no longer the garment tabs' pill; it REPLACES the address,
  so Back leaves the studio; the suit's second shoulder and chest are named
  "Waistcoat shoulder" and "Waistcoat chest" in the content; the unavailable page
  has a heading, "Try again" and "Shop standard sizes"; the skeleton holds every
  block the panel will; the lead no longer says "kameez" on a waistcoat list.

Verified: typecheck, lint, **296 tests** (89 in this feature and the domain) and
the production build pass. In the running store: 11 fields for the kameez shalwar, 14 for the
suit, and `?style=NOPE` falling back to 11; 21 typed in the chest survived a
switch to the suit with "1 of 11"; a submit on the suit gave 10 errors in three
garment groups with focus on the summary; at 390×844 focus mode on the suit reads
"14 of 14" with Next disabled and the chooser hidden; in Urdu the served words
render at `dir="rtl"`, "11 میں سے 0 ضروری ناپ لیے گئے" among them. The plan's own
checks, run with the mock temporarily bent and then restored: swapped rows reorder
the form; a mark pushed off its drawing is dropped and logged while the page
renders; a corrupted row gives the error state, with `points.12` named in the log;
a missing Urdu word gives the error state in Urdu only; the homepage still draws
all three emblems. And when MSW died mid-session, the studio showed its own
unavailable state and logged `[made-to-measure] NETWORK` once.

## Made-to-Measure — plan Phase 3: a real save, with a review first

**Measurements can be saved now** — against the mock backend, so into memory.

- **Check, review, save.** "Check my measurements" validates in the browser (an
  affordance), then asks the server's `validate` through
  `/api/made-to-measure/check`. A refusal lands on the field it is about and in
  the grouped summary, in our words — the server sends a REASON, never a sentence
  (`lib/field-problems.ts`). A pass shows the review; "Save my measurements" calls
  `saveProfile` through `/api/made-to-measure/profiles`; the confirmation says
  what was saved, whether it replaced an earlier save, and where it is kept — with
  the account, or "for this browser only, and not linked to an account".
- **What is sent is what was TYPED**: per point the figure as a string and the unit
  it was typed in (`typedEntriesOf`) — never the converted figure a unit switch
  put in the field, and never a figure kept from another style. The server
  derives the millimetres from the list VERSION it served (A2-2), so 19.5 in
  across records 991 mm with centimetres on screen (a test).
- **The review shows every figure twice**, as typed and as kept, one table per
  garment. The kept figure is the SERVER's millimetres in the customer's unit;
  within the record's half-millimetre rounding it is shown as the customer's own
  figure (`keptFigure`) — straight back, 24 in read as 24.02 and looked altered.
  A real difference, such as a server holding a point FULL, still shows.
- **Append-only (§34.7, D6).** Each save is a new version; the one it replaces is
  marked `supersededBy` and kept. Every list version stays servable, and a
  version the server no longer serves is refused as `SET_VERSION_UNKNOWN` — the
  page then says the guide changed.
- **The owner never comes from the body.** The BFF attaches it
  (`API_HEADERS.measurementOwner`): the D3 mock session's email, or for a guest an
  httpOnly `aa_measurements` cookie written only when they first SAVE. Both routes
  refuse another origin (SEC-08).
- **Mock rules, FIXTURE** (`lib/mocks/profile-rules.ts`): the derivation, bounds,
  required points, an unreadable figure, an unknown point, and one placeholder hard
  rule — the hem at least the chest, `hemAtLeastChest` — until the client's list
  (Phase 6). The store, the owners and the version check are `profiles-db.ts`; the
  points and lists are `measurement-points-db.ts` and `measurement-sets-db.ts`.
- The "every figure is within range" notice is gone: the review replaced it.

**The Phase 3 review** (four lenses: security and data, state, interface, plan)
found real defects, all fixed:

- **A forged device cookie could supersede an account's profiles** — the store was
  keyed by the key alone, so `DEVICE:someone@example.com` was the same owner as
  `ACCOUNT:someone@example.com`. Owners are now keyed by kind AND key. Device tokens
  are minted by the module (`ENDPOINTS.madeToMeasure.deviceTokens`), and a token it
  never issued is refused; the BFF then mints a fresh one and retries once
  (`saveForCustomer`), as the bag does with a dead cart id. The cookie is written
  only once a save SUCCEEDS, with the cart's options (`capabilityCookieOptions`).
- **Only the current list version is accepted.** An open tab over a retired list is
  refused as `SET_VERSION_SUPERSEDED`, and the page offers "Load the new guide" (a
  `router.refresh()` the figures survive) rather than telling the customer to reload.
- **The contract tightened**: a figure is ASCII digits, four and two at most, and
  anything else is `UNREADABLE` (`0x15` used to parse as 21); each point once; at
  least one; findings carry a `ruleId`; a profile carries `source` and its
  acknowledgements. Urdu keyboard digits are normalised before sending.
- **The step is derived, not copied** (STATE-02): `useProfileSave` reads its
  EDITING / REVIEWING / SAVED union straight off two TanStack mutations, both
  through `unwrap` (DATA-03a). An answer landing after a style switch is ignored; a
  refused save goes back to the fields with focus on the summary; a rejection
  carrying only confirmations goes on the fields instead of reading as a changed
  list; a finding on a point the page lacks is judged stale instead of vanishing.
- **A finding stands only while its figures do** (`useServerFindings`): changing
  the chest clears the hem's "smaller than the Chest".
- **Interface.** "Checking…" and "Saving…" with `aria-busy` rather than disabled
  buttons, which dropped focus; the drawing's marks are inert outside the fields;
  the review's "as typed" is the string as sent; below a 26rem panel the typed
  figure moves under the measurement's name, and the garments' tables share one
  column layout; the confirmation lost the word "version", gained a way on, and
  "Measure again" became "Change and save again".
- **Rules.** The 304-line mock was split under MOD-03, three function bodies over
  60 lines were split into `useStudioSelection`, `ReviewTable` and a narrower
  `StudioFlow`, the dead browser derivation (`recordedMm`) went, and
  `fieldRowId`, `formatList`, `NO_STORE` and `readJsonBody` are shared helpers.

**D3, recorded rather than patched:** the account owner comes from the mock session
cookie, which is unsigned JSON. Anyone can write one and save as any email. That is
D3's placeholder working as designed — §11 (M6) replaces it with a session Java
verifies — and it confers nothing beyond these mock profiles.

Verified in the running store: a hem of 24 in across under a 25 in chest passed
the browser's own range and was refused by the server on the hem, "This came out
smaller than the Chest…", with focus on the summary; fixed to 26, the review
listed eight rows in the served order ("25 in across → 50 in around"), Save gave
"Saved as version 1 of your Kameez shalwar measurements. They are kept on this
device.", and "Measure again" brought the fields back with every figure kept. At
390×844: Return stepped focus into the next field, the review tables and the page
had no sideways scroll, and focus mode was off in the review. Directly against the
routes: another origin 403; a chest posted out of range REJECTED with its limit;
two saves on one device cookie gave versions 1 and 2; with the mock session cookie
two saves were kept with the ACCOUNT as versions 1 and 2 and no device cookie was
written; and a body naming its own owner was ignored — the save went to the
device. In Urdu at 390px the review reads right to left, "21 انچ آر پار" beside
"42 انچ گھیر", with no sideways scroll.

**Re-verified after the review's fixes** — typecheck, lint, **332 tests** and the
production build pass. Against the routes: another origin 403; a point sent twice
400; version 99 refused as `SET_VERSION_UNKNOWN`; a rejected guest save wrote no
cookie; a first save wrote `aa_measurements` and a second on it was version 2; a
well-shaped but never-issued device cookie was replaced and saved (it was a 502
before `saveForCustomer`); a mock-session save was kept with the ACCOUNT and wrote
no device cookie even with one sent. In the store at 1280px: a 20 in hem under a
25 in chest was refused on the hem with focus on the summary; changing the chest
to 19 cleared the hem's finding and the summary; the review took focus on its
heading with no live marks on the drawing, "19 in across" beside "38 in around";
Save said "We have your Kameez shalwar measurements. They are saved for this
browser only…" with a link to `/catalogue`; "Change and save again" returned to
the fields with every figure kept and focus on the first row. At 360px the review
table is 312px with no sideways scroll, the typed figure under each name, and a
second save read "These replace the Kameez shalwar measurements you saved before."
In Urdu the page is `dir="rtl"`, a chest typed as "۱۹٫۵" on an Urdu keyboard was
sent as 19.5 and kept as "39 انچ گھیر", the two garments' kept columns start at
the same offset, and the confirmation reads in Urdu. The design detector found
nothing in the changed components.

**A testing trap, not a bug:** at a phone viewport the Browser pane's `ref`
clicks do NOT scroll the element into view first, so a click on a field below the
fold lands on whatever is at those coordinates and every keystroke after it goes
nowhere. Scroll the field into view (or focus it by script after one real click
has hydrated the page) before typing. A probe read straight after a key press can
also run before the page has handled it; wait a beat before believing it.

## Made-to-Measure — plan Phase 5: collar, band and cuff choices

Built ahead of Phase 4, which waits on real cards. **Every value and default is
FIXTURE** — plan question 5 asks what the client's words mean.

- **Five choices, served on the set read** (A2-7, `options[]`): neck style (ban or
  collar), the ban's width and ends (only with a ban), sleeve end (cuff or plain),
  cuff style (only with a cuff). A condition names an EARLIER choice, so they
  settle in one pass (`lib/options.ts` `choicesInPlay`); the contract refuses a
  forward reference, an unknown value, a default the choice lacks, a choice of one.
- **Choices decide what is ASKED** (`askedWhen` on a point). The cuff is asked with
  a cuff; a new optional **sleeve opening (mohri)** with a plain sleeve, on the
  same place on the drawing — `sanitizeMarks` lets two points that are never asked
  together share a place (`neverTogether`, which follows nested conditions up).
  `askedStudio` is the one rule: the form's schema, the progress count, the stepper
  and focus mode, the error summary, the marks, the tabs, the review and the
  submission all read the list it returns. A figure on a point set aside is kept,
  converted with the rest, and neither judged, stepped to nor sent.
- **The drawing follows the choices** (`lib/kameez-variants.ts`): collar points, a
  taller band, square ends, a folded double cuff, a turned plain hem. A value names
  a drawing variant; one the drawing does not know draws the default, never a
  garment with a part missing. The default is the kameez the studio always drew,
  so the homepage emblems are unchanged.
- **Choices are part of the save.** The submission carries `preferences` (every
  choice in play, defaults included); the mock server settles them itself and
  refuses a choice it does not know (`OPTION_UNKNOWN`), one sent while it does not
  apply (`OPTION_NOT_APPLICABLE`) and a figure for a point not asked
  (`POINT_NOT_ASKED`) — the page reads all three as a changed list. The profile
  keeps the settled choices, and the review lists them first.
- **They describe the garment IN HAND** — what the tape is laid on — and a line
  above them says so. Whether the kameez being stitched may differ is plan
  question 10.
- `SegmentedChoice` is the one pill radio group; the unit toggle uses it too.

**The review** (three lenses: correctness, the rulebook, usability and the plan)
found real defects, all fixed:

- **An answer landing after a choice changed was shown against the new choices** —
  the review then listed the old choices, hid the old cuff row, and Save stored a
  cuff the page no longer showed. An answer is now keyed on the list AND the
  choices it was sent with (`lib/studio-step.ts` `keyOf`), and a changed pair
  returns to the fields.
- A unit switch gave a set-aside point the plain conversion, so 9 cm on the cuff
  came back as 3.54 in beside a 3.55 in minimum; the switch now sees the whole
  served list. Two points never asked together only through a nested condition
  were weighed as crowding each other.
- **In focus mode on a phone the choices were hidden but still in the tab order**:
  Shift+Tab reached an unseen radio, and an arrow key could change the sleeve
  unseen. `.mm-choices` now leaves the page in focus mode (`display: none`).
- The neck and chest instructions said "collar" under the default ban; the value
  reads "Ban (band collar)". The drawing's tag re-cased served labels carrying
  protected terms (I18N-09) — it is sentence case now. The selected pill measured
  2.3:1 (A11Y-07) and carries a boundary in its own ink.
- Rules: the save hook split into `lib/studio-step.ts` (pure) and
  `use-profile-requests.ts`; `MeasurementFieldsets`, `GarmentHotspots` and
  `studioFlow` took three function bodies back under 60 lines; no argument is
  mutated (TS-09); prop interfaces are named (CMP-04); picks are a map of branded
  ids (TS-12); variant names are typed, and each is tested to change the drawing
  (PD-01); the mock reads request bodies as `unknown` and checks them
  (`readSubmission`) rather than casting; module 18's mock handlers moved to
  `made-to-measure-handlers.ts`.
- The Urdu sleeve-opening label is neutral words, not a spelling of "mohri" with a
  second reading; the ban's "corners" became "ends" to match the English.

Verified: typecheck, lint, **372 tests** and the production build pass. Against the
routes: a cuff sent with a plain sleeve is refused `POINT_NOT_ASKED`, a ban width
with a collar `OPTION_NOT_APPLICABLE`, a choice sent twice 400, a body with no
choices 400; a save with a collar and a plain sleeve kept both choices and the
sleeve opening at 356 mm (7 in across). In the store at 1280px: Plain removed the
cuff field and its style and asked the opening, drew a turned hem and marked the
opening; Collar removed the ban's width and ends, drew collar points and still asked
the neck; the eight required figures with the opening left EMPTY passed to the
review; the review listed "Neck style Ban (band collar) · … · Sleeve end Plain"
first; the pills are marked selected only where checked. At 390×844 focus mode
reads "1 of 11", the choices are gone from the page and from the tab order, and
the tag reads "Kameez length". In Urdu every choice and value renders right to
left.

**Deviations** (plan, Phase 5 "As built"): the neck stays asked with a collar (a
collarless value is question 11); a plain sleeve asks its opening instead, so the
stepper total does not drop; the cuff is optional with a cuff — "required when"
waits for the client's list; every choice starts at its default and nothing
records whether it was picked (an operator question).

## Made-to-Measure — plan Phase 4: copy my tailor's card

**Every card convention is FIXTURE** — how a card writes each figure is plan
questions 1 and 3. The client's own example (chest 19.5, ghera 20.5, teera 8.5,
cuff 8.5) is what the fixture is shaped to accept.

- **A second way of measuring, as an address.**
  `/stitched?style=KAMEEZ_SHALWAR&source=TAILOR_CARD`. A style offering both paths
  shows a "How are you measuring?" strip under the style strip — one component,
  `ChoiceStrip`, for both (PD-01). The chosen path travels with every style link
  (`ROUTES.stitchedWith`, a named-parameter builder on `URLSearchParams`); a style
  without it serves its first path and SAYS so in the paths' own names, judged by
  comparing the path asked for with the path served (`StyleChoice.requestedSource`),
  never from how the backend answered. Coming back restores the card.
- **A card list is its own list** — (style, source, version) is a list's identity
  (A2-3), with `sources[]` on the set read — and its points have their own ids, so
  a card's half chest is never the garment's field. Card rows are BUILT FROM the
  garment rows (`measurement-card-points-db.ts`, `fromGarment`): the same bounds on
  the stored figure and the same marks, with only the card's convention changed —
  the teera HALF the shoulder (a half WIDTH, its own `HALF_WIDTH` reading, drawn on
  the half written down) and the cuff FULL. No card point is asked by a choice.
- **The words say what the store does with a figure**, never what cards usually do:
  "We read the card's chest as half the way round: 19.5 is kept as 39. Type it as
  written." The hint asks for every figure as written, "19½ as 19.5"; ½, ¼, ¾, 1/2,
  1/4 and 3/4 are read as decimals everywhere (`normaliseDigits`). On the card the
  review's "as typed" is the bare figure, character for character the card's.
- **A figure written the other way is named** (`writtenOtherWay`): out of range but
  in range halved or doubled, the field says "This looks like a whole figure, but we
  read this one off the card as half…" (and the garment path's own version) instead
  of the bare range. Every range now names its unit.
- **Finishing choices appear on the card too**, describing the kameez to be stitched
  and deciding nothing asked; the line above them says so.
- **The photo** is picked on the device and shown beside the form, with a switch
  between it and the drawing and an enlarge toggle. `useObjectUrl`
  (`src/hooks/use-object-url.ts`) makes its `blob:` address when it is chosen and
  revokes it when replaced or unmounted; the studio holds it above every switch, so
  it lasts until the page closes. A photo the browser cannot show (an iPhone's HEIC
  on a desktop) says so. In focus mode the picker gives its room to the photo. A
  test pins the submission's keys, so nothing that could carry a file rides along.
- **The server keeps the path as a fact of the list**: the profile's `source` and
  each value's `origin` (TRANSCRIBED) come from the list typed against, and the mock
  parses bodies with a zod schema rather than casting. The hem-at-least-chest rule
  applies to the card's own points.
- A unit switch converts every point any list has shown in this studio, so a figure
  kept from the other path comes back at a value its own field accepts.

**Deviations** (plan, Phase 4 "As built"): the card path exists for the kameez
shalwar and the kurta, not the waistcoat suit (question 4); every entry point still
opens the garment path (question 2); choices carry across a path switch.

Verified: typecheck, lint, **389 tests** and the production build pass. In the store
at 1280px: the card path lists nine card fields with the finishing choices and the
card hint, and every style link carries the path; the waistcoat suit, which has no
card, falls back with "“Copy my tailor’s card” is not offered for this style yet, so
this is “Copy a garment I own”." while its style links keep the card; a chest of 39
said it looks whole and to halve it; 20½ in the ghera was accepted; an empty teera
read "between 6.89 and 11.81 in"; a card photo chosen on the kameez shalwar was the
same `blob:` photo after a switch to the kurta. At 375px no sideways scroll, the
photo frame 327×247. In Urdu at 1280 and 375px, right to left with no sideways
scroll: «کندھا (تیرا)», the fallback naming both paths, and the status
"قمیض شلوار، اپنے درزی کے کارڈ سے: 9 ناپ لینے ہیں۔".

## Made-to-Measure — plan Phase 6: the tailor's rules, as rows

The client's written list has not arrived, so this builds the MACHINERY and fills
it with **FIXTURE rows** — every ratio, tolerance and severity ours, labelled so in
the file header and named aloud at any demo. When the list arrives it replaces
rows, not code. **No model produces or checks a figure** (A2-11): a rule is a row
of integers, judged the same way twice.

- **Rules are rows, on the server.** `src/lib/mocks/profile-rule-rows.ts` holds
  them and `profile-rule-eval.ts` judges them, beside the derivation rather than in
  the store or the lists. A row is `{id, severity MUST | WARN, point, from,
  permille, offsetMm, toleranceBelowMm, toleranceAboveMm, when, showsTarget}`.
  Five rows: the hem at least the chest (MUST, as Phase 3 shipped it), and four
  that ASK — the shoulder and the neck against the chest, the neck's tolerance
  differing under a ban and a collar, and a waistcoat chest against the kameez's.
- **The arithmetic is integers only**, so the mock and Java cannot drift:
  `expected = floor((permille × from + 500) / 1000) + offsetMm`, then the distance
  from it, with the two sides kept apart and BELOW the tighter of them (A2-6) —
  cloth cut too small cannot be let out. An "at least" rule is the same arithmetic
  at a permille of 1000, so there is one evaluator, not two.
- **A rule is written ONCE and holds on both paths.** It names the GARMENT point,
  and a card point answers for the point it was built from (`GARMENT_POINT_OF`,
  recorded where the card rows are made). `hemAtLeastChest` was two rows and is one.
  This settles the plan's open question by the garment point id rather than a role
  vocabulary: a role would have to sit on the point row, and the set read spreads
  every point field onto the wire, so the rulebook would ship to the browser. A
  test proves no rule id, permille or tolerance appears anywhere in interface code.
- **A WARN rule asks; it never scolds.** The field gets a quiet note — what looks
  unusual, the measurement it was judged against by name, and two answers:
  "Measure again" ("Check the card again" off a card) or "Keep my number" ("Keep
  the card's figure"). It is never red, never `aria-invalid`, never `role="alert"`
  and never in the error summary; its own "Worth a second look" section lists the
  noted fields with a way to each, takes focus when a check only asks, and says so
  politely once every note is answered. A refusal still lands on the red summary.
- **No note gives a target figure, on ANY point** — stricter than the plan, which
  forbids one on shoulder, neck and cuff. Every WARN row withholds it and the words
  have nowhere to put one; a test asserts no note text contains a digit even when
  the finding carries one. A number to copy would be us filling the measurement in.
- **Keeping a figure is recorded.** The save is refused while anything is
  outstanding, unanswered notes included (A2-5, which Phase 3 contradicted by
  blocking on refusals alone). An answer counts only against a finding the server
  actually raised, is rebuilt from that finding rather than from the body, and one
  that matches nothing is ignored rather than refused — every refusal reason reads
  as "the guide has changed", which would dead-end a customer who did nothing
  wrong. The same answer twice is malformed. The profile records which RULE SET
  judged it, and rule sets are append-only, so an old answer's rule stays resolvable.
- **A note stands only while its figures do, and so does a keep** — judged on what
  was TYPED rather than on what the fields show (`lib/standing.ts`). The same fix
  went to server REFUSALS, which until now vanished whenever the customer toggled
  inches and centimetres. Changing the chest clears the shoulder's note, because
  that is the figure it was judged against.
- The review marks every figure the customer was asked about and kept.

**The phase's review** (three lenses — correctness, the rulebook, the customer and
the plan — with every finding then put to an independent skeptic; 7 of 18 stood)
found one defect that would have broken the phase for a whole class of customer:
**a figure typed on an Urdu keyboard, or as a card fraction, made every finding
invisible.** What is sent is normalised (`۲۱` → `21`) while the field still holds
what was typed, and a finding stood only while the two matched character for
character — so the check would have appeared to do nothing, for ever, with no way
to discover why. Both sides now read the figure the way it is sent.

It also found that **three FIXTURE rules could not be satisfied at the top of the
chest's range**: the ratios were fitted without the points' own bounds, so above a
certain chest no figure the shoulder, neck or waistcoat chest accepts could clear
its rule, and the only way past was to keep a number against an impossible rule.
The three ceilings are raised — they are FIXTURE as well — and a test pins the
property for every rule on every list. And four smaller ones, all fixed: the
note's focus request stayed armed behind a refusal and would have fired on the
keystroke that cleared the last red field; the field's accessible description read
the note's BUTTONS as prose; the gold tape was declared twice (PD-01); and the
store passed MOD-03's 300-line ceiling, so reading an inbound body moved to its own
module.

**A defect found by hand, not by a test:** pressing "Keep my number" a second time
in a later check did nothing. The answers were held in a map keyed by note, and one
whose figures had since changed stayed in that map while no longer standing, so the
next press deleted the lapsed entry instead of adding a new one. The toggle now
reads what is in force, and a lapsed answer is let go when the next one lands.

**Deviations:** no cuff rule — the only evidence for a chest-to-cuff proportion is
the client's single card where the shoulder and the cuff both read 8.5, which plan
question 3 asks about, and a rule built on it would make a possible transcription
slip into tailoring. "Required when" waits for the written list. An expected figure
still comes from ONE other measurement.

Verified after the review's fixes: typecheck, lint, **432 tests** and the
production build pass, with `/stitched`, `/api/made-to-measure/check` and
`/api/made-to-measure/profiles` in the build output. In the running store at 1280px: a 16 in shoulder beside a 21 in chest
gave the note "This is smaller than usual beside your Chest. Cloth cut too small
cannot be let out." with **0** invalid fields, **0** alert nodes, no digit in the
note, and focus on the quiet summary; "Keep my number" went on, off and on again,
kept its label and its place, and the status line flipped to "Every note is
answered."; the keep survived inches → centimetres → inches with the figures
returning exactly (16 → 40.6 → 16, 21 → 53.3 → 21); the review then marked the
shoulder "You checked this and kept it." and the save confirmed. Changing the chest
cleared both the note and the keep. Directly against the routes: an unanswered note
gives REJECTED carrying that CONFIRM finding and stores nothing; answered, it saves
with `acknowledgedFindings` holding exactly the server's match and `ruleSetVersion`
2 beside `setVersion` 1; an answer in the wrong direction is ignored and the note
still stands; the same answer twice is 400; another origin is 403; an answered check
returns no findings and echoes the answer back. On the card path the note reads
"…beside the Chest on the card" with "Check the card again" and "Keep the card's
figure", the word "measure" appears nowhere, and a hem narrower than the chest now
says "Check both against the card" — the Phase 4 defect that told a card customer to
measure again. In Urdu at 1280px the page is `dir="rtl"` with every note, action and
status line in Urdu and no sideways scroll. At 375px focus mode shows the active
field's note and both buttons, the drawing holds 357px, the stepper reads
"Previous · 3 of 9 · Next · Done", and a noted row that is not active has its
buttons at `display: none` with none reachable — the tab-order trap the finishing
choices once had. **The Urdu still needs a native tailor's review before any demo.**

## Made-to-Measure — what is left

**The card badge.** A product card still does not say that it can be made to
measure. That needs the offer on the CARD projection, not only on the product
page, and the card is the most reused component in the store — so it is its own
change rather than a rider on the entry points.

**The body path**, which §34.8 defers and §34.6a keeps deferred. The same set,
the same kinds, the same bounds and the same instructions drive it; what differs
is which picture the tape is laid on and how the instruction is worded.

**Saved measurements cannot be read back.** A save is real (to the mock), but
nothing reads a profile back into the fields, so a reload — or a style switch
whose load FAILS, which unmounts the form — loses the figures on screen even though
the saved profile is kept. Reading back belongs with the account area or with
ordering. No stitching charge is priced yet either. The operator questions this
raised (a guest signing in later, one profile per style, retention) are in the
plan, under "For the operator".

**Open for the operator** (plan, "For the operator"): whether a missing
translation should keep taking the studio down in that language, and whether
"nothing offered" should become an ordinary state that also hides the entry
points.

**The served lists are FIXTURE content, not the client's written list**
(`src/lib/mocks/measurement-sets-db.ts`, since plan Phase 2; the card lists since
Phase 4, on conventions no real card has confirmed yet). The studio now reads
them as content (ADR 17), so the real card replaces rows, not code. The ORDER is
the client's; the bounds, the required flags on the points they did not list, the
half/full conventions and — since Phase 6 — the tailor's RULE rows with their
ratios and tolerances (`src/lib/mocks/profile-rule-rows.ts`) are all placeholders
until the written list arrives. The machinery around them is built and tested; what
it is filled with is ours, and a demo should say so. They are GARMENT figures — a kameez chest carries ease a body chest does
not — and ADULT figures, which is why a boy's kurta carries no stitching offer.

## Account and tailored-from-a-product — plan Phase 1: reading a profile back

The plan is `.claude/working-docs/account-and-tailored-plan.md` (16 September 2026),
covering a customer profile page and a "get it tailored" entry on every adult
garment. Seven phases; this is the first, and it exists alone because **nothing
could read a saved profile back** — the feature had three POSTs and no GET, so the
profile page had nothing to show, "reuse if saved" had nothing to reuse, and a bag
line would have had nothing to reference.

- **The read is on the SERVER, and there is no new BFF.** `/stitched` is
  server-rendered, so `StitchedScreen` reads the profiles beside the studio's own
  load. A BFF exists where a request can only start in the browser; this one
  cannot, so adding a browser-facing surface would have been a credential-bearing
  route with no caller. `fetchProfiles` carries the owner in the same header the
  save uses, at `revalidate: 0` — the owner is a HEADER and Next's data cache is
  keyed on the request, so any cached read would be one customer's profiles served
  to another.
- **A read does not mint an owner.** `resolveProfileOwner` takes a device token
  from the backend when a browser has none, which is right for a save and wrong
  for a read: every anonymous visit to the studio would take a token and do
  nothing with it. `readProfileOwner` answers null instead, and a browser with no
  cookie has saved nothing.
- **An unreadable profile is not a broken page.** `savedProfilesFor` answers with
  a LIST rather than a `Result`: a customer who has never saved and a customer
  whose read failed see the same page, the one they came for. A device token the
  module no longer knows owns nothing and is not logged; anything else is logged
  once (ERR-10).
- **Reuse across garment styles is a LOOKUP, not a mapping**, and that is a fact of
  the served lists rather than a convenience taken in code: every style is composed
  from the same point rows, so `kameezChest` in a waistcoat suit IS `kameezChest`
  in a kameez shalwar — same bounds, same half-or-whole convention, same basis.
  Someone who has measured a kameez shalwar has already given eleven of a waistcoat
  suit's fourteen. The tailor's-card lists are the exception and the reason the
  matching is by point id: their points carry their own ids, so a card figure
  answers a card list and never a garment one.
- **It is an OFFER.** A band above the fields says what is on file and when it was
  saved; nothing reaches a field until the button is pressed, and afterwards the
  same section says how many figures landed and asks the customer to look at each
  one. Cloth is cut from these figures.
- A figure the point no longer ACCEPTS is set aside and named rather than dropped,
  because a field that stayed empty for no stated reason is worse than one that
  says why. A figure for a garment this list does not measure is simply not
  offered — that is not a problem the customer can act on.

**The phase's review** (four lenses — security and data, correctness, the rulebook,
the customer — each finding then put to an independent skeptic; 9 of 39 stood)
found five real defects, all fixed:

- **A save on one capture path HID the other path's figures.** Supersession ran on
  (owner, style) and ignored the path, but the two paths' points carry different
  ids, so the survivor could not answer the other list at all. A guest who copied a
  garment and then tried their tailor's card lost the garment figures from every
  page that could have offered them — and the waistcoat suit, which serves no card
  list, went permanently silent with no strip to switch to. The skeptic ran the
  mock to prove it. Supersession and the version counter are per (owner, style,
  PATH) now, which is what A2-3 already said a list's identity is. **The plan had
  named this exact question and told Phase 1 to decide it before reading anything
  back; the first answer was wrong, and written into a comment whose premise its
  own sibling file contradicted.**
- **Taking the offer left the fields red.** `form.setValue` fires no change event,
  and `reValidateMode: 'onChange'` runs off the input's own event, so a failed
  check's errors survived the fill: eight fields filled with valid figures, all
  eight still red, the summary still listing them, beside a status line saying they
  had just been filled. `judgeAgain()` re-judges, guarded by `isSubmitted` so the
  form still does not scold anyone who has not asked.
- **A taken figure lost the unit it was typed in.** The studio converts from what
  was TYPED, and a figure it places itself was not typed — so the next switch
  converted a conversion: 24 in came back as 24.02, and that is what the review
  showed and the server would have recorded. `remember()` seeds the same ref the
  unit switch keeps, so a placed figure behaves exactly as a typed one.
- **The band was not hidden in phone focus mode** — the third time furniture has
  been added to the panel and missed that list, after the finishing choices in
  Phase 5 and the note actions in Phase 6. It sat inside the one-field sheet with a
  live button in its tab order.
- **The offer outlived the save it was read before.** The page is rendered with
  what was on file, and the studio stays mounted; after saving and pressing "Change
  and save again" the band went on naming the version just superseded, and taking
  it would have put the older figures back over the new ones. A successful save
  refreshes.

Verified: typecheck, lint, **448 tests** and the production build pass. Measured in
the running store rather than eyeballed — a profile saved through the BFF, then the
band reading "Saved on 16 September 2026, from your Kameez shalwar"; a browser with
no cookie sees nothing; pressing it fills 8 of 8 exactly as typed with the status
"8 measurements filled in from your saved Kameez shalwar. Look at each one before
you save."; on the **waistcoat suit** the band adds "Some of these were taken for a
different garment", pressing fills 8 of its 14 and the progress reads "8 of 11
required measurements taken" with only the three waistcoat points left; with the
form switched to centimetres first, 21 in arrives as 53.3 and the whole set returns
to inches with **zero drift**; after the fixes, saving on BOTH paths leaves all four
lists still offering, a check-then-take leaves **0 invalid fields** with the red
summary gone, focus mode hides the band at `display: none`, and a save then a fresh
press offers the NEW figure rather than the superseded one. In Urdu at 375px the
band and its status read right to left with 0 elements past the viewport.

**Phases 2 to 7 are not started.** The profile page, the wishlist moving to the
account, the address book, order history, the made-to-measure bag line with its
stitching charge, and the product entry with the card mark are all still to come.

## Account and tailored-from-a-product — plan Phase 2: the account area

`/account` exists, with the saved measurements in it, for a signed-in customer and
for a guest.

- **The route composes and implements nothing** (STRUCT-02). Identity comes from
  `features/auth`, the measurements from `features/made-to-measure`, so neither
  feature knows about the other and the page knows about neither's internals
  (MOD-01). `AccountMeasurements` reads its OWN data rather than taking it as a
  prop: the feature that owns the record owns the reads and the words for it.
- **A GUEST gets the page.** Measurements save against a device token before
  anyone signs in, so a page that refused a guest would hide a customer's own
  figures behind a sign-in they were never asked for. One line says where they are
  kept, and it does not promise a merge, because there is not one.
- **The saved figures are the REVIEW's own rows.** A saved profile keeps what was
  typed beside what was recorded, which is exactly what a passed check leaves
  behind — so `checkedFromProfile` turns the record into that shape and the page
  reuses `reviewGroups`, `typedText` and `keptText`. The account page and the
  review therefore cannot disagree about what a figure records as (PD-01). The
  table is the review's without its "Change" column, because on this page there is
  nothing to change into, and it reuses the review's CSS — including its container,
  so the typed figure moves under the name on a phone exactly as it does there.
- **No client boundary.** Every part takes its words as a prop rather than from the
  client context, so the page ships no JavaScript of its own.
- **One read per profile, and all of them cached.** A saved profile carries point
  IDS and no words (§34.3), so the page makes the same two content reads the studio
  makes plus one list per profile. A profile whose list or wording cannot be read
  still appears with its date and a way in — the customer's own record must not
  vanish because content did.
- **The way in.** The header's account menu for a customer; the studio's own save
  confirmation for a guest, who has no menu to hang it from.
- **The D3 placeholder is stated in words on the page**, because a screen that
  looks like an account is a screen people put real details into, and this one is
  guarded by an unsigned cookie until §11 lands.

**The phase's review** (three lenses — privacy, correctness, the rulebook — each
finding then put to an independent skeptic; 6 of 34 stood, and the six were two
defects found independently by all three lenses):

- **A failed read of the RECORD was shown as "you have not saved any measurements
  yet."** Phase 1's `savedProfilesFor` collapses any failure to an empty list,
  which is right for the studio — there, silence is simply no offer and asserts
  nothing. On this page the same silence becomes a sentence about the customer's
  own record, and the loader's own doc comment said that would be a lie. The read
  now answers `READ` or `UNREADABLE`; the studio keeps the collapsing wrapper. An
  UNAUTHORIZED device token still reads as empty, because a token the module never
  issued genuinely owns nothing. Checked both ways with the mock bent to 500 and
  then restored: the failure says so and withholds the "Take your measurements"
  button, which would otherwise have appended a needless version over a record the
  customer had just been told did not exist.
- **The new copy block stole the wishlist's doc comment.** Inserted between
  `/** §28.3's saved items. */` and the key it described, so the registry
  documented `account` as "saved items" and left `wishlist` with nothing. Both
  blocks have their own comment now.

Verified: typecheck, lint, **453 tests** (5 new) and the production build pass,
with `/account` in the output as a DYNAMIC route — it reads cookies, so it is
never prerendered with one customer's data in it. Measured in the running store: a
stranger sees the guest heading and the empty state; a guest with a device profile
sees "Saved on 16 September 2026, Copy a garment I own.", the Kameez and Shalwar
tables, eight figures reading "21 in across" beside "42 in around", the
browser-only line and a link to their own list; with a session cookie the details
block shows name, email and mobile with the placeholder caution and no
browser-only line; at 375px there are 0 elements past the viewport and the typed
figure moves under the name; in Urdu at 375px the page is `dir="rtl"` with the
captions and the saved-on line in Urdu and nothing past the viewport; the header
menu reads "Your account", "Saved items", "Sign out"; and the studio's save
confirmation offers "See your saved measurements".

**Phases 4 to 7 are not started.** The address book, order history, the
made-to-measure bag line with its stitching charge, and the product entry with the
card mark are all still to come.

## Account and tailored-from-a-product — plan Phase 3: the wishlist, moved to the account

**A saved item belongs to the customer now**, so it follows them to a phone. It
used to live in `localStorage` and be invisible to the operator.

- **Server-held per ACCOUNT** — `src/lib/mocks/wishlist-db.ts`, one list per
  account key, with MSW handlers in `account-handlers.ts` and the endpoints under
  `ENDPOINTS.account`. **A guest keeps `localStorage`**, which is the plan's own
  wording: a guest has no account for a list to belong to, and the heart is
  already hidden for them. This is why the account travels in its own header
  (`x-account-key`) rather than through §34's owner machinery — that carries a
  KIND as well as a key precisely because measurements can belong to a device,
  and a saved list never can.
- **D6.** Un-hearting RECORDS a removal on the row; saving the same product again
  appends a NEW row rather than resurrecting the settled one, exactly as a bag
  line does. **6 tests** pin it, including that a removed row keeps its date and
  that a re-save leaves the removal on file.
- **Two BFF routes** — `/api/saved-items` (GET and POST) and
  `/api/saved-items/removal`, the eighth and ninth. They exist because the heart
  is pressed in the browser and `apiRequest` is `server-only`. The account is read
  from the SESSION on the server side and attached as a header, so a request can
  no more name its own owner than a measurement save can; both carry the SEC-08
  origin check, and a guest is refused 401 rather than served an empty list.
- **`accountKeyOf` is one function now** (`src/features/auth/account-key.ts`):
  the email when there is one and the mobile otherwise, because a customer who
  signed in by code has no email and keying them by `''` would put every such
  customer in one shared account. Made-to-measure's `profile-owner.ts` had two
  copies of that rule and now has none (PD-01).
- **A list built before signing in is carried into the account, once**, and the
  saved-items page says so. `SavedItemsProvider` is mounted in the root layout
  rather than inside the hook every card calls — a listing holds twenty-four
  hearts, each would have held its own "already carrying" latch, and all
  twenty-four would have posted the same list on the same render. It attempts
  once per visit and never un-latches: the effect's dependencies include the
  local list, which is a new object every render, so releasing on failure would
  retry on the next render and a failing endpoint would become a request storm.
  The browser's copy is cleared only after the account confirms.
- **`useWishlist` kept its shape**, as the plan asked, and gained one thing it
  did not have: `isUnreadable`, so a list that could not be READ is never shown
  as a list that is empty.
- **The account page has a saved-items section** — count and a way in, read on
  the server, so `/account` still ships no JavaScript of its own. It does not
  repeat the grid: the grid is the catalogue's client card, hearts and all, and a
  second copy of it here would put every one of those on the one page whose point
  is that it has none.
- `features/wishlist/contract.ts` is the client-safe barrel (STRUCT-06), because
  `index.ts` now reaches `server-only` code. `WishlistScreen` stays on the server
  barrel although it is a Client Component: only a Server Component mounts it, and
  a client barrel carrying the whole product grid would make a cycle out of the
  card that imports the hook.

**Two defects were found by watching it fail rather than by reading**, both fixed:

- **A failed read of the account's list rendered as "Nothing saved yet."** MSW
  died mid-session, the GET answered 502, and the page told the customer they had
  saved nothing. That is the Phase 2 defect again in a new place, and the fix is
  the same shape: `isUnreadable` is its own answer. Re-verified against a
  genuinely dead backend, not a simulated one.
- **One customer's saved list was served to the next one on the same browser.**
  Signing out and signing in again are both SOFT navigations, so the query cache
  survives them; with one key for the whole browser, TanStack returned the
  previous customer's cached list to the next one for the 30s stale window. The
  key is `savedItems(accountKey)` now. The bag is deliberately not keyed this way
  and should not be: a cart id belongs to the browser, and a saved list belongs
  to the customer.

**The review** (three lenses — correctness and security, the rulebook, the
customer and the plan — with every finding put to an independent skeptic; 4 of 14
stood, and three of the refutations were findings the two fixes above had already
answered while the review was running):

- **The optimistic toggle serialised nothing.** Saving and removing are different
  routes, so a double press sent two writes that could arrive in either order —
  and a removal arriving first is a no-op on a row that does not exist yet, which
  left the product SAVED after the customer's last action was to unsave it. The
  mutation carries `scope: { id: 'saved-items' }` now, so presses queue. Verified
  in the store: remove then save 120ms apart ends saved in both the heart and the
  mock, and two presses in one tick are two idempotent saves.
- **A refused change was never told to the customer**, and `onError` only
  invalidated — but the refetch does not retry either, and TanStack keeps the
  last data it had, which is the guess. So a failed save left the heart filled
  for the life of the page on a product that was never saved. The press now puts
  back the list it was made against, and the card carries a `role="alert"` line.
  Verified with the browser's own `fetch` bent to refuse the POST: the heart
  returned to `aria-pressed="false"`, exactly ONE card showed the line, and the
  store was unchanged.
- Two doc comments had gone stale the moment the list moved — the wishlist
  route's and `fetch-saved-products`'s stated reason for putting ids in the query
  string — and two relative imports had been left inside the `@/` alias group
  (IMP-02).

Verified: typecheck, lint, **459 tests** and the production build pass, with
`/api/saved-items` and `/api/saved-items/removal` in the build output. In the
running store: a two-id browser list was carried into the account on the page the
customer landed on, the browser's copy emptied, and the saved-items page read "2
items you saved on this browser are now kept with your account"; the heart saved
and un-saved through the real HTTP boundary with the order of the list preserved;
and the account page and the saved list agreed on the count. Directly against the
routes: another origin 403 on both GET and POST, a guest 401 on all three, a
non-UUID id 400, an empty list 400, 101 ids 400, a body naming `ids` instead of
`productIds` 400, GET on the removal path 405; two different accounts kept two
different lists, including a customer with no email keyed by their mobile; and
saving something already saved changed nothing. In Urdu at 375px the page is
`dir="rtl"` with the carried line, the counts and the account section all in
Urdu and no sideways scroll.

**Deviation from the plan:** the plan's first bullet says "through the same owner
mechanism the measurements use", and this does not use it — its second bullet,
that a guest keeps `localStorage`, is what makes the DEVICE half of that mechanism
dead weight here. A saved list only ever belongs to an account, so it is keyed by
an account and nothing else.

## Phone layout — the five faults the by-hand pass found

`TESTING-USE-CASES.md` is the log: thirteen use cases on a desktop and a phone, the
fault, the repair and the measurement after it. What follows is only what the code
needs to remember.

- **The product page was 432px wide on every phone, and a scroller was the reason.**
  The page's main grid declared two columns from 1024px and NOTHING below it, so the
  single column was an implicit `auto` track — sized to its contents and unable to
  shrink under them. The widest content was the gallery's thumbnail strip, five 80px
  thumbnails and four gaps, and the strip's own `overflow-x-auto` did not save it:
  **an auto track measures what is INSIDE a scroller, not the scroller.** Everything
  in the column inherited that width, so title, price, sizes and the per-piece panel
  all ran off the screen. `grid-cols-1` — `minmax(0, 1fr)` — is the fix, on the page
  and on its loading skeleton. Measured at 320, 360, 375, 390, 414, 480, 768 and
  1023px: nothing past the edge; 1024 and 1440px unchanged at two equal columns.
- **The bag panel and the try-on panel were the same fault, not two more.** Both
  measured the page rather than the screen, because a mobile browser widens its
  layout viewport to fit an overflowing page. Nothing was changed in either: the bag
  panel is 375 wide at the left edge and the try-on dialog 343px centred, from a
  product page, once the page itself fits.
- **The card's heart and quick add are DRAWN on a touch device now.** They were
  `opacity: 0` with their taps still live, so a tap meant for the product silently
  saved it or opened a size tray. The frame arrows beside them take the opposite
  treatment and always did — the difference is a replacement: a swipe replaces an
  arrow, and nothing replaces a heart. They are 2.25rem there, not 2.75rem: at three
  columns on a 375px screen a tile is 104px, and a 44px control would be nearly half
  the card.
- **No field is under 16px where the primary input is touch**, because iOS Safari
  zooms in on a smaller one and does not zoom back out. One unlayered element rule
  on `input` / `select` / `textarea` under `(hover: none)`, and the studio's own copy
  of that fix is gone with it (PD-01). An element rule rather than a class on
  purpose: the store writes field styling in three places and a fourth form would
  have been missed the same way these were. Written as chained `:not()`s, because the
  selector-list form is Selectors 4 and a browser that cannot parse it drops the
  whole rule — on exactly the old iOS Safari the rule exists for.
- **Three tap targets were raised** — breadcrumbs 17→33px, "View all" 20→36px, the
  dialogs' close button 28→36px.

### What the repairs themselves broke, and how it was caught

Two of the three came from an adversarial review of the change, one from measuring
while making it. All three only ever showed at the **three-column** density a phone
customer can choose; the default is two.

- **The size tray covered the button that closes it.** The tray and the action column
  are siblings at the same z-index with the tray later in the tree, so the tray
  hit-tested on top. Making the bag button visible made opening the tray routine, and
  making both it and its sizes finger-sized grew the tray from ~101px to 124px over a
  130px photograph — closing the ~21px strip of the close button that had still been
  reachable. The X stayed VISIBLE through the tray's transparent top, so it looked
  live and did nothing; with no outside-tap and no Escape on a phone, the card was a
  dead end whose only exits were buying a size or a 6px strip of photograph. The
  action column is `z-20` now. **This is the shape to watch for: making a
  hover-only surface reachable on touch turns everything inside it into a touch
  surface, and the interactions between the parts are what break, not the parts.**
- **The drawn control clipped the "Low stock" badge** to "Low s" on a 104px tile. A
  badge states its status in words and the tint is only reinforcement (A11Y-06), so a
  covered word is a covered message. The badge strip is bounded away from the action
  column at every width; it wraps inside its own pill instead. Nothing changes at one
  or two columns.
- **The tray's own size buttons were 22px**, under WCAG 2.2's 24px minimum, on a
  control where a mis-tap buys the wrong size. 2rem now, with the tray's padding
  trimmed to 0.5rem so three rows still fit inside the photograph.

Verified: typecheck, lint, **432 tests** and the production build pass. Measured in
the running store rather than eyeballed — every width above; `.card-action` at
opacity 1 and 36×36 on touch while `.card-frame-control` stays hidden with its
pointer events off; quick add driven end to end on a phone (tray, size M, one item in
the bag); 16px on all five checkout fields, sign-in, the search panel, the fabric
calculator's select and all eleven studio fields, with desktop still 14px; the
breadcrumb 33px and the topmost element at its top edge; "View all" 36px hit-tested
at top, middle and bottom with its section head still 28px; the close button 36×36;
0px badge overlap at three columns; and the topmost element at the centre of the
tray's X being the X, which then closes the tray.

## Deliberate gaps — do not "fix" these

- **Product imagery is now the client's own.** Fourteen photographs in
  `public/products/`, converted to 4:5 AVIF from the originals kept in
  `assets/photography/`. See "Photography" below for what this changed and what
  is still missing.
- **Auth is still D3's placeholder, now with a real shape.** The seeded account
  is `customer@example.com` / `password1234`, and it lives ONLY in the mock
  layer — `API_MOCKING=disabled` removes both the account and the hint printed
  on the sign-in screen. Passwords are compared in plaintext there because §11's
  adaptive hashing is the Java module's job, and imitating it would suggest that
  file is a security boundary. It is not.
- **No address book and no order history.** `/account` holds the customer's
  details, their saved items and their measurements; the other two are plan
  phases 4 and 5.
- **The wishlist has a PAGE now, at `/wishlist`**, reached from the account
  menu — the heart used to save into a list with nowhere to open it. It renders
  the same `ProductCard` as the catalogue, so the heart, the quick add and the
  frame carousel work there for free, and un-hearting removes the item from the
  page as you watch.

  **It belongs to the ACCOUNT now** (plan Phase 3), so it follows the customer
  between devices, and it is still only offered to a signed-in customer: the
  heart is HIDDEN for guests — offering it let them save into a list they could
  never open — and the page itself asks a guest to sign in rather than showing an
  empty list they were never allowed to fill. A list built in a browser before
  signing in is carried into the account once, and the page says so.

  Three details are load-bearing. `useWishlist` now returns `isReady`, because
  the ids are read in an effect — so the server and client renders agree — and
  without it the page flashed "nothing saved" on every load. A response SHORTER
  than the request means a product was withdrawn since it was saved, and the
  page says so rather than quietly shrinking. And the whole list is fetched in
  ONE request through `/api/products`, a BFF that also merges the live
  availability overlay, so a list of twenty is not twenty round trips. Quick add stays available to guests, because guest checkout is
  Release 1 scope (§28.2) and a guest really can buy.
- **The language switcher is OFF**, via `CLIENT.features.languageSwitcher`.
  Nothing about the bilingual build was removed — `LOCALES`, both message files
  and the RTL layout are untouched, and turning it back on is one word. It is
  off because D2's closing phase (Nastaliq, protected terms) is unfinished, and
  offering a switch to a half-reviewed translation is worse than offering none.
- **No confirmation SMS, and nothing that mentions one.** §28.2 has one and §7.2
  step 8 enqueues it, but no SMS provider is wired up — so neither the
  confirmation page nor the payment guide says a message is coming. The auth
  code path is the one place an SMS is still named, and there the mock RETURNS
  the code on screen rather than pretending to send it.
- **No payment gateway.** Card and wallet orders come back `AUTHORIZED` because
  the mock says so. §7.2's honest consequence — an order existing in
  `AWAITING_PAYMENT` before authorisation returns — is modelled in the states,
  but there is no authorisation to fail.
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
- The product page's gallery is ONE LINE that scrolls, not a wrapping strip.
  Wrapping made its height depend on how many shots a garment happened to have,
  so the buy box moved down the page from one product to the next; a scroller is
  a fixed 91px whatever the count, and a half-visible thumbnail at the edge is
  its own affordance. The thin themed scrollbar comes from the global rule that
  already covers nested scrollers.
- The PRODUCT PAGE now shows all five frames too. Its mock was still returning
  one, with a comment explaining that one shot was all that existed — true when
  it was written, and outlived by the generated frames. Both surfaces read
  `frameUrls` now, so the card and the gallery cannot disagree about how many
  pictures a garment has.
- The sold-out overlay named "Dupatta", a piece no menswear set has. Now Shalwar,
  the one piece both SET garments share.

Copy that contradicted the new catalogue was updated with it: hero headline,
meta description, search placeholder, the fabric glossary, the care guide and
the size guide, in both locales.

**Still missing, and not faked:**

- **No cloth photography.** The unstitched line (the adult kurta) shows a
  stitched example, because no photograph of fabric on the bolt exists yet.
- **Four of every five frames are GENERATED, not photographed.** Each garment
  now has five: the client's own photograph, plus full-length, three-quarter,
  side-profile and collar-detail views cropped from one Gemini 2x2 collage
  (originals in `collage/`). They are consistent with the real photograph and
  with each other, but they are not a second shoot — real alternate angles
  replace them file-for-file, and `FRAMES` in `catalogue-db.ts` is the one
  number to change.

  Mapping the collages to garments was done by COMPARING each against the
  original photograph, not by reading filenames — the filenames are opaque
  hashes, and three of the fourteen would have been mis-assigned on a glance.
- **The two brand pieces are unused** — `assets/photography/brand-poster-lion.jpeg`
  carries the gold lion crest and would make a real logo and favicon; both it and
  `brand-banner-rust.jpeg` have a phone number burned into them, so neither is
  usable as-is.

## How Try-On was verified (historical — committed as `1a1eeba`)

Try-On as described above. This section was headed "uncommitted" and outlived
the fact, exactly as the M4 heading below it did before — a reminder that a
heading describing a STATE goes stale the moment the state changes, and that
nothing points back at it.

Verified at the time: **typecheck, lint, 182 tests and the production build all
pass**, with `/api/try-on` registered in the build output. The suite has since
grown to **198** with the D6 provenance tests and the try-on additions.

**SEC-08 gap, stated rather than bundled.** `/api/try-on` verifies the request
origin via `lib/utils/request.ts`. The six BFF routes that predate it — bag,
bag lines, bag code, both checkout routes, products — do NOT, and several of
them genuinely mutate state. That is a pre-existing gap; BOT-04 says adjacent
cleanup is offered separately rather than smuggled into an unrelated change, so
it is offered here and not done. The helper is already shared and named.

## How M4 was verified (historical — committed)

The bag and its reservations, as described above.

Verified: **typecheck, lint, 134 tests and the production build all pass.**
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

M5 was exercised end to end in the running store: a two-piece order placed with
Cash on Delivery produced order **AA100001**, the bag emptied,
`/api/checkout/quote` then answered 404 because there was nothing left to check
out, and `/order/AA100001` still renders on a fresh load.

---

## Things that cost time once and should not cost it twice

- **Skill descriptions have a registration cap near 512 characters.** Over it,
  the skill is silently dropped — no error, it simply never appears. This was
  hiding `nextjs-guidelines` itself, meaning the BINDING rulebook was not
  auto-triggering. Keep every `description:` under ~500 characters.
- **Next BLOCKS its own dev resources cross-origin**, so opening the store on a
  phone over the LAN gives a page that renders and navigates but does nothing
  interactive: every `/_next/*` chunk is refused, and with no client JavaScript
  a `<Link>` still works as a plain `<a>` while search, the bag panel and
  checkout silently do not. The tell is `Blocked cross-origin request to
  Next.js dev resource` in the server log, which is a warning rather than an
  error and is easy to scroll past. Fixed by `allowedDevOrigins`, fed from
  `DEV_ALLOWED_ORIGINS` in `.env.local` — a LAN address is machine-local, it
  changes with the DHCP lease, and SEC-10 keeps it out of committed config.
  Development only; it has no effect on a production build.
- **MSW dies on hot reload** unless it is a module-scoped singleton in `node.ts`
  with `ensureMockServer()` called from the root layout per request. A
  `globalThis` cache made it worse, not better.
- **"We could not reach the store" on every page means MSW stopped
  intercepting. Restart the dev server; do NOT delete `.next`.**

  The symptom is total: every outbound call escapes to `JAVA_API_BASE_URL`,
  gets `ECONNREFUSED`, and every page that reads data renders `ErrorState`.
  Two probes tell it apart from anything else in seconds — `/api/quick-add?slug=x`
  answers **502** rather than the 404 a live mock gives, and `/api/suggest`
  answers `{"terms":[],"products":[]}`.

  **Observed cause, September 2026: accumulated hot reloads, with no build
  involved.** The dev server had been up for ~25 minutes across edits to
  several feature files and MSW's interception simply died. `next dev` alone,
  started fresh, fixed it.

  **Second occurrence, and the probes are not as sharp as this note claimed.** A
  long Made-to-Measure session — roughly an hour of hot reloads across the
  feature plus SIX `npm run build` runs against the live server — killed it
  again. The tell was NOT the documented pair: `/api/quick-add?slug=x` answered
  **404**, the "mock is alive" answer, while `/catalogue` was rendering
  `ErrorState`. Only `/api/suggest` was degraded. **The reliable probe is to
  fetch a page's own HTML and count what should be in it** — `<article>` came
  back 0 on `/catalogue` before the restart and 24 after. Which of the two
  causes it was is not established: both were present in quantity.

  **Count OCCURRENCES, not lines.** `grep -c '<article'` on server HTML returns
  1 however many products rendered, because the markup is one long line. Use
  `grep -o … | wc -l`. This briefly read as a regression that had not happened.

  **Third occurrence, and this one has a CERTAIN cause: switching branches with
  the dev server running.** `git checkout main` plus a fast-forward rewrote about
  thirty files on disk — to the 3D version and straight back — inside a second.
  The catalogue went from 24 products to 0 at once, with no build and no long
  session involved. **Stop the dev server before switching branches, or restart
  it straight after.** The probe that caught it was the article count, again.

  **What this note used to say, and why it was wrong.** It claimed dev and build
  "share `.next`" and that running `npm run build` against a live dev server was
  the cause. At **Next 16.3.4 that is not the layout**: a dev-only run leaves
  `.next` containing exactly one directory, `.next/dev`, and a production build
  writes to `.next/build`. Verified by observation. Whether a *concurrent* build
  still disturbs dev at this version is UNTESTED — checking it means running a
  build against a live server — so keep them apart out of caution, but do not
  reach for `rm -rf .next` on that theory.

  **Deleting `.next` is expensive and almost never the fix.** It is 280MB. A
  cold rebuild re-parses every source file through Turbopack, re-downloads and
  re-subsets both Google fonts (10 `.woff2` files — Noto Nastaliq Urdu is
  large), rescans the tree for Tailwind, and re-optimises the AVIF photography
  on demand. Next 16 compiles routes on first REQUEST, so the cost lands on the
  first few page loads rather than on startup, which makes it read as a hang.
- **`ECONNREFUSED` can surface as `CONTRACT_VIOLATION`, not `NETWORK`.** An
  UNCACHED read (`/api/bag`) reports the transport failure honestly, but a
  CACHED one (`searchProducts`, which carries `next.revalidate`) came back
  through Next's fetch cache as a body that failed `resultPageSchema` instead.
  So a dead backend reads as "the response did not match the expected schema"
  on `/catalogue` and sends you to the schema. Check the log for a nearby
  `TypeError: fetch failed` before believing a contract violation.
- **Locale must be a query param, not `Accept-Language`.** Next's data cache is
  not keyed on that header, so both locales collided in one cache entry.
- **`overflow-x: clip`, never `hidden`,** when something has to spill on ONE axis
  only — `hidden` forces the other axis to `auto` and kills the spill. Learned on
  the hero's ambient glow, which has since been removed; the rule stands.
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
- **An animation short enough to be missed reads as no animation.** A 0.78s
  entrance with no delay was reported as "just the same tick" — not because it
  was broken, but because it was finished before the eye arrived from the
  navigation. Give an arrival animation a start delay and enough duration to be
  caught, and stage its parts so there is something still happening when the
  reader looks.
- **The preview pane's animation clock is frozen** — `document.timeline.currentTime`
  stays at 0, so CSS animations never advance here and cannot be judged by
  watching. Drive them: `el.getAnimations({subtree: true})` and set
  `currentTime` on each, then screenshot. That is the only way to see a keyframe
  sequence from this side.
- **The preview pane throttles `requestAnimationFrame` while hidden,** so
  animations read as stuck at their initial values. Force a screenshot before
  measuring anything animated, and before any layout read.
- **`typedRoutes` is off** on purpose: it is incompatible with backend-supplied
  hrefs.
- **MSW handlers that read a body MUST `request.clone().json()`.** MSW walks its
  handler list to find a match, and a resolver that reads the body consumes the
  stream — the next handler to touch the same request throws `Body is unusable`
  and the whole lookup fails as a 502. Three bag writes collided on this.
- **There are TWO forms on the checkout page** — the header's search field and
  the checkout itself. `document.querySelector('form')` finds the search one, so
  a scripted submit silently does nothing. Scope to the checkout form via a
  field it owns.
- **React 19 spells the popover props camelCase** (`popoverTarget`,
  `popoverTargetAction`). The lowercase HTML spelling still works — React passes
  unknown attributes through — but warns "Invalid DOM property" on every render.
- **MSW must CLOSE the previous interceptor when re-arming.** `startMockServer`
  re-armed per module context but never disarmed, so every hot reload left
  another live interceptor and ONE request was handled once per accumulated
  interceptor. Symptom: a single "Add to bag" ran the reservation four times and
  put 2 in the bag. The registry is keyed with `Symbol.for` so it resolves
  across contexts, and holds only the active server so the stale one can be
  closed. This is NOT the `globalThis` cache that was tried and removed — that
  one returned the old server and never re-patched.
- **`disabled={isPending}` does not prevent double submission.** `isPending`
  only becomes true after a re-render, so two clicks in one tick both pass. A
  `useRef` latch flipped synchronously inside the handler is the fix; it is on
  Add to bag and on Place order.
- **`react-hooks/refs` flags a ref read by a callback composed during render.**
  `form.handleSubmit(onSubmit)` in JSX counts, even though the callback only
  runs on submit. Compose it inside the event handler instead.
- **A sibling overlay swallows gestures; a child overlay does not.** Touch
  events bubble to the target's OWN ancestors, so the card's absolutely
  positioned `<Link>` — a sibling of the image stack — received every swipe and
  passed it to the wrapper, never to the carousel. Making the anchor a child of
  the element that listens fixed it without changing a pixel.
- **A swipe still fires a click.** A drag that ends on an anchor produces a
  click in some browsers, so a gesture-driven carousel inside a link needs a
  latch set at `touchend` and spent in `onClickCapture` — captured on the way
  down, so the anchor never sees the event.
- **A JSX comment cannot open a ternary branch.** `cond ? null : ( {/* … */}
  <ul/> )` parses as an object literal and fails with "')' expected" pointing at
  the wrong line. Put the comment above the conditional.
- **A feature barrel that re-exports a Server Component poisons every client
  import of it.** `@/features/catalogue` pulls in `CatalogueScreen`, which
  reaches `next/headers`, so a Client Component importing the barrel for a
  single grid fails the build with "you're importing a module that depends on
  next/headers". The fix is a second client-safe barrel (`contract.ts`), which
  is what STRUCT-06 is for and what `features/bag` already did.
- **An animation restarts on a NAME change, not a direction change.** Writing the
  exit as the entry plus `reverse` looks economical and does nothing: the
  finished animation re-evaluates at its new end state and the element snaps.
  Give the exit its own `@keyframes`.
- **When two fixes in a row change nothing the operator can see, STOP fixing and
  bisect.** Remove the feature entirely, confirm the rest is sound, then add it
  back. Three attempts went into fixing the bag's entry as a timing problem
  before the transition was simply deleted — which proved in one step that the
  travel itself was the fault, not its timing. The operator suggested it; it
  should have been proposed two attempts earlier, especially given that
  animation timing cannot be observed from this pane at all.
- **A `str.replace` anchored on a common CSS pattern will land in the wrong
  block.** A backdrop rule intended for `slide-over` went into `search-overlay`,
  which shares the identical `&::backdrop { background-color: ... }` line, and
  quietly gave the search panel a backdrop fade it never asked for. Anchor on
  something unique to the target, or slice from the utility's own opening line
  — and assert the count.
- **A transition starts at the style change, not at the first painted frame.**
  If displaying the element involves real work — first layout of a large
  subtree, image decode — the clock runs through it and the reader only ever
  sees the tail, which looks like the element popping in near its destination
  and finishing. `@starting-style` does not help: it supplies the value to
  animate FROM, not the moment the clock starts. Push the element to its start
  position, show it, and release it a frame or two later.
- **The preview pane throttles `requestAnimationFrame` AND `setTimeout`.** A
  rAF sampling loop recorded ZERO samples, and a 120ms timeout fired at 434ms.
  Animation timing simply cannot be observed from here — verify the mechanism
  (attribute order, keyframe values) and let a human confirm the feel.
- **A transition cannot run on the first frame an element is rendered.** Anything
  that goes from `display: none` — a `<dialog>`, a `[popover]` — has no previous
  value to animate from, so it appears instantly however complete the transition
  looks. Only the EXIT works, which is a distinctive symptom: snaps open, glides
  shut. `@starting-style` supplies the missing value.
- **A closing popover leaves the top layer immediately.** Transition `overlay`
  with `allow-discrete` alongside `display`, or the exit animation plays behind
  the rest of the page. `display` alone keeps it rendered but not on top.
- **A popover survives a client-side navigation.** Next keeps the DOM element,
  so a menu of links stayed open over the page it had just re-ordered. Keying it
  on the URL unmounts and remounts it, which closes it with no JavaScript —
  removing the element is how a popover closes anyway.
- **A top-layer element cannot be positioned with `position: absolute`.** Its
  containing block is the viewport, so it has no positioned ancestor to hang
  from; `anchor-name` on the trigger plus `position-anchor` on the popover is
  what re-establishes the relationship. Always pair it with `@supports not`,
  since the UA default is to centre the popover in the viewport, which reads as
  a broken dropdown rather than a missing feature.
- **A control revealed on hover does not exist on a phone.** `group-hover` is
  invisible to touch, so the card's frame arrows were unreachable there. Test
  with `@media (hover: none)` — it asks whether the PRIMARY input can hover, so
  a touchscreen laptop correctly keeps the reveal.
- **A comment that explains an absence goes stale silently.** The product mock
  said "ONE shot, because one shot is what exists" and stayed correct for
  exactly as long as that was true; four generated frames per garment landed
  later and nothing pointed back at it, so the gallery quietly showed one of
  five. An explanation of why something is missing needs re-reading when the
  thing arrives.
- **A page size that does not divide by the column count leaves a hole.** It is
  silent — nothing throws, and it only shows on the monitor widths where that
  column count applies, which is why 24-over-5 columns survived at 1920px for so
  long. Any new breakpoint has to divide `DEFAULT_PAGE_SIZE`.
- **`align-items: flex-start` defeats `truncate`.** A flex-start child is sized
  to its content, so a heading kept its full intrinsic width, overflowed its
  tile and never showed an ellipsis — the ellipsis needs a box NARROWER than the
  text to appear in. `stretch` is what makes a stacked flex child fill and
  therefore truncate.
- **`inset-block-start-0` and `inset-inline-end-0` are NOT Tailwind utilities.**
  They are CSS property names; Tailwind's logical inset utilities are `start-*`
  and `end-*`, with `top-*`/`bottom-*` for the block axis (which does not flip in
  a horizontal writing mode). Written as properties they compile to nothing, and
  the bag badge silently fell out of its corner.
- **Never animate content in from `opacity: 0` with `motion` on a page that must
  be readable.** Motion writes the `initial` styles into the SERVER HTML, so
  until that client leaf hydrates the content is invisible — the order
  confirmation rendered blank. Decoration animates via CSS (no hydration, no
  bundle); text is plain server-rendered markup.
- **A header child that pins its own text colour will not follow the bar over
  the hero.** `body:has([data-hero]) header[data-scrolled='false']` sets
  `color: on-media`, and anything carrying `text-fg` or `text-fg-muted`
  overrides that inheritance — the bag icon and the customer's name nearly
  vanished against a light film while the wordmark beside them stayed legible.
  Header controls should inherit and dim with `opacity`, which works whatever
  colour they inherit.
- **`preserve-3d` falls back to DOM order when faces are parallel.** The
  confirmation mark's dark back face painted over its green front one and hid
  the tick entirely, even though the card computed `transform-style:
  preserve-3d` and the faces were 12px apart in Z. At rest, with no rotation,
  the engine stops sorting by z-position. Put the back face FIRST in the DOM so
  it is correct either way.
- **A submit latch set BEFORE validation never gets released.** `handleSubmit`
  flipped the ref, RHF then rejected the form, `onSubmit` never ran, and the
  clearing line inside it never ran either — one mismatched password left the
  sign-up form permanently dead. `form.handleSubmit(fn)(event)` returns a
  promise that settles on every path, so clear the latch in its `.finally`.
- **A flat scrim over a film dims the part nobody is reading.** The hero used
  `media-scrim/45` across the whole stage in BOTH themes, which only looked
  wrong in the light one — a white page around a film dimmed by half reads as a
  grey box. The fix is a gradient anchored to the caption: clear from 60% up,
  strong where the text sits. Its stops were SOLVED, not judged — sampling the
  film gave luminance 0.66 behind the 48px headline, and the WCAG formula gives
  the minimum scrim for 3:1 and 4.5:1. Measured after: 3.79:1 and 5.36:1.
- **`cn` keeps the LAST of two conflicting Tailwind classes**, which is what
  tailwind-merge is for — but it means a state class layered over a per-item one
  silently wins for every item. `opacity-60` for sold-out, applied to each
  frame, overrode the `opacity-0` hiding the inactive ones: all five rendered at
  60% at once, ghosted over each other, and stepping the carousel changed
  nothing visible. A whole-element state belongs on a WRAPPER.
- **An absolutely positioned control lands where its CONTAINING BLOCK says.**
  The card's size tray sat directly under the `<article>`, so its
  `inset-block-end: 0` resolved against the whole card and it covered the name
  and price instead of the photograph. It belongs inside the image box.
- **A card's link must be an OVERLAY, not a wrapper, once it has controls.**
  Sibling buttons plus `position: absolute; inset: 0` on the anchor. And the
  controls need a HIGHER z-index than that overlay — otherwise the anchor
  swallows the pointer and an arrow click opens the product without the
  handler ever running.
- **`getComputedStyle` goes stale in the preview pane.** Style recalculation is
  deferred while it is not painting, so opacity reads can lag by seconds and
  suggest an animation is stuck. Read the CLASS LIST instead — it is the truth.
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
- **`server-only` makes a module untestable under Vitest, and the fix ships with
  the package.** Its default export throws so a Client Component importing a
  server module fails the BUILD; Vitest is neither a bundler nor a browser, so it
  resolves that throwing entry and every module transitively reaching
  `env.server.ts` dies at import with "This module cannot be imported from a
  Client Component". The package already ships `empty.js` for the case where the
  guard has nothing to protect, selected by the `react-server` export condition
  that Vitest does not set. Alias it in `vitest.config.ts` — pointing at the
  package's own shim rather than a stub of ours keeps the decision visible.
- **`env.server.ts` is a boot invariant, and a test process is a boot.** It
  throws on an invalid environment (ERR-06), so the Vitest config must supply the
  minimum for the schema to parse. Those are not fixtures and nothing asserts
  against them; the try-on provider key is deliberately absent so the suite
  exercises the unconfigured path.
- **A test behind a short-circuit asserts nothing.** Two enforcement tests read
  `expect(outcome.status).not.toBe('READY')` and passed on the PROVIDER_DISABLED
  answer that came first — they would have passed with the enforcement deleted.
  Checking the REQUEST before checking feature availability is both better
  behaviour ("that is a PDF" beats "unavailable") and what made them assert
  something. If a test cannot fail, it is documentation with a green tick.
- **Check port 3000, not just the preview harness, before `next build`.** The
  harness reported no preview server and there was still a `next dev` on 3000
  from earlier in the day, started outside the session — so the documented
  build-breaks-dev collision happened anyway. `Get-NetTCPConnection -LocalPort
  3000` is the check the existing note was missing.
- **`sharp` takes per-channel gains in `linear([r,g,b])`** — verified on 0.35.4,
  which is what makes grey-world white balance about six lines. Flatten alpha
  first, or the array length will not match the channel count. It is present
  transitively via Next but is now DECLARED in `devDependencies` (BASE-01),
  following msw's precedent: dev-only, server-only, never bundled.
- **Gemini's image API does not accept AVIF.** Supported types are PNG, JPEG,
  WebP, HEIC and HEIF. A catalogue stored in AVIF has to convert before it can
  send, and the offer must not advertise a format the provider will refuse.
- **A route `page.tsx` has an 80-line HARD ceiling (MOD-03).** Adding a parallel
  read and a slot pushed the product route to 94. The fix was to move the "is
  this offer usable" judgement into a Server Component in the feature — which
  STRUCT-02 wanted anyway, since routes compose rather than decide — and then to
  tighten comment blocks. Worth knowing before adding anything else to that file:
  it now sits at 79.
- **`flex` and `grid` disagree about what a sticky item may do.** A sticky GRID
  item is confined to its own grid area, so stacked single-column it scrolls away
  the moment the next row starts; a sticky FLEX item is confined to the flex
  container, which spans every item. And the sticky box must BE the item — one
  that exactly fills its containing block has nowhere to travel and never sticks.
  In grid it additionally needs `self-start`, or it stretches to the row height
  and pins itself in place again.
- **`items-center` on a flex column collapses a height-constrained child to zero
  WIDTH.** The child is sized to its content and a grandchild's `w-full` resolves
  against nothing. The figure rendered 2px wide with no error; take width from an
  aspect ratio instead.
- **`Object.fromEntries` widens a literal key union back to `string`.** A
  `Record<'neck' | 'chest' | ..., T>` built that way will not satisfy its own
  type. Pass the already-keyed registry object through rather than mapping it.
- **`z.string().pipe(z.coerce.number())` does not typecheck.** `z.coerce`'s input
  is `unknown`, not the `string` the pipe promises. If a form's values are
  strings, validate them AS strings with a `refine` and convert at submission — a
  resolver whose output type differs from its input also makes the `useForm`
  generics fight back.
- **`form.watch()` makes React Compiler skip memoising the whole component.**
  `useWatch({ control })` is the same subscription without the opt-out.
- **The preview pane returns BLANK screenshots while it is hidden**, and nothing
  in the image says so — it looks exactly like a page that rendered nothing.
  `tabs_context` reports it; `tabs_select` fronts it. Its screenshots also lag
  behind interactions by seconds, so verify anything post-interaction with a DOM
  probe and treat the picture as the slower witness.
- **`EffectComposer` writes an OPAQUE result.** Wherever nothing was drawn the
  canvas came back black, so the stage stayed dark on a light page however the
  CSS behind it was themed — `alpha: true` on the renderer buys nothing once a
  composer is in the chain. Give the scene its own `background`.
- **A limb baked into figure heights cannot be posed.** Authoring the arm along
  its own length from a joint is what turns a fixed sculpture into a rig, and it
  costs nothing at the time: the same loft, indexed differently. Anything meant
  to travel with the limb has to be a CHILD of its group and expressed in the
  same space, or it stays behind in mid-air.
- **A loft's end cap is a flat disc and it shows.** Taper every part to near zero
  at both ends, and start a limb ABOVE its joint so the cap is swallowed by the
  socket.
- **`mode: 'onBlur'` on an all-required form scolds people for work they have not
  done.** Every field went red the moment it was left, so tabbing down the form
  painted the page red before a single value was entered — "empty" and "wrong"
  looked identical. `onSubmit` with `reValidateMode: 'onChange'` is the pattern.
- **React re-renders BEFORE `handleSubmit`'s promise settles.** Focusing an error
  summary in `.finally()` silently does nothing: the summary does not exist yet
  and the ref is still null. Record the intent BEFORE the submit and spend it in
  an effect that also checks the summary is now there.
- **A scrim strong enough for a dark set dissolves a light one.** The bottom
  gradient behind the caption was a near-white sheet in light mode and still left
  muted text under 4.5:1. A small blurred PLATE carries its own contrast wherever
  it lands and leaves the rest of the set alone.
- **Transmission scales with geometry thickness.** At a setting the torso could
  carry, the calves — thin, backlit by a pale backdrop — faded out from the knee
  down and the figure looked like it was dissolving.
- **`next/dynamic` with `ssr: false` is what keeps a heavy scene off every other
  route.** three's core lands in its own ~1.5 MB chunk that only `/stitched` asks
  for.
- **Writing a ref during render is a lint error, not a style note**
  (`react-hooks/refs`). Keeping a callback fresh for a long-lived imperative scene
  means assigning it in an effect.
- **`preview_stop` can leave the dev server alive on port 3000.** The next
  `preview_start` refuses with "port in use by node.exe (not a preview server)".
  Check the PID's command line before killing it.
- **A `find` result goes stale across a `navigate` in the same batch.** The click
  lands on whatever now occupies the old coordinates — twice here it hit a
  different field, and once it followed a link to the catalogue. Screenshot to
  refresh the frame, then find and click.
- **Proportion is what makes a figure read as a person, not detail.** The
  mannequin was 11.3 heads tall for three rounds of "it looks like a dummy"
  feedback, while effort went into material, lighting and anatomy of individual
  parts. Count the heads FIRST; 7.5 to 8 is a person, and the
  `img2threejs` skill's `humanoid_proportions.py` supplies the canon with its
  provenance attached.
- **A canon that names what it does NOT know is worth more than one that fills
  every field.** That corpus refuses to supply hand, foot and thigh length rather
  than interpolating them, which is exactly what keeps the sourced numbers
  trustworthy. Mark borrowed convention as convention.
- **Two lofted parts that meet on a shared ring must not BOTH be capped.** The
  coincident discs face opposite ways and z-fight, drawing a bright seam ring —
  ours landed exactly where the cuff is measured.
- **A measurement authored in a limb's space needs its camera target resolved
  THROUGH the pose.** Framing the arm measurements on the shoulder was stable but
  wrong: at a T-pose the wrist is most of a metre off the centre line, so the
  cuff tape sat off the edge of the stage with only its bloom showing.
- **Thirteen equal markers are a menu at rest and a rash in close-up.** Shrink the
  ones that are not being measured once one is chosen; at camera distance they
  read as studs pressed into the body.
- **A tape pulled tight is a CONVEX HULL, not a surface trace.** It bridges the
  small of the back and the gap between the pectorals. Following the surface
  faithfully reads low on every measurement, and low is the direction that cuts a
  garment too tight to wear.
- **A limb is a CONNECTED RUN, and that is the only reliable way to find its
  end.** Below the hand there is no arm, so the outermost cluster at that height
  becomes a LEG — near the axis and a long way down, which dragged a fitted arm
  axis inward and put the cuff tape at hip height. An absolute jump threshold was
  tried first and was worse than useless: the slice misses at scattered heights
  INSIDE the arm, so the next real centroid is a whole gap away and the guard
  fired on a legitimate step, collecting one centroid before giving up. Two misses
  in a row ends the run; and an arm always travels AWAY from the axis, which
  catches whatever a stray hit picks up next.
- **A slab thickness that works at the waist finds four points at the wrist.**
  Vertex density varies enormously across a model, so grow the slab until the
  slice is a shape rather than a scatter — and set the minimum point count for the
  THINNEST part, not the thickest.
- **`visible = false` hides an object's CHILDREN too.** A fallback tape parented
  into the hidden procedural arm group was built, positioned, and never drawn.
- **WRONG — see "A build run beside `next dev` corrupts `.next/dev/types`" at the
  end of this list.** What this note claimed: a build CAN run against a live dev
  server at Next 16.3.4 — measured, not assumed. After `npm run build` with `next dev` up: `/stitched` 200,
  `/catalogue` still rendering real product data, `/api/quick-add` answering 404
  rather than the 502 that means MSW died, and the WebGL page still loading in the
  browser. The `PROGRESS` caution was explicitly UNTESTED and rested on a theory
  the same note had already disproved. One caveat, stated rather than glossed:
  `/api/suggest` answered empty afterwards, and no BEFORE reading was taken, so
  that one probe is inconclusive rather than clean.
- **The Read tool does not render AVIF.** To look at converted output, composite
  a contact sheet as JPEG and read that instead — one image, one look.
- **React Hook Form focuses the first bad field, and it beats your effect.**
  `shouldFocusError` defaults to true and runs AFTER the render that produced the
  errors, so an effect moving focus to an error summary appears to do nothing —
  focus is stolen a tick later, with no warning and nothing in the DOM to show
  it. Turn it off explicitly when a summary owns the landing.
- **A width read while a transition is mid-flight reports 0, and looks exactly
  like broken CSS.** The pane's clock is frozen, so a `transition: inline-size`
  never advances; `getBoundingClientRect().width` came back 0 on a bar whose
  custom property, matching rule and parent width were all verifiably correct.
  Read the rect a second time, in a later call, before believing a layout number
  on anything that transitions.
- **`computer{action:"zoom"}` does not crop in the Browser pane** — it returns the
  whole screenshot with a note. To look closely at one element, shrink the
  VIEWPORT so the screenshot is unscaled, and hide the rest of the page with an
  injected stylesheet.
- **Back-searching for a preceding doc comment lands anywhere.**
  `text.rfind("  /**", 0, start)`, used to widen a replacement to include the
  comment above a block, matched an unrelated comment in a file whose target had
  none — and the replacement swallowed the end of the previous block. Anchor on
  the block's own opening line and nothing else, and assert the match count.
- **A `<<'EOF'` heredoc into `cat` failed with "unexpected EOF" in this shell**
  while the identical form into `python -` worked. Do not fight it: write the
  file with the Write tool and `cat` the pieces together.
- **The midpoint of a symmetric dimension line is the centre front.** Anchoring a
  marker at the middle of a shoulder or chest span puts it exactly on the placket,
  among the buttons, where it reads as one of them. Two such markers a few units
  apart also overlap into one hit area, so the wrong field opens with nothing on
  screen to explain why. Anchor a girth ON its ring and a length off its midpoint,
  and assert a minimum separation in a test — this is invisible in code review and
  obvious the moment it is drawn.
- **A garment flat is a pattern, not a picture, and the difference is legible.**
  Three defects made the first drawings read wrong to anyone who owns the
  garment: a body narrower than its own shoulders, an armhole that bulged OUTWARD
  instead of being cut in (which turns a waistcoat into a sleeveless dress), and
  a collar drawn as two arcs over a dipped neckline, which closes into a lens and
  reads as a ring resting on the shoulders. Draw the seam a tailor would sew: a
  band collar opens at the centre front, an armhole bows toward the centre.
- **Detail is not the enemy; wrong proportion is.** The shalwar's fullness — the
  gathers, the nala, the drape, the curved inseams — was stripped out on the
  theory that a measurement diagram should be spare, and the pared-back version
  read as a trouser. It went back in. A shalwar IS wide and the drawing has to
  say so; what was actually making the picture wrong the whole time was one
  number, not the level of detail.
- **ONE number decides whether a garment reads as a garment: where the crotch
  sits.** Three rounds of feedback on the shalwar were answered by redrawing the
  silhouette, the seams and then the whole level of detail, while the crotch sat
  at 57% and then 48% of the length throughout — which makes the legs shorter
  than the body above them and reads as clown trousers however good the outline
  is. It is the exact shape of the 11.3-heads mannequin further up this file:
  effort went into everything except the proportion that was actually wrong.
  **When feedback repeats after a fix, the fix addressed the wrong thing — go
  back and measure the proportions before touching the drawing again.**

- **A read written to be forgiving becomes a lie when a second screen REPORTS what
  it returns.** The studio's profile read collapses every failure to an empty list
  on purpose: there, the absence of an offer asserts nothing. The account page put
  that same empty list behind the sentence "you have not saved any measurements
  yet", which is a claim about the customer's own record — made on the strength of
  a read that had failed. Two screens wanting different things from one read is the
  signal: let the read say what happened and let each caller decide what to do with
  it, rather than deciding once for both at the bottom.
- **A `/** */` comment belongs to whatever key follows it, so inserting a block
  between the two silently re-labels it.** The new account block landed under the
  wishlist's `§28.3's saved items` and took it: the registry then documented the
  account as "saved items" and left the wishlist undocumented. In a file whose
  block comments are the only statement of what each group is for, that is a real
  loss. Put a new block ABOVE the comment it must not steal, or give it its own.
- **`.next/dev/types` corrupts every time the preview is stopped and a build or
  typecheck follows immediately** — twice in one session now, both times
  `validator.ts` with TS1128 at a line that is past the real end of the file. The
  dev server is still flushing those files as it goes down. The documented fix
  works every time and takes seconds: delete `routes.d.ts` and `validator.ts`, run
  `npx next typegen`, then typecheck. Do not reach for `rm -rf .next`.
- **A GET must not create the thing it reads.** The save path mints a device token
  when a browser has none, which is right for a write and wrong for a read —
  reusing it would have taken a token from the backend on every anonymous visit to
  the studio and done nothing with it. A browser with no cookie owns nothing, and
  that is an answer.
- **Superseding across two lists that share no point ids HIDES figures rather than
  replacing them.** A tailor's card and a copied garment are two ways of measuring
  one garment, so superseding across them reads as obviously right — and is wrong
  the moment anything reads a profile BACK, because the card's points carry their
  own ids and can only answer a card list. The figures stay on file and stop being
  reachable from anywhere. Two things generalise: a supersession rule has to be
  keyed on the same identity the READ matches on, and the plan's own open question
  (“decide this before anything reads versions back”) was the warning.
- **`form.setValue` does not re-validate, and `reValidateMode: 'onChange'` will not
  save you.** That mode fires from the input's own change event, which a
  programmatic write never dispatches, so every error from an earlier submit
  survives a fill — eight fields holding good figures, all eight red, beside a
  status line saying they had just been filled. Re-judge explicitly, and guard it
  on `formState.isSubmitted` so a form that has not been asked to check still does
  not scold.
- **A figure the app PUTS in a field was not typed, and anything that converts
  “from what was typed” has to be told.** The studio's unit switch converts from the
  original every time, which is what keeps 18.25 in from drifting; a restored
  figure written straight into the field is read as freshly typed in whatever unit
  is showing, so the next switch converts a conversion (24 → 61 → 24.02). Seed the
  record at the moment of placing, with the original figure and its original unit.
- **Anything added to the studio's panel has to be added to the focus-mode hide
  list — this is the third time.** The finishing choices missed it in Phase 5, the
  field-note actions in Phase 6, and the saved-measurements band now. On a phone
  the sheet is one field over the drawing, so furniture left in it steals the
  drawing's room and leaves a button in the sheet's tab order. A new block in
  `MeasurementPanel` needs an `mm-` class and a line in that `:is(...)`.
- **A server-rendered snapshot goes stale the moment the page mutates what it read.**
  The studio is rendered with the profiles on file and stays mounted across a save,
  so the offer went on naming the version that save had just superseded — and
  taking it would have put the older figures back over the newer ones. A mutation
  that changes what the page was rendered from needs a `router.refresh()`.
- **Port 3000 may belong to a different project.** `preview_start` refused with
  “in use by node.exe (not a preview server)”, and the PID's command line showed a
  `next` server from another repository entirely — the operator's, running at the
  same time. Read the command line before assuming it is a stale copy of this one;
  `"autoPort": true` in `.claude/launch.json` takes a free port instead of fighting
  for that one.
- **A grid that declares columns only at a breakpoint has an AUTO track below it,
  and an auto track is sized to its contents.** `grid lg:grid-cols-2` looks like it
  says "one column, then two"; it says "a column as wide as whatever is in it, then
  two". Anything intrinsically wide in that column sets the page width and everything
  beside it inherits it — which is invisible on a desktop, where the breakpoint
  applies, and breaks every phone. **A scroller inside does not protect you**: an
  auto track measures what is inside the scroller, not the scroller, so the product
  page's `overflow-x-auto` thumbnail strip was the thing setting the width. State the
  base count (`grid-cols-1`, i.e. `minmax(0, 1fr)`) on every responsive grid.
- **A phone widens its LAYOUT VIEWPORT to fit an overflowing page, so `100%` on a
  fixed element stops meaning "the screen".** The bag panel measured 456px on a 375px
  screen and read as a second, separate bug; it was the product page's overflow,
  seen through a panel that was sizing itself correctly. Fix the page before
  believing a fixed overlay is broken.
- **Vertical padding grows a tap target for free on an INLINE box and is real layout
  on a FLEX ITEM.** The same `py-2` made a 17px breadcrumb link a 33px target without
  moving anything (the `<a>` is inline inside its `<li>`), and made a rail's section
  head 8px taller with its heading's baseline shifted (the `<a>` is a direct child of
  a flex container, so it is blockified). Pair it with `-my-2` in the second case.
  Two reviewers caught the comment claiming otherwise; the measurement settled it.
- **Making a hover-only surface reachable on touch turns everything inside it into a
  touch target.** Drawing the card's quick add on phones promoted a whole tray nobody
  had ever tapped: its size buttons were 22px, under the 24px minimum, and the taller
  tray then covered its own close button — which stayed visible through the tray's
  transparent top and silently did nothing, because equal z-index plus later in the
  tree wins the hit test. Neither a test nor a screenshot would have shown it; an
  adversarial review did, and only at the three-column density. **When a control
  becomes reachable somewhere new, re-examine everything it opens, not just itself.**
- **`:not(a, b)` is Selectors 4 and takes the whole rule down with it where it is not
  parsed.** A selector list inside `:not()` that a browser cannot read invalidates
  the entire rule, including the perfectly ordinary selectors beside it. For a rule
  whose whole purpose is protecting an OLD browser, write the Level 3 form —
  `:not(a):not(b)`.
- **MSW died twice more, both times within minutes of a fresh start and after one or
  two edits** — one of them a comment. The probe pair ended the hunt in seconds each
  time: `/api/quick-add?slug=x` answering 502 and `/catalogue` rendering 0
  `<article>`. Read the probes BEFORE suspecting what was just written.
- **A `ref` from `find` is stale the moment the layout changes, and it clicks by
  PIXEL.** Switching the catalogue from two columns to three moved every card; clicks
  on refs captured before the switch landed on the photograph and navigated to a
  product page twice in a row, which reads exactly like a broken handler. Re-`find`
  after any layout change — and to test whether a tap REACHES a control, ask
  `document.elementFromPoint` at the control's own centre, which is the hit test
  itself rather than a proxy for it.
- **A `prefers-reduced-motion: reduce` override loses to the rule that STARTS the
  animation, if that rule is more specific.** `.measure-line { animation: none }`
  is (0,1,0) and `.group:hover > .measure-line` is (0,3,0); a media query adds no
  specificity, so the guard compiled, read correctly and did nothing. Grant the
  motion inside `no-preference` instead, and there is nothing left to override —
  the same shape as the breakpoint-reset note above.
- **Chrome counts only KEYBOARD focus as `:focus-visible`.** A scripted
  `el.focus()` after pointer activity matches `:focus` and not `:focus-visible`,
  so a focus-ring probe reads "no outline" on a ring that works. Focus the
  element, then press a real Tab and Shift+Tab.
- **A canvas colour probe fails SILENTLY on a string it cannot parse.** Setting
  `fillStyle` to an unparseable value is ignored and the previous fill stays, so
  the focus ring read as "not on-brand" when the custom property's text
  (`lab(98.87% …)`) and the computed outline (`lab(98.87 …)`) were the same
  colour. Print both values before believing a mismatch.
- **Changing the layout on FOCUS moves the target out from under the pointer.**
  Focus lands between the press and the release, so a field that reshapes the
  page when focused has its release — and the click — land on whatever is there
  now. In the studio a tap on Chest came out as a tap on the drawing's Shoulder
  mark, and could as easily have been Done; on touch it is the classic ghost
  click. Activate pointer interactions on click, and keep focus for the keyboard.
- **The preview harness's Enter sends keydown only, no keypress**, so implicit
  form submission never fires from it. A form that "does not submit on Enter" in
  the pane is the harness, not the form — click the submit button to test that
  path.
- **`event.timeStamp` is not one clock across event types.** A pointer event and
  a focus event came back on different time bases, so "focus within a second of
  the press" read as stale and the fix silently did nothing. Take both times from
  `performance.now()` inside the handlers.
- **A client subtree that hydrates on its first real event never sees that event
  in its own handlers.** The studio's first `onPointerDown` did not run on a fresh
  page, so anything that must know about the FIRST interaction needs a native
  listener registered when the module loads. Test a fresh load separately: an
  already-hydrated page passed every time while a fresh one failed.
- **A build run beside `next dev` corrupts `.next/dev/types` — never run one while
  the dev server is up.** Both processes write `routes.d.ts` and `validator.ts`
  there, and `tsconfig.json` deliberately includes `.next/dev/types/**/*.ts`. A
  shorter write over a longer file left the old tail behind — `never }` after the
  real end of `routes.d.ts`, `nore type __Unused…` inside `validator.ts` — so the
  build compiled and then "Failed to type check" with TS1128 at those lines, and
  `npm run typecheck` failed the same way from then on. The corruption PERSISTS: a
  second build with the dev server idle failed identically. The fix: stop the dev
  server, check port 3000 is free, delete those two files, `npx next typegen`,
  then typecheck and build. This is the earlier note's "untested" caution coming
  true, and it overturns its "measured" claim.
- **Zod 4's `.nonempty()` refuses an empty array but still TYPES it `T[]`.** Under
  `noUncheckedIndexedAccess` the first element is then `T | undefined` everywhere,
  and every consumer grows a dead branch. `z.tuple([item], item)` refuses the same
  input and types it `[T, ...T[]]`.
- **MSW died a fourth time, after only four client-component edits**, in the
  middle of Phase 2 — well short of the "long session" the earlier notes blame.
  The tell was the studio's own unavailable state plus `[made-to-measure]
  NETWORK` in the log, and 0 articles on `/catalogue`. No cause established;
  restart and re-probe after any burst of edits before believing a page.
- **A barrel and its first consumer written in one burst can leave a stale
  module behind:** the product schema threw `styleOfferSchema is not defined`
  because the dev server had evaluated `contract.ts` before its new export
  landed. It is not a cycle; a restart cleared it.
- **The dev server did NOT serve a stale served list across a restart**, despite
  `revalidate: 300` on the read: swapped mock rows showed at once after a
  restart. That is what makes "edit the mock and restart" a usable check here.

- **A schema test that leaves a field out tests the wrong thing.** The form's
  schema refuses `undefined`, but a form never holds it — a field shows `''` — so a
  fixture without the optional fields failed for a reason no customer can meet.
  Build a form fixture from `emptyEntry(points)` and overlay the figures.
- **A choice is part of what an answer is ABOUT.** Keying a pending request only on
  the list let an answer about Cuff be shown after the customer picked Plain. Any
  input that changes which fields are asked belongs in the staleness key.
- **When the pane stops drawing, clicks fail but the page still works.** With the
  app window behind another, every `left_click` refused ("has not drawn yet") and
  screenshots came back blank, yet `find`, `form_input`, `form.requestSubmit()`
  and a scripted `link.click()` all drove the hydrated studio correctly — enough to
  verify a submit, a client navigation and a file choice (a canvas PNG set through
  `DataTransfer` and a bubbling `change`). Scope every probe to elements outside
  `[hidden]`, and read the result from the DOM rather than a picture.
- **A toggle must read what is IN FORCE, not what the map remembers.** "Keep my
  number" held each answer in a Map keyed by its note, and an answer whose figures
  had since changed stayed in that map while no longer standing. The next press
  therefore DELETED the lapsed entry instead of adding a new one: the button did
  nothing, and only a second press turned it on. Decide from the same value the
  render shows, and let a lapsed entry go when the next answer lands, so it cannot
  come back to life if the customer happens to type the old figure again. Found by
  pressing the button twice in the browser; no test would have caught it, because
  the state it depends on only exists across two checks.
- **MSW died twice more in one Phase 6 session**, each time within minutes of a
  fresh start and after two or three edits — one of them a comment. The studio's
  own unavailable state ("The measuring guide could not be loaded") is honest and
  looks exactly like a defect in whatever was just written, so read the two probes
  BEFORE suspecting the change: `/api/quick-add?slug=x` answering 502 and
  `/catalogue` rendering 0 `<article>` is the mock, not the code. Both times that
  pair ended the hunt in seconds.
- **An undrawn pane is 0 pixels wide, and every page then "scrolls sideways".**
  `clientWidth` and `innerWidth` read 0 while `scrollWidth` read 184, English and
  Urdu alike, and the "offenders" were the header's logo and icons at negative
  offsets — a phantom RTL overflow. Set an explicit size with `resize_window`
  (1280×800, or the mobile preset) before any overflow probe, and print
  `clientWidth` beside the result.

## Commands

```bash
npm run dev
```

```bash
npm run typecheck && npm run lint && npm run test && npm run build
```
