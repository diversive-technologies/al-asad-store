# Manual test log — functional and layout

Testing the running app as a customer would, on a **desktop** width (1440×900) and
a **phone** width (375×812), for every use case. No code is changed while testing;
findings are recorded here.

**Legend** — `PASS` works and looks right · `WARN` works but looks or feels wrong
· `FAIL` does not work · `FIXED` was wrong, has been repaired and re-measured
· `NOTE` deliberate, recorded so it is not re-reported.

**How a layout fault is judged.** A page fails on layout if it scrolls sideways,
if something a customer needs sits outside the screen, if text overlaps or is cut
off, or if a control is too small to hit on a phone (under about 32px).

**What this log holds.** UC-01 to UC-13 are the by-hand pass recorded before
2026-09-19, kept as it was found. UC-14 to UC-16 are the numbers
`../BACKEND-USE-CASES.md` gives to tailoring a garment from its product, the account
page and the address book; they have not had a by-hand pass in this log yet. UC-17
to UC-26 are the features added in the round of 17–19 September 2026. Since that
round the main journeys also run automatically (see "The automated journeys"
below), and the by-hand pass of the new use cases is the last section
("By-hand pass, 2026-09-19").

---

## What was wrong, and what was done

Every item below is **fixed and re-measured**. The original finding is kept in its
use case further down, so the record of what was wrong survives.

| # | What was wrong | What was done | Measured after |
| --- | --- | --- | --- |
| 1 | **The product page was 81px wider than the phone screen** (UC-02). Title, price, sizes and the per-piece panel all cut off at the right. | The page's main grid never said how many columns it had below a laptop, so its one column was sized to the widest thing in it — the gallery's five thumbnails, 432px of them — and everything beside them inherited that width. The column is now told to fill the screen and is allowed to be narrower than its contents. | 320, 360, 375, 390, 414, 480, 768 and 1023px: **nothing past the screen edge, no sideways scroll**. 1024 and 1440px: two equal columns, exactly as before. |
| 2 | **The bag panel (456px) and the Try-on panel (25px off-screen)** were dragged off the edge whenever they were opened from a product page (UC-04, UC-10). | Nothing of their own. A phone widens its whole layout to fit a page that overflows, so both panels followed the product page out; fixing item 1 fixed them. | Bag panel **375 wide at the left edge** on a 375 screen. Try-on panel **343px centred**, 16px clear on each side. |
| 3 | **Two controls on every product card were invisible but still tappable** on a phone (UC-03, UC-09). | On a device that cannot hover they are now **drawn**, at 36px. The image arrows keep the opposite treatment on purpose — a swipe replaces an arrow, and nothing replaces a heart or a size tray. | Both visible, 36×36, taps landing on them. Quick add used end to end on a phone: tray → size → **1 item in the bag**. Desktop unchanged — still revealed by hover, still 32px. |
| 4 | **Text fields were 14px across the store**, so an iPhone zooms the page in the moment one is tapped and leaves the customer scrolling sideways through the rest of the form (UC-05, UC-07, UC-08). | One rule now holds every field at 16px wherever the main way of pointing is a finger. It is written against the field elements themselves rather than a class, so a form added later cannot miss it; the measurement studio's own copy of the fix was deleted with it. | **16px** on all five checkout fields, sign-in, the search panel, the fabric calculator's dropdown and all eleven studio fields. Desktop still 14px. |
| 5 | **Small tap targets**: breadcrumbs 17px, "View all" 20px, "Close bag" 28px (UC-01, UC-02, UC-04). | Padding that grows the target without moving anything on the page, and a taller close button. | Breadcrumbs **33px**, "View all" **36px** (checked at its top, middle and bottom), close button **36×36**. |

### Three faults the repairs themselves created

Two were found by an adversarial review of the change and one by measuring while
making it. All three are fixed, and all three only ever appeared at the **three
columns per row** density a customer can choose on a phone — the default is two.

- **The size tray covered the button that closes it.** Making the bag button visible
  on phones made the tray a routine thing to open; making both it and its size
  buttons finger-sized made it tall enough to cover the X at the top of the card.
  The X stayed visible through the tray, so it looked live, and every tap on it
  landed on the tray instead. With no way out but buying a size, the card was a dead
  end. The controls now sit above the tray. *Measured: the topmost thing at the
  centre of the X is the X, and tapping there closes the tray.*
- **The new button clipped the "Low stock" badge**, which read as "Low s" on a 104px
  tile. A badge says its status in words and the colour is only reinforcement, so a
  covered word is a lost message. The badges are now kept clear of the button at
  every width. *Measured: 0px overlap at three columns, the badge wrapping inside its
  own pill; unchanged at one and two columns.*
