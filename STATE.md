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

- **Four small things a user meets.** Deleting a folder asks first and says the cards stay. The
  name asked at sign-up travels as user metadata and, when a session comes back, is set on the
  profile straight away. Favorites, Wishlist, a folder and the public profile page on `?page=`
  through one `CardsPagination`, the same as Cards; the profile's canonical names its page. The
  three `scripts/backfill-*.mjs` are gone: they wrote to the database directly, against
  R-DATA-003, for columns nothing reads any more.
- **The landing prerenders and the public pages carry their metadata.** The signed-in redirect on
  `/`, `/login` and `/signup` lives in the middleware now, so `page.tsx` at the root touches no
  session and builds static. `robots.ts`, `sitemap.ts` (the six public pages) and a generated
  `opengraph-image`; own titles and descriptions for `/login` and `/signup`; a canonical on every
  public page; the profile page gets its own OG title and the brand only once. Preview deploys
  carry `noindex`. Dev port is 3210: the portfolio project's server took 3111 and 3112.
- **Mobbin pattern check** over every page (Bart wants this as a standing check, see memory). Three
  PRs came out of it: the market price carries the name's weight on the tile and sits under the
  title in the panel; the public profile shows display name, handle and "cards · sets"; the
  Pokédex has a progress bar and the Cards count sits by the search. Settings, forgot-password and
  Home already follow their references. Still open from the check: sort and set/rarity filters on
  Cards, which need parameters on `GET /v1/cards` first.
- **Card pictures through the image optimizer, and the functions in Dublin (#21).** A performance
  review found the pictures came straight from `assets.tcgdex.net` — one server in France, no CDN,
  unreachable that day — and the functions ran in `iad1` while the API sits in `dub1`. Every card
  `<img>` is now `CardImage` (`src/components/app/card-image.tsx`) over `next/image`, with the
  allowed hosts in `next.config.mjs`; `vercel.json` pins `regions: ["dub1"]`. One thumbnail went
  from 176 KB PNG to 23 KB WebP.
- **The layout's answers are kept per person (#26).** Profile, folders and stats go through
  `perUser()` in `src/lib/user-cache.ts`: five minutes under one tag per user id, and every
  server action that writes calls `forgetMine()`, which drops the tag with `updateTag` and
  revalidates the layout. `src/app/(app)/dashboard/loading.tsx` shows the outline of a grid while a
  page still fetches. Not measured with a session; the first signed-in visit after deploy is the
  check that a write shows up on the next screen. Still open: JS on first load is 228 KB Brotli
  against a 150 KB budget.
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
- Untitled UI kit: 190 of 252 vendored files are unreferenced and keep recharts, motion, embla,
  qr-code-styling and input-otp alive (~38 MB). Policy: keep what is imported, re-fetch through the
  MCP when needed. Write it as a line under R-STRUCT-001, then one deletion PR.
- First tests in `src/lib` (`formatDate`, the `.or()` search escaping, the pokemontcg client with a
  mocked fetch), then drop `--passWithNoTests`.
- Small: GitHub description + topics; README to the documentation template; one
  `useDebouncedSearch` hook for the four copies.
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
