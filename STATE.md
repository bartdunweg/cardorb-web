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

**Live at https://cardorb.com** on Vercel project `cardorb-web`, `main` is production. `/api/v1`
is proxied to the previous app on `api.cardorb.com` (R-DEPLOY-001); the iOS client and
bartdunweg.com keep working through it.

## Last session

- Went live: PR #2 merged, production build green, `cardorb.com` + `www` moved from project
  `cardorb` to `cardorb-web`. Checked: landing 200, `/dashboard` redirects to login, `/api/v1`
  answers the same body through `cardorb.com` and `api.cardorb.com`, `/api/v1/collection` 401
  without a token. `www` now redirects to the apex from `vercel.json`.
- Meridian setup from `/meridian:start`: `CLAUDE.md` rewritten in the Meridian format (85 lines,
  domain terms and two principles from the owner's interview), `AGENTS.md` reduced to a pointer,
  `.claude/settings.json` lists the installed plugins (`interfaces`, `elements-of-style`,
  `emil-skills`; the old `interface-details` name matched nothing). Lint was already strict.
- Linked this directory and the GitHub repo to the existing (empty) Vercel project `cardorb-web`.
- Added `vercel.json`: framework `nextjs`, `pnpm install --frozen-lockfile`, and a rewrite of
  `/api/v1/*` to `https://api.cardorb.com/api/v1/*`. New rule **R-DEPLOY-001** records why.
- `middleware.ts` no longer runs on `/api/`: nothing there needs a Supabase session.
- Attached `api.cardorb.com` to the old `cardorb` Vercel project. Its `.vercel.app` address sits
  behind Vercel SSO (`all_except_custom_domains`), so the proxy needs a custom domain there.
- README gained a "Deploying" section listing the four production env vars, including `NPM_RC`
  for the private `@strakzat` package.
- `./scripts/verify.sh` green.

## Next

- Owner: sign in on https://cardorb.com once to confirm the Supabase redirect URLs are right.
- `NPM_RC` is set for Production only; PR previews fail at install until it is added for Preview.
- Point the iOS app at `https://api.cardorb.com/api/v1` directly (in `bartdunweg/cardorb-ios`),
  so the rewrite can eventually go.
- Parked from earlier: iOS-style mobile page header (4 open questions), 13 promo cards without
  art, wishlist count on Home / add-to-wishlist from a card's detail.

## Open

- `cardorb.com` will show a different product with real accounts where a single-passcode site
  used to be; the old app stays reachable only through `api.cardorb.com`.
- Untitled UI PRO license + Supabase service-role key were pasted in chat earlier — rotate if you care.