- **The tray's own size buttons were 22px**, under the 24px minimum, on a control
  where a mis-tap buys the wrong size. They are 32px now, and the tray's padding was
  trimmed so three rows of them still fit inside the photograph. *Measured: tray
  124px inside a 130px image, nothing cut off.*

Everything else in this log passed on both screens, including the whole
buy-to-confirmation path on a phone.

---

## UC-01 — Land on the home page

**As a customer:** I open the shop and look around.

| | Desktop 1440 | Phone 375 |
| --- | --- | --- |
| Loads, hero, six sections | PASS | PASS |
| Sideways scroll | none | none |
| Hero fills one screen | PASS | PASS (812px, exactly one screen) |
| Header controls | 10 reachable | 10 reachable |

**Findings**

- `FIXED` (was `WARN`) **"View all" links were 51×20px** — under a comfortable tap
  size, and sitting beside a rail people swipe, so a near-miss scrolls the rail. They
  are **36px** tall now, checked by hit-testing the top, the middle and the bottom of
  the link, and the section head is still exactly the 28px it was. Getting both took
  two different techniques, which is worth recording: on the breadcrumb the padding
  is on a line of text and buys a bigger target for free, but this link sits directly
  inside a row that lays its children out, so there the same padding is real height
  and had to be cancelled by an equal negative margin. Told apart by measuring the
  head, not by reading the markup.
- `NOTE` Product photographs in the rails extend past the right edge
  (e.g. 216→392px on a 375 screen) **by design** — that is the horizontal rail a
  customer swipes. The page itself does not scroll sideways.
- `NOTE` "Skip to content" measures 1×1px until focused. That is the standard way
  of hiding a skip link; it appears on Tab.
- `NOTE` The card's image arrows are 28×28px. They are hidden from touch devices
  on purpose (a phone has no hover), so the 28px size applies to mouse only.

---

## UC-02 — Open a product page  ← **the reported fault, reproduced**

**As a customer:** I tap a product and look at the photographs, the price and the
sizes.

| | Desktop 1440 | Phone 375 |
| --- | --- | --- |
| Page loads, gallery, buy box | PASS | PASS |
| Sideways scroll | none | none — was **456px of content in a 375px screen** |
| Title, price, sizes on screen | PASS | PASS — were **all cut off at the right** |

**`FIXED` (was `FAIL`) The page was 81px too wide on every common phone.** Title, description,
product code, price, the size buttons and "Adjust individual pieces" are all laid
out **432px wide** starting 24px in — so they run to 456px inside a 375px screen.
The customer must scroll sideways, or zoom out and still find things misaligned.

- **Where it starts and stops:** broken at 360, 375, 390, 414; clean from 480 up.
  So every phone is affected and no desktop is — which is why it survived.
- **The cause, exactly:** the photograph's box is `aspect-[4/5] w-full` inside a
  grid that only becomes two columns at 1024px. Below that, the single column is
  sized "to fit its contents", and a width of `100%` has nothing definite to
  measure against — so the column falls back to the photograph's own natural width
  of 432px and everything beside it inherits that width.
- **What the fix was:** the grid is now told it has one column below a laptop, so
  the column fills the screen and is allowed to be narrower than its contents instead
  of being sized to them. The route's loading skeleton got the same line, so the
  placeholder cannot lay itself out differently from the page it stands in for.
- **Measured after:** 320, 360, 375, 390, 414, 480, 768 and 1023px — one column,
  nothing past the screen edge, no sideways scroll. 1024 and 1440px — two equal
  columns, 444px and 652px, exactly as before.
- **One correction to the cause above:** the 432px came from the gallery's THUMBNAIL
  STRIP, not the photograph — five 80px thumbnails and four gaps. The strip has its
  own sideways scroller, which was meant to absorb exactly this and could not: a
  column sized to its contents measures what is inside a scroller rather than the
  scroller itself.

**Findings**

- `FIXED` (was `WARN`) Breadcrumb links ("Home", "Catalogue") were 17px high, at the
  very top of a phone screen. **33px** now, and the row's spacing was widened so a
  breadcrumb that wraps onto two lines cannot have the line above stealing taps from
  the line below.
- `PASS` The gallery keeps a fixed height whatever the number of photographs, so
  the buy box does not jump from product to product.

---

## UC-03 — Browse the catalogue

**As a customer:** I open the catalogue and scan what is there.

| | Desktop 1440 | Phone 375 |
| --- | --- | --- |
| 24 products, full rows | PASS | PASS (24 cards, 156px each) |
| Sideways scroll | none | none |
| Filters and Sort reachable | PASS | PASS |

**Findings**

