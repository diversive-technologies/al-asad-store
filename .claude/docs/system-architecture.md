# Ethnic Apparel E-Commerce Platform

## System Architecture & MVP Specification

*Custom build · Pakistan · English and Urdu*

Bounded contexts, transactional guarantees, module contracts and release scope

---

# Contents

**Part I — Foundations**

1. Purpose and Scope
2. Actors
3. Architectural Principles
4. External Systems and Integration Points

**Part II — System Design**

5. System Decomposition
6. Core Domain Models
7. Transactional Design
8. Data Architecture
9. Scalability Design
10. Authorization Model

**Part III — Module Specifications**

11. Identity and Access
12. Catalogue
13. Inventory
14. Pricing and Promotions
15. Search and Discovery
16. Cart
17. Checkout and Payment
18. Order Management
19. Returns and Cancellation
20. Reviews
21. Content
22. Localisation
23. Notifications
24. Try-On
25. Fabric Calculator
26. Reporting
27. Administration

**Part IV — Delivery**

28. Release 1 — MVP Scope
29. Release 2 — Deferred Scope
30. Non-Functional Requirements
31. Configuration Register
32. Architectural Decision Record
33. Risks

---
---

# PART I — FOUNDATIONS

---

# 1. Purpose and Scope

## 1.1 What this document is

This is the system design for a custom-built ethnic apparel e-commerce platform serving the Pakistani domestic market in English and Urdu. It defines how the system is decomposed, what guarantees each part makes, and what is built in the first release.

It is written for the engineer who will build it. Every module has a stated responsibility, a stated set of data it owns, a stated interface, and stated invariants that must hold. Where a value is commercial rather than technical it is named as a configuration value and listed in section 31.

## 1.2 What makes this system architecturally distinctive

Most storefronts are simple: a product has a price and a stock count. This one is not, for three reasons, and the architecture exists mostly to serve them.

**A product may be composite, and most are not.** A cap, a jubba, a single stitched shalwar qameez, a one-piece unstitched fabric — each is one garment, sold in one size, with one stock figure. These are ordinary products and the system must treat them as ordinary.

But a two-piece or three-piece suit is one purchasable thing made of several **independently sized, independently stocked** garments. A customer takes M in the kameez and L in the shalwar, and either piece can sell out on its own.

The catalogue therefore carries an explicit product type — `SIMPLE` or `SET` — declared when the product is created. It is not inferred by counting rows. A cap is `SIMPLE` because it is a single garment, not because a query returned one row.

**Where a product is a SET, the stock invariant becomes multi-row.** Reserving a three-piece set means reserving three separate rows atomically. Partial reservation is a corrupt state — it holds stock nobody can buy while telling the customer the set is unavailable. Concurrent customers competing for the last unit of a shared piece make this the central correctness problem of the system.

For a `SIMPLE` product the same transaction runs over exactly one row. The machinery does not change shape; it simply has less to do.

**One physical product has two commercial forms.** Unstitched fabric is sold by length; stitched garments are sold by size. The same catalogue serves both, so the domain model must carry metreage and size ranges side by side without either being a special case bolted onto the other.

Everything else — search, cart, checkout, notifications — is conventional. The design effort belongs where those three problems are.

## 1.3 Scope boundary

**In scope:** a single-market, single-currency, single-warehouse online store with one administrative user in the first release.

**Out of scope, structurally:** multiple markets, multiple currencies, physical retail, in-store stock, click-and-collect, international shipping. These are not deferred features; the system is not designed for them, and adding any of them would be a re-architecture rather than an extension.

---

# 2. Actors

An actor is a party with goals the system serves. External services are not actors — they are dependencies, and appear in section 4.

## 2.1 Release 1 actors

| # | Actor | Description |
|---|---|---|
| 1 | **Visitor** | An unauthenticated user. Browses, searches, filters, views products, uses the Fabric Calculator, places an order as a guest, and tracks that order using its number and the mobile number it was placed with. |
| 2 | **Customer** | An authenticated user. Everything a Visitor can do, plus wishlist, saved sizes, saved addresses, order history, self-service cancellation and returns. |
| 3 | **Administrator** | The single operator of the business. Holds every permission in the system: catalogue, inventory, orders, dispatch, returns, refunds, content, promotions, configuration and reporting. |

Three actors. There is no separate Catalogue Manager, Merchandiser, Operations Officer, Finance Officer, Support Agent or Content Manager. In a business run by one person, splitting one human into six named roles produces a specification that describes an organisation that does not exist, and an authorization model with five unused branches.

## 2.2 Planned actor

| # | Actor | Description | Release |
|---|---|---|---|
| 4 | **Manager** | Sees inventory position, sales and margin. Does not process orders, issue refunds, or change configuration. Exists so that commercial oversight is separable from day-to-day operation. | 2 |

## 2.3 Why the Manager role costs nothing to add later

The authorization model in section 10 never asks *"is this user an Administrator?"* It asks *"does this user hold permission `order.refund`?"* Roles are collections of permissions held as data.

Adding the Manager is therefore a new row in a roles table with a selected permission set — no code change, no new branches, no redeployment of business logic. This is the Open/Closed Principle applied to authorization, and it is the only reason a single-actor MVP does not become a rewrite when the second actor arrives.

The permission set the Manager will hold is already listed in section 10.4, so the split is designed now and enabled later.

---

# 3. Architectural Principles

These are not recited as definitions. Each is stated as the specific decision it forces in this system.

## 3.1 SOLID applied

### Single Responsibility

**Every module owns exactly one body of data and has exactly one reason to change.**

The consequences are concrete and load-bearing:

- **Catalogue does not know stock levels.** A product record contains no quantity field. "Is this sold out?" is a query answered by Inventory. This is why a stock change never requires a catalogue write, and why the catalogue read model can be cached aggressively while stock stays live.
- **Order does not compute price.** It records the prices Pricing returned at the moment of placement. An order's totals are immutable historical facts, not a live recalculation. Changing a discount rule tomorrow must not alter yesterday's order.
- **Inventory does not know what a set is.** It manages quantities against `(piece, size)` keys and never reads `product_type`. Cart is responsible for knowing that reserving a three-piece set means three keys and a cap means one — passed to the same atomic call either way.
- **Pricing does not know about carts.** It answers "what does this cost, given these inputs" as a pure function of catalogue data, promotion rules and time.

### Open/Closed

**Three axes of this system will change often and must extend without modification:**

- **Payment methods.** Four exist at launch and more will follow. Checkout must not contain a conditional per method. See section 17.2 for the interface and section 3.3 for why a naive version of it would be wrong.
- **Notification channels.** SMS and email at launch; WhatsApp is explicitly deferred, not excluded. Adding it must be one adapter, not an edit to every place a message is sent.
- **Promotion rules.** New discount shapes must be new rule types, not new branches in a pricing function.

### Liskov Substitution — and where it nearly breaks

This principle is usually stated abstractly. Here it forces a specific and non-obvious design decision, so it is worth stating carefully.

The obvious payment abstraction is `PaymentProvider.charge(order)`. **It is wrong, and it violates LSP.** Cash on Delivery cannot charge anything at checkout — there is no money to take. A Cash-on-Delivery implementation of `charge()` would have to either do nothing and lie about success, or throw — and a subtype that cannot honour the supertype's contract is exactly the violation LSP describes. Callers would then need to know which provider they hold, which defeats the abstraction entirely.

**The correct abstraction is one level up: the payment lifecycle as a state machine, with each method declaring which transitions it supports.**

```
PaymentMethod
  supports(transition) -> boolean
  initiate(order)      -> PaymentState
  confirm(order, evidence) -> PaymentState
  settle(order)        -> PaymentState
  refund(order, amount)-> PaymentState
```

- **Card and wallet** — `initiate` authorises with the gateway, `settle` captures, `refund` reverses.
- **Cash on Delivery** — `initiate` sends the confirmation SMS and moves to `AWAITING_CONFIRMATION`, `confirm` records the customer's reply, `settle` records cash collected on delivery, `refund` records cash returned.
- **Bank transfer** — `initiate` issues the reference and moves to `AWAITING_TRANSFER`, `confirm` is the Administrator matching the payment, `settle` is the same event, `refund` is a manual outward transfer.

