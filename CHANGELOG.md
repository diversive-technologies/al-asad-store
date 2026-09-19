# Changelog

Every commit on `main`, newest first, with what it actually changed and — where
there is one — the thing that was learned or that will bite someone later.

**Why this exists and what it is not.** A commit message says what was done. This
says _why_, records the mistakes that cost time, and names the decisions that a
reader would otherwise have to reverse-engineer from a diff. It is not a release
log: there are no releases yet, and inventing version numbers for a storefront
that has never shipped would be a fiction.

Related documents, none of which this duplicates:

| Document                              | Holds                                                                |
| ------------------------------------- | -------------------------------------------------------------------- |
| `.claude/CLAUDE.md`                   | The binding decisions (D1–D6), the build sequence, the read protocol |
| `.claude/PROGRESS.md`                 | Where the build is _now_, and the deliberate gaps                    |
| `.claude/docs/system-architecture.md` | What the system does                                                 |

**Maintenance.** New entries go at the top, written _before_ the commit is made,
so the commit that adds an entry is itself in the file. That is why the newest
entry names no hash — it does not have one until it is committed.

---

## Unreleased

### _(this commit)_ — 2026-09-19

**Repair the whole storefront, finish the product page and the account, move the
catalogue to one product per photograph, add the store's policy pages and search
engine files, put the main journeys under a browser test, and test every use case
by hand.**

Five passes over 17–19 September, committed together. The sixteen commits between
`b0c3cbe` and this one (`62363d3` to `621e384`) have no entries of their own; their
commit messages say what they did and `.claude/PROGRESS.md` records the state they
left. This entry does not backfill them.

**1. A repair pass over everything built so far.**

- **Every state-changing BFF route now refuses another origin (SEC-08)** before it
  reads a body, a cookie or a parameter. PROGRESS had listed the six routes missing
  the check, and listed them wrongly — two of the six it named were GETs and both
  `/removal` POSTs were missing. `request-policy.test.ts` now reads every
  `app/api/**/route.ts` and fails if any write handler lacks the check or runs it
  late.
- **An order could be read by anyone who guessed its number.** Numbers are
  sequential, and the order page answered any of them. The backend now answers an
  order only to the account that placed it or to a browser holding an access token
  issued at placement; anyone else gets a "Find your order" form that asks for the
  order's mobile number (§28.3's "by number and mobile"). A shared order link no
  longer shows the order.
- **A refused add is its own answer.** An unknown product or an incomplete set of
  sizes used to come back as `NOT_FOUND`, which the bag BFF reads as "this cart is
  gone" — and it threw the customer's real bag away. It is `SELECTION_REFUSED` now,
  and the BFF confirms a cart is really gone (a HEAD on it) before discarding the
  cookie.
- **Availability is one computation.** The card overlay, the "In stock only" filter
  and its count, and the best sellers read a stored flag while the product page read
  the stock ledger, so a card could say "In stock" over a product whose page said
  sold out. All of them now read the ledger.
- **The unstitched kurta could not be bought at all**: the add contract had no way
  to name a piece with no size. A sizeless piece is now resolved by the backend as
  its one size.
- Order history is paged, bank transfer shows where to pay, `/bag` has its own
  loading and error pages, a product or order that does not exist gets a proper
  not-found page, every page states its own canonical address, `?locale=` works,
  sign-in returns to the page it was entered from, and the mock files and oversized
  components were split under MOD-03's ceilings.
- **The MSW-dies-on-hot-reload problem has a found cause.** Next captures the
  original `fetch` at boot and puts it back on every server hot reload, discarding
  MSW's patch; Server Fast Refresh then never re-evaluates the mock module, so
  nothing re-arms. `node.ts` now notices the swap and re-arms the same handlers.