- `PASS` Nothing overflows at 375. Cards, the head and the toolbar all fit.
- `PASS` Filter chips carry their counts ("Boski 7", "Cotton 7"), so a customer
  can see what a filter will do before tapping it.
- `FIXED` (was `WARN`) **A card's "Choose a size" button was invisible on a phone
  and still tappable** — `opacity: 0` with taps left live, over every photograph in
  the grid, so a tap meant for the product opened a size tray instead. It is **drawn**
  on a touch device now, at 36×36. It was not simply switched off the way the image
  arrows were, because an arrow has a replacement — the swipe — and a size tray has
  none; switching it off would have taken quick add away from every phone.
  **Checked end to end on a phone:** tap the button, the tray opens, tap M, one item
  in the bag. Desktop is unchanged — still revealed by hover, still 32px.
- `NOTE` (changed 2026-09-19) The catalogue now shows **12 products per page**, so
  the 24 products are two pages, not one. 12 divides every column count the grid
  uses (1, 2, 3, 4 and 6), so every page still ends on a full row.

---

## UC-04 — Put something in the bag

**As a customer:** I choose a size and add the suit to my bag, then look at it.

| | Desktop 1440 | Phone 375 |
| --- | --- | --- |
| Choose size, Add to bag | PASS | PASS (header shows "1 item") |
| Bag panel contents | PASS | PASS |
| `/bag` page | PASS, no overflow | PASS, no overflow |
| Quantity, Remove, promo code | PASS | PASS |

**Findings**

- `PASS` The three-piece suit shows each piece with its own size — "Waistcoat · S,
  Kameez · S, Shalwar · S" — plus the hold time, the free-delivery progress and
  the made-to-measure nudge.
- `FIXED` (was `WARN`) **The bag panel inherited the product page's fault** — opened
  from a product page on a phone it was 456px wide on a 375px screen, with its right
  edge, including part of Remove, off screen. A phone widens its whole layout to fit
  a page that overflows, so the panel was measuring the broken page rather than the
  screen. Fixing UC-02 fixed it: **375 wide at the left edge**, measured from a
  product page.
- `FIXED` (was `WARN`) "Close bag" was 28px high. **36×36** now, and so is the
  matching close button on the centred dialogs.

---

## UC-05 — Check out

**As a customer:** I fill in my details, choose delivery and payment, and place
the order.

| | Desktop 1440 | Phone 375 |
| --- | --- | --- |
| Form, summary, all four payment methods | PASS | PASS |
| Sideways scroll | none | none |
| Place order present | PASS | PASS |

**Findings**

- `FIXED` (was `WARN`) **Every text field was 14px, which makes iPhones zoom in on
  tap.** Name, mobile, email, address and city were all below the 16px Safari treats
  as readable, so focusing one zoomed the page and left the customer scrolling
  sideways through the rest of the form. All five measure **16px** on a touch device
  now, and 14px on a desktop as before. The rule is written once, against the field
  elements themselves, so a form added later cannot be missed the way these were.
- `PASS` Delivery options and payment methods are a plain list with descriptions,
  and Cash on delivery states its cap.

---

## UC-06 — Measure for stitching (desktop)

**As a customer:** I open "Stitched to your size" and take my measurements.

| | Desktop 1440 |
| --- | --- |
| Drawing, 11 fields, both paths offered | PASS |
| Sideways scroll / overflow | none |
| Announcement for screen readers | PASS — "Kameez shalwar, Copy a garment I own: 11 measurements to take." |

**Findings**

