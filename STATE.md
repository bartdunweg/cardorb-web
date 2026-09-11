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
  wrong both ways and are right. The Pokédex slot followed (cardorb-api#259): the 1,025 species
  in those languages, from the PokéAPI CSV the English list already came from, longest name first
  so ミュウ does not swallow ミュウツー.
- **A Japanese set page has prices** (cardorb-api#261). It showed a blank line under every card
  while Cardmarket priced them — all 92 of one set were in the guide the API downloads daily —
  because the only map from a card to its Cardmarket product held English cards somebody owns.
  A script asked TCGdex once about every card on the four shelves (21,333) and committed the
  product of each, one map per catalogue since the ids collide: ja 10,350 of 12,781, zh-tw
  3,861 of 7,436, zh-cn 742 of 877, ko all 239. The page pays no request it did not pay before.
  Nothing changed on the web: it rendered whatever price the API sent, which was null.
- **A Japanese set has its pictures** (cardorb-api#262). TCGdex had no file behind 41 of 72
  sampled Japanese cards, whole sets at a time; Limitless has them at a guessable address, and
  a set TCGdex has not photographed now shows those. One probe per set. Chinese (44 of 60
  missing) and Korean are not on Limitless; the odd gap in a photographed Japanese set stays.
- **Search, the English shelf and the second-market price left pokemontcg.io** (cardorb-api#260,
  #266, #268, #270). Measured on 2026-09-11: that host answered 500 or 502 to three requests in
  five, so a search for "charizard" failed all three attempts about half the time — and the web
  turned the failure into "No cards found". TCGdex answers the same questions in ~200 ms: search
  by name with the set and the type as filters, the 203 English sets with logos and release dates,
  and TCGplayer's price relayed per card. Set ids are TCGdex's now (`sv03.5`, `me05`); the old
  ids still open the same page. TCGdex also carries Pokémon TCG Pocket, the mobile game's fifteen
  sets — Bart's call: left out of the shelf, the set pages and the search. Ownership on the shelf
  joins by set id, checked against the old counts (Black Bolt 170 of 172, 151 207 of 207). Only
  set logos and a scan fallback still ask pokemontcg.io, behind a day-long cache.
- **A failed search is not an empty one** (#312, #316, #317, #318). Every search box says "The
  card service didn't answer" with Try again where it used to say "No cards found"; the palette
  says how many it found, loads the next twenty as you scroll, and can add to the wishlist. The
  keyboard stays in the field after a button. Measured in the pane against a dead API URL and
  then the live one.
- **A card with no picture lies face down** (#314). Bart's call: the official back from
  tcg.pokemon.com, a static file, in the set page, the grid, the Pokédex and the sheet, where a
  grey box with the name in it read as "nothing here". `CardImage` draws it itself once both of
  its sources fail. Prices untouched. Measured on S7R (zh-tw): 22 backs, 0 broken images.
- **An owned Japanese card from an unphotographed set** shows Limitless's scan too
  (cardorb-api#264): the collection resolves a card on its own, so it probes once per card,
  cached a day, where the shelf probed once per set.
- **The holo effect's CSS travels with the sheet** (#327), not with every page: the shared
  stylesheet 260 → 204 KB (37.4 → 30.8 KB gzip), confirmed on production. The GPL question stands.
- **Measured, so nobody need re-check:** of 1,946 rows with a catalogue id, 1,924 are English
  and 22 carry no language (all English ids); none is Japanese, Korean or Chinese. No `zh` row
  exists, and no row lost its language to the bug #269 fixed — nothing from those shelves had
  been added yet. A script to pin `zh` rows to their catalogue was written and dropped: it had
  nothing to act on.
- **Chinese is two languages** (cardorb-api#269, web #326). Bart's call, and it turned out to
  be a fix: a card added from a Chinese shelf arrived as `zh-tw`, failed a list that knew only
  `zh`, and was stored with no language — then looked up as an English card by its set's name.
  `zh-tw` and `zh-cn` are languages now, each asking its own catalogue; `zh` stays for old rows
  and asks both. The note that held this back feared an enum the iOS app decodes; checked, it
  decodes no language field at all. Old `zh` rows are not rewritten.
- **Every shelf reads in English** (cardorb-api#275, web #338). Bart's call: the app is English
  throughout, and a Japanese set page named its cards リザードンex. The API names a Japanese,
  Korean or Chinese card off Cardmarket's product list (through the committed product id maps)
  or, failing that, its species and printed suffix — 12,308 of 12,781 Japanese cards, 6,582 of
  7,436 Traditional Chinese, 823 of 877 Simplified, all 239 Korean; the rest, old-era trainers
  mostly, keep their printed name. The eras are English too (Scarlet & Violet, not ポケモンカード
  ゲーム スカーレット&バイオレット). The printed name travels as `localName` and the sheet shows
  it in brackets after the English one — "Oddish (ナゾノクサ)" — on a set page's card, owned or
  not; a collection row stores one name, English from now on. Set names still come off the
  hand-kept lists: SV4a is Shiny Treasure ex now (TCGdex mislabels it), and the 46 Simplified
  Chinese sets and three coming MEGA sets have no English name yet. Measured in the pane against
  the API worktree: SV4a in Japanese, 320 English names, the sheet's bracketed heading.
- **…and the rest of the way** (cardorb-api#279, web #341). A collection row off those shelves
  carries the printed name too, so its sheet reads the same brackets. The palette's language chips
  (#336) now find a card by the English name the app shows it under: "charizard" on the Japanese
  shelf answers 67 Lizardons — the API scans its committed names, no request, and reads only the
  sets on the page shown; a term in the shelf's own script still asks TCGdex. The 46 Simplified
  Chinese sets have English titles now, literal renderings flagged as such; M3 (ムニキスゼロ) still
  does not, CP5 does (cardorb-api#282, which also drops TCGdex's fifteen cloned placeholder sets
  from the shelves). Measured in the pane against the API worktree. Then Bart's call: the
  language is a filter chip like Set and Type, the kit's, not a row of flags (web #344); the Set
  chip lists the chosen shelf's sets and the API keeps to it (cardorb-api#284). Type stays
  English-only: TCGdex publishes no types on the other shelves. The same chip stands on Browse,
  in the add dialog and in the phone's search (web #347); the row of flags is gone. A visitor's
  sheet on a public profile shows the brackets too (cardorb-api#287).
- **The small thumbnails lie face down too** (#324): table rows, the add dialog, the folder's
  card search and the Pokédex slider. The Fomantis acquired date is put right (2026-09-07),
  through the sheet on the dev server.
- **A set the catalogue has not recorded says so** (#320, #321, cardorb-api#265). TCGdex lists
  68 of 184 Japanese sets and 92 of 95 Korean ones with a count and no card; the page opened on
  nothing under "0 of 0 cards". The page shows an empty state naming the count the catalogue
  claims, and the shelf tile says "No cards in the catalogue yet" in place of the count and
  the bar. The API reads which sets those are off the committed Cardmarket id maps — no request
  — so it is as current as the maps' last run; a set's own page reads the cards live.
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

- **The add button on every set page was dead for seventeen hours** (#333, cardorb-api#271).
  Since #308 (01:10) a tile handed the add action `language: null` and `tcgId: null`, and a
  schema that took only "absent" answered "Invalid input: expected string, received null" — a
  red line under the tile that reads as nothing happening. English too; only the palette, whose
  hits carry neither key, could add. Found by adding a Japanese トランセル to check #259. Behind
  it the language shelves sent no `tcgId` at all, so a Japanese card would have gone to the API
  with a language and no id. Both fixed and **measured end to end on the dev server against
  production**: the row is stored `ja` / `SV2a-011`, and the `/cards` item comes back with
  `speciesId: 11`. The slot still reads "Missing" on Bart's page — his Pokédex keeps five
  rarities and a common is not one — which is the setting, not a bug. The test card was removed.
- **The API's `check` job was red on main since #270** (cardorb-api#272): the card route's test
  made five real TCGdex requests and timed out on the runner. Mocked; 223 ms.
- **Search can ask a language's catalogue** (cardorb-api#273, web #336). Bart's ask: the palette
  and the Add dialog asked the English catalogue only, so "リザードン" found nothing. Both have
  Browse's row of flags now; outside English the set and type chips go, being English lists.
  Measured against production: 49 Japanese Charizards, and an add from the palette stores
  `ja` / `SV2a-006`.
- **A Japanese search hit gets the picture its set page shows** (cardorb-api#280). The list
  showed a picture for one hit in three: search handed over TCGdex's address as the record
  carried it, or nothing. The twenty shown go through the set page's Limitless step now, grouped
  by set so it stays one probe per set, on both search paths; a record naming no picture gets
  the guess without a probe. Measured in the palette: "リザードン" 20 of 20 with a picture (14
  Limitless, 6 TCGdex), 0 broken, where it was 6 of 20.
- **A TCGdex outage is found out once** (cardorb-api#283, closes cardorb-api#164). #165 had
  already made the answer right — rows without the catalogue, flagged — but every request in an
  outage still waited on three attempts, up to ~25 s, before getting there. A breaker in the
  client: after one failed call, twenty seconds of refusing at once, then one probe; a 404 never
  trips it; per instance. The web frame already survives a failed folder list. Not taken: the
  vendor comment on #164 offering pokemontcgapi.com as a third catalogue — Bart's call.
- **A profile change made through the API reaches cardorb.com at once** (cardorb-api#285, web
  #345). `forgetMine()` only ever dropped this app's cache for writes made here; a switch to
  private in the iOS app stayed open on the web for five minutes. `PATCH /profile` now posts who
  changed to `POST /api/revalidate`, behind a shared secret (`REVALIDATE_SECRET` here,
  `WEB_REVALIDATE_URL` + `WEB_REVALIDATE_SECRET` on the API, production and preview), which
  drops the public and the user tag — `revalidateTag(…, "max")`, since Next refuses `updateTag`
  in a route handler. Measured on production: PATCH 19:34:25 → POST /api/revalidate 19:34:26 →
  `/user/bartdunweg` "Collection not found" at 19:34:39; flipped back, page back. Every
  collection write followed (cardorb-api#288): cards, copies, split, folders and the CSV import
  say the same word beside their own `revalidateTag`, with two seconds for the web at most.
- **A page audit, eleven pages wide and four narrow** (2026-09-11, without Mobbin: the connector
  is not in the session). No overflow, no broken picture, no contrast fault seen. Four findings,
  all fixed (web #352, #354, cardorb-api#292): one count for a collection — the collection said
  1,915 (rows), the public page 1,609 (distinct cards), Home 1,933 (copies) about the same binder,
  and copies is the number everywhere now, `copies` beside `total` in every list answer and the
  folder counts; the public page said "You hold ×1" to a visitor, and says "Holds"; no "×1"
  under a wish; a binder's Delete sits behind the kit's dots trigger, not beside Edit and Add.
  Measured on the dev server: Collection "1,933 cards", Kanto 734, the dots menu opens by mouse
  and the confirm dialog takes focus. Keyboard on the menu is not measured: the pane delivers no
  key to a react-aria button. The Mobbin pass stays owed until the connector is on.
- **Pokémon Card 151's Japanese cards looked like reverse holos** (cardorb-api#277). Bart saw it;
  it was the scan, not the app: TCGdex photographed SV2a in its Master Ball variant, every card
  (001, 011, 025, 150 looked at), no other Japanese set sampled. A set list in `artwork.ts`, SV2a
  alone in it, and the shelf and the collection take Limitless's plain print for those without
  probing TCGdex. Measured on the dev server after the deploy: 210 of 210 tiles from Limitless,
  0 broken.

## Next

- **Condition and grade do not reach the price.** A Poor copy and a PSA 10 show what a Near Mint
  one does. Neither Cardmarket nor TCGplayer publishes either — checked, both feeds carry
  printing and no condition. PokemonPriceTracker does, RAW and PSA, at $9.99 a month, from the
  American market. **Needs a decision before it needs code.**
- **"Buy on Cardmarket" is off** (cardorb-api#267): `cmUrl` is null until an address can be
  guaranteed to land on the card's own page. Cardmarket publishes product ids but not the
  expansion half of a product's address, and its site answers every probe from a tool with a
  bot check, so it cannot be verified from here. Bart's call, 2026-09-11. The links map and
  `cardmarketUrl()` stay.

## Open

- **Seen in passing on 2026-09-11:** on the dev server the sheet's chunk (`card-detail-slideout`)
  is refused by the CSP nonce — dev-only as far as seen, production untested. The other two
  things seen that day are closed: TCGdex's fifteen トリプレットビート placeholder sets are off the
  shelves (cardorb-api#282) and CSV1C, which TCGdex lists twice, shows once, as the entry its
  own page opens on (cardorb-api#289).
- **The holo CSS is GPL-3.0.** Accepted while Cardorb is free; before it charges, swap the folder
  for an own implementation of the same recipe or write to @simeydotme. It no longer ships on
  every route: since #327 it loads with the sheet (`src/styles/holo.css`, same cascade layer),
  and the shared stylesheet went 260 → 204 KB (37.4 → 30.8 KB gzip), the effect computing the
  same styles before and after.
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