Every method honours the same contract. None pretends to do something it cannot. Checkout orchestrates transitions without knowing which method it holds.

### Interface Segregation

**Read and write paths are separate interfaces, and the storefront never sees an administrative one.**

The storefront depends on `CatalogueQuery`, `InventoryAvailability` and `PricingQuery`. It has no visibility of `CatalogueCommand`, `InventoryAdjustment` or `PricingRuleCommand`. This is not only a security posture — it is what allows the read side to be served from cache and read replicas while the write side stays transactional against the primary.

### Dependency Inversion

**Domain modules define the interfaces they need; adapters to the outside world implement them at the edge.**

This is what makes the Try-On requirement *architecturally* satisfiable rather than merely hoped for. The rule is "Try-On must never prevent a sale". If the domain called an external HTTP client directly, that rule would depend on someone remembering to set a timeout. Instead, Try-On is an optional adapter behind a port that the purchase path does not depend on at all. The product page renders and the Add to Bag button works whether the Try-On adapter is present, absent, failing or not yet built.

## 3.2 ACID applied

The critical section of this system is inventory reservation. Each ACID property forces a specific implementation choice.

### Atomicity

**Reserving a multi-piece set is one transaction covering every piece.** Two of three pieces reserved is a corrupt state: it holds stock nobody can buy while telling the customer the set is unavailable. Either all piece reservations commit or none do.

### Consistency

**The invariant `on_hand ≥ reserved + allocated` and `available = on_hand − reserved − allocated ≥ 0` is enforced by a database constraint, not by application code.**

Application-level checks are advisory. They fail under concurrency, under a code path someone forgets, and under manual data correction. A `CHECK` constraint on the stock row makes overselling impossible to represent, whatever the calling code does.

### Isolation

**Concurrent reservations against the same piece and size must serialise, and multi-row locking must not deadlock.**

Two customers reserving the last unit must not both succeed. Stock rows are therefore locked for update within the reservation transaction.

Deadlock is a real risk here: customer A reserves pieces {1, 5, 9} while customer B reserves {9, 5, 1}. If each locks in the order the cart happens to list them, they deadlock. **The rule is therefore: within a reservation transaction, piece-size rows are always locked in ascending order of their primary key, regardless of the order they appear in the cart.** A consistent global lock order makes deadlock structurally impossible.

### Durability

**Reservations are rows in the primary database with an expiry timestamp. They are never held only in a cache or in application memory.**

If reservations lived in an in-memory store, a process restart would lose them and the system would oversell. They are durable records.

**Expiry is evaluated at read time, not only by a background sweeper.** Availability is computed as:

```
available = on_hand − allocated − SUM(reservations WHERE expires_at > now())
```

A sweeper job also deletes expired rows, but only to keep the table small. If the sweeper stops, availability figures remain correct. Correctness never depends on a background job having run.

## 3.3 Scalability posture

**The system is a modular monolith with enforced internal boundaries, not a set of microservices.**

For a single-market store with a sub-1,000-item catalogue and one administrative user, distributed services would add network partitions, distributed transactions and deployment complexity to solve a scale problem that does not exist. The multi-row atomic reservation described above is straightforward inside one database and genuinely difficult across service boundaries.

The boundaries are nonetheless real and enforced: each module in Part III owns its tables, and no module reads another's tables directly — only its published interface. A module can therefore be extracted later if load ever justifies it, and Search is already a separate index for reasons given in section 8.3.

Scaling in Release 1 is horizontal on the application tier, which is stateless, with read replicas and caching absorbing the read-heavy browse traffic.

---

# 4. External Systems and Integration Points

These are dependencies, not actors. Each sits behind a port defined by the domain and is replaceable without changing domain code.

| System | Port | Purpose | Failure behaviour |
|---|---|---|---|
| **Payment gateway** | `PaymentMethod` | Authorises and captures card and wallet payments | Order is not placed; bag preserved; customer told payment did not complete |
| **SMS provider** | `NotificationChannel` | Order confirmation, dispatch, COD confirmation, sign-in codes | Queued and retried; never blocks the operation that triggered it |
| **Email provider** | `NotificationChannel` | Confirmations, alerts, password reset, abandoned bag | As above |
| **Try-On service** | `TryOnProvider` | Generates the colour-on-customer image | Feature reports unavailable; purchase path entirely unaffected |
| **Translation service** | `TranslationProvider` | Produces Urdu text for stored content | Falls back to English text; never renders an empty string |
| **Courier** | Manual, via Administrator | Carries parcels, collects COD | Tracking reference entered by hand; no live integration in Release 1 |
| **Object storage / CDN** | `MediaStore` | Product imagery and video | Static assets; origin fallback |
| **Search index** | `SearchIndex` | Query, facet counts, suggestions | Falls back to database query with reduced features |

**Design rule:** no external system is on the critical path of a purchase except the payment gateway, and only for card and wallet methods. Cash on Delivery — expected to be the majority of orders — requires no external system to place the order at all.

---
---

# PART II — SYSTEM DESIGN

---

# 5. System Decomposition

## 5.1 Modules

Seventeen modules, each owning one body of data.

| # | Module | Owns | Type |
|---|---|---|---|
| 1 | Identity and Access | Accounts, sessions, roles, permissions | Core |
| 2 | Catalogue | Products, pieces, fabrics, colours, size sets, attributes, media | Core |
| 3 | Inventory | Stock, reservations, allocations | Core |
| 4 | Pricing and Promotions | Base prices, discount rules, promotional codes | Core |
| 5 | Search and Discovery | Search index, facet definitions | Read |
| 6 | Cart | Bag contents, reservation orchestration | Core |
| 7 | Checkout and Payment | Payment records, payment method adapters | Core |
| 8 | Order Management | Orders, order lines, state history | Core |
| 9 | Returns and Cancellation | Cancellations, return requests | Core |
| 10 | Reviews | Reviews, moderation state | Supporting |
| 11 | Content | Help pages, static pages, fabric explainers | Supporting |
| 12 | Localisation | Translations, protected terms | Supporting |
| 13 | Notifications | Templates, send log | Supporting |
| 14 | Try-On | Session records only; no image storage | Supporting |
| 15 | Fabric Calculator | Requirement table | Supporting |
| 16 | Reporting | Read projections | Read |
| 17 | Administration | Configuration, audit log | Supporting |

## 5.2 Dependency direction

Dependencies point inward. Core modules never depend on supporting or read modules.

```
                  ┌──────────────────────────────┐
                  │   Storefront / Admin UI      │
                  └──────────────┬───────────────┘
                                 │
     ┌───────────────────────────┼───────────────────────────┐
     │                           │                           │
┌────▼─────┐              ┌──────▼──────┐            ┌───────▼──────┐
│  Search  │              │    Cart     │            │  Reporting   │
│  (read)  │              └──────┬──────┘            │   (read)     │
└────┬─────┘                     │                   └───────┬──────┘
     │                    ┌──────▼──────┐                    │
     │                    │  Checkout   │                    │
     │                    └──────┬──────┘                    │
     │                           │                           │
┌────▼───────────────────────────▼───────────────────────────▼──────┐
│  Catalogue   │   Inventory   │   Pricing   │   Order   │  Identity │
│                        CORE DOMAIN                                 │
└────────────────────────────┬───────────────────────────────────────┘
                             │
              ┌──────────────▼──────────────┐
              │  Ports: Payment · Notify ·  │
              │  TryOn · Translate · Media  │
              └──────────────┬──────────────┘
                             │
              ┌──────────────▼──────────────┐
              │     External Systems        │
              └─────────────────────────────┘
```

**Enforced rules:**

