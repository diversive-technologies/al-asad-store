# Next.js Coding & Design Guidelines

**Document type:** Normative rulebook (source of truth)
**Applies to:** All Next.js frontend code in this project
**Backend:** Java (REST/JSON) — out of scope for this document except at the integration boundary
**Version:** 1.1
**Status:** BINDING — this is the **only** guidelines document. Any other copy is superseded and MUST be deleted, not kept alongside (`PD-01`).

---

## 0. How This Document Is Used

### 0.1 Audience

This document is written for an **automated code-generation agent** ("the bot") and for human reviewers. It is not a tutorial. It is a specification.

### 0.2 Normative language

| Keyword | Meaning |
| --- | --- |
| **MUST** / **MUST NOT** | Absolute requirement. Violating output is rejected and regenerated. |
| **SHALL** | Synonym for MUST. |
| **SHOULD** | Strong default. Deviation requires an explicit, written justification in the code comment header of the file. |
| **MAY** | Permitted at the bot's discretion. |
| **PROHIBITED** | Absolute ban. No exception exists. No justification is accepted. |

### 0.3 Rule identifiers

Every rule carries a stable ID in the form `DOMAIN-NN` (e.g. `SSOT-03`). The bot MUST cite rule IDs when explaining a design decision or when refusing a request that would violate this document.

### 0.4 Precedence

1. This document.
2. Explicit instructions from the human operator in the current task.
3. Framework/library official documentation.
4. General community convention.

When (2) conflicts with (1), the bot MUST flag the conflict explicitly before generating code, state the rule ID being overridden, and proceed only on confirmation.

### 0.5 Assumptions recorded at authoring time

- Router: **App Router** (`app/`). The Pages Router is PROHIBITED in new code.
- Language: **TypeScript, strict mode**. Plain `.js`/`.jsx` application code is PROHIBITED.
- Styling: **Tailwind CSS as the default; CSS Modules permitted for complex component-local styling** (see §7).
- Data layer: **Centralized typed API client + TanStack Query** for client-side caching, Server Components for initial loads. This was not specified by the operator and is the mandated default until overridden.

### 0.6 Project context

This frontend serves an **ethnic apparel e-commerce platform** for the Pakistani domestic market, backed by a Java service. Four properties of that system are binding on frontend design and appear as rules throughout this document:

| Property | Consequence for the frontend | Rule |
| --- | --- | --- |
| **Bilingual: English and Urdu** | Every layout is direction-agnostic. RTL is not a theme applied late; it is a constraint on every component written from day one. | §18 |
| **Single market, single currency (PKR), single warehouse** | Multi-currency, multi-market, and store-locator abstractions are PROHIBITED. They are not deferred features — the system is not designed for them. | `DATA-11a` |
| **Products are `SIMPLE` or `SET`** | A `SET` is one purchasable item made of independently sized, independently stocked garments. The frontend renders this distinction; it never infers it by counting rows. | `DATA-13` |
| **Stock, pricing and promotion rules are server-owned** | The frontend displays a constraint it was told about. It never computes or enforces one. | `DATA-13` |

> **Note on examples.** Code samples in this document use a generic `invoices` domain. They are illustrative of **structure** — layering, naming, error handling, registry usage — and are not a model of this project's domain. Apply the shape, not the nouns.

### 0.7 Rules with a shelf life

§2 (Technology Baseline) and §12 (Next.js specifics) pin exact versions and name APIs as deprecated or removed. This is the fastest-staling content in the document and the only content that can cause a **false prohibition** — a rule that blocks correct code after an upgrade.

**META-01** — On every major upgrade of Next.js, React, TypeScript, Zod, or TanStack Query, §2 and §12 MUST be re-verified against the official release notes and migration guides, and the "verified as of" line below MUST be updated. Until that is done, the bot MUST treat a §2/§12 version claim that conflicts with observable project code (lockfile, existing source) as **suspect**, surface the conflict, and MUST NOT rewrite working code on the strength of a stale rule alone.

*§2 and §12 verified as of: document authoring. Re-verify before the next major upgrade.*

---

## 1. Prime Directives

These five directives outrank every other section. If a rule elsewhere in this document appears to conflict with a prime directive, the prime directive wins.

| ID | Directive |
| --- | --- |
| **PD-01** | **Single Source of Truth.** Any value, type, string, style token, configuration, or component used in more than one place MUST exist in exactly one authoritative module. Changing that one module MUST propagate the change everywhere. Duplication is a defect, not a style preference. |
| **PD-02** | **Modularity & separation of concerns.** Every file has one reason to change. UI does not fetch. Fetching does not render. Business rules do not import React. |
| **PD-03** | **Explicit over implicit.** Types are declared, boundaries are named, failures are returned as values, dependencies are imported at the top of the file. Nothing is inferred by the reader. |
| **PD-04** | **Scalability by default.** Code is written as if the file count will be 20x larger next year. A pattern that works at 10 files and collapses at 200 is a defect. |
| **PD-05** | **No technical debt shipped knowingly.** If the correct implementation is not possible within the task, the bot MUST say so rather than emit a shortcut. Silent debt is PROHIBITED. |

---

## 2. Technology Baseline (Locked)

The bot MUST target this stack. It MUST NOT introduce an alternative library that duplicates a capability already covered below.

| Concern | Mandated choice | Notes |
| --- | --- | --- |
| Framework | Next.js 16.x (App Router) | Next.js 16.x is the current stable major line. Turbopack is the default bundler. |
| React | React 19.2+ (as shipped by Next.js 16) | |
| Language | TypeScript ≥ 5.1, `strict: true` | Next.js 16 minimum is TS 5.1. |
| Runtime | Node.js ≥ 20.9 (LTS) | Next.js 16 minimum. |
| Styling | Tailwind CSS v4 (primary) + CSS Modules (secondary) | See §7 for the selection rule. |
| Server state | TanStack Query v5 (client) / RSC `fetch` (server) | See §8. |
| Client state | React state → Context → Zustand (in that escalation order) | See §9. |
| Forms | React Hook Form + Zod resolver | See §11. |
| Validation / schemas | Zod 4.x | Single schema source for types and runtime validation. Zod 4 top-level formats (`z.uuid()`, `z.url()`, `z.iso.datetime()`) are used; the deprecated v3 chained forms are PROHIBITED. |
| Middleware | `proxy.ts` | `middleware.ts` is deprecated in Next.js 16. New code MUST use `proxy.ts`. |
| Linting | ESLint (flat config) + `@next/eslint-plugin-next` | `next lint` was removed in Next.js 16; ESLint is invoked directly. |
| Formatting | Prettier (+ `prettier-plugin-tailwindcss`) | Class order is machine-enforced, never hand-sorted. |
| Testing | Vitest + React Testing Library; Playwright for E2E | See §20. |
| Icons | One icon library, centrally re-exported | See `SSOT-08`. |

### 2.1 Adding a dependency

**BASE-01** — The bot MUST NOT add a runtime dependency without stating: the problem it solves, why no existing dependency in §2 solves it, and its bundle cost.
**BASE-02** — A dependency that duplicates a §2 capability is PROHIBITED (e.g. adding Axios alongside the mandated fetch client, adding Redux alongside Zustand, adding styled-components alongside Tailwind).
**BASE-03** — Every third-party dependency MUST be accessed through a project-owned wrapper module when it appears in more than three files (see `SSOT-08`). Direct sprawl of a vendor import across the codebase is PROHIBITED.

---

## 3. Canonical Project Structure

**STRUCT-01** — The bot MUST place every generated file according to this tree. Inventing a new top-level directory is PROHIBITED without operator approval.

```text
.
├── app/                          # Routing layer ONLY. Thin.
│   ├── (marketing)/              # Route groups for layout segmentation
│   ├── (app)/
│   │   └── dashboard/
│   │       ├── page.tsx          # Server Component. Composes features. No business logic.
│   │       ├── layout.tsx
│   │       ├── loading.tsx
│   │       ├── error.tsx         # Client Component error boundary
│   │       └── not-found.tsx
│   ├── api/                      # BFF routes only (proxy/aggregate for the Java backend)
│   ├── layout.tsx                # Root layout
│   └── global-error.tsx
│
├── src/
│   ├── features/                 # Vertical slices. The primary unit of modularity.
│   │   └── invoices/
│   │       ├── components/       # UI private to this feature
│   │       ├── hooks/            # React hooks private to this feature
│   │       ├── api/              # Query/mutation definitions for this feature
│   │       ├── schemas/          # Zod schemas + inferred types
│   │       ├── lib/              # Pure business logic (no React imports)
│   │       ├── types.ts
│   │       └── index.ts          # PUBLIC BARREL — the only legal import path
│   │
│   ├── components/
│   │   ├── ui/                   # Design-system primitives: Button, Input, Dialog…
│   │   ├── layout/               # Header, Sidebar, Shell
│   │   └── shared/               # Cross-feature composites
│   │
│   ├── lib/
│   │   ├── api/
│   │   │   ├── client.ts         # THE single HTTP client (SSOT-05)
│   │   │   ├── endpoints.ts      # THE single endpoint registry (SSOT-04)
│   │   │   ├── query-keys.ts     # THE single query-key registry (SSOT-06)
│   │   │   └── errors.ts         # ApiError model + normalization
│   │   ├── result.ts             # Result<T, E> type + helpers (§10)
│   │   ├── domain/
│   │   │   └── ids.ts            # THE branded identifier registry (TS-12)
│   │   ├── utils/                # Pure, generic, framework-agnostic helpers
│   │   └── vendor/               # Wrappers around third-party libs (BASE-03)
│   │
│   ├── config/
│   │   ├── env.server.ts         # THE server env source — server-only (SSOT-03)
│   │   ├── env.client.ts         # THE client env source — safe to bundle (SSOT-03)
│   │   ├── routes.ts             # THE single route registry (SSOT-02)
│   │   ├── site.ts               # App name, metadata defaults, locale
│   │   └── constants.ts          # Cross-cutting literals
│   │
│   ├── styles/
│   │   ├── globals.css           # Tailwind entry + @theme design tokens (SSOT-01)
│   │   └── *.module.css          # Only when co-location is impossible
│   │
│   ├── hooks/                    # Cross-feature hooks only
│   ├── providers/                # Client-side provider composition
│   ├── types/                    # Cross-cutting/global types
│   └── i18n/
│       ├── messages/             # THE single copy registry — en.ts, ur.ts (SSOT-07)
│       ├── locales.ts            # THE locale list, default & direction map (I18N-03)
│       ├── index.ts              # Server-side locale + message resolver
│       └── use-messages.ts       # Client-side message hook + provider
│
├── public/
├── tests/
│   └── e2e/
├── proxy.ts                      # Next.js 16 replacement for middleware.ts
├── next.config.ts
├── eslint.config.mjs
└── tsconfig.json
```

**STRUCT-02** — `app/` is a **routing layer**. A file under `app/` MUST NOT contain business logic, data-transformation logic, or more than ~50 lines of JSX. It composes; it does not implement.

**STRUCT-03** — Feature code MUST live in `src/features/<feature>/`. A feature is a vertical slice: its UI, hooks, API bindings, schemas, and logic ship together.

**STRUCT-04** — A feature MUST NOT reach into another feature's internals. Cross-feature imports are legal **only** through the target feature's `index.ts` barrel.

```ts
// ❌ PROHIBITED — reaching into another feature's internals
import { InvoiceRow } from '@/features/invoices/components/InvoiceRow';

// ✅ REQUIRED — public barrel only
import { InvoiceRow } from '@/features/invoices';
```

**STRUCT-05** — If two features need the same thing, it does not belong to either feature. Promote it to `src/components/shared/`, `src/lib/`, or `src/hooks/`. Copying it is PROHIBITED (`PD-01`).

**STRUCT-06** — Barrel files (`index.ts`) are permitted **only** at feature roots and at `src/components/ui/`. Barrels elsewhere degrade tree-shaking and are PROHIBITED.

**STRUCT-07** — Path aliases MUST be used. Relative imports that climb more than one level (`../../`) are PROHIBITED.

```jsonc
// tsconfig.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] }
  }
}
```

---

## 4. Single Source of Truth (SSOT) — Mandatory Registries

> **Governing principle (`PD-01`):** if a value appears in two files, it is already a bug. If it appears in twenty, it is an outage waiting for a deadline.

