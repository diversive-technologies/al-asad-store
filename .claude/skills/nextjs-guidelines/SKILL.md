---
name: nextjs-guidelines
description: BINDING rulebook for all Next.js frontend code in this project (ethnic apparel e-commerce, EN/UR). Load before writing, generating, reviewing or refactoring ANY frontend file — components, pages, routes, hooks, API client code, forms, styling, state, i18n — and before adding a dependency, creating a directory, or answering "how should this be structured". Covers project structure, SSOT registries, layering, Tailwind/CSS Modules, TanStack Query, Zod, error handling, RTL, accessibility, testing and the consolidated prohibitions.
---

# Next.js Coding & Design Guidelines — router

The rulebook is **one file, unmodified**:
`.claude/skills/nextjs-guidelines/reference/nextjs-coding-guidelines.md` (v1.1, ~2,000 lines)

It is BINDING. It is not summarised or paraphrased anywhere — including in this
file. `PD-01` makes a second copy of a rule a defect, and the document's own
status line requires any duplicate to be deleted rather than kept alongside.
This file routes; it never restates.

## Mandatory procedure

1. Read the sections that govern the task (table below).
2. Read **§22 Pre-Output Compliance Checklist** and **§23 Bot Operating
   Procedure** before emitting any file.
3. Cite rule IDs (`PD-02`, `SSOT-03`, `DATA-13`, …) when a decision follows from
   the document, and when refusing a request that would violate it.
4. Where an operator instruction conflicts with a rule, name the rule ID being
   overridden and get confirmation before generating code (§0.4).

## Which section governs what

| Task | Read |
| --- | --- |
| Anything at all, first time in a session | §1 Prime Directives, §21 Consolidated Prohibitions |
| Choosing/adding a dependency | §2 Technology Baseline (locked), `BASE-01`–`BASE-03` |
| Where does this file go? New directory? | §3 Canonical Project Structure, `STRUCT-01` |
| Constants, types, env, routes, icons, tokens, config | §4 SSOT Mandatory Registries |
| Layering — what may import what | §5 Modularity & Separation of Concerns |
| Writing a component | §6 Component Rules, §15 Naming |
| Tailwind vs CSS Modules, tokens | §7 Styling Rules |
| API client, fetching, TanStack Query, RSC loads | §8 Data Layer — Java Backend Integration |
| Client state, Context, Zustand | §9 State Management |
| Errors, result types, control flow | §10 Error Handling & Control Flow |
| Forms, React Hook Form, Zod resolvers | §11 Forms & Validation |
| Routing, rendering modes, `proxy.ts`, Next 16 specifics | §12 Routing, Rendering & Next.js 16 Specifics |
| Types, generics, `any`, assertions | §13 TypeScript Rules |
| Imports, barrels, module hygiene | §14 Imports & Module Hygiene |
| Bundle size, images, memoisation | §16 Performance |
| Semantics, focus, ARIA, contrast | §17 Accessibility (non-negotiable) |
| Urdu, RTL, logical properties, Nastaliq, formatting | §18 Internationalisation & Bidirectional Layout |
| Auth boundaries, secrets, env exposure | §19 Security |
| Vitest, RTL, Playwright, MSW | §20 Testing |

## Version rules have a shelf life

`META-01`: §2 and §12 pin exact versions and name deprecated APIs. If one
contradicts the lockfile or working source, treat the rule as **suspect**,
surface the conflict, and do not rewrite working code on the strength of a
stale rule alone.

## Reading efficiently

The file is large. Locate a section by heading rather than reading whole:

```bash
grep -n "^## " .claude/skills/nextjs-guidelines/reference/nextjs-coding-guidelines.md
```

Then read that line range. Do not load the entire document when one section
answers the question.
