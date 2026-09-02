# cardorb-web

A trading card management web app — browse, organize, and manage trading card collections.
Built with [Next.js](https://nextjs.org/) (App Router), [Untitled UI React](https://www.untitledui.com/react),
and Tailwind CSS v4.

## Getting started

```bash
pnpm install
pnpm dev        # http://localhost:3000
```

Other commands: `pnpm build`, `pnpm typecheck`, `pnpm lint` (Prettier check), `pnpm format`.
Run `./scripts/verify.sh` for the full health gate.

See `CLAUDE.md` for project instructions, `CONVENTIONS.md` for the rules that apply now, and
`STATE.md` for where the work currently stands.

## Deploying

The app runs on Vercel, project `cardorb` in the `bartdunweg` team, connected to this
GitHub repository: every pull request gets a preview URL and `main` is production at
https://cardorb.com. `vercel.json` sets the framework and install command.

Production needs four environment variables, set in the Vercel project (never in the repo):

| Name | Value |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | the Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | the Supabase anon (public) key |
| `NEXT_PUBLIC_SITE_URL` | `https://cardorb.com` |
| `NPM_RC` | `//npm.pkg.github.com/:_authToken=<GitHub token with read:packages>` |

`NPM_RC` exists because `@strakzat/eslint-config-ui` is a private package on GitHub Packages;
without it `pnpm install` fails on Vercel, the same reason CI carries `PACKAGES_TOKEN`.

The Supabase project must list `https://cardorb.com/**` and
`https://*-bartdunweg.vercel.app/**` under Authentication → URL Configuration → Redirect URLs,
or sign-in on the deployed site fails.

`/api/v1/*` is not served by this app. `vercel.json` rewrites it to `https://api.cardorb.com`,
where the previous Cardorb app still runs (Vercel project `cardorb-api`), because the iOS app and bartdunweg.com read that API
from `cardorb.com` (see R-DEPLOY-001 in `CONVENTIONS.md`).