- `PASS` Style and path are offered as links ("Kameez shalwar / Waistcoat suit /
  Kurta", "Copy a garment I own / Copy my tailor's card"), so each is a bookmarkable
  address.
- `PASS` The lead line explains the drawing before any field is touched.

---

## UC-07 — Search

**As a customer:** I tap search and look for something.

| | Desktop 1440 | Phone 375 |
| --- | --- | --- |
| Panel opens full width | PASS (1440) | PASS (375) |
| Trending + best sellers before typing | PASS, 4 product cards | PASS, 4 product cards |
| Overflow inside the panel | none | none |

- `FIXED` (was `WARN`) The search field was 14px. **16px** on touch now.

---

## UC-08 — Sign in

**As a customer:** I sign in with my email and password.

| | Desktop 1440 | Phone 375 |
| --- | --- | --- |
| Form, both ways in, submit | PASS | PASS |
| Sideways scroll / overflow | none | none |
| Signing in | PASS — lands back on the home page, signed in | PASS |

- `PASS` The submit button is 48px tall, comfortably tappable.
- `FIXED` (was `WARN`) Email and password were 14px. **16px** on touch now.

---

## UC-09 — Save something for later

**As a customer:** I tap the heart on a product and open my saved items.

| | Phone 375 |
| --- | --- |
| Heart toggles, label becomes "Remove from wishlist" | PASS |
| Saved items page lists it | PASS — "Plain Waistcoat Suit" |
| Empty state before saving | PASS — "Tap the heart on any product to keep it here." |

- `FIXED` (was `WARN`) **The heart was invisible on a phone and still tappable** —
  `opacity: 0`, 32×32, over the photograph, so a customer aiming for the product
  could silently save it instead. Drawn at 36×36 on touch now, by the same fix as the
  "Choose a size" button in UC-03.
- `NOTE` (changed 2026-09-19) The heart's label no longer flips to "Remove from
  wishlist". It is always "Save to wishlist", and a screen reader hears whether it is
  pressed. The heart is offered only to a signed-in customer; saved items belong to
  the account.

---

## UC-10 — Try it on

**As a customer:** I open "Try it on" to see the colour on me.

| | Phone 375 |
| --- | --- |
| Panel opens, guidance, photo picker | PASS |
| Honest about the photo | PASS — "never stored… discarded as soon as the image comes back" |
| Says it shows colour, not fit | PASS |

- `FIXED` (was `WARN`) The panel sat **25px off the right edge** (57→400 on a 375
  screen) because it centres itself on the page and the page was 456px wide — UC-02
  again rather than a fault of the panel. **343px centred, 16px clear on each side**
  now.

---

## UC-11 — Place an order

**As a customer:** I fill in my details and pay cash on delivery.

| | Phone 375 |
| --- | --- |
| Form accepts name, mobile, email, address, city | PASS |
| Choose delivery and payment | PASS |
| Order placed | PASS — **AA100001** |
| Confirmation page | PASS — order number, address, delivery, payment, no errors |

- `PASS` The whole path — catalogue → product → bag → checkout → confirmation —
  works on a phone, despite the product page's width fault.
- `NOTE` (changed 2026-09-19) The confirmation is now headed **"Order placed"**, which
  is true whatever state the order is in. An order paid by bank transfer shows where
  to pay (UC-24). The order's page opens straight away only in the browser that
  placed it or for the signed-in account that placed it; anyone else is asked for
  the order's mobile number first (UC-24).

---

## UC-12 — Help pages

**As a customer:** I read the size guide.

| | Phone 375 |
| --- | --- |
| Loads, readable, no overflow | PASS |

- `NOTE` (changed 2026-09-19) The same route now also serves six store pages —
  About us, Contact us, Delivery, Returns and exchanges, Terms of sale and Privacy —
  linked from a regrouped footer (UC-25).

---

## UC-13 — Measure for stitching on a phone

**As a customer:** I take my measurements standing over the garment, on my phone.

| | Phone 375 |
| --- | --- |
| 11 fields, drawing, no sideways scroll | PASS |
| Tapping a field gives it the screen | PASS — one field, drawing 525px, stepper "1 of 11" |
| Leaving that view | PASS — Done restores all 11 fields, focus on the row |

- `PASS` **The studio's fields are 16px**, so an iPhone does not zoom when one is
  tapped. They used to be the only fields in the store that were; the whole store is
  now, and the studio's private copy of that fix was deleted so there is one rule
  rather than two (item 4 above).
- `PASS` The drawing keeps a useful size with a field open, so the guide is still
  visible at the moment it is needed.

---

## UC-17 — Read the size guide without losing my size

**As a customer:** on a product page I am not sure of my size, so I open the size
guide, read it, and go back to choosing.

- A **"Size guide"** button sits at the end of the "Size" line on a single-piece
  product. On a set it sits on the "Size for the whole set" line and on the "Adjust
  individual pieces" heading — not beside every piece.
- Choose a size first, then press it. A centred dialog titled "Size guide" shows the
  served size guide and a link, **"Open this guide on its own page"**, to
  `/help/size-guide`.
- Close it with the X, a click outside it, or Escape. Focus returns to the "Size
  guide" button and **the size chosen before is still chosen**.
- Phone 375: the button stays on the size line (or wraps under a long one), the
  dialog fits the screen, nothing scrolls sideways.

**Automated:** `product-page.spec.ts` — "the size guide opens over the page and
hands focus back when it closes" (Escape and the close button).

---

## UC-18 — Share a product

**As a customer:** I send a product to someone on WhatsApp, or copy its link.

- Under "Estimated delivery": **"Share on WhatsApp"** and **"Copy link"**.
- WhatsApp opens `wa.me` in a new tab with the message already written: "Have a
  look at {product} from Al-Asad:" and the product's address on the next line. The
  address is the product's own, with no language setting in it.
- "Copy link" shows a tick and **"Link copied."**, which a screen reader also hears.
  Pasting gives the product's address.
- If the browser will not copy by either of the two ways the page tries, it says
  "Your browser did not let us copy the link. Copy it from the box below." and shows
  the link, selected, in a box labelled "Link to this product".

**Automated:** `product-page.spec.ts` — "copy link puts the product's own address on
the clipboard and says so".

---

## UC-19 — See what else I might like

**As a customer:** at the foot of a product page I look at related products.

- A **"You may also like"** section with up to 12 product cards, in the same grid as
  the catalogue. The product itself is never among them.
- The same garment comes first, other garments of the same kind after, and
  anything sold out goes last. An unstitched kurta shows only the other unstitched
  kurta.
- The cards work like the catalogue's: frames on hover, quick add, the heart for a
  signed-in customer. Pressing one opens that product.
- The section arrives after the rest of the page: the buy box works before it is
  there, and a grey placeholder holds its place meanwhile.

**Automated:** `product-page.spec.ts` — "you may also like offers other products,
and each opens its own page".

---

## UC-20 — Look closely at the photographs

**As a customer:** I zoom into the cloth, and look at every photograph full screen.

- **Desktop, with a mouse:** hovering the main photograph zooms it in place, twice
  the size, following the pointer. Nothing else on the page moves.
- **Pressing the photograph** (or Tab to it and Enter) opens a full-screen view
  titled "Photographs of {product}", with focus on its close button. Next and
  previous buttons, the arrow keys and the thumbnails change the photograph; the
  keys follow the reading direction and wrap from the last to the first. A line
  reads "Image n of N". Home and End jump to the ends.
- Closing it (Escape or the close button) returns focus to the photograph, and the
  page shows the photograph last looked at, with its thumbnail scrolled into view.
- **Phone:** an expand icon on the photograph shows it opens larger. Swiping left
  and right changes the photograph; dragging up or down does not; pinching zooms
  without changing the photograph. With the phone on its side, the full-screen
  view hides its thumbnails so the photograph keeps its height.
- Pick a product with several photographs: four of the 24 have only one.

**Automated:** `product-page.spec.ts` — "the gallery opens full screen, steps
through the photographs and closes".

---

## UC-21 — Ask to be told when a sold-out size is back (Notify Me)

**As a customer:** my size is sold out, so I ask to be emailed when it returns.

- On a product with a size drawn struck through, under the sizes: "Sold out in your
  size? Choose it and we will email you when it is back." and one button per
  sold-out size, named "Email me when size {size} is back".
- **As a guest:** pressing it opens an email field ("Size {size} is sold out. Where
  should we email you when it is back?"). A bad address says "Enter a valid email
  address." A good one closes the form and says "We will email you when {product}
  is back in size {size}." Asking again with the same address, in any letter case,
  says "We already have a request to email you…".
- Typing the test account's own email as a guest gives exactly the same sentence as
  any other address — the page never reveals whether an account exists.
- **Signed in:** the line says "…we will email the address on your account…", and
  one press records the request with no form.
- **On a set:** the buttons under "Size for the whole set" ask about the whole
  product; those under a piece in "Adjust individual pieces" ask about that piece
  ("…when the Shalwar in {product} is back…"). A whole-set size is drawn sold out
  when any piece lacks it.
- No email is actually sent: nothing sends email yet. The store only records the
  request.

**Automated:** `product-page.spec.ts` — "notify me takes an address for a sold-out
size and says what will happen" (guest).

---

## UC-22 — Move things between the bag and my saved items

**As a signed-in customer:** I keep something for later instead of buying it now,
and later buy something I had saved.

- Each line in the bag (panel and `/bag`) has **"Move to saved items"** before
  Remove. Pressing it takes the line out of the bag, says "{item} moved to your
  saved items.", and moves focus to the next line's Remove (or to the empty-bag
  sentence). The product is then on `/wishlist` and its heart is filled.
- A line being cut to measure has no "Move to saved items" — only Remove. A guest
  sees no move button at all.
- On `/wishlist`, adding a card to the bag with its quick add **moves** it: the card
  leaves the list without the list blanking, the bag panel does not open, and
  "{item} moved to your bag." appears above the list beside a "View bag" link, which
  takes focus. Elsewhere, quick add still opens the bag panel.

**Automated:** `saved-for-later.spec.ts` — "a bag line moved to saved items leaves
the bag and appears on the saved list".

---

## UC-23 — Have my size remembered

**As a signed-in customer:** I save my size once and it is chosen for me on other
products.

- Choose one size for the whole product (a single-piece product, or a set with every
  piece in the same size). A **"Remember size {size}"** button appears under the
  sizes. Pressing it says "Size {size} is saved…" and a **"Your size"** mark appears
  under that size in every selector.
- On another product that comes in that size and has it in stock, the size is
  already chosen, with "We have chosen your saved size. You can change it." Nothing
  goes in the bag until Add to bag is pressed.
- Saving another size says "Size L is saved in place of M." Sizes chosen differently
  per piece offer nothing to remember. A saved size that is sold out is not chosen,
  but is still marked. On a set, the saved size is chosen for every piece or for
  none: if any piece lacks it in stock, nothing is chosen.
- In a card's quick-add tray the saved size is marked with an icon; a screen reader
  hears "{size} — your saved size". It is never pressed for you.
- `/account` has **"Your saved sizes"**: the chart ("Clothing sizes") and the size,
  with Forget. Forgetting says "Saved size forgotten." and product pages stop
  choosing it.
- A guest sees none of this.

**Automated:** `saved-for-later.spec.ts` — "a size saved on one product is chosen for
the customer on the next".

---

## UC-24 — Open my order again, from anywhere

**As a customer:** I come back to my order later, maybe on another phone.

- The browser that placed the order opens `/order/{number}` straight away, and so
  does the signed-in account that placed it, from any browser.
- Anyone else — another browser, a shared link — sees **"Find your order"** and a
  mobile number field. The mobile the order was placed with opens it; a wrong one,
  or a number that names no order, says "We could not find an order with that
  number and mobile number." — the same sentence for both.
- An address with the order number in small letters (`/order/aa100001`) opens
  straight away for the signed-in account that placed it. For a guest it asks for
  the mobile number even in the browser that placed the order — that browser's
  access is kept under the number as issued — and after the lookup it opens at
  either spelling.
- An order paid by **bank transfer** shows "Paying by bank transfer": the amount,
  the order number as the reference, and the bank's details. The bank details are a
  placeholder, not the client's account.
- A signed-in customer's `/account` lists their orders 20 at a time, newest first,
  with **"Show more orders"**; it works without JavaScript.

**Automated:** none. `guest-checkout.spec.ts` covers placing an order and seeing its
page in the same browser.

---

## UC-25 — Read the store's own pages

**As a customer:** I look up delivery, returns, or how to reach the shop.

- The footer has four parts: **Shop**, **Help** (Delivery, Returns and exchanges,
  Size guide, Payment guide, Fabric glossary, Care guide), **Our store** (About us,
  Contact us, Terms of sale, Privacy) and the newsletter. One column on a phone,
  three columns on a tablet with the newsletter on its own row, one row on a desktop.
- Each opens at `/help/{page}`. **Contact us** ends with "How to reach us": phone
  (opens the dialler), WhatsApp (opens in a new tab), email, hours and address.
  **Every contact detail is a placeholder**; the hours look real and are not.
- No page states a figure — delivery charges, the free-delivery threshold and the
  cash-on-delivery limit are described without numbers. Returns are asked for by
  contacting the store; there is no return form.
- Terms of sale and Privacy are placeholders with no legal standing, to be replaced
  by the client's lawyer.
- In Urdu (`?locale=ur`) every page and the footer read right to left, and the
  footer offers the way back to English, because the header switch is off.
- A page that does not exist, a product that does not exist and an order number
  that cannot be one each show a proper "could not find" page with a way back.

**Automated:** `urdu.spec.ts` checks the footer's help heading in Urdu; nothing opens
the store pages yet.

---

## UC-26 — What a search engine is given

**As the store:** search engines can find every public page and nothing private.

- `/robots.txt` allows `/` and disallows `/api/`, `/account`, `/bag`, `/checkout`,
  `/order/`, `/sign-in`, `/sign-up`, `/forgot-password` and `/wishlist`, and names the
  sitemap.
- `/sitemap.xml` lists the homepage, `/catalogue`, `/stitched`, the ten help and store
  pages and all 24 products, as full addresses, each with its English and Urdu
  alternative.
- A product page's source holds a `Product` description (name, code, price in PKR,
  availability matching the buy box, no rating) and a `BreadcrumbList`; `/catalogue`
  has a `BreadcrumbList`; the homepage has the store's name and web address.