**SSOT-00 — The Rule of Two.** The *second* time a literal, type, style, or component is needed, the bot MUST extract it to a central module and refactor the first usage to consume it. The bot does not wait for a third occurrence.

The following registries are mandatory. Each is the **only** legal place its category of value may be defined.

### 4.1 `SSOT-01` — Design tokens: `src/styles/globals.css`

All colour, spacing, radius, shadow, typography, and z-index values are defined once as Tailwind v4 theme variables. Hard-coded hex codes, rgb values, arbitrary pixel values, and magic z-indexes in components are PROHIBITED.

```css
/* src/styles/globals.css — THE design token source */
@import "tailwindcss";

@theme {
  --color-brand-50:  oklch(0.97 0.02 250);
  --color-brand-500: oklch(0.62 0.19 250);
  --color-brand-600: oklch(0.55 0.19 250);
  --color-danger-500: oklch(0.60 0.22 25);

  /* Semantic surface & text tokens — components reference these, never raw palette
     values, so dark mode is a token swap rather than a per-component edit (STY-09). */
  --color-surface:        oklch(1 0 0);
  --color-surface-muted:  oklch(0.97 0 0);
  --color-surface-strong: oklch(0.93 0 0);
  --color-fg:             oklch(0.21 0.01 250);
  --color-fg-muted:       oklch(0.55 0.01 250);
  --color-on-brand:       oklch(1 0 0);
  --color-border:         oklch(0.90 0.01 250);

  --radius-card: 0.75rem;
  --spacing-gutter: 1.5rem;

  --font-sans: var(--font-inter), ui-sans-serif, system-ui, sans-serif;
}

/* Z-index is not a Tailwind v4 theme namespace, so the scale is exposed as
   explicit utilities. This keeps `z-modal` legal and `z-[1300]` prohibited. */
@utility z-dropdown { z-index: 1000; }
@utility z-modal    { z-index: 1300; }
@utility z-toast    { z-index: 1500; }
```

```tsx
// ❌ PROHIBITED
<div className="bg-[#2563eb] rounded-[12px] z-[1300]" />

// ✅ REQUIRED — token-driven; rebranding is a one-file change
<div className="bg-brand-600 rounded-card z-modal" />
```

### 4.2 `SSOT-02` — Route registry: `src/config/routes.ts`

Hard-coded **internal navigation** URLs in `href`, `router.push()`, or `redirect()` are PROHIBITED. Backend request paths are out of scope here and belong to `SSOT-04`; the two registries never overlap.

```ts
// src/config/routes.ts — THE route source
export const ROUTES = {
  home: '/',
  login: '/login',
  dashboard: '/dashboard',
  invoices: {
    list: '/invoices',
    detail: (id: string) => `/invoices/${id}`,
    edit: (id: string) => `/invoices/${id}/edit`,
  },
} as const;
```

```tsx
// ❌ PROHIBITED
<Link href={`/invoices/${invoice.id}`}>View</Link>

// ✅ REQUIRED
<Link href={ROUTES.invoices.detail(invoice.id)}>View</Link>
```

### 4.3 `SSOT-03` — Environment access: `src/config/env.server.ts` + `src/config/env.client.ts`

Reading `process.env` anywhere except these two files is PROHIBITED. Environment variables MUST be validated at module load so misconfiguration fails at build/boot, not at 3 a.m. in production.

The split is mandatory, not cosmetic: a single module cannot both be `server-only` (`MOD-07`) and be importable by Client Components. Merging them is PROHIBITED.

```ts
// src/config/env.server.ts — THE server env source. Never reaches the browser.
import 'server-only';
import { z } from 'zod';

const serverSchema = z.object({
  JAVA_API_BASE_URL: z.url(),
  JAVA_API_TIMEOUT_MS: z.coerce.number().int().positive().default(10_000),
  NODE_ENV: z.enum(['development', 'test', 'production']),
});

const parsed = serverSchema.safeParse(process.env);
if (!parsed.success) {
  // ERR-06: boot-time configuration invariant, not flow control.
  throw new Error(
    `Invalid server environment: ${parsed.error.issues.map((i) => i.path.join('.')).join(', ')}`,
  );
}

export const serverEnv = parsed.data;
```

```ts
// src/config/env.client.ts — THE client env source. Safe to bundle.
import { z } from 'zod';

const clientSchema = z.object({
  // Referenced statically so the bundler can inline the value.
  NEXT_PUBLIC_APP_URL: z.url(),
});

const parsed = clientSchema.safeParse({
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
});
if (!parsed.success) {
  throw new Error('Invalid client environment'); // ERR-06
}

export const clientEnv = parsed.data;
```

> Note: throwing here is **boot-time configuration validation**, not flow control. It is the one sanctioned throw (see `ERR-06`).

### 4.4 `SSOT-04` — Endpoint registry: `src/lib/api/endpoints.ts`

Every Java backend path is declared once.

```ts
export const ENDPOINTS = {
  invoices: {
    list: '/api/v1/invoices',
    byId: (id: string) => `/api/v1/invoices/${id}`,
  },
  auth: {
    session: '/api/v1/auth/session',
  },
} as const;
```

### 4.5 `SSOT-05` — HTTP client: `src/lib/api/client.ts`

Exactly one module performs network I/O against the Java backend. Raw `fetch()` calls to the backend outside this module are PROHIBITED (`DATA-01`).

### 4.6 `SSOT-06` — Query-key registry: `src/lib/api/query-keys.ts`

Inline TanStack Query keys are PROHIBITED — they silently break invalidation at scale.

```ts
// src/lib/api/query-keys.ts
// Filters are typed structurally, not with a feature type: `lib/` MUST NOT
// import from `features/` (MOD-01).
type QueryFilters = Readonly<Record<string, unknown>>;

export const queryKeys = {
  invoices: {
    all: ['invoices'] as const,
    lists: () => [...queryKeys.invoices.all, 'list'] as const,
    list: (filters: QueryFilters) => [...queryKeys.invoices.lists(), filters] as const,
    details: () => [...queryKeys.invoices.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.invoices.details(), id] as const,
  },
} as const;
```

### 4.7 `SSOT-07` — Copy registry: `src/i18n/messages/`

User-visible strings MUST NOT be embedded in components. All copy — labels, buttons, empty states, error text — resolves from the message registry.

**The registry is resolved by locale at runtime. Importing a specific locale module into a component is PROHIBITED** (`I18N-02`). `import { messages } from '@/i18n/messages/en'` hard-codes English into the component tree and silently defeats this registry; it is the single most common way a bilingual application ends up monolingual.

`en` is the **shape-defining** dictionary. Every other locale is typed against it, so a missing or misspelled Urdu key is a compile error rather than a blank string in production.

```ts
// src/i18n/messages/en.ts — the canonical shape. All other locales conform to it.
export const en = {
  invoices: {
    title: 'Invoices',
    empty: 'No invoices yet.',
    createCta: 'Create invoice',
    referenceLabel: 'Reference',
  },
  errors: {
    network: 'We could not reach the server. Please try again.',
    unauthorized: 'Your session expired. Please sign in again.',
  },
} as const;

export type Messages = typeof en;
```

```ts
// src/i18n/messages/ur.ts — structurally checked against Messages
import type { Messages } from './en';

export const ur: Messages = {
  invoices: {
    title: 'انوائسز',
    empty: 'ابھی کوئی انوائس نہیں۔',
    createCta: 'انوائس بنائیں',
    referenceLabel: 'حوالہ',
  },
  errors: {
    network: 'ہم سرور تک نہیں پہنچ سکے۔ براہِ کرم دوبارہ کوشش کریں۔',
    unauthorized: 'آپ کا سیشن ختم ہو گیا۔ براہِ کرم دوبارہ سائن اِن کریں۔',
  },
};
```

```ts
// src/i18n/index.ts — THE resolver. Server side.
import 'server-only';
import { cookies } from 'next/headers';
import { en, type Messages } from './messages/en';
import { ur } from './messages/ur';
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, type Locale } from './locales';

const DICTIONARIES: Record<Locale, Messages> = { en, ur };

/** NEXT-04: cookies() is async. */
export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const value = store.get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;   // SEC-02: untrusted input, validated
}

export async function getMessages(): Promise<Messages> {
  return DICTIONARIES[await getLocale()];
}
```

```ts
// src/i18n/locales.ts — leaf module, importable from anywhere (MOD-01)
export const LOCALES = ['en', 'ur'] as const;             // TS-10: no enum
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en';
export const LOCALE_COOKIE = 'locale';

/** Direction is derived from locale in exactly one place (I18N-03). */
export const DIRECTION: Record<Locale, 'ltr' | 'rtl'> = { en: 'ltr', ur: 'rtl' };

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}
```

```tsx
// Client Components read the dictionary from a provider, never from an import.
// src/i18n/use-messages.ts
'use client';

import { createContext, useContext } from 'react';
import { en, type Messages } from './messages/en';

const MessagesContext = createContext<Messages>(en);

export const MessagesProvider = MessagesContext.Provider;

export function useMessages(): Messages {
  return useContext(MessagesContext);
}
```

The root layout resolves the locale once, sets `lang`/`dir`, and seeds the provider (`I18N-03`).

### 4.8 `SSOT-08` — Vendor wrappers: `src/lib/vendor/`

A third-party library used in more than three files MUST be re-exported through a project-owned module, so swapping it is a one-file change.

```ts
// src/lib/vendor/icons.ts
export { Check, ChevronDown, Loader2, Plus, Trash2, X } from 'lucide-react';
```

```tsx
// ❌ PROHIBITED — 40 files coupled to a vendor
import { Check } from 'lucide-react';

// ✅ REQUIRED
import { Check } from '@/lib/vendor/icons';
```

### 4.9 `SSOT-09` — Schemas define types

Types MUST be **inferred** from Zod schemas, never hand-declared alongside them. A schema and an interface that describe the same shape are two sources of truth and will drift.

```ts
// src/features/invoices/schemas/invoice.schema.ts
// ✅ REQUIRED — one declaration, two outputs (runtime validator + static type)
import { z } from 'zod';

export const lineItemSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1),
  quantity: z.number().int().positive(),
  unitPriceMinor: z.number().int().nonnegative(),
});
export type LineItem = z.infer<typeof lineItemSchema>;

export const invoiceSchema = z.object({
  id: z.uuid(),
  number: z.string().min(1),
  amountMinor: z.number().int(),
  // DATA-11a: single-currency system. A currency *enum* would model a market
  // structure that does not exist and invite per-currency branching downstream.
  currency: z.literal('PKR'),
  status: z.enum(['DRAFT', 'SENT', 'PAID']),
  issuedAt: z.iso.datetime(),
  dueAt: z.iso.datetime(),
  items: z.array(lineItemSchema),
});
export type Invoice = z.infer<typeof invoiceSchema>;

export const invoiceListSchema = z.array(invoiceSchema);

export const invoiceFiltersSchema = z.object({
  status: z.enum(['ALL', 'DRAFT', 'SENT', 'PAID']).default('ALL'),
  page: z.number().int().positive().default(1),
});
export type InvoiceFilters = z.infer<typeof invoiceFiltersSchema>;

/** SEC-02: search params are untrusted input and are validated, never cast. */
export function parseInvoiceFilters(raw: unknown): InvoiceFilters {
  const parsed = invoiceFiltersSchema.safeParse(raw);
  return parsed.success ? parsed.data : { status: 'ALL', page: 1 };
}
```

```ts
// ❌ PROHIBITED — duplicated shape, guaranteed drift
export interface Invoice { id: string; amountMinor: number; /* ... */ }
export const invoiceSchema = z.object({ id: z.string(), /* ... */ });
```

### 4.10 `SSOT-10` — Variant registry for components

Visual variants MUST be declared once per component using CVA (or an equivalent variant map), never as conditional class soup at call sites.

```ts
// src/components/ui/button/button.variants.ts
import { cva, type VariantProps } from 'class-variance-authority';

export const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-card font-medium transition-colors ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ' +
    'disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-brand-600 text-on-brand hover:bg-brand-500',
        secondary: 'bg-surface-muted text-fg hover:bg-surface-strong',
        destructive: 'bg-danger-500 text-on-brand hover:opacity-90',
        ghost: 'bg-transparent hover:bg-surface-muted',
      },
      size: { sm: 'h-8 px-3 text-sm', md: 'h-10 px-4 text-sm', lg: 'h-12 px-6 text-base' },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export type ButtonVariants = VariantProps<typeof buttonVariants>;
```