**2. The rest of the product page and the account (§28.2, §28.3).** Size guide in a
dialog, WhatsApp and copy-link sharing, "You may also like", a desktop magnifier and
a full-screen gallery, Notify Me on sold-out sizes, moving a line between the bag
and the saved items, and saved sizes that pre-fill the size selector.

- **The first-load JavaScript budget (PERF-10) is met on every route.** Routes were
  shipping 345–366 KiB gzipped against 200 kB. The search panel, the bag's contents,
  the full-screen gallery, try-on and the studio's review now download when first
  wanted; Zod is no longer in any route's first load; `motion` was replaced by a CSS
  transition and removed; the messages context stopped defaulting to the whole
  English dictionary.
- **A Playwright suite**, `npm run test:e2e`: seventeen journeys on the store's own
  `next dev`, on port 3107.

**3. The catalogue is one product per photograph.** The operator supplied new
collages, which became ten new products and 28 frames. The fixture used to offer
each of fourteen garments twice, in two cloths, which put the same picture on two
tiles of one page; it now has 24 products, each its own photograph, with six new
colours. The page size went from 24 to 12, so a 24-product catalogue pages at all;
12 still divides every column count.

**4. Store pages, search engines, a review and its fixes.** About, Contact,
Delivery, Returns and exchanges, Terms of sale and Privacy, as served content under
`/help/[slug]`, with a regrouped footer; the contact details are placeholders in
`CLIENT.contact`. Product, breadcrumb and organisation structured data through one
escaping serialiser; `sitemap.xml` from a backend feed; `robots.txt`. Then a
four-area adversarial review — 56 confirmed findings, 63 fixes — including two HIGH
defects:

- **One cart could hold more of a size than exists.** A reservation left out every
  hold of the whole cart, not only the line being changed, so two lines of one
  garment sharing a (piece, size) each passed alone and together oversold; placement
  then allocated past `on_hand`. The check now sets aside only the same line's
  holds, and allocation sums each (piece, size) before comparing.
- **An open redirect after sign-in.** `returnTo=/.//evil.test` passed every check on
  the raw string and was then rebuilt by the URL parser as `//evil.test`, a
  protocol-relative address to another site. The rebuilt path is checked now.

Also from the review: search results are read uncached, because they carry the
in-stock count; a placement whose answer never arrived no longer says "nothing has
been charged"; the delivery option is the one the quote states rather than a
hard-coded `standard`; a mobile number means the same account however it is spaced;
and a part of the page whose download fails now says so in place, where it used to
take the page down with it.

**5. A by-hand pass over every use case, in the browser**, logged in
`TESTING-USE-CASES.md`, and the last small fixes, from that pass and the review
before it: the order page got its own loading skeleton;
a saved size is pre-filled on a set only when every piece can take it in stock (it
used to leave a set half-sized, with Add to bag unavailable); the largest image on
the product page and the hero loads eagerly at high priority (Next 16 deprecates
`priority`); the bag line's quantity is formatted per locale; the saved-size radio's
accessible name is one message; the footer's "English" is marked as English, so a
screen reader on an Urdu page says it in English; and an unknown payment method or
delivery option is refused at placement instead of being priced as the first.

**Worth knowing.**

- **The last verification** (19 September, after the by-hand fixes): typecheck,
  lint, 1,586 unit tests, `npm run build` and 17/17 Playwright journeys, two full
  runs in a row. The guest checkout journey had been failing in every full run: the
  bag panel stays modal through its 220ms exit, so the page under it is inert, and
  on a warm server Playwright typed into the checkout form inside that window. The
  journey now waits for the panel to close. An earlier verification found `/stitched` back over budget —
  280 kB — because a shared `Breadcrumbs` imported the client environment module,
  which validates with Zod. It is 196.5 kB now, and `studio-first-load.test.ts`
  fails if Zod is reachable from the studio's first load again. `/stitched` (196.5)
  and the product page (189.6) have little room left.
- **`next dev` writes `AGENTS.md` and `CLAUDE.md` into the repository root** when it
  runs inside an agent session. Both are now in `.gitignore`.
