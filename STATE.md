# State

Where this project stands right now. Read it at the start of a session; update it at the end.
This file is deliberately short — it orients, it does not document. The rules that apply now
live in `CONVENTIONS.md`.

Rewrite it in place. This file has no history worth keeping; the history is in git.

## Now

Trading card management web app on Next.js 16 + React 19 + Tailwind 4 + Untitled UI (PRO).
**Live at https://cardorb.com** on Vercel project `cardorb`, `main` is production.

**Since 2026-09-02 this app reads and writes cards, folders and profiles through the Card Orb API**
(`bartdunweg/cardorb-api`, api.cardorb.com), the same API the iOS app uses (R-DATA-003). Supabase
is touched directly for auth and the session only; the same project signs both, so the session's
access token is the API's bearer. `src/lib/api.ts` is the client, `src/lib/api-shapes.ts` turns
the API's answers into what the screens already render (tested). `scripts/verify.sh` fails on a
`.from("` outside `src/lib/supabase/`. Live: landing, app shell, Home, Cards, Collections
(folders in the API), Favorites, Wishlist, Pokédex, command-palette search (the API's catalogue,
which also says what is already yours), Settings (avatar through the API), public profile.

## Last session

- **Card pictures through the image optimizer, and the functions in Dublin (#21).** A performance
  review found the pictures came straight from `assets.tcgdex.net` — one server in France, no CDN,
  unreachable that day — and the functions ran in `iad1` while the API sits in `dub1`. Every card
  `<img>` is now `CardImage` (`src/components/app/card-image.tsx`) over `next/image`, with the
  allowed hosts in `next.config.mjs`; `vercel.json` pins `regions: ["dub1"]`. One thumbnail went
  from 176 KB PNG to 23 KB WebP. Still open from that review, in order: the layout's three
  sequential API calls (profile, folders, stats) cached per user; `loading.tsx` per dashboard route
  so the shell streams before the cards; JS on first load is 228 KB Brotli against a 150 KB budget.
- **"Forgot password?" on `/login`** leads to `/forgot-password`: one email field, and
  `requestPasswordReset` calls Supabase's `resetPasswordForEmail`. The answer is the same for a
  known and an unknown address. The link in the email lands on `/auth/confirm` like every other.
- **Prices on the cards.** `priceForCopy` in `src/lib/api-shapes.ts` picks one number per copy from
  the API's `price`/`priceHolo` (the Near Mint midpoint, else the market price; a holo or
  reverse-holo copy takes the holo price) and `formatPrice` writes it as `€12.50`. Shown on the grid
  tile, as a "Price" column in the table and as a "Price" row in the detail panel. The public
  profile still carries no price: its routes never send one.
- **The API reference lives here now**, at `/docs/api`: `src/lib/api-reference.ts` reads the
  contract from `https://api.cardorb.com/openapi.yaml` (fetched once an hour) and the page draws
  it in the legal-page shell, which gained an optional version line and an "API" footer link.
  `api.cardorb.com/` redirects here.
- **The web app moved onto the API.** `lib/cards.ts`, `collections.ts`, `profile.ts`,
  `public-profile.ts`, `pokedex.ts` and every server action call `api.cardorb.com`; `pokemontcg.ts`
  is gone (the API matches a card against three catalogues and picks the picture and the price).
  Adding a card sends name, set and number; the API does the rest. The Pokédex comes from the
  catalogues rather than a stored number. The public page reads the three unkeyed public routes.
- Earlier the same day: `/auth/confirm` and `/reset-password` (#15), where every auth email lands.

## Next

Backlog from the review, ranked. Each is one PR.

- A "Collection value" tile on Home needs a `value` on `GET /v1/stats` in `cardorb-api`; summing a
  page of 100 here would lie about a collection of 1,936.
- The `wishlist` and `pokedex_numbers` columns on `cards` are no longer written or read by
  anything; a migration that drops them belongs in `cardorb-api`, which owns the schema.
- Landing page: move the signed-in redirect into the middleware so `/` prerenders (LCP 3.1 s → ~2.3 s).
- `robots.ts`, `sitemap.ts`, an `opengraph-image`, own titles for `/login` and `/signup`, and drop the
  doubled " · Cardorb" on `/user/[username]`.
- Untitled UI kit: 190 of 252 vendored files are unreferenced and keep recharts, motion, embla,
  qr-code-styling and input-otp alive (~38 MB). Policy: keep what is imported, re-fetch through the
  MCP when needed. Write it as a line under R-STRUCT-001, then one deletion PR.
- First tests in `src/lib` (`formatDate`, the `.or()` search escaping, the pokemontcg client with a
  mocked fetch), then drop `--passWithNoTests`.
- Small: `POKEMONTCG_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` in `.env.example`; `.gitignore`
  `.env` / `.env.*` / `!.env.example`; GitHub description + topics; README to the documentation
  template; delete or document `scripts/backfill-*.mjs`; one `useDebouncedSearch` hook for the four
  copies; confirmation before deleting a collection; pagination on favorites/wishlist/collection
  detail/public profile (all cap at 100 while showing the full count); the signup "Name" field is
  never read.
- Parked from earlier: iOS-style mobile page header (4 open questions), 13 promo cards without art,
  wishlist count on Home.

## Open

- Supabase side is recorded in `docs/supabase.md`: anon holds column-level SELECT on the public
  card columns only, the `avatars` bucket has type and size limits, the SECURITY DEFINER functions
  are not callable by anon. Still a dashboard click: leaked password protection.
- The first signup after 2026-09-02 verifies that revoking EXECUTE on `handle_new_user()` did not
  break the profile trigger; if it did, `grant execute on function public.handle_new_user() to
  authenticated` restores it.
- The Vercel preview check went green on #19; the `NPM_RC` note for Preview is resolved.
- Rotate the Supabase service-role key that was once pasted in chat.