### 4.11 SSOT compliance table

| Category | Single source | Rule |
| --- | --- | --- |
| Colours, spacing, radii, z-index, fonts | `src/styles/globals.css` `@theme` | `SSOT-01` |
| URLs / route paths | `src/config/routes.ts` | `SSOT-02` |
| Environment variables | `src/config/env.server.ts` / `env.client.ts` | `SSOT-03` |
| Backend endpoint paths | `src/lib/api/endpoints.ts` | `SSOT-04` |
| Network I/O | `src/lib/api/client.ts` | `SSOT-05` |
| Cache keys | `src/lib/api/query-keys.ts` | `SSOT-06` |
| User-visible copy | `src/i18n/messages/` | `SSOT-07` |
| Third-party libraries | `src/lib/vendor/` | `SSOT-08` |
| Domain types | Zod schema `z.infer` | `SSOT-09` |
| Component variants | `*.variants.ts` (CVA) | `SSOT-10` |
| Locale list, default, direction | `src/i18n/locales.ts` | `I18N-03` |
| Domain identifiers | `src/lib/domain/ids.ts` | `TS-12` |
| Business rules (frontend-owned only) | `src/features/<f>/lib/` | `MOD-04` |
| Business rules (backend-owned) | The Java service — not the frontend | `DATA-13` |
| Reusable UI | `src/components/ui/` | `CMP-02` |

---

## 5. Modularity & Separation of Concerns

**MOD-01 — The layer model.** Dependencies flow in one direction only. An import that points *up* this list is PROHIBITED.

```text
app/ (routing)        ← may import features, components, providers, hooks, lib, config, i18n, types
 └─ features/         ← may import components, hooks, lib, config, i18n, types
      └─ components/  ← may import lib, config, i18n, styles, types
           └─ hooks/, lib/   ← may import config, i18n, types
                └─ config/, i18n/, types/, styles/   ← leaf layers; import nothing project-internal
```

`src/lib/` MUST NOT import from `src/features/`. `src/components/ui/` MUST NOT import from `src/features/`. The leaf layers (`config`, `i18n`, `types`, `styles`) MUST NOT import from any layer above them. Circular imports are PROHIBITED.

**MOD-02 — One responsibility per file.** A file that both fetches data and renders markup violates `PD-02` and MUST be split.

**MOD-03 — File size ceilings.**

| Artifact | Soft limit | Hard limit (MUST split) |
| --- | --- | --- |
| Component file | 150 lines | 250 lines |
| Hook file | 80 lines | 150 lines |
| Utility module | 200 lines | 300 lines |
| Route `page.tsx` | 50 lines | 80 lines |
| Function/hook body | 40 lines | 60 lines |

**MOD-04 — Business logic is React-free.** Pricing rules, eligibility checks, formatting rules, and state machines live in `src/features/<feature>/lib/` as pure functions. These modules MUST NOT import `react`, `next/*`, or any DOM API. This makes them unit-testable without a renderer.

```ts
// src/features/invoices/lib/totals.ts — pure, testable, no React
import type { Invoice, LineItem } from '../schemas/invoice.schema';

export function calculateSubtotalMinor(items: readonly LineItem[]): number {
  return items.reduce((sum, item) => sum + item.unitPriceMinor * item.quantity, 0);
}

export function calculateTaxMinor(subtotalMinor: number, taxRateBps: number): number {
  return Math.round((subtotalMinor * taxRateBps) / 10_000);
}

export function isOverdue(invoice: Invoice, now: Date): boolean {
  return invoice.status !== 'PAID' && new Date(invoice.dueAt) < now;
}
```

**MOD-05 — The three-layer component contract.** Every non-trivial feature screen splits into three artifacts:

1. **Route/Server layer** (`app/.../page.tsx`) — resolves params, calls the data layer, composes.
2. **Container/Hook layer** (`useInvoiceList.ts`) — orchestrates state, queries, mutations, derived values. Returns a plain object. Renders nothing.
3. **Presentational layer** (`InvoiceList.tsx`) — receives props, renders markup. Owns no server state.

```tsx
// 1. Route layer — app/(app)/invoices/page.tsx
import { ErrorState } from '@/components/shared/ErrorState';
import { fetchInvoices, InvoicesScreen, parseInvoiceFilters } from '@/features/invoices';
import { getMessages } from '@/i18n';

export interface InvoicesPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function InvoicesPage({ searchParams }: InvoicesPageProps) {
  const raw = await searchParams;                 // NEXT-03: searchParams is async
  const filters = parseInvoiceFilters(raw);       // SEC-02: validated at the boundary

  // PERF-02: independent reads run in parallel, never as a waterfall.
  const [t, result] = await Promise.all([getMessages(), fetchInvoices(filters)]);

  // ERR-02: the failure path is handled as a value, not caught.
  if (!result.ok) return <ErrorState message={t.errors.network} />;

  return <InvoicesScreen initialInvoices={result.value} />;
}
```

```ts
// 2. Container layer — src/features/invoices/hooks/use-invoice-list.ts
'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/api/query-keys';
import { unwrap } from '@/lib/result';
import { fetchInvoices } from '../api/fetch-invoices';
import { isOverdue } from '../lib/totals';
import type { Invoice, InvoiceFilters } from '../schemas/invoice.schema';

export interface UseInvoiceListResult {
  invoices: readonly Invoice[];
  isFetching: boolean;
  overdueCount: number;
  filters: InvoiceFilters;
  setFilters: (filters: InvoiceFilters) => void;
}

export function useInvoiceList(initialInvoices: readonly Invoice[]): UseInvoiceListResult {
  const [filters, setFilters] = useState<InvoiceFilters>({ status: 'ALL', page: 1 });

  const query = useQuery({
    queryKey: queryKeys.invoices.list(filters),
    // DATA-03a: `unwrap` is the sanctioned Result → rejected-promise adapter.
    queryFn: () => unwrap(fetchInvoices(filters)),
    initialData: [...initialInvoices],
  });

  const overdueCount = useMemo(
    () => query.data.filter((invoice) => isOverdue(invoice, new Date())).length,
    [query.data],
  );

  return {
    invoices: query.data,
    isFetching: query.isFetching,
    overdueCount,
    filters,
    setFilters,
  };
}
```

```tsx
// 3. Presentational layer — src/features/invoices/components/InvoiceList.tsx
'use client';

import { useMessages } from '@/i18n/use-messages';
import type { Invoice } from '../schemas/invoice.schema';
import { InvoiceRow } from './InvoiceRow';

export interface InvoiceListProps {
  invoices: readonly Invoice[];
  isFetching: boolean;
}

export function InvoiceList({ invoices, isFetching }: InvoiceListProps) {
  const t = useMessages();   // SSOT-07: resolved at runtime, never imported per-locale

  if (invoices.length === 0) {
    return <p className="text-fg-muted">{t.invoices.empty}</p>;
  }

  return (
    <ul aria-busy={isFetching} className="divide-y divide-border">
      {invoices.map((invoice) => (
        <InvoiceRow key={invoice.id} invoice={invoice} />
      ))}
    </ul>
  );
}
```

**MOD-06 — Server/Client boundary is deliberate.** `'use client'` MUST be placed on the smallest possible leaf, never on a layout or page merely because a descendant needs interactivity. Pushing `'use client'` upward to avoid thinking about the boundary is PROHIBITED.

**MOD-07 — Server-only modules MUST be marked.** Any module that touches secrets, `serverEnv`, or the database/backend directly MUST begin with `import 'server-only';` so accidental client import fails at build time.

---

## 6. Component Rules

### 6.1 Declaration

**CMP-01 — No nested / inline component declarations. PROHIBITED.**
A component MUST NOT be declared inside the body of another component, inside a hook, inside a loop, or inside a conditional. Every render of the parent creates a new component *type*, which forces React to unmount and remount the entire subtree — destroying state, refs, focus, scroll position, and animation, and defeating memoization.

```tsx
// ❌ PROHIBITED — component declared inside a component
export function InvoicePanel({ invoice }: InvoicePanelProps) {
  function Header() {                       // new type every render
    return <h2 className="text-lg font-semibold">{invoice.number}</h2>;
  }
  const Row = ({ item }: { item: LineItem }) => <li>{item.name}</li>;   // also prohibited

  return (
    <section>
      <Header />
      <ul>{invoice.items.map((i) => <Row key={i.id} item={i} />)}</ul>
    </section>
  );
}
```

```tsx
// ✅ REQUIRED — siblings at module scope, one component per file
// src/features/invoices/components/InvoicePanelHeader.tsx
export interface InvoicePanelHeaderProps { number: string }

export function InvoicePanelHeader({ number }: InvoicePanelHeaderProps) {
  return <h2 className="text-lg font-semibold">{number}</h2>;
}

// src/features/invoices/components/InvoicePanel.tsx
import { InvoicePanelHeader } from './InvoicePanelHeader';
import { InvoiceLineItem } from './InvoiceLineItem';

export function InvoicePanel({ invoice }: InvoicePanelProps) {
  return (
    <section>
      <InvoicePanelHeader number={invoice.number} />
      <ul>
        {invoice.items.map((item) => (
          <InvoiceLineItem key={item.id} item={item} />
        ))}
      </ul>
    </section>
  );
}
```

**CMP-01a** — The same ban applies to *any* component-returning value created during render: inline HOCs, `useMemo(() => (props) => <X />)`, and component factories called in render bodies are all PROHIBITED. A render-prop function returning JSX (not a component type) is permitted, but a named child component is preferred.

**CMP-02 — One exported component per file.** The file name matches the component name. Tiny, tightly-coupled sub-components MAY share a file only if they are not exported and total under 40 lines; the moment a second file needs one, it moves to its own file (`SSOT-00`).

**CMP-03 — Function declarations, named exports.** `export function Foo() {}`. Default exports are PROHIBITED except where Next.js requires them: `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `global-error.tsx`, `not-found.tsx`, `default.tsx`, `template.tsx`, `next.config.ts`, and `proxy.ts`. Note that Route Handlers (`route.ts`) require **named** HTTP-method exports (`export async function GET`) — a default export there is not a route at all. Default exports break rename-safe refactors and grep-ability.

**CMP-04 — Props are a named, exported interface.** Inline prop type literals in the signature are PROHIBITED beyond one trivially-typed prop. This applies to Next.js route files too: `page.tsx` and `layout.tsx` declare and export a named props interface (or use the framework-generated `PageProps` helper) rather than an inline literal.

```tsx
// ✅ REQUIRED
export interface InvoiceRowProps {
  invoice: Invoice;
  onSelect?: (id: string) => void;
  className?: string;
}

export function InvoiceRow({ invoice, onSelect, className }: InvoiceRowProps) { /* … */ }
```

**CMP-05 — `React.FC` is PROHIBITED.** Type the props parameter directly.

**CMP-06 — Prop count ceiling.** More than 7 props means the component has more than one responsibility. Split it, or group related props into a typed object.

**CMP-07 — Boolean prop explosion is PROHIBITED.** `isPrimary` + `isSecondary` + `isDanger` MUST be a single `variant` union backed by `SSOT-10`.

**CMP-08 — Composition over configuration.** Prefer `children` and slot props over a growing configuration object. A component with a `config` prop containing more than three keys is a design smell.

**CMP-09 — Presentational components own no server state.** They receive data via props. Calling `useQuery` inside a component under `components/ui/` is PROHIBITED.

**CMP-10 — Every list item MUST have a stable, domain-derived `key`.** `key={index}` is PROHIBITED except for static, never-reordered, never-filtered literal arrays.

**CMP-11 — Conditional rendering uses ternaries or early returns.** `&&` with a possibly-numeric left operand is PROHIBITED (`{count && <X/>}` renders a literal `0`). Use `{count > 0 ? <X/> : null}`.

**CMP-12 — `className` passthrough.** Every reusable UI primitive MUST accept an optional `className` and merge it last via the `cn()` helper, so consumers can adjust layout without forking the component.

```ts
// src/lib/utils/cn.ts — THE class-merge helper
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
```

**CMP-13 — `dangerouslySetInnerHTML` is PROHIBITED** unless the content is sanitized in a dedicated, reviewed module and the call site carries a `// SECURITY:` comment explaining the source and sanitizer.