- The contact details, the bank transfer account, the terms, the privacy page, the
  stitching charges and the tailor's rules are all placeholders, and all the Urdu
  written in this round still needs a native reader.

---

### `b0c3cbe` — 2026-09-08

**Backfill the three entries this file had started missing.**

The maintenance rule above — write the entry, then commit — lapsed twice in a
row, and nothing caught it because nothing can: a convention enforced only by
memory is a convention with no test behind it. `8ab5bec` and `197b297` went in
without entries, and `e5d0456` never had its own `_(this commit)_` replaced with
the hash it earned. All three are below.

Worth stating plainly, since it is the second time this file has recorded a
lesson about itself: if these entries keep being written after the fact, the
honest move is to drop the "written before" rule rather than keep breaking it.

---

### `197b297` — 2026-09-08

**Fix the order confirmation 404 by reading the order through a BFF instead of
the server render.**

Every order placed on the Vercel deployment ended on "This page could not be
found" — under a tab still titled _Order confirmed_ — while the identical flow
worked locally on every machine it was tried on.

- **Root cause: mock state is per-process, and serverless does not share one.**
  Under D1 the "backend" is MSW answering from `Map`s in the Node heap.
  `POST /api/checkout/place` wrote the order to `ORDERS`; `/order/[orderNumber]`
  read it back **during its own server render**, which on Vercel is a different
  function with a different heap that had never been written to. Locally a single
  long-lived `next dev` process hides the whole problem.
- **The rest of the store was never affected, and that is the clue.** Everything
  else that touches mutable state reaches it through a Route Handler — `/bag`
  renders a Client Component that fetches `/api/bag`. The order page was the one
  place a Server Component read state a Route Handler had written. So the rule is
  now explicit: **mutable state under D1 is reached from Route Handlers only.**
- **A second, independent defect made it undiagnosable.** `if (!order.ok)
  notFound()` collapsed a ten-member `ApiError` union into one 404, so `NETWORK`,
  `TIMEOUT`, `CONTRACT_VIOLATION` and `SERVER` all rendered as "no such order".
  §10 `ERR-02` shows the correct `switch` verbatim; this was a rule not followed,
  not a gap in the rulebook. A customer holding a receipt was told their order
  did not exist, and the real failure was invisible to anyone looking for it.
- **Absence now lives in the success channel** as `ok(null)`, the shape
  `fetchProduct` already used, so "no such order" and "could not reach the store"
  can never be confused again.
- `classifyOrderResponse` gives that one rule a name and a test. The test was
  proved to fail: reinstating the original defect produced six failures.
- The segment had **no `loading.tsx` and no `error.tsx`** at all — an `ERR-09`
  violation that predates this change. Both added.
- **Verified against the live deployment before the fix** by placing a real
  order: `/order/AA100001` 404'd on reload, deterministically, while `/api/bag`
  showed the cart correctly converted — the write had succeeded in one process
  and the read failed in another.

**A second bug of the same origin is NOT fixed here**, and should not be
forgotten: the product page reads availability during its server render, so a
size held in someone's bag still reads as available on the deployment. Six units
of M were reserved through `/api/bag` while the server HTML kept offering M. It
undersells and oversells silently, and fixing it means moving that read
client-side — a first-paint tradeoff that is the operator's call.

**A trap worth keeping:** the preview pane starves **React's scheduler**, not
just CSS animation. The fixed page sat on "Loading…" through nineteen seconds of
waiting with the query already settled, and committed the instant a screenshot
forced a paint. The existing note covers `requestAnimationFrame` and
`setTimeout`; this extends it to React state updates. Also: read `textContent`
rather than `innerText` there, since `innerText` needs a layout the pane defers.

---

### `8ab5bec` — 2026-09-08

**Stop tracking `.vscode` and ignore it.**

