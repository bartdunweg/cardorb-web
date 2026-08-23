# State

Where this project stands right now. Read it at the start of a session; update it at the end.
This file is deliberately short — it orients, it does not document. The rules that apply now
live in `CONVENTIONS.md`.

Rewrite it in place. This file has no history worth keeping; the history is in git.

## Now

Trading card management web app on Next.js 16 + React 19 + Tailwind 4 + Untitled UI (PRO).
Foundation is in place: black/white brand, Supabase auth wiring, login/signup, protected app
shell with theme toggle. No card/collection features yet. Supabase project not yet connected.

## Last session

- Brand set to grayscale (near-black light / near-white dark): remapped `--color-brand-*` to the
  neutral ramp, pushed solid-brand to the extremes, fixed `button.tsx` primary to flip text to
  black in dark. Verified visually on `/login` in both modes.
- Added Supabase (`@supabase/ssr`) client/server/middleware, root `middleware.ts` (session
  refresh + auth gate), zod validation, email+password `/login` + `/signup` + sign-out, protected
  `(app)` shell with theme toggle. Real app metadata in `layout.tsx`.
- Tooling: ESLint (native flat config, eslint 9) scoped to our code; Vitest with
  `--passWithNoTests`; both added to `scripts/verify.sh`.
- Removed the Untitled UI sync workflow so nothing overwrites `theme.css`.
- `./scripts/verify.sh` all green (secrets, typecheck, lint, test, build, conventions, standards).

## Next

- Connect Supabase: authorize the MCP via `/mcp`, create/select the project, fill `.env.local`
  (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`). Without env, `/` returns 500 by
  design; `/login` and `/signup` render.
- Create `collections` and `cards` tables with RLS keyed to `auth.uid()`.
- Build the first feature (collections/cards) under `src/app/(app)` + `src/lib`.
- Set up Vercel: link project, add env vars, enable preview deploys.

## Open

- Supabase project + env not set yet (blocks `/` and real auth end-to-end).
- Vercel not linked yet.
- Untitled UI PRO license was shared in chat during setup — rotate it.
- Auth is email+password; magic-link is a small variant if wanted later.
- `postcss.config.mjs` has one non-blocking eslint warning (anonymous default export); left as-is.
