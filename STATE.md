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
Supabase is auth and the session only. `src/lib/api.ts` is the client, `src/lib/api-shapes.ts`
turns the API's answers into what the screens render, zod at every boundary.

Live: landing, Home, Collection, Browse, Binders, Favorites, wishlist, Pokédex, set pages,
command-palette search, Settings, public profile, and `/dashboard/design` — the design system,
reachable only by typing the address (see `CLAUDE.md`).

## Last session

**2026-09-10 and 11.** The API had never been audited. It was, twice — once for security, once
for the failures that leave no trace — and everything both passes found is closed.

- **A signed-in stranger could read every private column of any public collection** — purchase
  price, notes, condition, grade, the wishlist — straight from PostgREST, around this API and
  around the layer that exists to strip exactly those fields. Measured on the live database, not
  read off the migrations: the policy applied to every role, and `authenticated` held select on
  all 28 columns against `anon`'s 13. Closed and applied (cardorb-api#251). Public reads already
  went through the service-role client, so the branch that opened it bought nothing.
- **Three more doors** (cardorb-api#255): the public collection ignored the wishlist switch,
  changing a password asked for the old one only if the caller offered it, and reserved usernames
  held on the claim path but not at signup. Both migrations of the day are **applied and
  verified in the database**.
- **Two valuations wrote to the same daily row** (cardorb-api#256). The script priced from one
  market where the cron blends two, and used a different reverse-holo rule. On a €100 card that is
  +12.1%; under €20 it reverses to −7.2%, so the error's size *and direction* depended on what you
  hold. The script records nothing now. One bad night also valued a whole collection on one
  market, permanently — the quiet period is per set with a breaker.
- **Languages, step 2** (cardorb-api#257, web #308). A card off the Japanese, Korean or Chinese
  shelves can be added. The wall was that the collection found a set by its English name; the way
  past was already in the table, because a row carries `tcg_id` and a TCGdex id names its own set.
  English rows are untouched and sets with no English card are now *cheaper*. Ownership marks were
  wrong both ways and are right. **cardorb-api#259 is open**: the Pokédex slot, which needed the
  1,025 species in those languages (PokéAPI's CSV already had them).
- **A test that guards the wrong thing** (cardorb-api#258). Five of them, and the sharpest mocked
  the payload it was meant to inspect — so the suite was green with the field-stripping deleted.
  Each is now checked by breaking what it guards and watching it go red. The ten undocumented
  statuses were fixed by a mechanism rather than one at a time: the spec test reads each handler's
  own source, and found two the review had missed.
- **The web got lighter** (#306). The card sheet was in the first load of every page with a grid:
  the public profile went 389.4 KB → 255.6 KB Brotli, measured by rebuilding. Tiles asked for
  384 px pictures into a 104 px box — about a megabyte a page on a phone. `global-error.tsx` and
  a frame for the public profile, which had neither.
- **Thirteen accessibility findings** (#301, #302), none of which `jsx-a11y` could catch. Two
  Level A: no skip link, and the card sheet's arrow keys stealing ← and → from the price chart,
  which made that chart's text alternative unreachable.
- **235 leftover branches deleted** across both repositories. One of them had the name a new
  branch wanted, and a pull request landed on three-day-old work because of it.

## Next

- **Condition and grade do not reach the price.** A Poor copy and a PSA 10 show what a Near Mint
  one does. Neither Cardmarket nor TCGplayer publishes either — checked, both feeds carry
  printing and no condition. PokemonPriceTracker does, RAW and PSA, at $9.99 a month, from the
  American market. **Needs a decision before it needs code.**
- **Step 2b, the rest of it.** The language set page shows no prices (that browse surface prices
  through a guide keyed by English ids, while the per-card figures exist); a Cardmarket link falls
  back to searching the Japanese name; and `zh` is one code for two catalogues, so traditional is
  asked before simplified. Splitting it properly widens an enum the iOS app decodes, which is a
  decision rather than a side effect.
- **A privacy flip made in the iOS app is invisible here for five minutes.** `forgetMine()` drops
  the public tag on writes made through this app; the same API serves iOS and invalidates nothing
  here. Wants a revalidation webhook from cardorb-api.
- **One acquired date is wrong.** A Fomantis copy reads 2026-09-08 and was got on the 7th — a
  mis-click while testing undo. Two taps in the sheet: Details → Acquired.

## Open

- **The holo CSS is GPL-3.0.** Accepted while Cardorb is free; before it charges, swap the folder
  for an own implementation of the same recipe or write to @simeydotme. It also ships on every
  route for 5.4 KB Brotli while only the card sheet uses it — moving it out of the Tailwind entry
  changes the cascade, so that wants a pair of eyes on the effect, not a blind edit.
- **A revoked session stays open on the web for up to an hour (#79).** Both the middleware and
  the API verify the token locally with `getClaims`. To shorten it: lower the JWT expiry in the
  Supabase project.
- **Clearing a search back to the full list is still silent** to a screen reader. The mechanism is
  right and the condition is wrong: it asks "is this list filtered" where the question is "did the
  reader change this list, or arrive at it". Answering it properly needs a comparison React will
  not allow during render, and every legal way round changes whether *arriving* is announced —
  which is a judgement that wants a screen reader, not a guess.
- **Chrome still exposes the sidebar kit's unnamed `<aside>` as a nested `complementary`** inside
  the `<nav>`. HTML-AAM says `generic`; removing it needs the vendored file.
- **Verified this session, so nobody need re-check:** cardorb-api scopes card writes by
  `id AND user_id` *and* by RLS, with `cards.user_id` defaulting to `auth.uid()`; the service-role
  key is reachable from two routes and neither touches cards; HSTS is set on both hosts; and the
  `/api/v1/*` rewrite is not a CSRF surface — the API answers 401 to a cookie with no bearer.
- Supabase's own side is in `docs/supabase.md`. The advisor still lists few MFA options and
  `citext` in `public`; neither is on the list.
- Accepted accessibility decisions live in `docs/accessibility-decisions.md` and are not raised
  again. Deliberate departures from the kit carry `kit-drift: <why>` in a comment; two exist, and
  `scripts/kit-drift-baseline.json` is at zero.