Its only content was one developer's window colours, which every other checkout
was being handed and shown as a permanent diff. `git rm --cached` leaves the file
on disk untouched. The `.gitignore` entry carries a note that specific files can
be un-ignored by name if shared editor settings are ever actually wanted.

---

### `e5d0456` — 2026-09-08

**Add this changelog.**

Every commit to date, with the reasoning and the traps behind each. Written
before committing so that this entry describes the commit that introduces it.

---

### `217a7f6` — 2026-09-08

**Turn the search panel's suggestion column into a mini filter.**

The panel used to show suggested search terms once you typed. It now shows three
suggestions plus a row of refinement chips — `Boski 4`, `Emerald 2` — that narrow
the products **inside the panel** rather than navigating away.

- The whole catalogue query travels client → BFF → reader → mock, serialised with
  the same canonical helper the address bar uses, so the panel asks exactly the
  question the results page would.
- Counts come from the backend, never the panel. Four products are shown out of
  however many matched; counting fabrics from those four would produce numbers
  that are simply wrong.
- **Each facet is counted with its own filter lifted.** Without this, choosing
  Boski left Boski as the only fabric on offer — the control that got you there
  could never take you back. This was a real bug, found in testing.
- The mock originally ignored filters entirely, so the chips would have _looked_
  like they worked while the products underneath never changed.
- Panel stays open while refining; closes on navigation, when the bag opens, on
  Escape/backdrop/X, and on "View all" — which carries the filters into the URL.
- The filter drawer now closes on a change of **path** but not of **query
  string**, so filtering repeatedly no longer shuts it.

**Worth knowing.** The scroll lock written in the same stretch of work —
`html:has(dialog[open]) { overflow: hidden }`, which stops the page scrolling
behind an open modal — is **not** in this commit. It landed in `1a1eeba` because
a concurrent session staged `globals.css` while the edit was in it. The code is
correct and present; only its attribution is wrong.

---

### `a8e7f97` — 2026-09-08

**Record D6 in the progress file, and correct the `.next` note.**

The old note claimed dev and build share `.next` and blamed a concurrent build
for MSW dying. At Next 16 that is not the layout — dev writes `.next/dev`, builds
write `.next/build`. The real cause of "We could not reach the store" on every
page is MSW's interception dying across accumulated hot reloads. **Restart the
dev server; do not delete `.next`** — that is 280MB and a full cold rebuild.

---

### `cfd876f` — 2026-09-08

**Adopt D6 append-only in the bag.**

Nothing is ever deleted. Both `DELETE` endpoints became `POST` to `/removal`
sub-resources, because `DELETE` promises the resource is gone afterwards and that
promise would be false here.

- Reservations and cart lines settle by **status** rather than being removed.
- Carts are `CONVERTED` at placement, carrying their order number, rather than
  discarded.
- Four tests pin the provenance guarantee.

**The one that bites silently.** Availability must filter on status **and**
expiry. Deletion used to do half that job implicitly; forget the status half and
released holds keep counting against stock. That does not oversell — it
_undersells_, silently, and nothing throws.

---

### `1a1eeba` — 2026-09-08

**Add §24 Try-On.**

The `TryOnProvider` port with an image-model adapter, a sample placeholder in the
mock layer, grey-world white balance, a no-persistence guarantee, the seventh BFF
with an origin check, a centred `Dialog` primitive, and the try-on entry on the
product page. `apiRequest` gained multipart bodies and per-request timeouts;
`server-only` is aliased for Vitest; `sharp` is declared.

**Also contains, by accident:** the modal scroll lock described under `217a7f6`.

---

### `1827f9a` — 2026-09-07

**Add a `.prettierignore`.**

`npm run format` is `prettier --write .` with no ignore file, so running it would
have reflowed `CLAUDE.md`, `GIT.md`, `PROGRESS.md`, the architecture spec and the
lockfile. Those are hand-formatted prose and machine-owned files respectively.
Also formatted `tsconfig.json`, the one config file Prettier should own.

