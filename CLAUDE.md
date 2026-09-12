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
| `pnpm emails:render` | The auth emails (`src/emails`) to static HTML for `cardorb-api/supabase/templates` |

## Structure

```
src/
├── app/            # routes: (auth) login/signup, (app)/dashboard/*, user/[username]
├── components/app/ # our own shared components, the only lint-policed UI dir
├── components/…    # vendored Untitled UI kit (base, application, marketing, foundations)
├── lib/            # api.ts (the API client), api-shapes.ts (its answers → what screens render), Supabase auth clients
└── styles/         # globals.css, theme.css (tokens), typography.css
```

Absolute imports through `@/`. Untitled UI import and composition conventions: `docs/untitledui.md`.

**`/dashboard/design`** is the design system: every component the app uses, each marked as the
kit's or ours, and the list of controls still built by hand. It is reached by typing the address,
deliberately not in the sidebar, the tab bar or the prefetch list, because it is a tool for
building the app and not a page of it. Signing in is the only gate it has, which is enough:
nothing on it is anyone's data. Its "still built by hand" list reads
`scripts/kit-drift-baseline.json`, the file `verify.sh` enforces (R-UI-001), so the page cannot
quietly stop being true.

## How the skills relate

Pinned skills from other authors lead on craft. Meridian's skills state this
studio's difference and name who owns the rest; where one disagrees with an
external, the Meridian skill's own list of house calls decides.

Process is Meridian's. Apply a standard while you write and say nothing about it;
review once, at the commit or the pull request, with a verdict and its evidence.
A skill that asks for a review, a plan or a brainstorm at another moment defers
to this.

## Domain

- **Collection**: everything you own. That is the word on screen for the whole of it, and the
  page that lists every card you hold; Browse (every set there has been) and the wishlist sit
  beside it, not in it.
- **Binder**: one place you put cards: two that are always there (Favorites, Pokédex) and the
  ones you make, by hand or by rule. In copy one is a "Binder" and the list of them is
  "Binders", nothing else: one word with a singular and a plural, where it used to be a
  "Folder" inside "Collections" and the app said Collection for two different things.
  The `collections` table, the `/collections` routes and the API's own path keep their names:
  those are addresses, and one of them is a contract the iOS app reads.
  On desktop the sidebar's Binders section is the list; on a phone the Binders tab is.
- **Owned / wishlist**: mutually exclusive. A card you do not own is on the wishlist, nowhere
  else. Collection views and stats exclude wishlist cards.
- **Favorite**: a flag on a card you own, shown as a folder that is always there.
- **Pokédex slot**: one Pokémon (dex number 1–1025) with every card you own of it; grey when
  you own none. A card can belong to several slots (tag teams).
- **Card**: one printing, as the Card Orb API identifies it from its catalogues (TCGdex first). Not the Pokémon.
- **Public profile**: `/user/[username]`, the owned collection without prices or notes.
  Only shown when the profile is set to public.

Project-specific rules with an ID (R-DATA-002, R-DATA-003, …) live in `CONVENTIONS.md`, which
`scripts/verify.sh` checks. Where the work stands: `STATE.md`.

## Principles

- **One road to the cards**: this app reads and writes cards, folders and profiles through the
  Card Orb API (`src/lib/api.ts`, R-DATA-003), the same API the iOS app uses, so both see the
  same pictures, prices and features. `/api/v1/*` on cardorb.com is a `vercel.json` rewrite to
  that API for bartdunweg.com.

## Language

Interface language is English. Strings live in the components themselves; there is no
translation file. Everything on disk is English; answer the owner in the language they write in.
No em dashes anywhere, on screen or in a comment (R-COPY-001): two sentences, a comma, a colon
or parentheses instead.

## Watch out for

- `@strakzat/eslint-config-ui` is public on npm since 0.4.0. A `~/.npmrc` that still maps the
  `@strakzat` scope to GitHub Packages makes `pnpm install` ask that registry, which wants a
  token even to read; remove the line.
