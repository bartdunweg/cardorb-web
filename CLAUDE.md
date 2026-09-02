# Cardorb

A web app for keeping track of a Pokémon card collection: which cards you own, sorted into
collections, a wishlist, a Pokédex view of which Pokémon you hold cards of, and a public
profile page that shows your collection to others. The owner is the one user today; accounts
exist so other collectors can join later.

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript, pnpm, Node 24 (`.nvmrc`)
- Tailwind v4 + Untitled UI PRO (vendored in `src/components`)
- Supabase (Postgres + auth, email and password), zod at every boundary
- Deployed on Vercel: `main` is production at https://cardorb.com, every PR gets a preview

## Commands

| Command | Does |
|---|---|
| `./scripts/verify.sh` | The whole gate: secrets, typecheck, lint, test, build, conventions |
| `pnpm dev` | Dev server on http://localhost:3000 |
| `pnpm build` | Production build |
| `pnpm lint` | ESLint (`@strakzat/eslint-config-ui` strict) + Prettier check |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm test` | Vitest |

## Structure

```
src/
├── app/            # routes: (auth) login/signup, (app)/dashboard/*, user/[username]
├── components/app/ # our own shared components — the only lint-policed UI dir
├── components/…    # vendored Untitled UI kit (base, application, marketing, foundations)
├── lib/            # Supabase clients, data access, public-profile queries
└── styles/         # globals.css, theme.css (tokens), typography.css
```

Absolute imports through `@/`. Untitled UI import and composition conventions: `docs/untitledui.md`.

## How the skills relate

Pinned skills from other authors lead on craft. Meridian's skills state this
studio's difference and name who owns the rest; where one disagrees with an
external, the Meridian skill's own list of house calls decides.

Process is Meridian's. Apply a standard while you write and say nothing about it;
review once, at the commit or the pull request, with a verdict and its evidence.
A skill that asks for a review, a plan or a brainstorm at another moment defers
to this.

## Domain

- **Collection** — two meanings: everything you own, and a folder you create yourself to
  group cards. The `collections` table is the folders; "the collection" in copy is the owned set.
- **Owned / wishlist** — mutually exclusive. A card you do not own is on the wishlist, nowhere
  else. Collection views and stats exclude wishlist cards.
- **Favorite** — a flag on a card you own. Not a folder.
- **Pokédex slot** — one Pokémon (dex number 1–1025) with every card you own of it; grey when
  you own none. A card can belong to several slots (tag teams).
- **Card** — one printing from pokemontcg.io, identified by its id. Not the Pokémon.
- **Public profile** — `/user/[username]`, the owned collection without prices or notes.
  Only shown when the profile is set to public.

Project-specific rules with an ID (R-DATA-002, R-SEC-002, …) live in `CONVENTIONS.md`, which
`scripts/verify.sh` checks. Where the work stands: `STATE.md`.

## Principles

- **API bridge** — `/api/v1/*` is not implemented here; `vercel.json` rewrites it to
  `api.cardorb.com`, the previous Cardorb app. The iOS app and bartdunweg.com read that API
  from `cardorb.com`, which now points at this app; the old Vercel project stays until they are
  repointed.
- **Grayscale brand** — the brand ramp maps onto the neutral ramp and there is no accent colour.
  The cards are the colour; the interface stays out of their way.

## Language

Interface language is English. Strings live in the components themselves; there is no
translation file. Everything on disk is English; answer the owner in the language they write in.

## Watch out for

- Every "my data" query filters on `user_id` explicitly (R-SEC-002): the cards SELECT policy
  also exposes public profiles' rows, so an unscoped query shows another user's cards.
- `NPM_RC` on Vercel and `PACKAGES_TOKEN` in GitHub Actions carry the token for the private
  `@strakzat` package; without them `pnpm install` fails on the runner.