1. No module reads another module's tables. Access is through the owning module's interface only.
2. Core modules do not import supporting or read modules.
3. External systems are reached only through ports defined by the domain.
4. Cart is the only module permitted to orchestrate a multi-piece reservation, because it is the only module that knows a set is a set.

---

# 6. Core Domain Models

## 6.1 Product and Piece

```
Product (aggregate root)
  id, code, name, description
  product_type          -- SIMPLE | SET      declared, never inferred
  category, collection, launch_at
  season[], garment_type, work_type, fit
  is_unstitched
  media[]
  pieces[]              -- exactly one if SIMPLE, two or more if SET
  display_price_override (nullable)

Piece (part of Product aggregate)
  id, product_id, code, name, position
  fabric_id             -> Catalogue.Fabric
  colour_id             -> Catalogue.Colour
  size_set_id           -> Catalogue.SizeSet  (nullable for one-size)
  length_metres         (required when is_unstitched)
  base_price
```

### Product type

`product_type` is chosen by the Administrator when the product is created and drives every behaviour the customer can see.

| | `SIMPLE` | `SET` |
|---|---|---|
| Examples | Cap · jubba · stitched shalwar qameez sold as one unit · 1-piece unstitched fabric · dupatta or trouser sold alone | 2-piece and 3-piece suits · co-ord sets · any product where pieces are sized separately |
| Pieces | Exactly one | Two or more |
| Size selection | One size selector | Unified selector plus per-piece override |
| Bag display | One line with its size | One line with each piece and its size listed beneath |
| Listing action | Quick add | Quick view |
| Reservation | One row | All rows, atomically |

**The type is a per-product decision, not a category rule.** A stitched shalwar qameez is `SIMPLE` when it is sold in one size. Were it ever sold with the kameez and shalwar sized independently, the same garment would be created as a `SET`. The system does not assume; the person creating the product declares it.

### Why storage is uniform while type is explicit

A `SIMPLE` product still has one `Piece` row. This is deliberate and worth stating plainly, because it is the one place where the model does not mirror the domain exactly.

The alternative — storing fabric, colour, size and stock directly on `Product` for `SIMPLE` and in `Piece` rows for `SET` — would give Inventory **two different key shapes** to reserve against, and reservation is the one transaction in this system that must never be wrong. Two shapes means two lock paths, two availability queries and two ways to oversell.

So: **storage is uniform, behaviour is explicit.** Inventory keys on `(piece_id, size)` for everything and stays a simple, heavily-tested counter. Everything the customer sees — sizing, bag, quick add, product page layout — branches on `product_type`, which is a declared fact rather than a row count.

The distinction that matters commercially is preserved. The distinction that would endanger correctness is not introduced.

**Invariants:**

- `product_type = SIMPLE` ⟹ exactly one Piece. `product_type = SET` ⟹ two or more Pieces. Enforced at publish.
- `piece_count` is **derived** as `COUNT(pieces)`, never stored. The "3 Piece" a customer filters on and the three rows the system reserves are the same fact, so they cannot disagree.
- Every Piece of an unstitched Product has `length_metres`. Enforced at publish, not at save, so drafts can be incomplete.
- `Product.display_price` = sum of piece `base_price` unless overridden.
- A Product is invisible to all storefront queries until `launch_at` has passed. Visibility is a query predicate, not a status field to be forgotten.
- `product_type` cannot be changed once the product has been ordered. Doing so would alter the meaning of historical order lines.

## 6.2 Colour

```
Colour
  id
  display_name        -- "Sea Green"      shown to the customer
  filter_group        -- "Green"          used by the colour filter
  description         -- "a soft muted green with a grey undertone"
  urdu_display_name   -- fixed transliteration
  hex                 -- for the filter swatch
```

Three customer-facing fields, held once per colour rather than per product. `filter_group` is drawn from a fixed set of roughly twelve values so the colour filter stays usable as the catalogue grows.

## 6.3 Fabric

```
Fabric
  id
  name_en, name_ur          -- name_ur is the fixed transliteration
  weight                    -- Light | Medium | Heavy
  explainer                 -- one line, shown in filter and product page
  glossary_text             -- full entry
  care_text                 -- reused by every product using this fabric
```

Care instructions are held against the fabric, not the product. A hundred lawn products share one care text.

Creating a Fabric automatically creates its protected-term entry (section 22.3). A Fabric cannot be saved without `name_ur`, because machine translation would otherwise render "Lawn" as grass.

## 6.4 Inventory

```
StockLevel                     -- one row per piece per size
  piece_id, size
  on_hand      integer
  allocated    integer         -- committed to placed orders
  version      integer         -- optimistic concurrency
  CONSTRAINT on_hand >= 0
  CONSTRAINT allocated >= 0
  CONSTRAINT allocated <= on_hand

Reservation                    -- transient hold
  id, cart_id
  piece_id, size, quantity
  expires_at
  INDEX (piece_id, size, expires_at)
```

**Availability is computed, never stored:**

```
available(piece, size) =
    on_hand
  − allocated
  − SUM(reservation.quantity WHERE piece=? AND size=? AND expires_at > now())
```

**Derived product state:**

```
product.is_purchasable(chosen_sizes) =
    ALL pieces have available(piece, chosen_size) >= 1

product.is_sold_out =
    ANY piece has available(piece, size) = 0 for every size
```

Both expressions hold for `SIMPLE` and `SET` alike — for a `SIMPLE` product, "all pieces" and "any piece" address the single row, so no separate case is needed here.

**The commercial consequence applies only to sets.** A single sold-out trouser makes an entire three-piece set unbuyable, even though the kameez and dupatta are in stock. This is correct — you cannot ship two thirds of a suit — but it is easy to miss operationally, because nothing in an ordinary low-stock report says "this product cannot be sold at all". Section 26 therefore makes it a dedicated report line rather than something to be inferred.

## 6.5 Order

```
Order (aggregate root)
  id, order_number
  customer_id (nullable — guest orders)
  contact_name, contact_mobile, contact_email
  delivery_address, delivery_city
  delivery_option, delivery_charge
  is_gift, gift_message
  subtotal, discount_total, total
  order_state
  placed_at
  lines[]
  state_history[]

OrderLine
  product_id, product_code, product_name_snapshot
  quantity, unit_price, line_total
  pieces[]                 -- piece_code, name, size, price

Payment                        -- separate lifecycle from order
  order_id, method, payment_state
  gateway_reference (nullable)
  amount, transitions[]
```

**Invariants:**

- Order lines store **snapshots** of name, price and piece detail. An order is a historical record. Renaming a product or changing a price must never alter a placed order.
- `Order.total = subtotal − discount_total + delivery_charge + gift_charge`, checked at placement and never recalculated afterwards.
- Payment state is tracked separately from order state. They are different lifecycles with different owners, and conflating them is why so many stores cannot represent "delivered but not yet paid" — which is every Cash-on-Delivery order in transit.

## 6.6 Order state machine

```
                    ┌──────────────────────┐
   COD ────────────►│ AWAITING_CONFIRMATION│──┐
                    └──────────┬───────────┘  │
                               │ confirm      │ expire / reject
   Bank transfer ──┐           ▼              ▼
                   │      ┌─────────┐    ┌───────────┐
                   ├─────►│CONFIRMED│◄───┤ CANCELLED │
   Card / wallet ──┘      └────┬────┘    └───────────┘
   (on authorisation)          │              ▲
                               │ dispatch     │ cancel (within window,
                               ▼              │  pre-dispatch only)
                        ┌────────────┐        │
                        │ DISPATCHED │────────┘
                        └─────┬──────┘
                              │ deliver
                              ▼
                        ┌───────────┐    ┌──────────────────┐
                        │ DELIVERED │───►│ RETURN_REQUESTED │
                        └───────────┘    └────────┬─────────┘
                                                  │ approve + receive
                                                  ▼
                                            ┌──────────┐
                                            │ RETURNED │
                                            └──────────┘
```

**Transition guards:**

