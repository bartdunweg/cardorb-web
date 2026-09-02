# State

Where this project stands right now. Read it at the start of a session; update it at the end.
This file is deliberately short — it orients, it does not document. The rules that apply now
live in `CONVENTIONS.md`.

Rewrite it in place. This file has no history worth keeping; the history is in git.

## Now

Trading card management web app on Next.js 16 + React 19 + Tailwind 4 + Untitled UI (PRO).
Supabase connected (project `fprjroupecdhosfdrqhv`), RLS-scoped `cards`/`collections` with ~1960
imported cards (95% image-backfilled). Live features: public landing, protected app shell (sidebar
+ mobile pill tab bar), Home, Cards (table/grid + detail slideout + Pokémon-DB add), Collections
(folders), Favorites, Wishlist, command-palette search, Settings. Desktop sidebar: Home · Cards ·
Collections (label opens the overview, a chevron expands your collections) · Favorites · Wishlist.
Favorites + Wishlist are standalone pages on desktop and the mobile Collections hub's top cards.

## Last session

- Renamed the "Dashboard" nav to **Home** with a home icon (desktop sidebar, mobile tabs, page heading).
- Built the **Wishlist**: cards you want but don't own yet, kept out of the collection, stats, and
  collections. New `cards.wishlist` boolean (default false; existing data untouched). Adding a card
  now has a Collection/Wishlist toggle; wishlist has its own page (`/dashboard/wishlist`), a desktop
  sidebar item and a Collections-page card (mobile entry); a "Move to collection" action on a
  wishlist card marks it owned. `getMyCards` filters by `wishlist`; stats/collection counts exclude it.
- Promoted **Favorites** to its own page (`/dashboard/favorites`, moved out from under Collections)
  and made **Collections** an expandable sidebar item: the label navigates to the overview, a chevron
  toggles the list of your collections (no "View all"; no chevron when you have none). The Collections
  page now shows an empty state with a create button when you have no folders; Favorites/Wishlist cards
  there are mobile-only (desktop reaches them via the sidebar). Vendored `nav-list.tsx` gained a
  `NavCollapsibleWithLink` (link + chevron); the layout feeds `getMyCollections()` into the sidebar.
- **Empty states** now use the Untitled `EmptyState` component, centered in the viewport, never in a
  bordered card (new rule **R-UI-002**). Applied to Cards (no cards / no match), Collections, collection
  detail, Favorites, Wishlist. `AddCardModal` gained an optional `trigger` prop so an empty state can
  open it with a labelled button.
- **Collection = owned; not-owned ⇒ wishlist** (new rule **R-DATA-002**). Migrated the 25 not-owned
  imported cards (chase rares) to `wishlist = true`; bdunweg now has 1934 owned / 25 wishlist. Home
  stat tiles are now **Owned · Wishlist · Favorites** (Total dropped; it equalled Owned).
- **Data-scoping fix (R-SEC-002):** `getMyCards`, `getCardStats`, `getMyCollections`, `getCollection`,
  `getPokedex` now filter `user_id = auth.uid()`; `markOwned`/`setCardCollection` scope the write and
  error on a 0-row update (was silent). Root cause of "Morpeko wouldn't move": bdunweg's profile is
  public, the cards SELECT policy exposes public rows, and queries weren't user-scoped — so a card
  could be viewed but a write no-op'd. The slideout now shows the move error.
- Built the **Pokédex** page (`/dashboard/pokedex`, own sidebar item next to Cards): grid 1..1025,
  **owned only**; each slot holds all owned cards for that Pokémon and shows a **CSS scroll-snap
  slider** when there's more than one (count pill top-left, dex number bottom); grey where you own
  nothing. New `cards.pokedex_numbers int[]`; `addCard` stores it; existing cards backfilled from
  pokemontcg.io (`scripts/backfill-pokedex.mjs`) + PokeAPI name fallback (`scripts/backfill-pokedex-byname.mjs`).
  For bdunweg: 698/1025 Pokémon, 1809 card slots, 412 with sliders. Added `SUPABASE_SERVICE_ROLE_KEY`
  to `.env.local` for the scripts (gitignored; user pasted it in chat).
- `./scripts/verify.sh` green except pre-existing standards drift (CLAUDE.md/AGENTS.md from
  dev-standards v0.27.0; standard is v0.29.0).

## Next

- **Pokédex tail coverage:** 1818/1960 cards have `pokedex_numbers` after the id-based backfill
  (`scripts/backfill-pokedex.mjs`) + a name→dex fallback via PokeAPI (`scripts/backfill-pokedex-byname.mjs`,
  fills promos/fan-sets/tag-teams). The remaining ~142 null are Trainers/Energy and secret rares the
  API has no dex for — correct to leave null.
- **iOS-style mobile page header** (Back left / title / action right on deep pages) is parked pending
  4 answers: title layout, which pages, keep/hide the bottom tab bar, and Back behaviour. Untitled UI
  has no ready-made component; plan is a small custom `MobilePageHeader` from its primitives.
- **13 cards still have no art** (MEP/XY Black Star Promos, Miscellaneous Promos, Roaring Skies):
  non-standard promo numbering the API can't be matched on. A name placeholder shows instead of a blank.
- Set up Vercel: link project, add env vars, enable preview deploys.
- Consider surfacing wishlist size on Home; optional "add to wishlist" from a card's detail.

## Open

- Meridian set up: `.claude/settings.json` (plugins meridian/-design/-web/interface-details);
  `@strakzat/eslint-config-ui` **strict** wired into `eslint.config.mjs` (`...configs.strictHosted`,
  after Next's config). All 22 initial findings fixed → lint green. Added `--text-xxs` token (10px);
  overlays use `alpha-black`/`alpha-white`; `.gitleaks.toml` allowlists gitignored `.env.local`.
- Built the **public collection page** at `/user/[username]` (outside the auth-gated `(app)` group):
  looks up a profile by username where `is_public`, shows the owned collection as a read-only grid
  (card → read-only slideout, personal fields like purchase price/notes hidden). `getPublicProfile`
  /`getPublicCards` in `src/lib/public-profile.ts`; RLS already allowed public reads. Settings shows a
  "View your public page" link when the toggle is on. The `is_public` toggle now actually does something.
- Removed the legacy dev-standards `standards` stage from `verify.sh` (project uses Meridian now;
  its ESLint config enforces the half that matters). Added `.nvmrc` (24) and a pnpm CI workflow
  (`.github/workflows/ci.yml`: pnpm/action-setup, GitHub Packages auth, gitleaks, `verify.sh`).
  `verify.sh` now exits **0** — secrets/typecheck/lint/test/build/conventions all green.
- **Landing/auth polish:** landing hero title centred in the viewport, topbar reduced to just the
  Cardorb logo; login/signup are now clean single-column centred forms (no marketing panel), moved to
  `src/components/app` so they're lint-policed. Cards page got **pagination** (100/page). Pokédex
  multi-card slots got a `DexSlider` with hover arrows. Card art without an image shows a name placeholder.
- **Images:** 1947/1960 cards now have art. Ascended Heroes/Chaos Rising/Perfect Order/Pitch Black are
  real recent sets released after the first backfill; matched by set-name + number (zero-pad fix) via
  `scripts/backfill-images-bysetname.mjs`.
- Vercel not linked yet.
- Untitled UI PRO license + Supabase service-role key were pasted in chat — rotate if you care (owner declined for now).
- Auth is email+password; magic-link is a small variant if wanted later.
