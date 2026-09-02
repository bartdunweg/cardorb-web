# State

Where this project stands right now. Read it at the start of a session; update it at the end.
This file is deliberately short — it orients, it does not document. The rules that apply now
live in `CONVENTIONS.md`.

Rewrite it in place. This file has no history worth keeping; the history is in git.

## Now

Trading card management web app on Next.js 16 + React 19 + Tailwind 4 + Untitled UI (PRO).
Supabase connected (project `fprjroupecdhosfdrqhv`), RLS-scoped `cards`/`collections` with ~1960
imported cards. Live features: public landing, protected app shell, Home, Cards, Collections,
Favorites, Wishlist, Pokédex, command-palette search, Settings, public profile at `/user/[username]`.

**Live at https://cardorb.com** on Vercel project `cardorb` (the previous app is `cardorb-api`),
`main` is production. `/api/v1`
is proxied to the previous app on `api.cardorb.com` (R-DEPLOY-001); the iOS client and
bartdunweg.com keep working through it.

## Last session

- **Auth email links land here now.** One Supabase project serves the website, the iOS app and the
  API, and every auth email links to `{{ .SiteURL }}/auth/confirm` — a route of the previous app,
  which was removed from `cardorb-api` the same day cardorb.com moved here. `src/app/auth/confirm`
  verifies the token and lands by link type (`src/lib/auth-redirect.ts`, tested): recovery on the
  new `/reset-password` page, which sets a password without asking for the old one; an address
  change on Settings; a sign-up on the dashboard. The templates' `next=` values name the old
  app's routes and are ignored on purpose. `/login?error=` shows why a link failed.
- Previous: four review agents audited the repo; the blocking half shipped as six PRs (#7–#13).
  Lesson kept: gate a merge on the GitHub `check`, not on `--fail-fast` — the Vercel preview check
  is red by design (no `NPM_RC` for previews).

## Next

Backlog from the review, ranked. Each is one PR.

- The API reference at `/docs/api`, in this site's theme, read at build time from
  `https://api.cardorb.com/openapi.yaml`; then `api.cardorb.com/` points here. The previous
  renderer is in `cardorb-api` at `40cc85d`, `src/app/docs/api/`.
- A "Forgot password?" link on `/login` that calls `resetPasswordForEmail`; today only the iOS app
  and the API can send that email.
- Landing page: move the signed-in redirect into the middleware so `/` prerenders (LCP 3.1 s → ~2.3 s).
- `robots.ts`, `sitemap.ts`, an `opengraph-image`, own titles for `/login` and `/signup`, and drop the
  doubled " · Cardorb" on `/user/[username]`.
- Card images through `next/image` with `remotePatterns` for `images.pokemontcg.io` (165 KB PNG per
  thumbnail today; a 100-card grid is ~16 MB).
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
- `NPM_RC` is set for Production only; PR previews on Vercel fail at install until it is added for
  Preview. Harmless, but every PR shows a red Vercel check.
- Rotate the Supabase service-role key that was once pasted in chat.