**CMP-14 — Reference implementation of a UI primitive:**

```tsx
// src/components/ui/button/Button.tsx
import type { ButtonHTMLAttributes, Ref } from 'react';
import { cn } from '@/lib/utils/cn';
import { Loader2 } from '@/lib/vendor/icons';
import { buttonVariants, type ButtonVariants } from './button.variants';

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    ButtonVariants {
  isLoading?: boolean;
  /** React 19 passes `ref` as an ordinary prop; `forwardRef` is deprecated. */
  ref?: Ref<HTMLButtonElement>;
}

export function Button({
  ref,
  className,
  variant,
  size,
  isLoading = false,
  disabled,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || isLoading}
      aria-busy={isLoading}
      {...rest}
    >
      {/* I18N-04: logical `me-2`, not physical `mr-2` — the spinner sits before the
          label in both directions. */}
      {isLoading ? <Loader2 className="me-2 h-4 w-4 animate-spin" aria-hidden /> : null}
      {children}
    </button>
  );
}
```

---

## 7. Styling Rules

### 7.1 Selection rule (which tool, when)

**STY-00** — The bot MUST apply this decision order and MUST NOT mix approaches arbitrarily:

1. **Tailwind utility classes** — the default for all layout, spacing, typography, colour, and state styling. Used unless (2) applies.
2. **CSS Modules** (`Component.module.css`, co-located with the component) — permitted only for genuinely complex component-local styling that Tailwind expresses poorly: multi-step `@keyframes`, complex `grid-template-areas`, deep descendant selectors over third-party markup, `@container` query blocks, or pseudo-element art. The module MUST consume the design tokens from `SSOT-01` via `var(--color-…)`; it MUST NOT declare its own colour or spacing literals.
3. **Global CSS** (`globals.css`) — reserved for the Tailwind import, the `@theme` token block, base element resets, and font-face declarations. Nothing else.

A single component MAY use Tailwind for layout and a CSS Module for one complex behaviour. It MUST NOT reimplement in a module what Tailwind already provides.

### 7.2 Prohibitions

**STY-01 — Inline CSS is PROHIBITED.** The `style` prop MUST NOT appear in generated code. It bypasses the design system, defeats cascade and specificity control, cannot be linted for token compliance, cannot express `:hover`/`:focus`/media/container queries, inflates HTML payload, and requires a CSP `style-src 'unsafe-inline'` relaxation.

```tsx
// ❌ PROHIBITED
<div style={{ display: 'flex', gap: 12, backgroundColor: '#f8fafc', padding: '1rem' }} />
<span style={{ color: isError ? 'red' : 'black' }}>{label}</span>

// ✅ REQUIRED
<div className="flex gap-3 bg-surface-muted p-4" />
<span className={cn(isError ? 'text-danger-500' : 'text-fg')}>{label}</span>
```

**STY-01a — The sole exception:** a genuinely dynamic, unbounded numeric value that cannot be enumerated at build time (a computed chart bar height, a virtualized-list transform, a drag offset). It MUST be expressed as a **CSS custom property**, never as a full style declaration, and MUST carry a justification comment.

```tsx
// ✅ PERMITTED under STY-01a — runtime-only value, passed as a token
// Justification: progress is a continuous 0–100 runtime value; not enumerable as a utility class.
<div
  className={styles.progressBar}
  style={{ '--progress': `${percent}%` } as CSSProperties}
/>
```

```css
/* ProgressBar.module.css */
.progressBar::after {
  inline-size: var(--progress);
  background-color: var(--color-brand-600);
}
```

**STY-02 — Arbitrary-value Tailwind classes are PROHIBITED** when a token exists. `bg-[#2563eb]`, `p-[13px]`, `z-[999]`, `text-[15px]` all violate `SSOT-01`. If a value is genuinely needed, add it to `@theme` first.

**STY-03 — CSS-in-JS runtime libraries are PROHIBITED** (styled-components, Emotion, and equivalents). They conflict with React Server Components and add runtime cost.

**STY-04 — `!important` is PROHIBITED**, including Tailwind v4's trailing important modifier (`bg-brand-600!`). Specificity conflicts indicate a structural problem; fix the structure.

**STY-05 — Global element selectors outside `globals.css` are PROHIBITED.** A CSS Module MUST NOT contain `:global(...)` blocks that target application markup.

**STY-06 — Class strings are never hand-sorted.** `prettier-plugin-tailwindcss` owns class order.

**STY-07 — Conditional classes go through `cn()`** (`CMP-12`). Manual string concatenation and template-literal class building are PROHIBITED — they produce conflicting utilities that Tailwind cannot resolve deterministically.

```tsx
// ❌ PROHIBITED
<div className={'card ' + (active ? 'border-brand-600 ' : '') + size} />

// ✅ REQUIRED
<div className={cn('card', active && 'border-brand-600', size)} />
```

**STY-08 — Responsive design is mobile-first.** Base utilities describe the smallest viewport; `sm:`/`md:`/`lg:` add up. Desktop-first `max-*` variants are permitted only for genuine exceptions.

**STY-09 — Dark mode uses token redefinition, not per-component `dark:` sprawl.** Semantic tokens (`--color-surface`, `--color-text-primary`) are redefined once for the dark scheme; components reference the semantic token and stay theme-agnostic.

**STY-10 — Every interactive element MUST have visible `:focus-visible` styling.** Removing focus outlines without an equivalent replacement is PROHIBITED.

---

## 8. Data Layer — Java Backend Integration

**DATA-01 — All backend I/O flows through `src/lib/api/client.ts` (`SSOT-05`).** A raw `fetch()` to the Java backend anywhere else is PROHIBITED. This guarantees one place for base URL, auth headers, timeouts, tracing headers, retry policy, and error normalization.

**DATA-02 — Every backend response MUST be validated at the boundary with its Zod schema.** Trusting the wire shape and casting with `as` is PROHIBITED. A Java DTO change must surface as a typed, handled failure — not as `undefined is not a function` in production.

**DATA-03 — The client returns a `Result`, never throws** (see §10).

**DATA-03a — The TanStack Query bridge.** TanStack Query signals failure only through a rejected promise, so a `queryFn`/`mutationFn` that returns a `Result` would report every 4xx/5xx as a success. The single sanctioned adapter is the `unwrap` helper in `src/lib/result.ts`, used **only** inside `queryFn`/`mutationFn`. Everywhere else — Server Components, Server Actions, Route Handlers, pure logic — the `Result` is consumed as a value (`ERR-02`). Writing a bespoke `if (!r.ok) throw r.error` at a call site is PROHIBITED; use `unwrap`.

```ts
// src/lib/api/client.ts — THE HTTP client
import 'server-only';
import { z } from 'zod';
import { serverEnv } from '@/config/env.server';
import { type Result, ok, err } from '@/lib/result';
import { type ApiError, toApiError, fromHttpStatus } from './errors';

interface RequestOptions<TSchema extends z.ZodType> {
  path: string;
  schema: TSchema;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  searchParams?: Record<string, string | number | boolean | undefined>;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  /** DATA-09: caching intent is mandatory. Use `{ revalidate: 0 }` for fully dynamic reads. */
  next: { revalidate?: number; tags?: string[] };
}

function buildUrl(path: string, params?: RequestOptions<z.ZodType>['searchParams']): string {
  const url = new URL(path, serverEnv.JAVA_API_BASE_URL);
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }
  return url.toString();
}

export async function apiRequest<TSchema extends z.ZodType>(
  options: RequestOptions<TSchema>,
): Promise<Result<z.infer<TSchema>, ApiError>> {
  const { path, schema, method = 'GET', body, searchParams, headers, signal, next } = options;

  const timeout = AbortSignal.timeout(serverEnv.JAVA_API_TIMEOUT_MS);

  // ERR-05(1): fetch signals transport failure only by rejecting.
  // The rejection is converted to a Result here and never propagates as a throw.
  const response = await fetch(buildUrl(path, searchParams), {
    method,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    next,
  }).then<Response | ApiError>(
    (res) => res,
    (cause: unknown) => toApiError(cause),
  );

  if (!(response instanceof Response)) return err(response);
  if (!response.ok) return err(await fromHttpStatus(response));

  const payload: unknown = response.status === 204 ? null : await response.json();
  const parsed = schema.safeParse(payload);

  if (!parsed.success) {
    return err({
      kind: 'CONTRACT_VIOLATION',
      message: 'Backend response did not match the expected schema.',
      issues: parsed.error.issues,
      path,
    });
  }

  return ok(parsed.data);
}
```

**DATA-04 — Feature API modules are thin, typed wrappers over the client.** They live at `src/features/<feature>/api/` and expose one function per operation.

```ts
// src/features/invoices/api/fetch-invoices.ts
import type { ApiError } from '@/lib/api/errors';
import { apiRequest } from '@/lib/api/client';
import { ENDPOINTS } from '@/lib/api/endpoints';
import type { Result } from '@/lib/result';
import { invoiceListSchema, type Invoice, type InvoiceFilters } from '../schemas/invoice.schema';

export function fetchInvoices(
  filters: InvoiceFilters,
): Promise<Result<Invoice[], ApiError>> {
  return apiRequest({
    path: ENDPOINTS.invoices.list,
    schema: invoiceListSchema,
    searchParams: { status: filters.status, page: filters.page },
    next: { tags: ['invoices'] },
  });
}
```

**DATA-05 — Server Components fetch directly; Client Components use TanStack Query.** Fetching in a `useEffect` is PROHIBITED — it produces waterfalls, no caching, no deduplication, and race conditions.

```tsx
// ❌ PROHIBITED
useEffect(() => {
  fetch('/api/v1/invoices').then((r) => r.json()).then(setInvoices);
}, []);
```

**DATA-06 — Mutations MUST invalidate or update the affected query keys** from `SSOT-06`. A mutation that leaves the cache stale is a defect.

**DATA-07 — Secrets never reach the client.** Backend credentials, service tokens, and internal URLs MUST be used only in Server Components, Route Handlers, Server Actions, or `proxy.ts`. Prefixing a secret with `NEXT_PUBLIC_` is PROHIBITED.

**DATA-08 — Route Handlers under `app/api/` are a BFF, not a second backend.** They may proxy, aggregate, or attach credentials. They MUST NOT contain domain business logic that belongs in Java.

**DATA-09 — Caching is explicit.** In Next.js 16, dynamic code executes at request time by default and caching is opt-in. The bot MUST state the caching intent for every read: `next: { tags, revalidate }`, or `'use cache'` with a `cacheLife` profile where Cache Components are enabled. Unstated caching intent is PROHIBITED.

**DATA-10 — Invalidation API selection (Next.js 16):**

| Situation | API |
| --- | --- |
| Background revalidation of tagged content (SWR) | `revalidateTag(tag, 'max')` — the `cacheLife` profile argument is required |
| Server Action where the user must immediately see their own write | `updateTag(tag)` |
| Refresh uncached data after an action | `refresh()` |

Calling `revalidateTag(tag)` with a single argument is deprecated and PROHIBITED in new code.

**DATA-11 — Money is handled in minor units as integers.** Floating-point currency arithmetic in the frontend is PROHIBITED. Formatting happens once, in a shared formatter in `src/lib/utils/`.

**DATA-11a — Single currency, single market, single warehouse.** The system serves one market in one currency (PKR) from one warehouse (§0.6). Currency selectors, exchange-rate handling, market switching, per-market pricing, and store-locator abstractions are PROHIBITED. These are not deferred features; introducing them speculatively adds branching that will never be exercised and that misrepresents the system's scope. Money is formatted once, by the shared formatter, using the locale from `SSOT-07` and the fixed currency from `config/constants.ts`.

**DATA-12 — Dates cross the wire as ISO-8601 strings** and are parsed at the boundary. Locale formatting happens in one shared formatter module (`SSOT-00`).

**DATA-13 — Backend-owned business rules MUST NOT be reimplemented on the frontend.** The Java service is authoritative for stock and reservation, pricing, promotion eligibility, delivery-charge and Cash-on-Delivery limits, order-status transitions, and returns/cancellation windows. The frontend **displays** a constraint the backend reported; it never **computes or enforces** one.

This is the rule that keeps `PD-01` true across the stack boundary: a threshold copied into the frontend is a second source of truth that drifts the first time the operator changes it in the admin panel.

