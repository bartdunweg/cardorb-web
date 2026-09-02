# Conventions

The rules that apply **now**, in this repository. This is the only binding source, and it is
the whole memory — there is no archive of decisions and no archive of feedback.

A rule is rewritten or deleted the moment it stops being true. What it used to say is in
`git log -p CONVENTIONS.md`, which is deliberately not in the read path. A request from the
owner outranks any rule here; say which one it departs from, then do it.

- `Enforcement` is `reviewed`, or `enforced — <what enforces it>`. There is no third value:
  a rule nothing checks is dropped or made checkable.
- `Why` is one sentence and may not be empty. Where the reason is genuinely lost, write
  `unknown` — never invent one.
- IDs are stable and never reused, so a rule can be waived by name in a conversation.
- Present tense, imperative, at most two lines. No dates — that is what git is for.
- There is no rule-count ceiling. Freshness is the brake, not size.

last-reviewed: 2026-09-02

| ID | Rule | Enforcement | Why |
|---|---|---|---|
| R-STYLE-001 | All colours come from `src/styles/theme.css` tokens. The brand ramp (`--color-brand-*`) is the single brand source and is grayscale (near-black light / near-white dark). No hardcoded hex in components. | reviewed | A hardcoded colour escapes theming and dark mode and is found by a user, not a test. |
| R-STRUCT-001 | The vendored Untitled UI kit (`src/components/{base,application,marketing,foundations,shared-assets}`, plus the kit's `hooks`/`utils`/`providers`) is owned but not lint-policed; our own shared components live in `src/components/app`. | enforced — eslint.config.mjs ignores the vendored dirs | Keeps the lint signal about our code and a clear line between vendored and our own. |
| R-DATA-001 | Everything arriving from outside (forms, request bodies, params) is validated with zod before use. | reviewed | Unvalidated input fails deep in the code, where the message means nothing. |
| R-SEC-001 | Never commit secrets. Real keys live in `.env.local` (gitignored); `.env.example` documents the names only. | enforced — gitleaks in scripts/verify.sh | A secret that reaches a commit is leaked permanently, not deleted. |
| R-UI-001 | For any UI element, search Untitled UI first (MCP, then the vendored kit) and use the matching component as-is. Build custom markup only after confirming none fits, and flag every custom bit in the closing summary. | reviewed | A hand-rolled variant drifts from the design system — the mistake this project keeps hitting. |
| R-UI-002 | Empty states use the Untitled `EmptyState` component, centered in the content area (`flex-1` + `items-center justify-center`). Never wrap an empty state in a bordered card/box. | reviewed | A boxed empty state reads as a small error tile, not a full-page state — the owner flagged it. |
| R-DATA-002 | A card is either owned (the collection) or on the wishlist: `owned = false` implies `wishlist = true`. Collection views and stats filter `wishlist = false`; the wishlist filters `wishlist = true`. `markOwned` flips a card from wishlist to collection. | reviewed | Not owned means not in the collection — the owner's model; a not-owned card must live on the wishlist, nowhere else. |
| R-SEC-002 | Every "current user's data" query filters explicitly on `user_id = auth.uid()`, and every write scopes `.eq("user_id", user.id)` and checks a row changed. Never rely on RLS alone. | reviewed | The cards SELECT policy also exposes public profiles' rows, so an unscoped query leaks another user's cards into "my collection" and writes no-op silently. |

| R-DEPLOY-001 | `/api/v1/*` is not implemented here: `vercel.json` rewrites it to `https://api.cardorb.com`, the Card Orb API. Do not add routes under `/api/v1`. | enforced — vercel.json rewrite; middleware.ts excludes `/api/` | bartdunweg.com reads `cardorb.com/api/v1`, and cardorb.com now points at this app; the rewrite keeps it working. |
| R-DATA-003 | Cards, folders and profiles are read and written through the Card Orb API (`src/lib/api.ts`), never from the database. Supabase directly is auth and the session only. | enforced — `scripts/verify.sh` fails on `.from(` outside `src/lib/supabase/` | Two apps reading one table by two different roads showed different pictures and prices, and every feature existed on one side only. |

**Where a rule and the code disagree**, the rule is dead or the code is wrong. Do not decide
that alone and do not settle it in conversation — add it to `## Open` in `STATE.md`, which is
the list the owner actually reads.