- Each page names its own canonical address; the Urdu version names its own.

**Automated:** none end to end; unit tests hold robots.txt to the pages' own
`noindex` settings and check the sitemap and the structured data.

---

## The automated journeys

Since 2026-09-19 the main journeys run in a real browser against a real `next dev`,
with the mock backend inside it: `npm run test:e2e` (Playwright, Chromium). It
starts its own server on port **3107** and **cannot run while your own
`npm run dev` is running** — Next allows one dev server per project folder — so
stop that first. In a Claude Code session, also clear `AI_AGENT` and `CLAUDECODE`
before running it, or `next dev` writes `AGENTS.md` and `CLAUDE.md` into the
repository root. One run takes about three minutes; the last three full runs passed
17 of 17.

| Spec | Journeys |
| --- | --- |
| `guest-checkout.spec.ts` | A guest goes from the homepage to the catalogue, picks a size by keyboard, bags it, checks out with the first payment method on offer, lands on the order page, and finds the bag empty afterwards. |
| `catalogue-listing.spec.ts` | A filter and a sort narrow and order the listing, the screen-reader status line and the address follow both, and removing the filter keeps the sort. An address past the last page shows the last page. |
| `search.spec.ts` | Typing part of a trending term offers suggestions and choosing one lists results. A product code typed into search opens that product. |
| `product-page.spec.ts` | The size guide opens and hands focus back (UC-17). Copy link copies the product's own address (UC-18). "You may also like" offers other products that open (UC-19). The gallery opens full screen, steps and closes (UC-20). Notify Me takes an address for a sold-out size (UC-21). |
| `account.spec.ts` | A signed-in customer saves a product with the heart and finds it on the saved-items page and on the account. The account page shows who is signed in and every section's empty state. |
| `saved-for-later.spec.ts` | A bag line moved to saved items leaves the bag and appears on the list (UC-22). A size remembered on one product is chosen on the next (UC-23). |
| `made-to-measure.spec.ts` | A guest opens the studio from a product's fork, is refused with nothing filled, fills the required figures, checks, reviews, saves on this browser, and bags the garment, which the bag shows as cut to measure and not returnable. |
| `phone.spec.ts` | On a Pixel 7: a size is tapped, bagged, raised, and removed with confirmation, and nothing ever scrolls sideways. |
| `urdu.spec.ts` | In Urdu the homepage, the catalogue and a product page read right to left with their Urdu words, and nothing scrolls sideways. |