**Worth knowing.** `prettier --check` flags nearly every file on a Windows
checkout because of CRLF-vs-LF alone. `package.json` and `eslint.config.mjs`
looked non-conforming but produced **zero** diff in git.

---

### `405bd53` — 2026-09-07

**Reformat the source tree with the project's own Prettier settings.**

The repo had drifted from its own `prettier --write` output. 32 files, 215
insertions, 156 deletions — all line-wrapping, no behaviour. Verified inert:
typecheck, lint, tests and build all passed before committing.

---

### `e5d8c17` — 2026-09-07

**Add the saved-items page at `/wishlist`.**

The heart had been saving into a list with nowhere to open it.

- A by-ids catalogue read, plus a BFF that merges the live availability overlay
  §8.2 keeps separate — so a list of twenty is one request, not twenty.
- A **client-safe catalogue barrel** (`contract.ts`). The main barrel re-exports
  `CatalogueScreen`, which reaches `next/headers`; a Client Component importing
  it fails the build outright. Found by the page 500ing, not by reading.
- `useWishlist` gained `isReady`, because the ids are read in an effect — without
  it the page flashed "nothing saved" on every load.
- A response shorter than the request means a product was withdrawn since it was
  saved, and the page says so rather than quietly shrinking.

---

### `aba0480` — 2026-09-07

**One shared entry and exit animation for every native popover; one slide for
both drawers.**

**The search panel's exit had been broken.** Both states named the same
animation, with the closing one adding `reverse`. Changing only
`animation-direction` does **not** restart an animation — the _name_ is what the
browser keys on — so the finished entry animation re-evaluated at its reversed
end state and the panel vanished instantly. It opened beautifully and closed as
if the transition had been forgotten.

The bag and filter drawer were unified on one slide whose direction is a single
custom property, replacing four sign-flipped translate blocks.

**How the bag's animation was actually fixed:** by removing it. Three attempts to
fix it as a timing problem changed nothing; deleting the transition proved in one
step that the travel itself was at fault. When two fixes in a row change nothing
the reader can see, stop fixing and bisect.

---

### `b661b20` — 2026-09-07

**Remove the desktop filter rail; make sort a dropdown; fold the listing head
into one row.**

- The rail cost a fixed 16rem on every listing. Removing it widened tiles from
  246px to 318px at 1440 and removed a **duplicate** `FilterPanel` render.
- Sort collapsed from an open row of pills into an anchored native popover that
  is still a Server Component shipping **no JavaScript**. It closes itself by
  being keyed on the URL — Next navigates on the client, so the DOM element
  survived and the menu hung open over the re-ordered grid.
- A top-layer element cannot be positioned with `position: absolute`; its
  containing block is the viewport. `anchor-name` plus `position-anchor` is what
  re-establishes the relationship.
- Title, count and controls became one grid: two rows on a phone, one on desktop.
  `grid-template-areas`, because the count must move _between_ groups and
  flex-wrapping can only push the next item onto the next line.

---

### `b530bf6` — 2026-09-07

**Make the store work on a phone over the LAN; give the gallery every frame;
replace the card's hover arrows with a swipe on touch.**

**Next blocks its own dev resources cross-origin.** Opening the store on a phone
gave a page that rendered and navigated but did nothing interactive: every
`/_next/*` chunk was refused, and with no client JavaScript a `<Link>` still
works as a plain `<a>` while search, the bag and checkout silently do not. Fixed
with `allowedDevOrigins`, fed from `DEV_ALLOWED_ORIGINS` in `.env.local` — a LAN
address is machine-local and changes with the DHCP lease.

- The product gallery had been showing one of five frames. Its mock still
  returned a single shot, with a comment explaining that one shot was all that
  existed — true when written, and outlived by the generated frames.