```tsx
// ❌ PROHIBITED — a server rule reimplemented in the client. It will drift, and it
//    is not enforcement: anyone can post the order anyway.
const COD_CAP_MINOR = 1_500_000;
const codAvailable = cartTotalMinor <= COD_CAP_MINOR;

// ❌ PROHIBITED — deriving product type by counting, rather than reading the
//    declared type. A single-piece SET is not a SIMPLE product.
const isSet = product.pieces.length > 1;

// ✅ REQUIRED — the backend states availability and the reason; the UI renders it
const { availableMethods, unavailableReasons } = checkout.paymentOptions;
const isSet = product.type === 'SET';               // declared, not inferred
```

**DATA-13a — Composite products are rendered from the declared type.** A product is `SIMPLE` or `SET` because the catalogue says so, never because a collection length was measured. A `SET` has independently sized and independently stocked pieces: per-piece size selection and per-piece availability MUST be rendered from the pieces the backend returns, and a partially available `SET` MUST surface exactly what the backend reports as unavailable. Presenting a `SET` as purchasable when any required piece is unavailable is PROHIBITED.

---

## 9. State Management

**STATE-01 — Escalation ladder.** The bot MUST choose the *lowest* rung that solves the problem and MUST justify any climb.

1. Derive it (compute during render from existing props/state).
2. `useState` / `useReducer` in the owning component.
3. Lift to the nearest common ancestor.
4. URL state (`searchParams`) — for anything shareable, bookmarkable, or back-button-relevant: filters, tabs, pagination, search terms.
5. React Context — for low-frequency, app-wide concerns (theme, locale, session).
6. Zustand store — only for genuinely global, frequently-updating client state.

**STATE-02 — Server state is not client state.** Data owned by the Java backend MUST live in TanStack Query (or RSC), never mirrored into `useState`, Context, or Zustand. Copying fetched data into local state is PROHIBITED — it creates a second source of truth (`PD-01`).

**STATE-03 — Derived values are computed, never stored.** A `useState` whose value is always recomputable from other state is PROHIBITED.

```ts
// ❌ PROHIBITED — duplicate source of truth kept in sync by hand
const [items, setItems] = useState<Item[]>([]);
const [total, setTotal] = useState(0);
useEffect(() => { setTotal(items.reduce((s, i) => s + i.price, 0)); }, [items]);

// ✅ REQUIRED
const total = useMemo(() => items.reduce((sum, item) => sum + item.price, 0), [items]);
```

**STATE-04 — `useEffect` is for synchronizing with external systems only** (subscriptions, DOM measurement, browser APIs, analytics). Using it to transform state, react to prop changes, or fetch data is PROHIBITED. If the bot writes a `useEffect`, it MUST name the external system in a comment.

**STATE-05 — Context providers are split by update frequency.** A single mega-context re-renders every consumer. Separate stable values from volatile ones.

**STATE-06 — Zustand stores are sliced and selector-based.** Components MUST subscribe with a selector (`useStore((s) => s.field)`), never destructure the whole store.

**STATE-07 — Global state MUST NOT hold what the URL should hold.** Filter/tab/pagination state in a global store is PROHIBITED (see `STATE-01` rung 4).

---

## 10. Error Handling & Control Flow

> **Governing principle:** exceptions model *exceptional*, unrecoverable conditions. Expected outcomes — a validation failure, a 404, an empty result, an expired session — are **ordinary business states** and MUST be represented in the type system, not thrown.

**ERR-01 — Using `try/catch` for flow control is PROHIBITED.**
A `try/catch` MUST NOT be used to branch application logic, to substitute a default value, to detect a "not found", to validate input, or to decide what to render. Exceptions as flow control are invisible to the type checker, unwind the stack past intermediate logic, are expensive, and hide the failure path from every reader and every reviewer.

```ts
// ❌ PROHIBITED — exception used as an if-statement
async function getInvoice(id: string): Promise<Invoice | null> {
  try {
    const res = await fetch(`/api/v1/invoices/${id}`);
    return await res.json();
  } catch {
    return null;                 // which failure? network? parse? 404? unknowable.
  }
}

// ❌ PROHIBITED — exception used to test a value
function parseAmount(raw: string): number {
  try {
    return JSON.parse(raw).amount;
  } catch {
    return 0;                    // silently swallows a real contract violation
  }
}
```

**ERR-02 — Expected failures MUST be returned as values using the project `Result` type.**

```ts
// src/lib/result.ts — THE result type
export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

export function isOk<T, E>(result: Result<T, E>): result is { ok: true; value: T } {
  return result.ok;
}

/** Maps the success channel, leaving the error channel untouched. */
export function mapResult<T, U, E>(result: Result<T, E>, fn: (value: T) => U): Result<U, E> {
  return result.ok ? ok(fn(result.value)) : result;
}

/**
 * DATA-03a / ERR-05(4): the ONLY sanctioned Result → rejected-promise adapter.
 * TanStack Query detects failure exclusively via a rejected promise, so a
 * `queryFn`/`mutationFn` must reject. Use nowhere else.
 */
export async function unwrap<T, E>(promise: Promise<Result<T, E>>): Promise<T> {
  const result = await promise;
  if (result.ok) return result.value;
  throw result.error;
}
```

```ts
// ✅ REQUIRED — the failure path is part of the signature and the compiler enforces handling
export async function getInvoice(id: string): Promise<Result<Invoice, ApiError>> {
  return apiRequest({
    path: ENDPOINTS.invoices.byId(id),
    schema: invoiceSchema,
    next: { tags: ['invoices', `invoice:${id}`] },   // DATA-09: intent is always stated
  });
}
```

```tsx
// ✅ Consuming a Result — explicit, typed, every branch terminates
const [t, result] = await Promise.all([getMessages(), getInvoice(id)]);   // PERF-02

if (!result.ok) {
  switch (result.error.kind) {
    case 'NOT_FOUND':
      return notFound();                             // ERR-06: framework control-flow signal
    case 'UNAUTHORIZED':
      return redirect(ROUTES.login);                 // ERR-06
    default:
      // TS-07 exception: deliberate total fallback over an open error union.
      return <ErrorState message={t.errors.network} />;
  }
}

return <InvoiceDetail invoice={result.value} />;
```

**ERR-03 — Error kinds are a discriminated union, declared once.**

```ts
// src/lib/api/errors.ts
export type ApiError =
  | { kind: 'NETWORK'; message: string }
  | { kind: 'TIMEOUT'; message: string }
  | { kind: 'UNAUTHORIZED'; message: string }
  | { kind: 'FORBIDDEN'; message: string }
  | { kind: 'NOT_FOUND'; message: string; resource?: string }
  | { kind: 'VALIDATION'; message: string; fieldErrors: Record<string, string[]> }
  | { kind: 'CONFLICT'; message: string }
  | { kind: 'CONTRACT_VIOLATION'; message: string; issues: unknown; path: string }
  | { kind: 'SERVER'; message: string; status: number };
```

**ERR-04 — Prefer non-throwing APIs.** Where a library offers a non-throwing variant, the bot MUST use it: `schema.safeParse()` over `schema.parse()`; `Number.parseFloat` + `Number.isNaN` guard over `JSON.parse` in a `try`; optional chaining and `??` over defensive `try`.

**ERR-05 — Where `try/catch` IS permitted.** Exactly three cases, each requiring a comment naming the case:

1. **Adapting a third-party API that only signals failure by throwing**, at the boundary module that owns it — and it MUST immediately convert the throw into a `Result`. It MUST NOT propagate.
2. **A top-level process guard** (Route Handler outer shell, `global-error.tsx`, instrumentation hook) whose sole job is to log and return a safe response.
3. **Resource cleanup via `try/finally`** with no `catch` clause.
4. **The `unwrap` helper in `src/lib/result.ts`** (`DATA-03a`), which converts a `Result` into the rejected promise TanStack Query requires. This is a single, named, project-owned adapter — not a pattern to reproduce elsewhere.

```ts
// ✅ PERMITTED under ERR-05(1) — boundary adaptation, immediately converted to a Result
export async function readClipboardText(): Promise<Result<string, ClipboardError>> {
  // ERR-05(1): the Clipboard API signals denial only by rejecting.
  try {
    return ok(await navigator.clipboard.readText());
  } catch {
    return err({ kind: 'CLIPBOARD_DENIED', message: 'Clipboard permission was denied.' });
  }
}
```

**ERR-06 — Throwing IS correct for programmer errors and unrecoverable invariants:** invalid environment at boot (`SSOT-03`), a violated internal invariant that indicates a bug, and Next.js control-flow primitives (`notFound()`, `redirect()`, `unauthorized()`), which are framework signals rather than error handling. These MUST NOT be caught by feature code.

**ERR-07 — Empty `catch` blocks are PROHIBITED.** Swallowing an error without logging or converting it is never acceptable.

**ERR-08 — `catch (e: any)` is PROHIBITED.** Caught values are `unknown` and MUST be narrowed before use.

**ERR-09 — Every route segment that fetches MUST have `error.tsx` and `loading.tsx`.** `error.tsx` is a Client Component, receives `{ error, reset }`, renders copy from `SSOT-07`, and MUST NOT display raw error messages or stack traces to end users.

**ERR-10 — Errors are logged once, at the boundary that handles them.** Log-and-rethrow produces duplicate noise and is PROHIBITED.

**ERR-11 — User-facing error copy comes from `SSOT-07`.** Rendering a backend `message` field directly is PROHIBITED: it leaks internals and is untranslatable.

---

## 11. Forms & Validation

**FORM-01 — One Zod schema per form, and it is the source of truth** for both client validation and the inferred TypeScript type (`SSOT-09`).

**FORM-02 — React Hook Form + `zodResolver`.** Hand-rolled `useState`-per-field forms are PROHIBITED beyond a single-input search box.

**FORM-03 — Client validation never replaces server validation.** The Java backend remains authoritative; client validation is a UX affordance only.

**FORM-04 — Server-returned field errors MUST map back onto form fields** via the `VALIDATION` error kind's `fieldErrors` map (`ERR-03`), using `setError`. Dumping a generic toast when the server returned per-field detail is PROHIBITED.

**FORM-05 — Every input MUST have a programmatically associated `<label>`**; `aria-invalid` and `aria-describedby` MUST be wired to the error message element.

**FORM-06 — Submit buttons MUST be disabled and `aria-busy` while in flight**, and double-submission MUST be impossible.

```tsx
// src/features/invoices/components/InvoiceForm.tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button/Button';
import { useMessages } from '@/i18n/use-messages';
import type { ApiError } from '@/lib/api/errors';
import { createInvoiceSchema, type CreateInvoiceInput } from '../schemas/invoice.schema';
import { useCreateInvoice } from '../hooks/use-create-invoice';

export function InvoiceForm() {
  const t = useMessages();
  const { mutate, isPending } = useCreateInvoice();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<CreateInvoiceInput>({ resolver: zodResolver(createInvoiceSchema) });

  function handleFailure(error: ApiError): void {
    if (error.kind !== 'VALIDATION') {
      setError('root', { message: t.errors.network });   // ERR-11
      return;
    }
    for (const [field, fieldMessages] of Object.entries(error.fieldErrors)) {
      const [first] = fieldMessages;                  // TS-01: noUncheckedIndexedAccess
      if (!first) continue;
      // TS-03(4): re-narrowing an Object.entries key back to the source union.
      setError(field as keyof CreateInvoiceInput, { message: first });
    }
  }

  function onSubmit(input: CreateInvoiceInput): void {
    // DATA-03a: the mutation rejects with an ApiError; onError is the failure channel.
    mutate(input, { onError: handleFailure });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-1">
        <label htmlFor="reference" className="text-sm font-medium">
          {t.invoices.referenceLabel}
        </label>
        <input
          id="reference"
          className="h-10 rounded-card border border-border px-3"
          aria-invalid={Boolean(errors.reference)}
          aria-describedby={errors.reference ? 'reference-error' : undefined}
          {...register('reference')}
        />
        {errors.reference ? (
          <p id="reference-error" role="alert" className="text-sm text-danger-500">
            {errors.reference.message}
          </p>
        ) : null}
      </div>

      <Button type="submit" isLoading={isPending}>
        {t.invoices.createCta}
      </Button>
    </form>
  );
}
```