| Transition | Guard |
|---|---|
| → `CONFIRMED` | Payment state is `AUTHORIZED`, `SETTLED`, or method is COD with customer confirmation recorded |
| → `DISPATCHED` | Order is `CONFIRMED` and all lines allocated |
| → `CANCELLED` | Order is not `DISPATCHED`; either within the cancellation window (customer) or unconditional (Administrator) |
| → `RETURN_REQUESTED` | Order is `DELIVERED` and within the return window |
| → `RETURNED` | Return approved and goods received |

Every transition writes a `state_history` row with actor, timestamp and reason. State is never mutated without a history entry — the history is the audit trail, and there is no other.

---

# 7. Transactional Design

The two transactions below are the correctness core of the system. Everything else is ordinary CRUD.

## 7.1 Reserving stock (add to bag)

**Trigger:** customer adds a product to the bag with a size chosen for every piece.

**Guarantees:** atomic across all pieces; no oversell under concurrency; no deadlock; durable across restart.

**One transaction serves both product types.** For a `SIMPLE` product the loop below runs once; for a three-piece `SET` it runs three times. There is no separate simple path — sorting and locking a single key is correct and cheap, and having one reservation routine rather than two means there is one place where overselling could be introduced, not two.

```
BEGIN TRANSACTION

  1. Resolve the piece/size keys for every piece of the product.

  2. SORT the keys ascending by piece_id.
     — This is not cosmetic. A consistent global lock order is what
       makes deadlock structurally impossible when two carts contain
       overlapping pieces in different orders.

  3. FOR EACH key IN sorted order:
       SELECT ... FROM stock_level
         WHERE piece_id = ? AND size = ?
         FOR UPDATE                       -- serialises competing carts

       available := on_hand
                  − allocated
                  − SUM(active reservations for this key)

       IF available < requested_quantity:
           ROLLBACK
           RETURN Unavailable(piece)   -- names which piece failed

  4. FOR EACH key: INSERT reservation row
       (cart_id, piece_id, size, quantity,
        expires_at = now() + hold_period)

COMMIT
```

**Failure is specific, not generic.** The response names the piece that failed, so the interface can mark "Trouser — L" rather than telling the customer the set is unavailable and leaving them to guess.

**Extending an existing hold** refreshes `expires_at` on the existing rows rather than inserting new ones, so a customer editing their bag does not accumulate reservations against themselves.

## 7.2 Placing an order

**Trigger:** customer submits checkout.

**Guarantees:** stock converted from reserved to allocated atomically; order and payment created atomically; no partial order.

```
BEGIN TRANSACTION

  1. Load the cart and verify every reservation is still active
     (expires_at > now()). If any has expired, ROLLBACK and return
     the customer to the bag naming the expired items.

  2. Re-price the cart through Pricing at current time.
     If the total has changed since it was displayed, ROLLBACK and
     show the customer the new total for explicit confirmation.
     — Prices are never silently changed under a customer at payment.

  3. SORT piece keys ascending. FOR EACH, SELECT ... FOR UPDATE.

  4. FOR EACH: allocated += quantity ; DELETE the reservation row.
     The CHECK constraint allocated <= on_hand is the final guard.

  5. INSERT order with snapshotted line and piece detail.

  6. INSERT payment record in its initial state for the chosen method.

COMMIT

-- Outside the transaction, and only after commit:
  7. Invoke PaymentMethod.initiate()
  8. Enqueue confirmation notifications
```

**Steps 7 and 8 are deliberately outside the transaction.** Calling an external payment gateway while holding database locks would hold row locks for the duration of a network round trip, which under load is how a storefront stops serving anyone. Notifications are enqueued for the same reason and because a failed SMS must never roll back a paid order.

**Consequence, stated honestly:** for card and wallet, the order exists in `AWAITING_PAYMENT` before authorisation returns. If authorisation fails, the order is cancelled and stock released by the same path a customer cancellation takes. This is the correct trade — a briefly cancelled order is recoverable, a database under lock contention is not.

## 7.3 Releasing expired reservations

Two mechanisms, deliberately redundant.

**Read-time exclusion.** Every availability calculation filters on `expires_at > now()`. An expired reservation stops affecting availability the instant it expires, with no job involved.

**Background sweep.** A periodic job deletes rows where `expires_at < now()`. Its only purpose is to keep the table small.

If the sweeper stops, availability stays correct and only table size suffers. **Correctness never depends on a background job having run.**

## 7.4 Concurrency summary

| Scenario | Mechanism |
|---|---|
| Two carts, same piece and size, last unit | Row lock on `stock_level`; second waits, then fails cleanly |
| Two carts, overlapping pieces in different order | Ascending lock order prevents deadlock |
| Reservation expires mid-checkout | Detected at step 1 of placement; customer returned to bag |
| Application restart with active holds | Reservations are durable rows; unaffected |
| Administrator adjusts stock during active reservations | Adjustment takes the same row lock; `CHECK` constraint prevents driving `on_hand` below `allocated` |
| Price changes between bag and payment | Detected at step 2; customer must confirm the new total |

---

# 8. Data Architecture

## 8.1 Write model

A single relational primary database holds all transactional state. Tables are grouped by owning module and no module queries another's tables directly.

Chosen because the central correctness problem — atomic multi-row reservation with a serialisable guarantee — is solved by a relational database and is materially harder in any distributed arrangement.

## 8.2 Read models

Browse traffic is overwhelmingly reads of data that changes rarely. Two projections are maintained:

**Product projection** — one denormalised record per product holding everything the card and listing page need: name, imagery, prices, colour display name, fabric, work type, metreage line, badges. Rebuilt on catalogue change. Cached with a long lifetime.

**Availability overlay** — stock is *not* in the projection, because it changes constantly and would invalidate the cache on every order. Availability is fetched separately as a small, cheap, live query keyed by piece and size, and merged at render time.

This split is why a hundred concurrent shoppers browsing does not generate a hundred stock queries per page, while stock displayed remains accurate.

## 8.3 Search index

Search runs against a dedicated index, not the primary database, because:

- Facet counts across eight filter groups over a filtered result set are expensive as SQL aggregates and cheap in a search engine.
- Type-ahead requires sub-100ms response, which should not compete with checkout transactions for database resources.
- Fuzzy matching, stemming and relevance ranking are not relational operations.

The index is updated asynchronously on catalogue change. **It is eventually consistent, and that is acceptable** — a product appearing in search a few seconds late is not a correctness failure. Stock, however, is never taken from the index; the availability overlay is applied after results return.

## 8.4 Caching

| Layer | Content | Invalidation |
|---|---|---|
| CDN | Images, video, static assets | Content-hashed filenames |
| Application cache | Product projections, content pages, fabric data, translations | On write to the owning module |
| No cache | Availability, cart, prices at checkout, order state | — |

**Rule: nothing that affects money or stock is served from cache.**

## 8.5 Media

Images and video are held in object storage and served through a CDN. The application stores references only. Responsive variants are generated on upload, not on request.

---

# 9. Scalability Design

## 9.1 Load profile

| Path | Volume | Character | Strategy |
|---|---|---|---|
| Browse and search | Very high | Read-only, cacheable | CDN, projections, read replicas |
| Product page | High | Read + small live availability query | Cached projection + live overlay |
| Add to bag | Moderate | Write, transactional, contended | Row locks, short transactions |
| Checkout | Low | Write, transactional, critical | Never cached, never batched |
| Admin | Very low | Mixed | Direct to primary |

**The system is read-heavy by roughly two orders of magnitude.** Scaling effort belongs almost entirely on the read path.

## 9.2 Horizontal scaling

Application servers hold no session state — sessions are stored externally — so instances can be added and removed freely behind a load balancer.

Read replicas serve product projections, search and content. **The primary serves every write and every availability check**, because a replica lag of even a second would allow overselling.

## 9.3 Asynchronous work

A durable job queue handles everything that must not run inside a request:

- Notification dispatch (SMS, email)
- Translation of new or changed content
- Search index updates
- Product projection rebuilds
- Reservation sweep
- Review request scheduling
- Abandoned bag detection
- Report aggregation