- On touch there are no arrows; the card is swiped. A control revealed by hover
  does not exist on a phone. The link overlay had to become a **child** of the
  carousel, because touch events bubble only to the target's own ancestors.

---

### `e6ca1ab` — 2026-09-07

**Uniform grid, and a column switcher for small screens.**

**A page size that does not divide by the column count leaves a hole**, silently.
24 / 5 = 4.8, so from 1920px every page ended four tiles short with its next
products on page 2. Five columns were dropped; `grid-columns.test.ts` now asserts
the division so a bad breakpoint fails the suite rather than appearing as a gap
on one monitor width.

- Below 48rem a radiogroup offers 1, 2 or 3 columns. The preference is a
  **cookie**, not localStorage, so the server can read it and the first paint is
  already correct.
- A narrow card stacks its name over its price via a **container** query — the
  same card appears at different widths in the grid, the search panel and a rail.

---

### `3fc1826` — 2026-09-07

**Remove order tracking and the per-method confirmation step; restage the
confirmation animation.**

There is no tracking flow and no SMS provider, so copy describing either was a
promise nothing could keep. `nextStep` came out of the checkout contract.

The confirmation mark was rebuilt as a staged CSS sequence — disc, ring drawn by
`stroke-dashoffset`, tick, ray burst — running **1.4s and starting 120ms late**.
The previous version finished in 0.78s with no delay, which put it over before
the eye had crossed the page: an animation nobody catches is indistinguishable
from none.

Also: a contract violation now logs its failing field paths. A dead backend had
been surfacing as "the response did not match the expected schema", sending the
reader to the schema instead of the connection.

---

### `01e09cb` — 2026-09-07

**Anchor the hero scrim to the caption.**

A flat scrim over the whole film dimmed the part nobody was reading, which read
as a grey box in the light theme. The gradient stops were **solved, not judged**:
sampling the film gave luminance 0.66 behind the headline, and the WCAG formula
gives the minimum scrim for 3:1 and 4.5:1. Measured after: 3.79:1 and 5.36:1.

---

### `3a121af` — 2026-09-07

**Rebuild search as a full-width dialog.**

Trending searches and best sellers before a keystroke; refinement suggestions
with the typed fragment emboldened after one; four real `ProductCard`s so hover
frames and quick add work inside the panel for free.

An empty query is now **forwarded** to the backend rather than short-circuited:
what fills a blank panel is the backend's answer to the empty query, and deciding
here that it is nothing would overrule it.

---

### `66dd887` — 2026-09-07

**Build sign-in, sign-up and password reset against §11.**

Both the password and mobile-code paths are first-class — in this market a
customer reliably has a number and may not use email.

The mock Identity module enforces the invariants rather than assuming them:
single-use expiring codes, per-identifier rate limiting, and **identical refusals
for a wrong password, an unknown email and a locked account**, so the forms
cannot enumerate accounts. Registration _does_ report a collision, and the
asymmetry is deliberate.

Header controls that pinned their own colour would not follow the bar over the
hero; they now inherit and dim with opacity.

---

### `7178913` — 2026-09-07

**Add the wishlist heart, quick add and a frame carousel to the catalogue card.**

Each garment gained four generated frames beside its original photograph, an
aggregating quick-add BFF, and a session context.

- **The offerable sizes are the intersection across pieces.** Offering M when the
  shalwar has none produces an add the §7.1 transaction refuses — a button that
  looks live and fails.
- The heart is **hidden from guests**, who have no list to open. Quick add stays,
  because guest checkout is Release 1 scope and a guest really can buy.
- **The card's link is an OVERLAY, not a wrapper.** A `<button>` inside an `<a>`
  is invalid HTML whose clicks navigate before their own handler runs.
- **`cn` keeps the last of two conflicting Tailwind classes**, so `opacity-60`
  for sold-out overrode the `opacity-0` hiding inactive frames: all five rendered
  at 60% at once, ghosted over each other, and stepping the carousel changed
  nothing visible. A whole-element state belongs on a wrapper.