Before the first journey, `tests/e2e/global-setup.ts` checks that the catalogue has
product cards — so a mock that has stopped answering stops the run there, by name —
and requests every page and route once, so no journey pays for a first compile. The
server is pointed at `http://127.0.0.1:9` for the backend, so a request the mock does
not answer fails at once instead of reaching a real service. A signed-in journey
signs in by setting the mock session cookie, not through the sign-in form. After
"Go to checkout" the guest journey waits for the bag panel to finish closing before
it types: the panel stays modal through its exit animation, and the page under a
modal dialog cannot be typed into.

The journeys find products through the page — never by address or product code —
and read their words from the message files. Two things are still written into
them: the eleven measurement figures in `tests/e2e/support/measurements.ts`, which
must satisfy the placeholder tailor's rules, and the guest's name, mobile and
address.

---

## Not tested, and why

- **A real card payment.** There is no payment provider connected; card and wallet
  orders are confirmed by the stand-in. Cash on delivery was tested end to end.
- **A real Try-on image.** No image provider is connected, so the panel's guidance,
  privacy wording and photo picker were tested, but not a generated picture.
- **Urdu on the storefront, by hand.** The header language switch is deliberately
  off until the Urdu review is finished. Urdu is reachable with `?locale=ur`, and
  `urdu.spec.ts` checks the main path reads right to left; the words themselves
  still await a native reader.