**Every job is idempotent and retriable.** A job running twice must produce the same result as running once — a customer must not receive two dispatch messages because a worker restarted mid-run.

## 9.4 Drop-launch load

A scheduled collection launch is the one predictable traffic spike. It is handled by:

- Publishing products by a `launch_at` predicate rather than a bulk write at launch time, so there is no write storm at the moment of release.
- Warming the product projection and search index **before** the launch moment, since the products already exist and are merely invisible.
- Retaining the availability overlay as live — the one thing that genuinely must be accurate under a rush.

## 9.5 What is deliberately not built

No sharding, no read/write splitting beyond replicas, no service mesh, no event sourcing, no CQRS beyond the read projections described. Each would be justified by scale this business does not have, and each would make the reservation transaction harder to reason about.

---

# 10. Authorization Model

## 10.1 Structure

```
Account ──has one── Role ──has many── Permission
```

Permissions are strings namespaced by module: `catalogue.write`, `inventory.adjust`, `order.dispatch`, `order.refund`, `report.financial`, `config.write`.

## 10.2 Enforcement rule

**Code checks permissions, never roles.**

```
if (user.can('order.refund')) { ... }        // correct
if (user.role === 'ADMIN')    { ... }        // forbidden
```

Every authorization check in the system takes this form. There are no exceptions, because a single role check anywhere is what makes adding an actor a code change instead of a data change.

## 10.3 Release 1

One role, `ADMINISTRATOR`, holding every permission. The check above still runs on every operation — it simply always passes. The mechanism is exercised from day one so it cannot rot.

## 10.4 Release 2 — Manager

Added as data. The intended permission set, designed now:

| Permission | Administrator | Manager |
|---|---|---|
| `catalogue.read` | ✓ | ✓ |
| `catalogue.write` | ✓ | — |
| `inventory.read` | ✓ | ✓ |
| `inventory.adjust` | ✓ | — |
| `order.read` | ✓ | ✓ |
| `order.dispatch` | ✓ | — |
| `order.cancel` | ✓ | — |
| `order.refund` | ✓ | — |
| `return.process` | ✓ | — |
| `report.operational` | ✓ | ✓ |
| `report.financial` | ✓ | ✓ |
| `content.write` | ✓ | — |
| `promotion.write` | ✓ | — |
| `config.write` | ✓ | — |
| `account.manage` | ✓ | — |

The Manager sees inventory position, sales and margin, and changes nothing. This is the separation the business asked for, expressed entirely as permission assignment.

---
---

# PART III — MODULE SPECIFICATIONS

Each module is specified as: **Responsibility · Owns · Exposes · Depends on · Invariants · Notes**.

---

# 11. Identity and Access

**Responsibility.** Authenticate users and answer authorization questions. Nothing else.

**Owns.** Accounts, credentials, sessions, roles, permissions, role assignments.

**Exposes.**
```
authenticate(email, password) -> Session
authenticateByCode(mobile, code) -> Session
issueCode(mobile) -> void
resetPassword(email) -> void
can(account, permission) -> boolean
```

**Depends on.** Notification port (sign-in codes, reset links).

**Invariants.**
- Passwords are stored hashed with a modern adaptive function. Never reversible.
- Sign-in codes are single-use and expire.
- A password reset ends every existing session for that account.
- Failed attempts are rate-limited per identifier and per source.
- Authentication responses never reveal whether an account exists.

**Notes.** Customer accounts and the administrative account use the same mechanism and differ only by permission set. There is no separate admin login system to secure independently.

---

# 12. Catalogue

**Responsibility.** Define what is for sale. Owns product structure and every attribute of it except price and stock.

**Owns.** Products, Pieces, Fabrics, Colours, Size Sets, attribute vocabularies, media references, collections.

**Exposes.**
```
CatalogueQuery                      -- storefront
  getProduct(id | code)
  listByCollection(collection, paging)
  getFabric(id), listFabrics()
  getSizeSet(id)

CatalogueCommand                    -- admin only
  createProduct(draft) / updateProduct / publishProduct
  bulkImport(file) -> ImportReport
  manageFabric / manageColour / manageSizeSet
```

**Depends on.** Media port. Localisation (for translated fields). Nothing else.

**Invariants.**
- A Product has ≥ 1 Piece.
- Fabric and Colour are foreign keys to closed vocabularies. Free text is not accepted.
- Unstitched pieces require `length_metres` at publish.
- `launch_at` is mandatory. Storefront queries filter on it; there is no separate published flag to fall out of sync.
- A Fabric cannot be created without its Urdu transliteration.

**Notes.** Contains no quantity field of any kind. "Sold out" is not a catalogue concept — it is an Inventory answer, and keeping it out of this module is what allows product data to be cached for hours while stock stays live.

`product_type` is set at creation and is the field every other module consults to decide how a product behaves. Most of the catalogue will be `SIMPLE`; the `SET` machinery exists for suits and co-ords and should not be assumed to be the common case.

---

# 13. Inventory

**Responsibility.** Track stock and guarantee it is never oversold.

**Owns.** `stock_level`, `reservation`.

**Exposes.**
```
InventoryAvailability               -- read
  available(piece_id, size) -> integer
  availableForProduct(product_id) -> map<piece, map<size, integer>>

InventoryReservation                -- called only by Cart
  reserve(cart_id, [{piece_id, size, qty}]) -> Ok | Unavailable(piece)
  extend(cart_id) -> void
  release(cart_id, piece_id?, size?) -> void
  allocate(cart_id) -> Ok | Unavailable(piece)

InventoryAdjustment                 -- admin only
  adjust(piece_id, size, delta, reason) -> void
```

**Depends on.** Nothing. This module is a leaf and has no outward dependencies by design.

**Invariants.**
- `on_hand ≥ 0`, `allocated ≥ 0`, `allocated ≤ on_hand` — as database constraints.
- `available` excludes expired reservations at read time.
- `reserve` is atomic across all supplied keys.
- Locks are always acquired in ascending `piece_id` order.
- Every manual adjustment records a reason and an actor.

**Notes.** This module knows nothing about products, sets or orders. It manages counters against keys. The knowledge that three pieces form one purchasable set lives in Cart, which is the module that has a reason to know it.

---

# 14. Pricing and Promotions

**Responsibility.** Answer what something costs, right now, given the rules in force.

**Owns.** Discount rules, promotional codes, price band configuration.

**Exposes.**
```
PricingQuery
  priceFor(product_id) -> {base, effective, discount_rule?}
  priceCart(cart, code?) -> {subtotal, discount_total, applied[], total}
  validateCode(code, cart) -> Valid | Invalid(reason)

PricingRuleCommand                  -- admin only
  createRule / updateRule / deactivateRule
```

**Depends on.** Catalogue (base prices, product attributes for rule scope).

**Invariants.**
- Pricing is a **pure function** of catalogue data, active rules and the current time. It has no side effects and stores nothing per customer.
- Where multiple automatic rules match, the largest single reduction applies. **Reductions never stack.**
- A rule outside its active window is invisible to every calculation.
- Rules are never deleted, only deactivated — a deleted rule would make a past order's discount unexplainable.

**Notes.** Because pricing is pure, `priceCart` can be called freely during browsing and again at placement without side effects. The re-price at step 2 of order placement is the same call, which is why a price change between bag and payment is detectable rather than silent.

---

# 15. Search and Discovery

**Responsibility.** Find products and compute facet counts.

**Owns.** The search index and facet definitions.

**Exposes.**
```
SearchQuery
  search(term, filters, sort, paging) -> ResultPage
  suggest(partial) -> {terms[], products[]}
  facetCounts(filters) -> map<facet, map<value, count>>
  byCode(code) -> Product?
```

**Depends on.** Catalogue (source data). Inventory (availability overlay, applied after results return).

**Invariants.**
- The index is eventually consistent with Catalogue. Acceptable and explicitly accepted.
- **Stock is never read from the index.** Availability is overlaid live.
- Unlaunched products are excluded at index time, not filtered at query time.
- Facet counts reflect the current filter context, not the whole catalogue.