---

### `0bc5964` — 2026-09-07

**Turn the language switcher off; fix the bag badge; empty the bag on commit.**

- The switcher is off through the client profile, not deleted — the bilingual
  build is untouched and turning it back on is one word.
- **`inset-block-start-0` and `inset-inline-end-0` are not Tailwind utilities.**
  They are CSS property names, compiled to nothing, and the bag badge silently
  fell out of its corner.
- **Never animate readable content in from `opacity: 0` with `motion`.** It
  writes the initial styles into the server HTML, so the order confirmation
  rendered blank until hydration.

---

### `7b00ea3` — 2026-09-05

**Flip the two M2 compromises now that the product route exists.**

A type-ahead product row opens the product through a typed destination union
instead of searching for its name; an exact code match redirects to the product.
`CodeMatch` was deleted with the compromise it existed for.

---

### `3cb214e` — 2026-09-05

**Render the real bag at `/bag`, add the filter drawer, and fix two
double-application bugs.**

- **`disabled={isPending}` does not prevent double submission** — `isPending`
  only becomes true after a re-render, so two clicks in one tick both pass. A
  `useRef` latch flipped synchronously in the handler is the fix.
- **MSW must close the previous interceptor when re-arming.** Every hot reload
  left another live interceptor, so one "Add to bag" ran the reservation four
  times.

---

### `d61e2dd` — 2026-09-05

**Add M5's checkout: the §7.2 placement transaction.**

Both rollback paths are real — a lapsed hold returns `RESERVATION_EXPIRED`
naming the items, and a moved total returns `PRICE_CHANGED` carrying the new one,
because prices are never silently changed under a customer at payment.

**No conditional per payment method anywhere** (§3.1). The four methods are a
list from `quote()`, each carrying its own label and availability; a fifth is a
configuration entry in Java and changes no file here. The COD cap is enforced
server-side twice: `quote()` withholds the method, and `place()` refuses it
again, so a client that never called `quote` is still refused.

---

### `e233e62` — 2026-09-05

**Add M4's bag and reservation core: the §7.1 atomic multi-piece transaction.**

Sorted lock order, an all-or-nothing check across every piece before any row is
written, and `Unavailable(piece)` naming the piece _and_ size that failed. The
test that matters most: a SET failing on its last piece leaves **no** reservation
behind.

Stock became a real per-`(piece, size)` ledger — previously it was a status
pattern with no number, so `Unavailable` could never actually fire.

Native `<dialog>` and the popover API rather than a dependency: the platform
gives the focus trap, Escape, focus restore, top layer and inert background.

---

### `57401f2` — 2026-09-05

**Replace the placeholders with the client's own photography, and turn the
fixture from womenswear to menswear.**

Colour is now **read off the photograph**, not computed from an index — a filter
reading "Chiffon · Rose" over a maroon waistcoat is not a cosmetic mismatch, it
is a lying card. Piece counts follow the garment, so `PIECE_NAMES` is keyed by
garment: position 0 is "Waistcoat" in one and "Kameez" in another.

---

### `0348bda` — 2026-09-05

**Add the Fabric Calculator (§25) and the second BFF route.**

The interface holds no requirement table and does no subtraction: §25 makes that
a backend module, and the comfort margin is a tunable the operator owns.
Eligibility is the backend's answer too — the payload carries
`fabricCalculator: offer | null`, so nothing infers it from `isUnstitched`.

---

### `fcd81fe` — 2026-09-04

**Add the D5 client profile.**

Market, currency, formatting, fonts and optional features are configured in one
place, so a second client is a configuration change rather than a code fork.

---

### `526f66a` — 2026-09-04

**Add the M3 product contract, availability overlay, and `/catalogue/[slug]`.**

