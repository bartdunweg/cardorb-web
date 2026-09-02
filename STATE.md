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

- Four review agents (conventions, security, project setup, performance/SEO) audited the repo.
  The blocking half shipped as six PRs (#7–#13): Next.js 16.3.4 (0 audit findings), the public
  profile selects public card columns only (`PublicCard`), collection list/delete/move scoped on
  the user (R-SEC-002), three dead controls removed and the empty Cards page given its action,
  dialog titles / `aria-current` / live regions / a labelled favourite star, and password change
  that proves the current password plus a bounded avatar upload.
- Lesson recorded in the merge loop: gate a merge on the GitHub `check`, not on `--fail-fast`,
  because the Vercel preview check is red by design (no `NPM_RC` for previews). One lockfile
  mismatch reached main for a few minutes (#10 fixed it); the live site never changed.

## Next

Backlog from the review, ranked. Each is one PR.

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

- Supabase-side controls the repo cannot show: the `cards` SELECT policy (does the anon role read
  private columns of public profiles' rows?), `avatars` bucket `allowed_mime_types` /
  `file_size_limit` and a path-per-user storage policy, "secure password change" in Auth settings.
  Worth a `docs/schema.md` or the SQL itself so a reviewer can verify R-SEC-002.
- `NPM_RC` is set for Production only; PR previews on Vercel fail at install until it is added for
  Preview. Harmless, but every PR shows a red Vercel check.
- Rotate the Supabase service-role key that was once pasted in chat.