**Notes.** If the index is unavailable, search degrades to a database query with reduced relevance and no facet counts, rather than failing. Browsing must never depend on a secondary system being healthy.

---

# 16. Cart

**Responsibility.** Hold the customer's selection and orchestrate reservations. This is the only module that reads `product_type` in order to act on it — Inventory reserves whatever keys it is handed and has no opinion about whether they form a set.

**Owns.** Carts, cart lines with per-piece size selections.

**Exposes.**
```
CartService
  addItem(cart, product_id, {piece_id -> size}, qty) -> Ok | Unavailable(piece)
  updateQuantity(cart, line, qty)
  removeItem(cart, line)
  moveToWishlist(cart, line)
  applyCode(cart, code)
  summary(cart) -> {lines[], pricing, freeDeliveryProgress}
```

**Depends on.** Catalogue, Inventory, Pricing.

**Invariants.**
- A line cannot exist without a size selected for every piece of its product.
- Every line holds a live reservation. Adding without reserving is not a representable state.
- Reservation and cart line are created in the same transaction.
- Reducing quantity or removing a line releases the corresponding reservation immediately.

**Notes.** The decision to place the set-awareness here rather than in Inventory is deliberate. Inventory stays a simple, heavily-tested counter service with no product semantics; Cart carries the composite logic, and is the only place that logic appears.

---

# 17. Checkout and Payment

**Responsibility.** Convert a cart into an order and manage the payment lifecycle.

**Owns.** Payment records and payment method adapters.

**Exposes.**
```
CheckoutService
  quote(cart, address, deliveryOption) -> {totals, availableMethods}
  place(cart, contact, address, deliveryOption, method, giftOptions) -> Order | Failure

PaymentMethod                       -- one implementation per method
  supports(transition) -> boolean
  initiate(order) / confirm(order, evidence) / settle(order) / refund(order, amount)
```

**Depends on.** Cart, Inventory, Pricing, Order, Notifications, Payment gateway port.

**Invariants.**
- Order placement is the transaction in section 7.2. No partial order can exist.
- External payment calls occur **after** commit, never inside the transaction.
- A price change between display and submission halts placement for explicit confirmation.
- Cash on Delivery is unavailable above the COD cap; the restriction is enforced server-side, never only in the interface.
- Payment state is independent of order state.

**Notes.** Adding a payment method is one new class implementing `PaymentMethod` plus a configuration entry. No checkout code changes. This is the Open/Closed requirement in section 3.1 made concrete, and the state-machine shape is what keeps Cash on Delivery a first-class method rather than a special case.

---

# 18. Order Management

**Responsibility.** Own the order record and its lifecycle after placement.

**Owns.** Orders, order lines, piece detail, state history.

**Exposes.**
```
OrderQuery
  get(order_id)
  findForTracking(order_number, mobile) -> Order?
  listForCustomer(customer_id, paging)
  queue(filters, paging)              -- admin

OrderCommand
  transition(order, to_state, actor, reason) -> Ok | Rejected(guard)
  recordDispatch(order, courier_reference)
```

**Depends on.** Inventory (allocation release on cancellation), Notifications.

**Invariants.**
- Order lines are immutable snapshots. Catalogue and price changes never alter a placed order.
- Every state change is guarded per section 6.6 and writes a history row with actor, time and reason.
- **State is never mutated without a history entry.** There is no other audit trail and none is needed.
- Tracking lookup requires both order number and the mobile number on the order, and is rate-limited.

**Notes.** Guest and account orders are the same record; `customer_id` is simply null for guests. When a guest registers with the same email at the confirmation step, the order is attached to the new account.

---

# 19. Returns and Cancellation

**Responsibility.** Handle orders being unwound, before or after delivery.

**Owns.** Cancellations, return requests, return lines.

**Exposes.**
```
ReturnService
  canCancel(order) -> boolean
  cancel(order, actor, reason)
  requestReturn(order, [lines], reason)
  processReturn(request, decision, actor)
  recordReceipt(request, condition)
```

**Depends on.** Order, Inventory, Notifications, Payment (refund transition).

**Invariants.**
- Customer cancellation is permitted only within the cancellation window **and** before dispatch. Both conditions, checked server-side.
- Administrator cancellation is unconditional pre-dispatch.
- Cancellation releases allocated stock in the same transaction as the state change.
- Returned stock re-enters inventory only when recorded as resalable.
- A refund is a payment-lifecycle transition, not an order field.

---

# 20. Reviews

**Responsibility.** Collect and publish product reviews.

**Owns.** Reviews, moderation state.

**Exposes.**
```
ReviewService
  canReview(customer, product) -> boolean
  submit(order, product, rating, comment, usual_size)
  moderate(review, decision, actor)
  forProduct(product) -> {average, count, reviews[]} | Hidden
```

**Depends on.** Order (eligibility), Catalogue, Notifications.

**Invariants.**
- Only a customer with a `DELIVERED` order containing that product may review it.
- Size purchased is taken from the order and cannot be edited by the reviewer.
- **Below the display minimum, `forProduct` returns `Hidden`** — no average, no count, no section, and nothing on the product card. Absence is invisible rather than displayed as zero.
- Reviews are published only after moderation.

**Notes.** The `Hidden` return type rather than an empty result is deliberate: it makes it impossible for a caller to accidentally render "0 reviews", which is the failure mode that makes a new store look abandoned.

---

# 21. Content

**Responsibility.** Hold editorial and help content.

**Owns.** Help pages, static pages, homepage configuration, fabric explainer text.

**Exposes.**
```
ContentQuery
  page(slug, locale)
  homepage(locale)
ContentCommand
  savePage(slug, locale, body)
```

**Depends on.** Localisation, Media port.

**Invariants.**
- Every page exists in both locales. A missing Urdu version renders the English text, never an empty page.
- Fabric explainer text is owned by Catalogue's Fabric record, not duplicated here — Content renders it, Catalogue owns it.

---

# 22. Localisation

**Responsibility.** Present the entire system in English or Urdu.

**Owns.** Translation records, the protected-terms list, locale resolution.

**Exposes.**
```
LocalisationService
  translate(key | text, locale) -> string
  requestTranslation(entity, field, source_text)
  protectedTerms() -> map<en, ur>
```

**Depends on.** Translation provider port.

**Invariants.**
- **No customer-facing string is written into interface code.** All are translatable content.
- Protected terms are supplied with every translation request as do-not-translate instructions with fixed substitutions.
- Untranslated content falls back to English. An empty string is never rendered.
- Machine output is published without human review, **except** protected terms, which are never machine-generated.

**Notes.** The protected-terms list is the entire reason this design works. Machine translation would render "Lawn" as grass, destroying the fabric filter and glossary — the exact content meant to build trust with first-time buyers. The list is auto-populated from the Fabric vocabulary, so it cannot fall behind the catalogue.

Right-to-left layout is a presentation concern handled in the interface layer, not here: direction derives from locale, and every interface component is built direction-agnostic rather than being flipped by exception.

---

# 23. Notifications

**Responsibility.** Deliver messages. Own no business logic.

**Owns.** Templates, send log.

**Exposes.**
```
NotificationService
  send(template, recipient, data, locale) -> queued
NotificationChannel                 -- one per transport
  deliver(message) -> Sent | Failed
```

**Depends on.** SMS port, Email port.

**Invariants.**
- Every send is enqueued, never synchronous. **A notification failure never fails the operation that triggered it.**
- Every template exists in both locales; messages are sent in the customer's last-used locale.
- Sends are idempotent per (template, recipient, trigger reference), so a retried job cannot duplicate a message.
- Only the templates enumerated in section 28.7 exist. There is no ad-hoc send path.

---

# 24. Try-On

**Responsibility.** Produce a colour-on-customer image. Store nothing.

**Owns.** Ephemeral session records only. **No image is ever persisted.**

**Exposes.**
```
TryOnService
  isAvailable() -> boolean
  generate(product_id, colour_id, photo) -> Image | Unavailable
TryOnProvider                       -- port
  render(correctedPhoto, productImage) -> Image
```

