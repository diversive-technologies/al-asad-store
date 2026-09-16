# Manual test log — functional and layout

Testing the running app as a customer would, on a **desktop** width (1440×900) and
a **phone** width (375×812), for every use case. No code is changed while testing;
findings are recorded here.

**Legend** — `PASS` works and looks right · `WARN` works but looks or feels wrong
· `FAIL` does not work · `NOTE` deliberate, recorded so it is not re-reported.

**How a layout fault is judged.** A page fails on layout if it scrolls sideways,
if something a customer needs sits outside the screen, if text overlaps or is cut
off, or if a control is too small to hit on a phone (under about 32px).

---

## What to fix first

| # | What is wrong | Where | How bad |
| --- | --- | --- | --- |
| 1 | **The product page is 81px wider than a phone screen.** Title, price, sizes and the per-piece panel are all cut off at the right; the customer must scroll sideways or zoom out. Broken at 360–414px, clean from 480px up. | UC-02 | **FAIL** — every phone, the page customers buy from |
| 2 | The same fault drags the **bag panel** (456px wide) and the **Try-on panel** (25px off-screen) off the edge whenever they are opened from a product page. | UC-04, UC-10 | **FAIL** — same root cause, same one-line fix |
| 3 | **Two controls on every product card are invisible but still tappable on a phone** — the heart and "Choose a size" sit at zero opacity with taps still live. A tap meant for the product opens a size tray or silently saves it. | UC-03, UC-09 | WARN — wrong thing happens, no feedback |
| 4 | **Text fields are 14px in checkout, sign-in and search**, so an iPhone zooms the page in the moment one is tapped, and the customer is left scrolling sideways through the rest of the form. The measurement studio already fixed this for itself. | UC-05, UC-07, UC-08 | WARN — affects every iPhone |
| 5 | Small tap targets: breadcrumbs 17px, "View all" 20px, "Close bag" 28px. | UC-01, UC-02, UC-04 | WARN |

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

- `WARN` **"View all" links are 51×20px.** On a phone that is under the ~32px
  minimum for a comfortable tap, and they sit beside a rail people swipe — easy to
  miss, easy to hit by accident. Seen in the "New arrivals" section head.
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
| Sideways scroll | none | **456px of content in a 375px screen** |
| Title, price, sizes on screen | PASS | **FAIL — all cut off at the right** |

**`FAIL` The page is 81px too wide on every common phone.** Title, description,
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
- **The fix (not applied — testing only):** give that grid a definite single
  column at the base width (`grid-cols-1`, i.e. `minmax(0,1fr)`), instead of
  leaving it to size itself to the image. One line in the product page's shell.

**Findings**

- `WARN` Breadcrumb links ("Home", "Catalogue") are 17px high — under the ~32px
  comfortable tap size, and they sit at the very top of a phone screen.
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
- `WARN` **A card's "Choose a size" button is invisible on a phone but still
  tappable** — it sits at `opacity: 0` with pointer events left on, 32×32px, over
  every photograph in the grid. The image arrows beside it were correctly switched
  off for touch; this one was missed, so a tap meant for the product can open a
  size tray instead.

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
- `WARN` **The bag panel inherits the product page's fault.** Opened from a
  product page on a phone it is 456px wide on a 375px screen, so its right edge —
  including part of the Remove control — sits off screen. Opened from anywhere
  else it is exactly 375px and correct. Fixing UC-02 fixes this too.
- `WARN` "Close bag" is 28px high, under a comfortable tap size.

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

- `WARN` **Every text field is 14px, which makes iPhones zoom in on tap.** Name,
  mobile, email, address and city are all below the 16px that Safari treats as
  "readable"; focusing one zooms the page and leaves the customer scrolling
  sideways through the rest of the form. The measurement studio already fixes this
  for its own fields on phones — checkout does not.
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

- `WARN` The search field is 14px — see the store-wide note on iPhone zoom below.

---

## UC-08 — Sign in

**As a customer:** I sign in with my email and password.

| | Desktop 1440 | Phone 375 |
| --- | --- | --- |
| Form, both ways in, submit | PASS | PASS |
| Sideways scroll / overflow | none | none |
| Signing in | PASS — lands back on the home page, signed in | PASS |

- `PASS` The submit button is 48px tall, comfortably tappable.
- `WARN` Email and password fields are 14px — iPhone zoom, as below.

---

## UC-09 — Save something for later

**As a customer:** I tap the heart on a product and open my saved items.

| | Phone 375 |
| --- | --- |
| Heart toggles, label becomes "Remove from wishlist" | PASS |
| Saved items page lists it | PASS — "Plain Waistcoat Suit" |
| Empty state before saving | PASS — "Tap the heart on any product to keep it here." |

- `WARN` **The heart is invisible on a phone but still tappable** — `opacity: 0`,
  32×32, over the photograph. Same fault as the "Choose a size" button in UC-03:
  a customer aiming for the product can hit an unseen control instead.

---

## UC-10 — Try it on

**As a customer:** I open "Try it on" to see the colour on me.

| | Phone 375 |
| --- | --- |
| Panel opens, guidance, photo picker | PASS |
| Honest about the photo | PASS — "never stored… discarded as soon as the image comes back" |
| Says it shows colour, not fit | PASS |

- `WARN` The panel sits **25px off the right edge** (57→400 on a 375 screen). It is
  centred on the page, and the product page is 456px wide — so this is UC-02
  again, not a fault of the panel. Fixing UC-02 fixes it.

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

- `PASS` **The studio's own fields are 16px**, so an iPhone does not zoom when one
  is tapped — the fix the rest of the store still needs (item 4 above).
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

