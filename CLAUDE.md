# Cardorb

A web app for keeping track of a Pokémon card collection: which cards you own, sorted into
collections, a wishlist, a Pokédex view of which Pokémon you hold cards of, and a public
profile page that shows your collection to others. The owner is the one user today; accounts
exist so other collectors can join later.

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript, pnpm, Node 24 (`.nvmrc`)
- Tailwind v4 + Untitled UI PRO (vendored in `src/components`)
- The Card Orb API (`bartdunweg/cardorb-api`, api.cardorb.com) for cards, folders and profiles;
  Supabase (auth, email and password) for the session only; zod at every boundary
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
├── lib/            # api.ts (the API client), api-shapes.ts (its answers → what screens render), Supabase auth clients
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

- **Collection** — everything you own, as a list of folders: All cards, Favorites, the Pokédex,
  and the ones you make. Sets and the wishlist sit beside it, not in it. In copy the word means
  only what you own.
- **Folder** — an entry under Collection: three that are always there (All cards, Favorites,
  Pokédex) and the ones you make, by hand or by rule. The `collections` table and the
  `/collections` routes are the ones you make; in copy they are all "Folders", never
  "collections". On desktop the sidebar is the list; on a phone the Folders tab is.
- **Owned / wishlist** — mutually exclusive. A card you do not own is on the wishlist, nowhere
  else. Collection views and stats exclude wishlist cards.
- **Favorite** — a flag on a card you own. Not a folder.
- **Pokédex slot** — one Pokémon (dex number 1–1025) with every card you own of it; grey when
  you own none. A card can belong to several slots (tag teams).
- **Card** — one printing, as the Card Orb API identifies it from its catalogues (TCGdex first). Not the Pokémon.
- **Public profile** — `/user/[username]`, the owned collection without prices or notes.
  Only shown when the profile is set to public.

Project-specific rules with an ID (R-DATA-002, R-DATA-003, …) live in `CONVENTIONS.md`, which
`scripts/verify.sh` checks. Where the work stands: `STATE.md`.

## Principles

- **One road to the cards** — this app reads and writes cards, folders and profiles through the
  Card Orb API (`src/lib/api.ts`, R-DATA-003), the same API the iOS app uses, so both see the
  same pictures, prices and features. `/api/v1/*` on cardorb.com is a `vercel.json` rewrite to
  that API for bartdunweg.com.

## Language

Interface language is English. Strings live in the components themselves; there is no
translation file. Everything on disk is English; answer the owner in the language they write in.

## Watch out for

- `@strakzat/eslint-config-ui` is public on npm since 0.4.0. A `~/.npmrc` that still maps the
  `@strakzat` scope to GitHub Packages makes `pnpm install` ask that registry, which wants a
  token even to read; remove the line.
