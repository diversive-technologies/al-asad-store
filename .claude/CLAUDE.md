# Al-Asad — Ethnic Apparel E-Commerce (MVP)

Custom-built storefront for the Pakistani domestic market, English and Urdu.
Next.js 16 App Router frontend against a Java REST/JSON backend. Modular
monolith, single market, single currency (PKR), single warehouse.

**Status:** greenfield. No application code exists yet — no `package.json`,
no `app/`. The two documents below are the entire project.

---

## Sources of truth

| Document | Authority over | How it loads |
| --- | --- | --- |
| **Next.js Coding & Design Guidelines** (v1.1, BINDING) | How frontend code is written | Skill `nextjs-guidelines` — auto-triggers on frontend work. Doc at `.claude/skills/nextjs-guidelines/reference/` |
| **System Architecture & MVP Specification** | What the system does: modules, domain models, transactions, invariants, Release 1 scope | `.claude/docs/system-architecture.md` — read deliberately, per module |

Neither is summarised here on purpose. `PD-01` makes a second copy of a rule a
defect, and a paraphrase is a second copy. This file says *where to look and
when*, and records decisions that are not in either document.

## Read protocol

The documents are large (~3,500 lines combined) and are deliberately **not**
auto-imported into every session.

- **Frontend code** — the `nextjs-guidelines` skill carries its own routing
  table and mandatory procedure. Follow it.
- **Before implementing any module** — read that module's section in the
  architecture doc (Part III, §11–§27), plus §6 (domain models) and §7
  (transactional design) wherever stock, cart, checkout or orders are involved.
- **Before agreeing anything is in scope** — §28 Release 1 Scope. §28.6 lists
  what is explicitly out.

Where the guidelines and the architecture doc conflict, surface it — do not
silently pick one.

## Git

The full working agreement is `.claude/GIT.md`, imported here so it loads every
session rather than waiting to be looked up:

@./GIT.md

Two of its rules are restated inline, because an import that silently fails to
resolve must not be able to switch them off:

- **Never push.** No `git push` in any form, no `gh pr create`, no writing to
  any remote. Publishing is the operator's action.
- **Never commit without an explicit yes** from the operator, in this session,
  for these changes. Silence is a skip, not an approval.

## Decisions taken (not in either document)

**D1 — Frontend first, mocks at the HTTP boundary.** The Java backend is not
being waited on. Zod schemas are the API contract; MSW handlers stand in for
the service. Per `TEST-04`, mocking happens at the HTTP layer and never by
stubbing the project's own API client — so the real typed client and its schema
validation run in every mock path. Swapping in the real backend is a base-URL
change plus deleting handlers; no application code moves. Goal is a complete,
demonstrable UI for the client.

**D2 — RTL-safe from commit 1; Urdu content as a final phase.** Every component
is direction-agnostic from the first file per §18 — this is not deferrable.
Urdu strings, Nastaliq and the protected-terms list land as a closing phase.
This follows architecture §33 Risk 1, which recommends decoupling the English
launch from the Urdu launch to protect first revenue.

**D3 — Dummy sign-in in M1; real auth deferred to M6.** Entry to the store is
through a mock-backed sign-in screen: no real credentials, no credential
storage, MSW issues a mock session, and the user enters as an authenticated
Customer rather than a Visitor. It is a placeholder for the auth design the
operator intends to do separately (§11 is M6).

Noted for scheduling, not as an objection: guest checkout is Release 1 scope
(§28.2) and guest order tracking by number and mobile is too (§28.3). The dummy
sign-in sits alongside that path rather than replacing it, so both are built —
guest checkout lands in M5 where it already sits in the sequence below.

**D4 — TypeScript pinned to 6.0.3, deliberately below `latest`.** TypeScript 7
is the native Go port; `typescript-eslint` refuses to load against it outright
("typescript-eslint does not support TS 7.0"), and `eslint-config-next` depends
on that package, so ESLint will not run at all. Support is tracked for TS >= 7.1.
6.0.3 is the newest version that satisfies guidelines section 2 and keeps the
linter working. Do not raise this pin until typescript-eslint ships TS 7 support
— verified by installing both and running the linter, not by reading changelogs.

Note for whoever upgrades: TypeScript 6 deprecates `baseUrl`. `paths` in
tsconfig resolves relative to the config file without it, so STRUCT-07 path
aliases are unaffected.

## Build sequence — super-modules

Delivery is by page-level vertical slice. These consume the 17 architecture
modules; they do not replace them. Build in order. M0 (foundation) is
folded into M1 by operator decision — same work, reviewed once there is
something on screen.

| # | Super-module | Covers | Architecture refs |
| --- | --- | --- | --- |
| **M1** | **Landing page + foundation** | Scaffold, SSOT registries, typed API client + Zod contracts, MSW harness, RTL-safe layout primitives, design tokens. Then: homepage video with poster-first loading, four sections, newsletter capture, header/footer/nav shell, and the D3 dummy sign-in. | Guidelines §3, §4, §8, §18; arch §28.4 |
| **M2** | **Catalogue** | Listing pages, asymmetric grid, product card, six filters + facet counts + URL state, four sorts, pagination, search with type-ahead | §15, §28.1 |
| **M3** | **Product page** | One route, one shell, buy-box branching on declared `product_type`. Gallery, size guides, sold-out + Notify Me, Fabric Calculator, info sections, you-may-also-like | §12, §25, §28.2 |
| **M4** | **Bag & reservation** | Slide-in panel, per-piece size display, quantity, promo code, free-delivery progress, durable holds with read-time expiry | §16, §7.1, §7.3 |
| **M5** | **Checkout** | Single page, guest checkout, four payment methods, COD cap + SMS confirmation, gift options, order placement | §17, §7.2, §28.2 |
| **M6** | **Real auth & account** *(deferred)* | Registration, sign-in, phone-code, password reset, order history, saved addresses and sizes, wishlist | §11, §28.3 |

## Three properties that shape almost every decision

Named here only so an early structural mistake is not made before the docs are
opened. The rules themselves live in the documents.

1. **A product is `SIMPLE` or `SET`, declared — never inferred by counting
   rows.** A `SET` is one purchasable item made of independently sized,
   independently stocked pieces. §28.2: a `SIMPLE` product shows one size
   selector and nothing else; a `SET` shows the unified selector plus a
   per-piece override panel. One route, one shell, a branching buy-box.
2. **One catalogue, two commercial forms.** Unstitched fabric sells by length,
   stitched garments sell by size. Neither is a special case bolted onto the
   other. Architecture §6.
3. **Reserving a `SET` is an atomic multi-row operation.** Partial reservation
   is a corrupt state. Cart is the only module permitted to orchestrate it
   (§16). This is the central correctness problem of the system (§1.2).

Stock, pricing and promotion rules are server-owned. The frontend renders a
constraint it was told about; it never computes or enforces one. Under D1 the
mocks must honour this — a mock that computes availability client-side teaches
the UI a habit the real backend will not support.

## Working agreements

- Backend is Java and out of scope except at the integration boundary — the
  typed API client (guidelines §8).
- No silent technical debt (`PD-05`). If the correct implementation does not fit
  the task, say so instead of shipping a shortcut.
