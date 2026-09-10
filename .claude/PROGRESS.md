# Progress — where the build actually is

State, not rules. `CLAUDE.md` says what the super-modules are and `docs/system-architecture.md`
says what the system does; neither is repeated here. This file answers one
question at the start of a session: **what is done, and what is next.**

Keep it current at the end of an iteration. A stale progress file is worse than
none, because it is believed.

Last updated: 2026-09-10, on branch `flat-model`. Last commit: `62363d3`
(Made-to-Measure, committed incomplete because the rest forks onto this branch).
Tree still carries the search work in flight — see the end of this file.

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
| USP2 | Made-to-Measure (§34) | **Measurement atelier rebuilt as GARMENT FLATS** on branch `flat-model` — the 3D figure and `three` are gone. Kameez, shalwar and waistcoat as SVG line art, each measurement marked on the drawing it is taken from. Entry points and the buy-box fork are still not started. |

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

    On TOUCH there are no arrows at all — the card is SWIPED. A phone has no
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
- **BFF** — `/api/products`, the sixth. It exists because the ids live in the
  BROWSER and `apiRequest` is `server-only`, and it aggregates the cached
  projection with the live availability overlay that §8.2 keeps separate. Ids
  are capped at 100 (SEC-02: the length is untrusted input).
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
  `isConfigured()` is false, `isAvailable()` answers false, and the product page
  renders NO try-on button. That is the repository's default and the state §28.5
  describes. Verified in the running store: 0 try-on buttons, Add to Bag present,
  page intact — ADR 12 and §30.2 holding in the interface, not just on paper.
- **Absence IS the unavailable state.** A button that opens a panel to announce
  the feature is off is a control that cannot do its job. The panel's three
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

- **34 tests** across `garments`, `entries` and `units`, covering the doubling,
  the round-trip, the bounds being stated on the stored figure, every annotation
  falling inside its own viewBox, the anchor rules, and the mark separation.

Verified: **typecheck, lint, 229 tests and the production build all pass**, with
`/stitched` in the build output. Measured in the running store rather than
eyeballed: tabbing through five empty fields leaves **0** invalid fields and **0**
alert nodes; submitting empty gives **13** invalid fields, the summary heading,
**13** jump links, and focus on the summary; typing 21 into the kameez chest reads
`21 in across → 42 in around` and the toggle round-trips it to 56 cm and back;
clicking the sleeve mark focuses `kameezSleeve`; the thigh jump link switches the
drawing to the shalwar; and the page renders correctly light, dark, at 1440px and
at 390px. Urdu was checked at `dir="rtl"` — every string, `13 میں سے 1 ناپ لیے گئے`,
and the readout as `21 انچ آر پار ← 42 انچ گھیر`.

## Made-to-Measure — what is left

**Every entry point.** Nothing links to `/stitched` yet: no buy-box fork on the
product page, no homepage stage, no bag nudge for unstitched cloth, no card
badge. The studio exists and nobody can find it.

**The body path**, which §34.8 defers and §34.6a keeps deferred. The same set,
the same kinds, the same bounds and the same instructions drive it; what differs
is which picture the tape is laid on and how the instruction is worded.

**Nothing is saved.** Submitting validates and confirms on screen; there is no
contract, no BFF and no mock behind it, so no profile is written and no stitching
charge is priced. The measurement set is a fixture, not the tailor's card.

**Thirteen measurements is a fixture, not the tailor's card.** §34 makes the real
set content (ADR 17). The bounds are plausible rather than authoritative, and
they are GARMENT figures — a kameez chest carries ease a body chest does not.

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
- **No account area** beyond the saved items. Order history and saved addresses
  are still M6.
- **The wishlist has a PAGE now, at `/wishlist`**, reached from the account
  menu — the heart used to save into a list with nowhere to open it. It renders
  the same `ProductCard` as the catalogue, so the heart, the quick add and the
  frame carousel work there for free, and un-hearting removes the item from the
  page as you watch.

  It is still per-browser and still only offered to a signed-in customer. A real
  one belongs to an account (§28.3), so the heart is HIDDEN for guests —
  offering it let them save into a list they could never open — and the page
  itself asks a guest to sign in rather than showing an empty list they were
  never allowed to fill. Behind the mock sign-in it persists to `localStorage`:
  it survives a reload on one device, does not follow the customer to a phone,
  and is invisible to the operator. `useWishlist` is shaped so a server-backed
  list replaces it without the page or the cards changing.

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
- **A build CAN run against a live dev server at Next 16.3.4 — measured, not
  assumed.** After `npm run build` with `next dev` up: `/stitched` 200,
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

## Commands

```bash
npm run dev
```

```bash
npm run typecheck && npm run lint && npm run test && npm run build
```