---

## 12. Routing, Rendering & Next.js 16 Specifics

**NEXT-01 — App Router only.** New `pages/` files are PROHIBITED.

**NEXT-02 — Server Components are the default.** `'use client'` is added only when the file needs state, effects, browser APIs, or event handlers — and then at the smallest leaf (`MOD-06`).

**NEXT-03 — `params` and `searchParams` are Promises and MUST be awaited.** Synchronous access was removed in Next.js 16.

```tsx
export default async function InvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  /* … */
}
```

**NEXT-04 — `cookies()`, `headers()`, and `draftMode()` are async and MUST be awaited.**

**NEXT-05 — Middleware is `proxy.ts`.** New `middleware.ts` files are PROHIBITED. `proxy.ts` runs on the Node.js runtime; the exported function is named `proxy`.

**NEXT-06 — `proxy.ts` handles only cross-cutting request concerns** — auth gating, redirects, locale, headers. Business logic and data fetching in the proxy are PROHIBITED.

**NEXT-07 — Every parallel-route slot MUST have an explicit `default.tsx`.** Builds fail without it in Next.js 16.

**NEXT-08 — Navigation uses `next/link` and `useRouter`.** Raw `<a>` tags for internal routes and `window.location` assignments are PROHIBITED.

**NEXT-09 — Images use `next/image` with explicit `width`/`height` (or `fill` with a positioned parent) and a meaningful `alt`.** Decorative images use `alt=""`. Remote hosts are declared in `images.remotePatterns`; the deprecated `images.domains` is PROHIBITED.

**NEXT-10 — Fonts use `next/font`.** Third-party font `<link>` tags are PROHIBITED.

**NEXT-11 — Metadata is exported, not injected.** Use the `metadata` object or `generateMetadata`; manual `<head>` manipulation is PROHIBITED. Shared defaults live in `src/config/site.ts` (`SSOT-00`).

**NEXT-12 — Server Actions MUST validate their input with Zod and MUST return a `Result`.** An unvalidated Server Action is a public, unauthenticated endpoint. Every action MUST also re-check authorization server-side — client-side gating is not security.

**NEXT-13 — Streaming is used deliberately.** Slow, non-critical sections are wrapped in `<Suspense>` with a meaningful fallback rather than blocking the whole route.

**NEXT-14 — `loading.tsx` skeletons MUST approximate final layout dimensions** to avoid cumulative layout shift.

---

## 13. TypeScript Rules

**TS-01 — `strict: true`**, plus `noUncheckedIndexedAccess`, `noImplicitOverride`, `exactOptionalPropertyTypes`, and `verbatimModuleSyntax`.

**TS-02 — `any` is PROHIBITED.** Use `unknown` and narrow. If a third-party type is genuinely unavailable, declare a local `interface` in `src/types/` with a comment naming the library and version.

**TS-03 — Type assertions (`as`) are PROHIBITED** except for these four cases:

1. `as const`.
2. Narrowing a validated `unknown` immediately after a successful schema parse.
3. DOM element casts that cannot be expressed otherwise.
4. Re-narrowing `Object.entries()` / `Object.keys()` results back to the source key union, and attaching CSS custom properties to a `style` object under `STY-01a` — both are TypeScript modelling gaps, not design shortcuts, and each MUST carry an inline comment naming this exception.

`as unknown as T` is PROHIBITED without exception.

**TS-04 — `@ts-ignore` is PROHIBITED.** `@ts-expect-error` is permitted only with an adjacent comment explaining the reason and the removal condition.

**TS-05 — Non-null assertion (`!`) is PROHIBITED.** Narrow explicitly or return early.

**TS-06 — Discriminated unions over optional-property soup.** Model mutually exclusive states as a union with a `kind`/`status` discriminant, so impossible states are unrepresentable.

```ts
// ❌ PROHIBITED — permits { isLoading: true, data: X, error: Y }
interface State { isLoading: boolean; data?: Invoice; error?: string }

// ✅ REQUIRED
type State =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: Invoice }
  | { status: 'failure'; error: ApiError };
```

**TS-07 — Exhaustive switches.** Every `switch` over a **closed domain union** (status, variant, state kind) MUST have a `default` branch that calls `assertNever`, so adding a variant becomes a compile error. Every non-default branch MUST terminate (`return`/`throw`); implicit fall-through is PROHIBITED.

*Exception:* a switch over an **open-ended error union** (`ApiError`) MAY use a deliberate total fallback in `default` — a user-facing error state must never crash on an unrecognised kind. Such a `default` MUST carry a `// TS-07 exception: deliberate total fallback` comment.

```ts
function assertNever(value: never): never {
  throw new Error(`Unhandled variant: ${JSON.stringify(value)}`);   // ERR-06 invariant
}
```

**TS-08 — Public APIs are explicitly typed.** Exported functions and hooks declare return types — a hook's return type is a named, exported interface (`UseXResult`). Inference is permitted only for module-private helpers and for React components, whose return type is `JSX.Element | null` by construction.

**TS-09 — `readonly` for props and collections that are not mutated.** Mutating a prop or an argument array is PROHIBITED.

**TS-10 — `enum` is PROHIBITED.** Use `as const` objects with derived union types; they are erasable, tree-shakeable, and align with backend string values.

```ts
export const INVOICE_STATUS = { draft: 'DRAFT', sent: 'SENT', paid: 'PAID' } as const;
export type InvoiceStatus = (typeof INVOICE_STATUS)[keyof typeof INVOICE_STATUS];
```

**TS-11 — Type-only imports MUST use `import type`.**

**TS-12 — Domain identifiers MUST be branded types.** A `productId`, `orderId`, `cartLineId`, and `sizeId` are all `string` to the compiler, so nothing stops one being passed where another is required — and such a bug produces a plausible-looking request that fails only against real data. Branding costs nothing at runtime (the brand is erased) and makes the mistake a compile error.

```ts
// src/lib/domain/ids.ts — THE identifier registry
import { z } from 'zod';

declare const brand: unique symbol;
type Brand<T, B extends string> = T & { readonly [brand]: B };

export type ProductId = Brand<string, 'ProductId'>;
export type OrderId = Brand<string, 'OrderId'>;
export type CartLineId = Brand<string, 'CartLineId'>;

/** Branding happens once, at the validated boundary — never by casting at a call site. */
export const productIdSchema = z.uuid().transform((value) => value as ProductId);
export const orderIdSchema = z.uuid().transform((value) => value as OrderId);
```

```ts
// ✅ The compiler now rejects the transposition
function addToCart(productId: ProductId, quantity: number): Promise<Result<Cart, ApiError>>;

addToCart(order.id, 1);      // ❌ Type error: OrderId is not assignable to ProductId
addToCart(product.id, 1);    // ✅
```

The `as` inside `productIdSchema` is the sanctioned `TS-03(2)` case: narrowing a value that a schema has just validated. Branding a raw string anywhere else is PROHIBITED.

---

## 14. Imports & Module Hygiene

**IMP-01 — Inline / mid-file imports are PROHIBITED.** Every `import` statement MUST appear in the import block at the top of the file, before any other statement. Imports inside functions, inside conditionals, or interleaved with declarations are PROHIBITED — they hide the dependency graph, break static analysis and tree-shaking, and defeat review.

```ts
// ❌ PROHIBITED
export function formatInvoice(invoice: Invoice) {
  const { format } = require('date-fns');            // also prohibited: CommonJS require
  return format(new Date(invoice.issuedAt), 'PP');
}

// ❌ PROHIBITED — dynamic import used as an ordinary dependency
async function submit(values: FormValues) {
  const { validate } = await import('@/lib/validate');
  return validate(values);
}
```

**IMP-01a — The sole exception is a *deliberate* `next/dynamic` or `import()` split**, declared at module top level, for code-splitting a heavy client-only dependency (a chart library, a rich-text editor, a map). It MUST carry a comment stating the reason.

```tsx
// src/features/analytics/components/RevenuePanel.tsx
'use client';

import dynamic from 'next/dynamic';
import { ChartSkeleton } from './ChartSkeleton';

// Deliberate code split (IMP-01a): the chart bundle is ~180 kB and sits below the fold.
// `ssr: false` is legal here only because this module is a Client Component.
const RevenueChart = dynamic(() => import('./RevenueChart'), {
  ssr: false,
  loading: () => <ChartSkeleton />,
});
```

**IMP-02 — Import order is fixed and machine-enforced**, with a blank line between groups:

1. Directives (`'use client'`, `'use server'`, `import 'server-only'`)
2. Node/React/Next built-ins
3. External packages
4. Internal aliases (`@/config`, `@/lib`, `@/components`, `@/features`, `@/hooks`)
5. Relative imports (`./`, `../`)
6. Type-only imports (or interleaved with `import type`, consistently)
7. Style imports (`*.module.css`)

**IMP-03 — Wildcard namespace imports are PROHIBITED** (`import * as X`), except inside a `src/lib/vendor/` wrapper module for a library that only exposes a namespace API. Application code then imports named symbols from the wrapper (`SSOT-08`).

**IMP-04 — Unused imports are PROHIBITED** and MUST fail lint.

**IMP-05 — Circular imports are PROHIBITED.** If two modules need each other, extract the shared piece to a third module.

**IMP-06 — `require()` and CommonJS interop in application code are PROHIBITED.**

**IMP-07 — Deep imports into another feature are PROHIBITED** (`STRUCT-04`).

---

## 15. Naming Conventions

**NAME-01** — The bot MUST follow this table exactly.

| Artifact | Convention | Example |
| --- | --- | --- |
| Component file & component | `PascalCase` | `InvoiceRow.tsx` → `InvoiceRow` |
| Hook file | `kebab-case`, `use-` prefix | `use-invoice-list.ts` |
| Hook function | `camelCase`, `use` prefix | `useInvoiceList` |
| Utility / lib module | `kebab-case` | `format-currency.ts` |
| Schema file | `<domain>.schema.ts` | `invoice.schema.ts` |
| Variants file | `<component>.variants.ts` | `button.variants.ts` |
| Types file | `types.ts` or `<domain>.types.ts` | `invoice.types.ts` |
| Test file | `<subject>.test.ts(x)` | `totals.test.ts` |
| Route folders | `kebab-case` | `app/(app)/invoice-templates/` |
| Type / interface | `PascalCase`, no `I` prefix | `Invoice`, `InvoiceRowProps` |
| Props interface | `<Component>Props` | `InvoiceRowProps` |
| Constants | `SCREAMING_SNAKE_CASE` | `MAX_UPLOAD_BYTES` |
| Const registries | `SCREAMING_SNAKE` or `camelCase` object | `ROUTES`, `queryKeys` |
| Booleans | `is` / `has` / `can` / `should` prefix | `isPending`, `canEdit` |
| Event handler props | `on<Event>` | `onSelect`, `onSubmit` |
| Event handler impls | `handle<Event>` | `handleSelect` |
| Async functions | verb-first | `fetchInvoices`, `createInvoice` |
| Server Actions | verb-first, in `actions.ts` | `createInvoiceAction` |
| CSS Module classes | `camelCase` | `styles.progressBar` |
| Environment variables | `SCREAMING_SNAKE_CASE` | `JAVA_API_BASE_URL` |

**NAME-02 — Abbreviations are PROHIBITED** except universally understood ones (`id`, `url`, `api`, `http`, `db`). `usr`, `inv`, `btn`, `cfg` are PROHIBITED.

**NAME-03 — Names state intent, not implementation.** `useInvoiceList` not `useData`; `overdueCount` not `num2`.

**NAME-04 — Folder names are singular for a single concept, plural for collections of siblings** (`features/invoices/components/`, `lib/utils/`).

---

## 16. Performance

**PERF-01 — Ship the smallest possible client bundle.** Every `'use client'` boundary is a bundle cost. The bot MUST justify each one.

**PERF-02 — Server-side data fetching is parallel by default.** Sequential `await`s on independent requests are PROHIBITED; use `Promise.all`.

```ts
// ❌ PROHIBITED — waterfall
const invoice = await getInvoice(id);
const customer = await getCustomer(customerId);

// ✅ REQUIRED
const [invoice, customer] = await Promise.all([getInvoice(id), getCustomer(customerId)]);
```

**PERF-03 — Lists over ~100 rows MUST be virtualized or paginated.** Rendering an unbounded list is PROHIBITED.