- **Emails and text messages.** Nothing sends either yet, so a Notify Me request, a
  password reset and a sign-in code are recorded but never delivered; the sign-in
  code is shown on screen instead.

---

## By-hand pass, 2026-09-19

Driven in the running store (`npm run dev`, MSW on) at 1280×800 and at the 375×812
phone preset, light and dark, English and Urdu, as a guest and signed in (the D3
session cookie set directly — no password or sign-in code was typed). Results per
cell: `PASS`, `FIXED` (a fault found here and repaired in the same pass), `NOTE`,
or `—` where that width was not exercised for that case.

| Use case | Desktop 1280 | Phone 375 |
| --- | --- | --- |
| UC-17 Size guide | PASS | — (the page around it fits) |
| UC-18 Share a product | PASS | — |
| UC-19 You may also like | PASS | PASS (layout) |
| UC-20 Photographs, zoom and full screen | FIXED | NOTE (swipe and pinch need a real phone) |
| UC-21 Notify Me | PASS | — |
| UC-22 Bag and saved items | PASS | PASS |
| UC-23 Saved sizes | FIXED | PASS |
| UC-24 Open my order again | PASS, NOTE | — |
| UC-25 Store pages and footer | PASS | PASS |
| UC-26 Robots, sitemap, structured data | PASS | — (not width-dependent) |

**What was checked, briefly**

