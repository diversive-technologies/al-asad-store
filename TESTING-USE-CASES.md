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

---

## UC-12 — Help pages

**As a customer:** I read the size guide.

| | Phone 375 |
| --- | --- |
| Loads, readable, no overflow | PASS |

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

## Not tested, and why

- **A real card payment.** There is no payment provider connected; card and wallet
  orders are confirmed by the stand-in. Cash on delivery was tested end to end.
- **A real Try-on image.** No image provider is connected, so the panel's guidance,
  privacy wording and photo picker were tested, but not a generated picture.
- **Urdu on the storefront.** The language switcher is deliberately off until the
  Urdu review is finished; the made-to-measure screens were checked in Urdu
  separately and read correctly right-to-left.
- **Reading saved measurements back.** Nothing reads a saved profile into the form
  yet; that belongs with the account area.