**PERF-04 — Memoization is applied on evidence, not reflex.** `useMemo`/`useCallback`/`memo` are for measured expensive work or referential stability required by a dependency array. Wrapping everything is PROHIBITED — it adds cost and noise. Where the React Compiler is enabled, manual memoization SHOULD be removed.

**PERF-05 — Stable references.** Object/array/function literals passed as props to memoized children MUST be hoisted or memoized.

**PERF-06 — Heavy client-only libraries MUST be code-split** via `next/dynamic` (`IMP-01a`).

**PERF-07 — Images MUST declare dimensions and use modern formats** (`NEXT-09`). Above-the-fold hero images use `priority`.

**PERF-08 — No layout shift.** Reserve space for async content; skeletons match final dimensions (`NEXT-14`).

**PERF-09 — Cache intent is explicit for every read** (`DATA-09`).

**PERF-10 — Budgets.** First-load JS per route SHOULD stay under 200 kB gzipped. Exceeding it requires an explicit note in the output.

---

## 17. Accessibility (Non-Negotiable)

**A11Y-01 — Semantic HTML first.** `<button>`, `<nav>`, `<main>`, `<ul>`, `<table>`. A `<div>` with an `onClick` is PROHIBITED.

**A11Y-02 — Every interactive element is keyboard-operable** and reachable in a logical tab order. Positive `tabIndex` values are PROHIBITED.

**A11Y-03 — Visible focus indicators are mandatory** (`STY-10`).

**A11Y-04 — Every image, icon-only button, and control has an accessible name** (`alt`, `aria-label`, or visually-hidden text). Decorative icons carry `aria-hidden="true"`.

**A11Y-05 — Form controls are labelled and errors are announced** (`FORM-05`), with `role="alert"` on the error node.

**A11Y-06 — Colour is never the only carrier of meaning.** Status uses colour **and** text or icon.

**A11Y-07 — Contrast MUST meet WCAG 2.2 AA** (4.5:1 body text, 3:1 large text and UI boundaries).

**A11Y-08 — Dialogs, menus, and popovers MUST trap focus, restore focus on close, close on `Escape`, and carry correct ARIA roles.** The bot SHOULD use a headless accessible primitive rather than hand-rolling.

**A11Y-09 — Heading order is sequential.** Headings are not chosen for their size; size comes from utilities.

**A11Y-10 — Motion respects `prefers-reduced-motion`.**

**A11Y-11 — `aria-*` attributes are used only when semantic HTML cannot express the meaning.** Redundant ARIA on native elements is PROHIBITED.

**A11Y-12 — The `<html>` element MUST declare `lang` and `dir`** (`I18N-03`).

---

## 18. Internationalisation & Bidirectional Layout

> **Governing constraint (§0.6):** this application ships in **English and Urdu**. Urdu is right-to-left. Direction is therefore a property of every component from the moment it is written — not a theme applied at the end.
>
> A codebase that reaches feature-complete in LTR and then "adds RTL" does not add RTL. It performs a mechanical audit of every margin, padding, border, icon, alignment, and transform in the application, and it misses some. The rules below cost nothing while writing and make that audit unnecessary.

**I18N-01 — No user-visible string is written into interface code.** Every label, button, heading, empty state, validation message, `alt` text, `aria-label`, `title`, and `placeholder` resolves from the copy registry (`SSOT-07`). A literal string in JSX is PROHIBITED.

**I18N-02 — Copy is resolved by locale at runtime, never imported per-locale.** Server code calls `getMessages()`; client code calls `useMessages()`. `import { messages } from '@/i18n/messages/en'` in a component is PROHIBITED (`SSOT-07`) — it compiles, renders, and silently makes the component monolingual.

**I18N-03 — Direction is derived from locale in exactly one place.** The root layout resolves the locale, sets `lang` and `dir` on `<html>`, and seeds the messages provider. Individual components MUST NOT read the locale to decide their own direction, and MUST NOT flip themselves by exception.

```tsx
// app/layout.tsx — the ONLY place direction is decided
import { getLocale, getMessages } from '@/i18n';
import { DIRECTION } from '@/i18n/locales';
import { MessagesProvider } from '@/i18n/use-messages';

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [locale, messages] = await Promise.all([getLocale(), getMessages()]);   // PERF-02

  return (
    <html lang={locale} dir={DIRECTION[locale]}>
      <body>
        <MessagesProvider value={messages}>{children}</MessagesProvider>
      </body>
    </html>
  );
}
```

**I18N-04 — Physical direction utilities are PROHIBITED. Logical properties only.**
This is the rule that makes RTL free. A logical utility resolves against `dir` automatically; a physical one does not, and every physical utility is a latent Urdu bug.

| PROHIBITED (physical) | REQUIRED (logical) |
| --- | --- |
| `ml-*`, `mr-*` | `ms-*`, `me-*` |
| `pl-*`, `pr-*` | `ps-*`, `pe-*` |
| `left-*`, `right-*` | `start-*`, `end-*` |
| `text-left`, `text-right` | `text-start`, `text-end` |
| `border-l`, `border-r` | `border-s`, `border-e` |
| `rounded-l-*`, `rounded-r-*` | `rounded-s-*`, `rounded-e-*` |
| `float-left`, `float-right` | `float-start`, `float-end` |
| CSS `margin-left`, `padding-right`, `left`, `text-align: left` | `margin-inline-start`, `padding-inline-end`, `inset-inline-start`, `text-align: start` |
| CSS `width`, `height` in flow-relative contexts | `inline-size`, `block-size` |

```tsx
// ❌ PROHIBITED — correct in English, broken in Urdu
<div className="ml-4 border-l-2 pl-3 text-left">
  <Icon className="mr-2" />
  {t.cart.subtotal}
</div>

// ✅ REQUIRED — correct in both, with no conditional and no second code path
<div className="ms-4 border-s-2 ps-3 text-start">
  <Icon className="me-2" />
  {t.cart.subtotal}
</div>
```

*Exception:* a genuinely physical concern that must not mirror — a chart axis, a video scrubber, a `box-shadow` offset representing a fixed light source — MAY use a physical property with a comment naming why it must not flip.

**I18N-05 — Directional glyphs and transforms MUST mirror with direction.** Chevrons, back arrows, and "next" indicators point in a *logical* direction. Hard-coding `<ChevronRight/>` for "next" is PROHIBITED; use a direction-aware icon or a `rtl:` variant such as `rtl:rotate-180`. Non-directional icons (a cart, a heart, a search glass) MUST NOT mirror.

**I18N-06 — Sentences MUST NOT be assembled by concatenation.** Word order differs between languages, so a sentence built from fragments cannot be translated correctly.

```tsx
// ❌ PROHIBITED — untranslatable; the pieces cannot be reordered
<p>{t.cart.youHave} {count} {t.cart.itemsInCart}</p>

// ✅ REQUIRED — one whole message with a named parameter
<p>{format(t.cart.itemCount, { count })}</p>   // "You have {count} items in your cart"
```

**I18N-07 — Plurals and gendered forms use the message registry's plural rules**, not `count === 1 ? 'item' : 'items'`. Urdu pluralisation does not follow English rules, and a ternary hard-codes English grammar into the component tree.

**I18N-08 — Numbers, currency, dates, and times MUST be rendered through the locale-aware formatters** in `src/lib/utils/` (`DATA-11`, `DATA-12`). Raw `.toString()`, `.toFixed()`, and template-literal interpolation of a numeric value into user-visible text are PROHIBITED — they emit Western digits and English date order regardless of locale.

**I18N-09 — Protected terms are never machine-translated.** Fabric and garment vocabulary carried by the backend's protected-terms list (e.g. *Lawn*, *Kameez*, *Shalwar*) MUST be rendered exactly as the backend supplies them. The frontend MUST NOT transform, transliterate, or re-case a protected term.

**I18N-10 — Untranslated content falls back to the default locale; an empty string is never rendered.** A missing key MUST resolve to the `en` value, and MUST NOT produce a blank element, the raw key path, or `undefined`.

**I18N-11 — Fonts MUST cover both scripts.** The `next/font` stack (`NEXT-10`) declares an Urdu-capable face with an explicit fallback, and line-height is set per script — Nastaʿlīq requires materially more leading than Latin. Applying one Latin-tuned `leading-*` value to both scripts is PROHIBITED.

**I18N-12 — Both directions are verified.** Any component with layout that could mirror MUST be checked under `dir="rtl"` before it is considered done. An E2E smoke path (`TEST-07`) runs in Urdu.

---

## 19. Security

**SEC-01 — Secrets are server-only** (`DATA-07`). `NEXT_PUBLIC_` marks a value as world-readable; treat it as published.

**SEC-02 — All untrusted input is validated with Zod at the boundary** — backend responses (`DATA-02`), route params, search params, form input, Server Action arguments, and webhook bodies.

**SEC-03 — Authorization is enforced server-side on every request.** Hiding a button is UX, not access control. Every Server Action and Route Handler re-checks permissions.

**SEC-04 — `dangerouslySetInnerHTML` requires sanitization and a `// SECURITY:` comment** (`CMP-13`).

**SEC-05 — Auth tokens live in httpOnly, Secure, SameSite cookies.** Storing tokens in `localStorage` or `sessionStorage` is PROHIBITED.

**SEC-06 — Redirect targets derived from user input MUST be allow-listed** against `SSOT-02`. Open redirects are PROHIBITED.

**SEC-07 — Errors surfaced to users MUST NOT include stack traces, internal URLs, SQL, or backend exception text** (`ERR-11`).

**SEC-08 — Mutating Route Handlers MUST verify origin/CSRF** unless protected by an equivalent framework mechanism.

**SEC-09 — External links with `target="_blank"` MUST carry `rel="noopener noreferrer"`.**

**SEC-10 — No secrets, tokens, real customer data, or internal hostnames in generated code, fixtures, comments, or examples.**

---

## 20. Testing

**TEST-01 — Pure business logic in `features/*/lib/` MUST have unit tests.** This is the highest-value, lowest-cost tier and is non-optional.

**TEST-02 — Tests target behaviour through the public interface.** Testing internal state, private functions, or implementation details is PROHIBITED.

**TEST-03 — Queries follow the accessibility hierarchy:** `getByRole` → `getByLabelText` → `getByText` → `getByTestId` (last resort only).

**TEST-04 — Network is mocked at the HTTP layer** (MSW), not by stubbing the project's own API client. Tests then exercise the real client, schema validation included.

**TEST-05 — Both branches of every `Result` MUST be tested.** A test suite that only covers the happy path is incomplete.

**TEST-06 — No conditionals or loops inside test bodies.** Use table-driven `it.each`.

**TEST-07 — E2E (Playwright) covers critical user journeys only** — auth, primary create/read/update flows, payment or submission paths.

**TEST-08 — Every bug fix ships with a regression test** that fails before the fix.

---

## 21. Consolidated Prohibitions

The bot MUST scan its own output for every row below before presenting code. Any hit is a hard stop.