**Depends on.** Try-On provider port, Catalogue.

**Invariants.**
- The uploaded photograph is corrected for white balance, sent, and **deleted immediately** — on success, on failure, on timeout and on cancellation alike.
- No customer photograph is written to storage, backup or log at any point.
- The generated result is returned to the browser and not retained server-side.
- Requests time out at the configured limit.
- **This module is never on the purchase path.** Product pages render and Add to Bag functions with the provider absent, failing or not yet built.

**Notes.** Because the provider sits behind a port, Release 1 can ship the complete interface with a stub adapter reporting unavailable. Switching the real service on is configuration, not a release. This is Dependency Inversion earning its place: the deployment schedule of an external service cannot block the store.

---

# 25. Fabric Calculator

**Responsibility.** Determine whether a product's fabric is sufficient for a given customer.

**Owns.** The requirement table mapping height band and garment style to metres required.

**Exposes.**
```
FabricCalculator
  evaluate(product_id, height_cm, style) -> Comfortable(spare) | JustEnough | Insufficient(shortfall)
```

**Depends on.** Catalogue (piece metreage).

**Invariants.**
- A pure function. No customer input is stored.
- Offered only for products with at least one unstitched piece.
- `JustEnough` is returned when the surplus is positive but below the configured margin.

**Notes.** Deliberately the simplest module in the system — a table lookup and a subtraction — while being one of the three features no competitor offers. Its value is entirely in the data model decision to store metreage as a number rather than as description text.

---

# 26. Reporting

**Responsibility.** Answer questions about what has happened. Read-only.

**Owns.** Aggregate projections. No source data.

**Exposes.**
```
ReportQuery
  sales(range, groupBy)              -- requires report.financial
  stockAlerts()                      -- requires report.operational
  blockedProducts()                  -- requires report.operational
  abandonedCarts(range)
  searchAndFilterUsage(range)
```

**Depends on.** Order, Inventory, Search, Cart — read-only.

**Invariants.**
- Reporting never writes to any other module.
- Financial reports are gated on `report.financial`, which is the permission the Manager role will hold in Release 2.

**Notes.** `blockedProducts()` is called out separately from `stockAlerts()` because it answers the question this catalogue structure makes easy to miss: **which products are unsellable because a single piece is out of stock in every size.** In a composite-product catalogue this is the most commercially expensive condition to leave undetected, and it is invisible in an ordinary low-stock report.

---

# 27. Administration

**Responsibility.** Configuration and audit.

**Owns.** Configuration values, audit log.

**Exposes.**
```
ConfigService
  get(key) / set(key, value, actor)
AuditService
  record(actor, action, entity, before, after)
  search(filters)
```

**Depends on.** Nothing.

**Invariants.**
- Every configuration value in section 31 is readable and writable here. **No configuration value is a code constant.**
- Every write in every module produces an audit entry with actor, timestamp, entity and change.
- The audit log is append-only.

---
---

# PART IV — DELIVERY

---

# 28. Release 1 — MVP Scope

**Objective:** take a real order, correctly, in both languages, operated by one person.

## 28.1 Included — catalogue and browse

- Product model with pieces, fabric, colour, size sets, metreage, attributes
- Fabric, Colour and Size Set vocabularies with Urdu transliterations
- Single-product entry and spreadsheet bulk import
- Scheduled publication by `launch_at`
- Listing pages: breadcrumbs, product count, repeating asymmetric grid, numbered pagination
- Product card: image, hover image, work + fabric line, name, colour, price, metreage, badges
- Badges: New, Discount, Low stock, Sold out — all computed, none manual
- **Six filters:** Fabric, Colour, Price, Piece count, Garment type, In stock only
- Facet counts, removable chips, Clear all, instant apply, URL-encoded state
- Four sort options
- Search: type-ahead with product previews, results page with filters and sort, code lookup, no-results recovery

## 28.2 Included — product and purchase

- Product page: gallery with thumbnails, desktop magnifier, **mobile tap-to-fullscreen**, size guides, four information sections
- **Sizing by product type** — a `SIMPLE` product shows one size selector and nothing else; a `SET` shows the unified selector plus the per-piece override panel. Quick add is offered on `SIMPLE` listings, quick view on `SET` listings
- Sold-out sizes with Notify Me
- Fabric Calculator
- Model height and size worn
- Estimated delivery date
- WhatsApp and copy-link sharing
- You may also like
- Bag: slide-in panel, per-piece size display, quantity, remove with confirmation, promotional code, free-delivery progress
- **Stock reservation with durable holds and read-time expiry**
- Checkout: single page, guest checkout, all four payment methods, COD SMS confirmation and cap, gift wrapping and message
- Order placement per section 7.2

## 28.3 Included — accounts and orders

- Registration, sign-in, phone-code sign-in, password reset
- Order history, saved addresses, saved sizes (**stored and pre-filling the size selector**)
- Wishlist: save, view, move to bag
- Guest order tracking by number and mobile
- Self-service cancellation within the window
- Return request form and processing
- Order queue, dispatch, status transitions

## 28.4 Included — content, language, platform

- Four help pages: fabric glossary, payment guide, size guide, care guide
- Fabric explainers in the filter and on the product page
- Static pages
- **Full English and Urdu with right-to-left layout, Nastaliq, machine translation and the protected-terms list**
- Homepage: video with poster-first loading, four sections
- Newsletter capture
- Notifications: order confirmation, dispatch, COD confirmation, sign-in code, password reset, back-in-stock
- Single-role authorization with permission-based checks throughout
- Configuration register, audit log, five reports
- Performance, accessibility and search-engine standards in section 30

## 28.5 Deferred, with the interface built

**Try-On.** The `TryOnProvider` port, the upload flow, guidance screens, white-balance correction, deletion guarantees and the unavailable state are all built in Release 1. The adapter to the external service is connected when that service is ready. Switching it on is configuration.

This is the correct handling of a headline feature with an external dependency: the store does not wait for it, and does not need a release to gain it.

## 28.6 Not in Release 1

| Deferred | Reason |
|---|---|
| Reviews | No delivered orders exist at launch. A review system with nothing in it is worse than none. Ships with Release 2 once there is order history to request against. |
| Saved-size filtering of listings | Saved sizes are captured and used to pre-fill in R1. Filtering listings by them needs real customer data to be worth the query cost. |
| Wishlist price-drop and back-in-stock alerts | Depends on wishlist volume that does not exist on day one. |
| Abandoned-bag recovery email | Requires abandonment data to tune the threshold sensibly. |
| Chatbot | Adds a support surface before there is support load. WhatsApp, phone and email cover Release 1. |
| Drop preview page with countdown | Scheduled publication ships in R1; the promotional preview page does not. |
| Manager role | Data-only addition, as designed in section 10.4. |
| Work type and Season filters | Six filters at launch, not eight. Both attributes are captured in R1 so the filters are a configuration change later. |

**On the two deferred filters:** eight filter groups on a sub-1,000-item catalogue produces groups with two or three values each, which reads as an unfinished store. The attributes are recorded from day one, and section 26's filter-usage report will show which of the six are actually used before the remaining two are added.

## 28.7 Complete notification list for Release 1

**SMS:** COD confirmation request · COD confirmation reminder · order confirmation · dispatch · sign-in code

**Email:** order confirmation · dispatch · delivery · cancellation · return received · return decision · return resolved · back-in-stock · password reset · newsletter confirmation

No other message is sent. There is no ad-hoc send path.

---

# 29. Release 2 — Deferred Scope

In the order it should be built:

1. **Reviews** — submission, moderation, display with the hidden-below-minimum rule, SMS request scheduling
2. **Manager role** — permission set from section 10.4, financial reporting separated
3. **Try-On adapter** — connect the external service to the port built in R1
4. **Wishlist alerts** — price drop and back in stock
5. **Saved-size filtering** of listing pages
6. **Abandoned-bag recovery email**
7. **Work type and Season filters** — enabled once usage data justifies them
8. **Chatbot** — scope defined before build, per section 32
9. **Drop preview page** with countdown