- UC-17 — "Size guide" beside the whole-set legend and the per-piece heading opens the
  dialog with focus on Close, the help page's own text, and "Open this guide on its own
  page".
- UC-18 — the WhatsApp link carries the product name and its canonical address and
  opens safely (`target=_blank`, `rel=noopener noreferrer`, "opens in a new tab" in its
  name). The pane refuses the clipboard, so Copy link showed its fallback: the address
  in a selected read-only box and a sentence saying so.
- UC-19 — twelve products, the same garment first and newest first, the product itself
  and the sold-out suits left out.
- UC-20 — full screen opens on Close, reads "Image 1 of 4", steps with Next and the
  right arrow, and hands focus back to the photograph it opened from.
- UC-21 — as a guest: a bad address refused in words, then "We will email you when …
  is back in size XS." with focus on it, and a repeat request recognised ("We already
  have a request…").
- UC-22 — signed in, "Move to saved items" empties the line, says so and lands focus on
  "Your bag is empty."; on `/wishlist` a quick add moves the product into the bag and
  out of the list, announced, without duplicating a product already saved.
- UC-23 — "Remember size L" confirms with focus and marks all four selectors; another
  suit with L on every piece opens with L chosen and "We have chosen your saved size";
  the account lists "Clothing sizes / L" with a named Forget. At 3 per row on a phone
  the quick-add tray still fits the 104px tile, the saved size named "L — your saved
  size".
- UC-24 — `/order/AA100001` reloads to the order; an unknown number and a number the
  browser holds no access to both get the same "Find your order" lookup.
- UC-25 — all ten help and store pages answer with their own titles and canonical
  addresses; the contact card renders the FIXTURE details from the client profile; in
  Urdu the pages read right to left with nothing past the screen edge.
- UC-26 — `robots.txt` disallows the private routes and names the sitemap;
  `sitemap.xml` lists 37 addresses (home, catalogue, studio, ten pages, 24 products)
  with language alternates; the product page publishes Product (PKR price, live
  availability, no rating) and BreadcrumbList, the listing BreadcrumbList, the
  homepage Organization and WebSite.

The earlier use cases were walked again as well: header, search panel and results
page, listing (filters, chips, price, in stock, sort, paging, page 99, back button),
cards, product page (set sizing and per-piece override, Fabric Calculator, adding an
unstitched length), try-on (the sample labelled as a sample), bag panel (quantity,
codes, removal, the hold explanation), guest and signed-in checkout (validation,
delivery, gift, cash on delivery, one order from a double press, the saved-address
picker), made to measure from a product through save and Add to bag to a placed order
carrying the figures, sign-in, sign-up and reset validation, sign out, the account
area and the address book. A contrast sweep of every text element on eighteen pages
found nothing under 4.5:1 in dark or light, apart from text set over photographs,
which that sweep cannot see behind.

**Findings**

- **FIXED — a saved size half-filled a set.** The waistcoat had no L while the kameez
  and shalwar did; the page chose L on two pieces, left the waistcoat blank, disabled
  Add to bag and said "We have chosen your saved size". A set now takes its saved size
  whole or not at all (`saved-size-prefill.ts`, with a test).
- **FIXED — the largest image carried the `priority` prop Next 16 deprecates**, and the
  dev server warned about it on the product page. The gallery's frame and the hero's
  still load eagerly at high priority; a card's first frame in the leading rows loads
  eagerly.
- **FIXED — the way back to English was pronounced as Urdu.** The footer's "English"
  on an Urdu page now carries `lang="en"` in a `bdi`.
- **FIXED (found in review, not by hand) — an unknown payment method or delivery option
  at placement answered NOT_FOUND**, which the checkout route reads as an empty bag. It
  is its own INVALID answer now, a 400 like the quote's.
- **NOTE — `/order/aa100001` in the browser that placed it asks for the mobile.** The
  order read and the lookup ignore case; the browser's access cookie does not. The
  lookup then shows the order.
- **NOTE — an unknown `/help/…` page renders the store's not-found page with `noindex`
  and status 200.** The status is sent before the page streams; `/no-such-route`
  itself answers 404.
- **NOTE — the pane's Enter sends only a keydown**, so implicit form submission never
  fires from it; the search panel's submit was verified through the form itself.
- **NOTE — pane artefacts, not store faults:** while the pane is not painting, React's
  hidden streaming copies stay in the document, which duplicates ids and makes React
  warn about radios sharing a name. With the pane painting the copies are gone.

**Not exercised by hand:** typing a password or a sign-in code (covered by the
Playwright suite and by the session cookie), a real try-on image, a hold lapsing after
30 minutes, the backend switched off, a full keyboard-only walk, reduced motion, and
touch on a real phone.
