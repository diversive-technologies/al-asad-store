# Progress — where the build actually is

State, not rules. `CLAUDE.md` says what the super-modules are and `docs/system-architecture.md`
says what the system does; neither is repeated here. This file answers one
question at the start of a session: **what is done, and what is next.**

Keep it current at the end of an iteration. A stale progress file is worse than
none, because it is believed.

Last updated: 2026-09-07. Last commit: `01e09cb` (tree dirty — see below).

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
- **No account area.** Order history, saved addresses and a real wishlist are
  still M6; signing in today gets you a name in the header and the wishlist
  heart, nothing more.
- **The wishlist is per-browser, and only offered to a signed-in customer.** A
  real one belongs to an account (§28.3), so the heart is HIDDEN for guests —
  offering it let them save into a list they could never open. Behind the mock
  sign-in it persists to `localStorage`: it survives a reload on one device,
  does not follow the customer to a phone, and is invisible to the operator.
  `useWishlist` is shaped so a server-backed list replaces it without the cards
  changing. Quick add stays available to guests, because guest checkout is
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

## Uncommitted work — M4

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
- **Do not run `npm run build` while `npm run dev` is up.** They share `.next`,
  so the build writes into the directory the dev server watches, the dev server
  re-evaluates modules, and MSW's interception does not survive it. Every
  outbound call then escapes to `JAVA_API_BASE_URL` and gets `ECONNREFUSED`
  — the whole store appears broken and only a dev-server restart fixes it.
  Stop the server, build, start it again.
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
- **The Read tool does not render AVIF.** To look at converted output, composite
  a contact sheet as JPEG and read that instead — one image, one look.

## Commands

```bash
npm run dev
```

```bash
npm run typecheck && npm run lint && npm run test && npm run build
```