The product projection carries **no quantity** (§12); stock is a separate live
read at `(piece, size)` granularity. The schema asserts the §6.1 invariant —
SIMPLE ⟹ one piece, SET ⟹ two or more — so a backend that breaks it surfaces as
a handled contract violation rather than a buy box with nothing to override.

---

### `f6eccdd` — 2026-09-04

**Add the catalogue code lookup.**

An exact match surfaces above the search results from a parallel `byCode` read.
The client never decides what a code _looks like_ — that is the backend's rule;
it only declines terms that cannot be one.

---

### `7cf3f5b` — 2026-09-04

**Add the type-ahead with the first BFF route.**

The BFF exists because `apiRequest` is `server-only` while the type-ahead runs on
keystrokes. The header field is a full ARIA combobox: debounced, with
`aria-activedescendant` so focus never leaves the input, wrapping arrow keys,
layered Escape, and pointer selection on `mousedown` so it beats the blur.

---

### `858c2c0` — 2026-09-04

**Make the header search field borderless and collapse it in reverse.**

Fixed its close icon being invisible over the hero, and restored focus only on
deliberate dismissal.

---

### `d0445e1` — 2026-09-04

**Remove the header's primary navigation.**

Catalogue, Unstitched and Stitched were three links resolving to one route with
different filter state, and §30.5 wants a single canonical address for a listing.
The space they vacated is what the search field expands into.

---

### `e4525f8` — 2026-09-04

**Add the filter panel and sort control as zero-JavaScript link navigation.**

Contextual facet counts, removable chips and clear-all. Every control is a
`<Link>`, so the panel is a Server Component and every filter combination is a
crawlable URL. `PriceFilter` is the single client leaf, because a range needs a
submit rather than a navigation per keystroke.

---

### `aca3d62` — 2026-09-04

**Fix dead links, add route boundaries, redesign the product card.**

**Skill descriptions have a registration cap near 512 characters.** Over it, the
skill is silently dropped — which was hiding the project's own binding rulebook.

---

### `aec24cb` — 2026-09-04

**Add the catalogue listing and search results pages.**

One shell serves both: the listing is the search query with an empty term, so
there is one grid and one pagination rather than two that can disagree.

---

### `eb2db64` — 2026-09-03

**Add the search contract and the canonical URL-state module.**

Two load-bearing properties, both tested: total parsing never throws, and
serialisation is canonical — defaults omitted, values sorted — so two customers
with identical filters produce one cache entry rather than two.

---

### `8121005` — 2026-09-03

**Fill the viewport width with the hero film; add an ambient glow.**

**`overflow-x: clip`, never `hidden`** on the ambient wrapper: `hidden` forces
the other axis to `auto` and kills the intended downward spill.

---

### `ed4c5fa` — 2026-09-03

**Add thin theme-aware scrollbars and real photography.**

---

### `341b3f0` — 2026-09-03

**Make the header fixed and transparent over the hero; re-arm the mock layer per
request.**

**MSW dies on hot reload** unless it is a module-scoped singleton with
`ensureMockServer()` called from the root layout per request. A `globalThis`
cache made it worse, not better.

---

### `1721ced` — 2026-09-03

**Add the M1 landing page.**

App shell, four homepage section kinds, the product card with its availability
overlay, newsletter capture, and the D3 placeholder sign-in.

**Locale must be a query parameter, not `Accept-Language`.** Next's data cache is
not keyed on that header, so both locales collided in one cache entry and the
store served English facet labels inside an Urdu page.

---

### `6fe9134` — 2026-09-03

**Initialise the storefront foundation.**

SSOT registries, the typed API client, the MSW mock layer, EN/UR RTL layout from
the first file, and the binding documents.

**TypeScript is pinned to 6.0.3, deliberately below `latest` (D4).** TypeScript 7
is the native Go port; `typescript-eslint` refuses to load against it, and
`eslint-config-next` depends on that package — so ESLint would not run at all.