---

# 30. Non-Functional Requirements

## 30.1 Performance

| Path | Target |
|---|---|
| Product page, cached projection | Under 200 ms server response |
| Search type-ahead | Under 100 ms |
| Add to bag, including reservation | Under 500 ms |
| Checkout submission, excluding gateway | Under 1 s |

Page weight is budgeted against a slow mobile connection. Images are responsive and lazy-loaded. The Nastaliq font is loaded only for Urdu. The homepage video never blocks first render.

## 30.2 Availability

The purchase path — browse, product, bag, checkout — must function when Search, Try-On, Translation or the SMS provider are unavailable. Only the payment gateway is a hard dependency, and only for card and wallet methods.

## 30.3 Accessibility

Pinch-zoom is never disabled. Contrast meets a legible ratio. Every function is keyboard-operable. Every control has a descriptive label including icon-only controls. Every image has alternative text. In-place updates — filter results, bag changes, form errors — are announced to assistive technology.

## 30.4 Security

Passwords hashed adaptively. Sessions expire. Rate limiting on authentication, order tracking and code requests. Server-side enforcement of every rule, including the COD cap and cancellation windows — the interface is never the enforcement point. Customer photographs never persisted. Audit log append-only.

## 30.5 Search engines

Unique address, title and description per page. Product structured data on every product page. Breadcrumb structured data. Automatic sitemap excluding unlaunched products. Filtered views marked so the canonical category page is indexed. Both locales published, declared and cross-linked.

---

# 31. Configuration Register

Every value the system treats as configurable. None is a code constant. All are editable in Administration.

| # | Value | Used in | Default |
|---|---|---|---|
| 1 | COD maximum order value | 17 | To be set |
| 2 | COD confirmation window | 17 | 24 hours |
| 3 | Free-delivery threshold | 16, 17 | To be set |
| 4 | Delivery options, charges, transit times | 17 | To be set |
| 5 | Dispatch lead time | 12 | 2 working days |
| 6 | Bank transfer payment window | 17 | 48 hours |
| 7 | Gift wrapping charge | 17 | To be set |
| 8 | Gift message character limit | 17 | 200 |
| 9 | **Reservation hold period** | 13, 16 | 30 minutes |
| 10 | Order cancellation window | 19 | 1 hour |
| 11 | Return window after delivery | 19 | 7 days |
| 12 | Review request delay | 20 | 4 days |
| 13 | Review display minimum | 20 | 3 |
| 14 | Reviews per page | 20 | 10 |
| 15 | New badge period | 12 | 30 days |
| 16 | Low-stock threshold | 13, 26 | 3 units |
| 17 | Best-selling calculation period | 15 | 30 days |
| 18 | Products per listing page | 15 | 24 |
| 19 | Price filter bands | 14 | To be set |
| 20 | Search dropdown product count | 15 | 5 |
| 21 | Recent searches retained | 15 | 5 |
| 22 | You-may-also-like count | 12 | 8 |
| 23 | Try-On request timeout | 24 | 30 seconds |
| 24 | Fabric calculator margin | 25 | 0.15 m |
| 25 | Fabric requirement table | 25 | To be set |
| 26 | Abandoned bag threshold | 26 | 4 hours |
| 27 | Newsletter prompt page threshold | 21 | 4 pages |
| 28 | Sign-in code lifetime | 11 | 10 minutes |
| 29 | Sign-in code resend delay | 11 | 60 seconds |
| 30 | Password reset link lifetime | 11 | 1 hour |
| 31 | Password policy | 11 | Minimum 8 characters |
| 32 | Notification retry count | 23 | 3 |
| 33 | Urdu line-height multiplier | 22 | 1.8 |
| 34 | Reservation sweep interval | 13 | 5 minutes |

---

# 32. Architectural Decision Record

| # | Decision | Rationale | Consequence |
|---|---|---|---|
| 1 | Modular monolith, not microservices | Atomic multi-piece reservation is straightforward in one database and hard across services. Scale does not justify distribution. | Boundaries enforced in code; extraction possible later |
| 2 | **`product_type` declared (`SIMPLE` / `SET`), not inferred from row count** | A cap is a single garment, not a set of one. Behaviour the customer sees must follow the domain, not a query result | Every customer-facing surface branches on the type |
| 2a | Storage uniform — a `SIMPLE` product still has one `Piece` row | Two storage shapes would give Inventory two key shapes to reserve against, and reservation must never be wrong | Model does not mirror the domain exactly at this one point, deliberately |
| 2b | `piece_count` derived, never stored | The count a customer filters on and the rows the system reserves become the same fact | One less field to keep in sync |
| 3 | Stock excluded from Catalogue | Allows aggressive caching of product data while stock stays live | Availability is a separate query and overlay |
| 4 | Availability computed, never stored | Cannot drift from reality | Slightly more expensive read; correctness guaranteed |
| 5 | Reservation expiry evaluated at read time | Correctness cannot depend on a background job | Sweeper is an optimisation, not a requirement |
| 6 | Ascending lock order on piece keys | Makes deadlock structurally impossible | Reservation must sort before locking, always |
| 7 | Payment modelled as a lifecycle, not `charge()` | COD cannot charge; a `charge()` interface would violate LSP | Four methods share one honest contract |
| 8 | Payment state separate from order state | They are different lifecycles; conflating them cannot represent "delivered, unpaid" | Two state machines to maintain |
| 9 | External calls outside the order transaction | Holding row locks across a network call collapses throughput | Order may briefly exist before authorisation |
| 10 | Order lines snapshot names and prices | An order is a historical fact | Catalogue changes cannot corrupt history |
| 11 | Permission checks, never role checks | Adding the Manager becomes data, not code | Discipline required — no role check anywhere |
| 12 | Try-On behind a port, off the purchase path | External dependency must not gate launch or block a sale | Ships as a stub in R1; enabled by configuration |
| 13 | Protected-terms list auto-populated from Fabric | Machine translation would destroy the fabric vocabulary | Fabrics cannot be created without Urdu forms |
| 14 | Reviews return `Hidden`, not an empty set | Makes "0 reviews" impossible to render accidentally | Callers handle a distinct type |
| 15 | Six filters at launch, not eight | Thin facet groups read as an unfinished store | Attributes captured now; filters enabled on evidence |

---

# 33. Risks

| # | Risk | Impact | Mitigation |
|---|---|---|---|
| 1 | **Urdu doubles the surface area of the MVP** — every page, template, message and help page exists twice, plus right-to-left layout across all of it | High. The single largest line item in Release 1, and it delays first revenue | Build direction-agnostic interface components from the first commit rather than flipping by exception. Integrate Urdu as the final phase so English can be tested independently. **Recommend evaluating a two-week gap between an English launch and the Urdu launch** — the architecture supports it; the decision is commercial |
| 2 | Machine translation without review will produce awkward product descriptions | Medium. Trust content is the exception and is protected | Protected-terms list covers fabric and garment vocabulary — the highest-damage case. Consider hand-correcting the four help pages post-launch; they are fixed content written once |
| 3 | Reservation hold tuning | Medium. Too long locks stock against real buyers; too short loses sized sets | Configurable from day one. Monitor expiry-versus-conversion ratio in the first weeks |
| 4 | COD refused deliveries | Medium-high. Freight paid twice, stock in transit | SMS confirmation and the value cap both ship in R1. **An out-for-delivery SMS is the strongest remaining lever and was declined — worth reconsidering** |
| 5 | Composite products make a set unbuyable from one missing piece | High commercially, easy to miss | `blockedProducts()` report is a first-class R1 report, not an inferred figure |
| 6 | Try-On service timeline is outside this project's control | Low, by design | Port and stub ship in R1; the store never waits |
| 7 | Single administrator is a single point of failure operationally | Medium | Permission model is ready for the second actor from day one; adding them is data |

---

*End of specification.*
