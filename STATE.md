# State

Where this project stands right now. Read it at the start of a session; update it at the end.
This file is deliberately short — it orients, it does not document. The rules that apply now
live in `CONVENTIONS.md`.

Rewrite it in place. This file has no history worth keeping; the history is in git.

## Now

A Pokémon card collection on Next.js 16 + React 19 + Tailwind 4 + Untitled UI (PRO).
**Live at https://cardorb.com**, Vercel project `cardorb`, `main` is production.

Cards, binders and profiles are read and written through the Card Orb API
(`bartdunweg/cardorb-api`, api.cardorb.com), the same API the iOS app uses (R-DATA-003).
Supabase is auth and the session only; the same project signs both, so the session's access
token is the API's bearer. `src/lib/api.ts` is the client, `src/lib/api-shapes.ts` turns the
API's answers into what the screens render, zod at every boundary.

Live: landing, Home, Collection, Browse, Binders, Favorites, wishlist, Pokédex, set pages,
command-palette search, Settings, public profile, and `/dashboard/design` — the design system,
reachable only by typing the address (see `CLAUDE.md`).

## Last session

**2026-09-08.** Six pull requests, and two audits on ground nobody had looked at.

- **The app answers when you cannot see the answer** (#297, #301, #302). There is a toast, with
  one rule: a change you can see gets none. Nine files wire it. `Undo` on removing a card puts
  the row back **whole** — the API's delete hands back the row it removed and a create can now
  carry an acquired date (cardorb-api#248), so nothing is kept anywhere. Deliberately not a soft
  delete: that would put "deleted" behind every read in a database the iOS app also reads.
- **Every control belongs to the design system** (#299, #300). R-UI-001 says the whole rule now
  and `verify.sh` enforces it: `scripts/kit-drift.mjs --check` against a baseline that only
  shrinks. **The baseline is zero.** What the kit has, we use; what it does not, is a named
  component of ours marked as ours — `CardTile`, `CopyRow`, `SearchTrigger`, `FormError`,
  `AuthShell`. `/dashboard/design` shows all 29, each labelled.
- **A profile turned private stayed publicly readable for five minutes** (#299). Public reads
  carry `public:<username>` now and every write drops it.
- **The session cookie was readable by any script** (#300). Measured on the running app, not
  reasoned about. `@supabase/ssr` defaults to `httpOnly: false` for its browser client; we have
  none. The public profile also had no script policy, on a premise that was wrong — it does not
  prerender, it reads cookies, so it takes a nonce like every other per-request route.
- **Accessibility** (#301, #302). Thirteen findings, **none of which `jsx-a11y` could catch**.
  Two Level A: no skip link, and the card sheet's arrow keys stealing ← and → from the tabs and
  the price chart, which made that chart's text alternative unreachable. Also: a checkbox and a
  radio were **invisible when selected in the dark theme** (1.02:1, now 20.12:1) — found by
  building the design page, and live in `rarity-picker` and every selectable table row.
- **Forty kilobytes off ten routes** that cannot open a card sheet (#299), and the day's
  deduplication: eleven copies of one alert paragraph, four identical auth shells (286 → 168
  lines), ten of one number formatter, eight of one facets literal.

## Next

- **Condition and grade do not reach the price.** A Poor copy and a PSA 10 show what a Near Mint
  one does. Neither Cardmarket nor TCGplayer publishes either — checked, both feeds carry
  printing and no condition. PokemonPriceTracker does, RAW and PSA, at $9.99 a month, from the
  American market. Needs a decision before it needs code.
- **Languages, step 2.** Another language's catalogue is read-only: you cannot add such a card
  (the assembly resolves facts by English set name against TCGdex `en` and needs the row's
  language to pick the catalogue), search is not per language, and prices exist for Japanese
  (Cardmarket ids in TCGdex's pricing block) but next to none for Chinese.
- **No rate limiting anywhere.** `readListQuery` accepts any page number with no ceiling, and
  `?list=pokedex` fans one anonymous request out to `ceil(total / 500)` API calls. An
  unauthenticated walk of `?page=&q=` bills Vercel and can push the API over. Cap the page,
  answer empty past the total, add a Vercel Firewall rule on `/user/*`.
- **The public Pokédex tab breaks for a logged-out visitor.** `lib/pokedex.ts:12` reads the dex
  names through `perUser`, which throws 401 without a session, on a page anyone can open.
- **The avatar upload trusts the declared type** and its 4,000,000-character cap decodes to ~3 MB
  while the message says 2 MB. Small — the bucket is another origin — but both are one line.
- **JS on first load is 228 KB Brotli** against a 150 KB budget.

## Open

- **The holo CSS is GPL-3.0.** Accepted while Cardorb is free; before it charges, swap the folder
  for an own implementation of the same recipe or write to @simeydotme.
- **A revoked session stays open on the web for up to an hour (#79).** Both the middleware and
  the API verify the token locally with `getClaims`, so a sign-out everywhere, a ban or a
  password change is felt on the next token refresh. To shorten it: lower the JWT expiry in the
  Supabase project.
- **A privacy flip made in the iOS app is invisible here for five minutes.** `forgetMine()` drops
  the public tag on writes made *through this app*; the same API serves iOS and invalidates
  nothing here. Wants a revalidation webhook from cardorb-api.
- **Two accessibility gaps, both written down rather than hidden.** Clearing a search back to the
  full list is still silent (the list is keyed, so the live region is replaced, not updated), and
  Chrome still exposes the sidebar kit's unnamed `<aside>` as a nested `complementary` inside the
  `<nav>` — HTML-AAM says `generic`; removing it needs the vendored file.
- **Not verified, and each needs a running system**: that cardorb-api scopes
  `/v1/collection/items/{id}` by `id AND user_id` rather than id alone (a card id from a public
  profile is in that page's payload, so a signed-in stranger has one to hand); that Vercel sets
  HSTS; and that the `/api/v1/*` rewrite, which sends cookies to api.cardorb.com from our origin,
  never meets a route there that accepts a cookie as a credential.
- **`img-src` allows all of `https://*.supabase.co`.** Images only, and the optimizer pins the
  path, but it should name our project.
- Supabase's own side is in `docs/supabase.md`. The advisor still lists few MFA options and
  `citext` in `public`; neither is on the list.
- Accepted accessibility decisions live in `docs/accessibility-decisions.md` and are not raised
  again. Deliberate departures from the kit carry `kit-drift: <why>` in a comment; two exist.