| # | Prohibited pattern | Rule | Required alternative |
| --- | --- | --- | --- |
| 1 | `style={{ … }}` inline CSS | `STY-01` | Tailwind utilities / CSS Module; CSS custom property under `STY-01a` |
| 2 | `import` inside a function/block; `require()` | `IMP-01`, `IMP-06` | Top-of-file imports; deliberate `next/dynamic` split |
| 3 | `try/catch` for flow control | `ERR-01` | `Result<T, E>` returned as a value |
| 4 | Component declared inside a component | `CMP-01` | Sibling component at module scope, own file |
| 5 | Duplicated literal / type / token in 2+ files | `PD-01`, `SSOT-00` | Central registry (§4) |
| 6 | Hard-coded colour, spacing, radius, z-index | `SSOT-01` | `@theme` design token |
| 7 | Hard-coded URL / route string | `SSOT-02` | `ROUTES` registry |
| 8 | `process.env` outside `config/env.server.ts` / `env.client.ts` | `SSOT-03` | `serverEnv` / `clientEnv` |
| 9 | Raw `fetch()` to the Java backend outside the client | `DATA-01` | `apiRequest()` |
| 10 | Inline TanStack Query key array | `SSOT-06` | `queryKeys` registry |
| 11 | Unvalidated backend response / `as Invoice` cast | `DATA-02`, `TS-03` | `schema.safeParse()` at the boundary |
| 12 | Data fetching in `useEffect` | `DATA-05` | RSC fetch or TanStack Query |
| 13 | Server data copied into `useState` | `STATE-02` | Query cache is the single source |
| 14 | State that duplicates derivable data | `STATE-03` | Compute / `useMemo` |
| 15 | `useEffect` to transform state or sync props | `STATE-04` | Derive during render |
| 16 | `any`, `as unknown as T`, `@ts-ignore`, `!` | `TS-02`–`TS-05` | `unknown` + narrowing, schema parse |
| 17 | `enum` | `TS-10` | `as const` object + union type |
| 18 | `React.FC` | `CMP-05` | Typed props parameter |
| 19 | Default exports outside Next.js special files | `CMP-03` | Named exports |
| 20 | `key={index}` on dynamic lists | `CMP-10` | Stable domain id |
| 21 | `{count && <X/>}` numeric short-circuit | `CMP-11` | Explicit ternary |
| 22 | `!important` / Tailwind v4 trailing `!` modifier | `STY-04` | Fix specificity/structure |
| 23 | Arbitrary Tailwind values (`p-[13px]`) | `STY-02` | Add a token, then use it |
| 24 | String-concatenated class names | `STY-07` | `cn()` |
| 25 | CSS-in-JS runtime (styled-components, Emotion) | `STY-03` | Tailwind / CSS Modules |
| 26 | `'use client'` on a page or layout for convenience | `MOD-06`, `NEXT-02` | Push to the smallest leaf |
| 27 | Synchronous `params` / `searchParams` / `cookies()` | `NEXT-03`, `NEXT-04` | `await` them |
| 28 | New `middleware.ts` | `NEXT-05` | `proxy.ts` |
| 29 | `revalidateTag(tag)` single-argument | `DATA-10` | `revalidateTag(tag, 'max')` / `updateTag(tag)` |
| 30 | Deep import into another feature | `STRUCT-04` | Feature `index.ts` barrel |
| 31 | Business logic in `app/` route files | `STRUCT-02` | `features/*/lib/` |
| 32 | Empty `catch {}` / `catch (e: any)` | `ERR-07`, `ERR-08` | Convert to `Result`, narrow `unknown` |
| 33 | Raw backend error text shown to users | `ERR-11`, `SEC-07` | Copy from `SSOT-07` |
| 34 | Tokens in `localStorage` | `SEC-05` | httpOnly Secure cookies |
| 35 | `<div onClick>` as a button | `A11Y-01` | `<button>` |
| 36 | User-visible string hard-coded in JSX | `SSOT-07` | `messages` registry |
| 37 | Vendor import sprawl across >3 files | `BASE-03`, `SSOT-08` | `lib/vendor/` wrapper |
| 38 | Circular imports / barrel files outside allowed roots | `IMP-05`, `STRUCT-06` | Extract shared module |
| 39 | Sequential awaits on independent requests | `PERF-02` | `Promise.all` |
| 40 | Floating-point currency math | `DATA-11` | Integer minor units |
| 41 | `forwardRef` in new components | `CMP-14` | React 19 `ref` as an ordinary prop |
| 42 | `queryFn`/`mutationFn` returning a `Result` | `DATA-03a` | `unwrap()` adapter |
| 43 | Deprecated Zod v3 chained formats (`z.string().uuid()`) | §2 | Zod 4 top-level `z.uuid()`, `z.url()`, `z.iso.datetime()` |
| 44 | Raw palette colours (`text-slate-500`) in components | `SSOT-01`, `STY-09` | Semantic tokens (`text-fg-muted`) |
| 45 | Physical direction utility (`ml-*`, `pr-*`, `text-left`, `border-l`, `left-*`) | `I18N-04` | Logical equivalent (`ms-*`, `pe-*`, `text-start`, `border-s`, `start-*`) |
| 46 | Per-locale import in a component (`@/i18n/messages/en`) | `I18N-02`, `SSOT-07` | `getMessages()` / `useMessages()` |
| 47 | Sentence built by concatenating fragments | `I18N-06` | One parameterised message key |
| 48 | `count === 1 ? 'item' : 'items'` pluralisation | `I18N-07` | Registry plural rules |
| 49 | Directional icon hard-coded (`ChevronRight` for "next") | `I18N-05` | Direction-aware icon or `rtl:rotate-180` |
| 50 | Number, money, or date rendered without the locale formatter | `I18N-08`, `DATA-11` | Shared locale-aware formatter |
| 51 | Protected fabric/garment term transformed or transliterated | `I18N-09` | Render exactly as supplied |
| 52 | Backend business rule reimplemented client-side (COD cap, stock, pricing) | `DATA-13` | Render what the backend reported |
| 53 | Product type inferred by counting pieces | `DATA-13a` | Read the declared `SIMPLE` / `SET` |
| 54 | Currency enum, market switch, or exchange-rate handling | `DATA-11a` | Single fixed currency from config |
| 55 | Raw `string` domain identifier in a signature | `TS-12` | Branded `ProductId` / `OrderId` |

---

## 22. Pre-Output Compliance Checklist

The bot MUST run this checklist against its own generated code **before** presenting it. Each item is answered explicitly, and any "no" is fixed before output — not disclosed as a caveat.

### A. Architecture
- [ ] Every file is in its canonical location per `STRUCT-01`.
- [ ] No file crosses a layer boundary upward (`MOD-01`).
- [ ] No cross-feature deep import (`STRUCT-04`).
- [ ] `app/` files only compose; no business logic (`STRUCT-02`).
- [ ] Business logic is React-free and unit-testable (`MOD-04`).
- [ ] Every file is under its size ceiling (`MOD-03`).

### B. Single Source of Truth
- [ ] No literal, type, token, string, or component is duplicated (`PD-01`, `SSOT-00`).
- [ ] All colours/spacing/radii/z-indexes are `@theme` tokens (`SSOT-01`).
- [ ] All routes come from `ROUTES` (`SSOT-02`).
- [ ] All env access is via `config/env.server.ts` / `config/env.client.ts` (`SSOT-03`).
- [ ] All endpoints come from `ENDPOINTS` (`SSOT-04`).
- [ ] All network calls go through `apiRequest` (`SSOT-05`).
- [ ] All query keys come from `queryKeys` (`SSOT-06`).
- [ ] All user-visible copy comes from `messages` (`SSOT-07`).
- [ ] Domain types are `z.infer`red, not hand-written twice (`SSOT-09`).
- [ ] Component variants come from a CVA variants file (`SSOT-10`).

### C. The Four Named Anti-Patterns
- [ ] **Zero** `style={{ … }}` occurrences (`STY-01`). Any `STY-01a` exception is a CSS custom property with a justification comment.
- [ ] **Zero** imports below the import block; **zero** `require()` (`IMP-01`). Any `next/dynamic` split carries a reason comment.
- [ ] **Zero** `try/catch` used for branching; every expected failure is a returned `Result` (`ERR-01`, `ERR-02`). Any surviving `try/catch` cites `ERR-05(1|2|3)` in a comment.
- [ ] **Zero** components declared inside other components, hooks, loops, or conditionals (`CMP-01`).

### D. Types & Contracts
- [ ] No `any`, `as unknown as`, `@ts-ignore`, or `!` (`TS-02`–`TS-05`).
- [ ] Every backend payload is `safeParse`d (`DATA-02`).
- [ ] Every union `switch` is exhaustive with a `never` default (`TS-07`).
- [ ] Every exported function has an explicit return type (`TS-08`).

### E. Data & State
- [ ] No fetching in `useEffect` (`DATA-05`).
- [ ] Server state is not mirrored into local/global state (`STATE-02`).
- [ ] Every mutation invalidates or updates the right keys (`DATA-06`).
- [ ] Caching intent is stated for every read (`DATA-09`).
- [ ] The lowest adequate state rung was chosen (`STATE-01`).
- [ ] `queryFn`/`mutationFn` go through `unwrap`; no bespoke throw at a call site (`DATA-03a`).

### F. Rendering & Framework
- [ ] `'use client'` appears only where required, at the smallest leaf (`MOD-06`).
- [ ] `params`, `searchParams`, `cookies()`, `headers()` are awaited (`NEXT-03`, `NEXT-04`).
- [ ] `error.tsx` and `loading.tsx` exist for fetching segments (`ERR-09`).
- [ ] No `middleware.ts`; `proxy.ts` used instead (`NEXT-05`).

### G. Accessibility & Security
- [ ] Semantic elements; every control has an accessible name (`A11Y-01`, `A11Y-04`).
- [ ] Keyboard operable with visible focus (`A11Y-02`, `A11Y-03`).
- [ ] Form errors are associated and announced (`FORM-05`).
- [ ] No secrets client-side; authorization re-checked server-side (`SEC-01`, `SEC-03`).
- [ ] No raw error internals surfaced to users (`SEC-07`).

### H. Internationalisation & Direction
- [ ] **Zero** physical direction utilities; every spacing, border, radius, inset, and alignment is logical (`I18N-04`).
- [ ] **Zero** user-visible string literals; all copy resolves via `getMessages()` / `useMessages()` (`I18N-01`, `I18N-02`).
- [ ] No sentence is assembled by concatenation; plurals come from the registry (`I18N-06`, `I18N-07`).
- [ ] Directional icons mirror; non-directional icons do not (`I18N-05`).
- [ ] Numbers, currency, and dates go through the locale-aware formatters (`I18N-08`).
- [ ] `lang` and `dir` are set once, in the root layout, from the resolved locale (`I18N-03`).
- [ ] The output was mentally rendered under `dir="rtl"` and holds up (`I18N-12`).

### I. Domain Boundary
- [ ] No backend-owned rule (stock, pricing, promotion, COD cap, status transition) is computed client-side (`DATA-13`).
- [ ] `SIMPLE` / `SET` is read from the declared type, never inferred (`DATA-13a`).
- [ ] No multi-currency, multi-market, or multi-warehouse abstraction was introduced (`DATA-11a`).
- [ ] Domain identifiers in signatures are branded, not raw `string` (`TS-12`).

### J. Output Quality
- [ ] Code compiles under `strict` TypeScript as written.
- [ ] All referenced imports, registries, and files either exist or are included in the output.
- [ ] Every §21 row was checked against the produced code.
- [ ] Any deviation is stated explicitly with its rule ID and justification.

---

## 23. Bot Operating Procedure

**BOT-01 — Sequence for every code task:**

1. **Classify** the request: new feature, extension, refactor, or fix.
2. **Locate** existing sources of truth that already cover part of the request. Reuse them. Never re-declare.
3. **Plan** the file set, mapped onto `STRUCT-01`, and state it before writing.
4. **Generate** code that satisfies §1–§20.
5. **Self-review** against §21 and §22, line by line.
6. **Correct** every violation found. Do not present code with known violations.
7. **Report**: the files produced, which registries were touched or extended, and any deviation with rule ID and justification.

**BOT-02 — When a request would violate this document,** the bot MUST NOT silently comply. It states the rule ID, explains the risk in one or two sentences, offers the compliant alternative, and proceeds only on explicit operator override.

**BOT-03 — When a needed value has no home yet,** the bot MUST create the registry entry (or the registry module itself) as part of the same output — not inline the value "for now".

**BOT-04 — When touching existing code,** the bot MUST leave it at least as compliant as it found it. Introducing a new violation into a compliant file is PROHIBITED; opportunistic cleanup of adjacent violations SHOULD be offered separately rather than bundled silently into an unrelated change.

**BOT-05 — Output completeness.** Generated code MUST be runnable as written: no `// TODO: implement`, no `// ...rest of the logic`, no placeholder imports pointing at files that were never produced.

**BOT-06 — Ambiguity is surfaced, not guessed.** If the request underspecifies something this document cannot resolve, the bot states the assumption it is making at the top of its response and proceeds — it does not bury the guess in the code.

---

## 24. Final Directive

> **When generating code, this bot must verify all output against these guidelines before presenting the final code.**

This verification is not optional, not conditional on task size, and not satisfied by a general impression of compliance. The bot MUST perform the §22 checklist explicitly, scan for every pattern in §21, and correct all violations **prior to** presenting output. Code that has not been verified against this document MUST NOT be presented.

---

*End of document. Rules are additive: absence of a rule is not permission. When this document is silent, the bot applies `PD-01` through `PD-05` and states its reasoning.*
