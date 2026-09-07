# Progress — where the build actually is

State, not rules. `CLAUDE.md` says what the super-modules are and `docs/system-architecture.md`
says what the system does; neither is repeated here. This file answers one
question at the start of a session: **what is done, and what is next.**

Keep it current at the end of an iteration. A stale progress file is worse than
none, because it is believed.

Last updated: 2026-09-07. Last commit: `66dd887` (tree dirty — see below).

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

  The card's `<Link>` is an OVERLAY rather than a wrapper, because a `<button>`
  inside an `<a>` is invalid HTML whose clicks navigate before their own handler
  runs. Every control sits above it on its own z-index.
- **Grid** — vertical stagger via the `staggered-grid` utility in `globals.css`,
  scaling 2 / 3 / 4 / 5 / 6 columns from mobile to 2560px.
- **Filter panel** — all six filters of section 28.1 with contextual facet
  counts, removable chips, Clear all and instant apply. Every control is a
  `<Link>`, so the panel is a Server Component shipping no JavaScript and every
  filter combination is a crawlable URL; `PriceFilter` is the single client leaf,
  because a range needs a submit rather than a navigation per keystroke.
- **Sort** — the four options of section 28.1, as links with `aria-current`.
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
  methods are a LIST from `quote()`, each carrying its own label, description,
  availability and — crucially — its own `nextStep` sentence. That last field is
  what keeps the confirmation screen free of a branch: Cash on Delivery says an
  SMS is coming, a card says it is authorised, a transfer asks for the money. A
  fifth method is a configuration entry in Java and changes no file here.
- **The COD cap is server-side.** `quote()` returns Cash on Delivery disabled
  with a reason above the cap, and `place()` refuses it again — a client that
  never called `quote` is still refused, which is what §17 means by "never only
  in the interface".
- **Single page** (§28.2), guest checkout, React Hook Form + `zodResolver`,
  delivery options, gift wrapping with a message, and a sticky order summary.
- **The order number is the address** — `/order/[orderNumber]`, bookmarkable and
  shareable, which is how §28.3 will track a guest order.

## M5 — what is left

Order tracking by number and mobile (§28.3), and the payment gateway itself —
the mock has no gateway to call, so `AUTHORIZED` is stated rather than obtained.

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
- **No confirmation SMS.** §28.2 has one and §7.2 step 8 enqueues it, but no SMS
  provider is wired up, so Cash on Delivery says a call is coming rather than
  promising a message that never arrives.
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
Cash on Delivery produced order **AA100001**, the confirmation named the SMS
step, the bag emptied, `/api/checkout/quote` then answered 404 because there was
nothing left to check out, and `/order/AA100001` still renders on a fresh load.

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
- **A submit latch set BEFORE validation never gets released.** `handleSubmit`
  flipped the ref, RHF then rejected the form, `onSubmit` never ran, and the
  clearing line inside it never ran either — one mismatched password left the
  sign-up form permanently dead. `form.handleSubmit(fn)(event)` returns a
  promise that settles on every path, so clear the latch in its `.finally`.
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
