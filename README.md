# Cardorb

Web app for keeping track of a Pokémon card collection: the cards you own, sorted into folders, a
wishlist, a Pokédex of which Pokémon you hold cards of, and a public page that shows your collection
to others. Built for one collector today, with accounts so others can join. Runs at
https://cardorb.com; cards, folders and profiles come from the Card Orb API
(`bartdunweg/cardorb-api`), the same API the iOS app uses.

## Requirements

- Node 24 (see `.nvmrc`) and pnpm
- A GitHub token with `read:packages`, because `@strakzat/eslint-config-ui` is a private package on
  GitHub Packages. Put it in `~/.npmrc` as `//npm.pkg.github.com/:_authToken=<token>`.
- Access to the Vercel project `cardorb` (team `bartdunweg`) for the environment values

## Getting it running

```bash
git clone git@github.com:bartdunweg/cardorb-web.git
cd cardorb-web
pnpm install
vercel env pull .env.local --environment=development   # or copy .env.example and fill it in
pnpm dev
```

The app runs on http://localhost:3000. Sign in with a Cardorb account; there is no seed data, the
cards are the API's.

## Environment variables

| Variable | Required | Where it comes from |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Supabase project, Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | Supabase project, Settings → API (the public anon key) |
| `NEXT_PUBLIC_SITE_URL` | no | `https://cardorb.com` in production; defaults to `http://localhost:3000` |
| `CARDORB_API_URL` | no | Defaults to `https://api.cardorb.com/v1`; point it at a local checkout of `cardorb-api` to develop both |
| `NPM_RC` | Vercel only | `//npm.pkg.github.com/:_authToken=<token with read:packages>`; without it `pnpm install` fails on Vercel |

Supabase is used for sign-in and the session only. The session's access token is the API's bearer,
so one Supabase project serves the website, the iOS app and the API.

## Scripts

| Script | Does |
|---|---|
| `pnpm dev` | Dev server with Turbopack on http://localhost:3000 |
| `pnpm build` | Production build |
| `pnpm start` | Serves the production build |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm lint` | ESLint (`@strakzat/eslint-config-ui`, strict) and Prettier check |
| `pnpm format` | Prettier write |
| `pnpm test` | Vitest |
| `./scripts/verify.sh` | The whole gate CI runs: secrets, typecheck, lint, test, build, conventions. Exit 0 whole, 1 broken, 2 a check could not run |

## Structure

```
src/
├── app/              # routes: (auth) login/signup, (app)/dashboard/*, user/[username], docs/api
├── components/app/   # our own shared components, the only lint-policed UI folder
├── components/…      # the vendored Untitled UI kit; only what is imported stays (R-STRUCT-001)
├── hooks/, utils/    # small shared helpers, ours and the kit's
├── lib/              # api.ts (the API client), api-shapes.ts (its answers → what screens render), Supabase clients
└── styles/           # globals.css, theme.css (tokens), typography.css
```

`CLAUDE.md` holds the project instructions, `CONVENTIONS.md` the rules with an ID that
`scripts/verify.sh` checks, `STATE.md` where the work stands. `docs/untitledui.md` covers how the
kit is composed, `docs/supabase.md` what was applied on the Supabase side.

## Deploy

Merging to `main` deploys to production at https://cardorb.com through Vercel (project `cardorb`,
region `dub1`, next to the API). Every pull request gets a preview URL; previews carry `noindex`.
CI (`.github/workflows/ci.yml`) runs `scripts/verify.sh` on every pull request and is the merge
gate.

`/api/v1/*` is not served by this app: `vercel.json` rewrites it to `https://api.cardorb.com`,
because the iOS app and bartdunweg.com read the API from `cardorb.com` (R-DEPLOY-001).

The Supabase project must list `https://cardorb.com/**` and `https://*-bartdunweg.vercel.app/**`
under Authentication → URL Configuration → Redirect URLs, or sign-in on a deployed site fails.

Rolling back: promote the previous deployment in the Vercel dashboard. That is faster than a
revert commit.

## Known limitations

- A "collection value" tile, and sorting and filtering on the cards page, wait for the API to
  carry a total and the parameters (`GET /v1/stats`, `GET /v1/cards`).
- The public page shows no prices, on purpose: the public routes never send one.
- Leaked-password protection in Supabase is still off; it is a dashboard switch.
