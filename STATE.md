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

**2026-09-12, later.** The toast's title is medium (#422): the kit sets title and undo link both
semibold and tells them apart by colour, and Cardorb's brand is the same grey as the title. Read
against the PRO `application/notifications` source; ours is that box in its parts (#424). Then
the new-account flow, from the code (#429): five screens a fresh account reaches had no way
onward and have one now (Favorites, both empty binders, Check your email, an expired link on
/login); Choose your name opens the profile sheet and says the name is the public address; a
private profile's address says so instead of the site's 404. **Not yet walked in the browser as
the test account** (its password is Bart's). Still open from the same map: adding the first card
is silent and the palette stays over a Home that has switched to the stats; "Add to wishlist" on
the wishlist page opens the palette without the wishlist preset; one wishlist card flips Home
from the welcome to a €0 hero with four zeros; the Binders hub on a phone has no empty state, by
design.

**2026-09-12.** The sign-up was walked as a stranger, with a real address. The mail arrived and
its button went to `env%28SUPABASE_AUTH_SITE_URL%29/…`: a `config push` from a shell without
that variable had stored the literal text, so no sign-up could be confirmed and no password
reset (cardorb-api#307 writes the address out; the push is Bart's). On this side: the form said
eight characters where Supabase wants ten; a server error emptied the address; the "check your
email" line sat under a form still saying Get started; and Home after confirming was €0, an empty
chart and four zeros with nothing to do. Now the floor is ten everywhere, the address stays, the
sent state replaces the form, and an account that holds and wants nothing gets a welcome on Home
with Add your first card and Choose your name — the generated `bart-cardorb-test-boaw` kind of
name is the public address, and the person is told so where they are. Test account
`bart+cardorb-test@strakzat.com` is still in the database. Later that day the set page got its
band: the logo centred on its own brightest colour, read once from the PNG on the server
(`src/lib/logo-color.ts`, cached a month by address) and drawn by `SetHero`; grey where no colour
can be read, the name's first word where there is no logo.

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
- **Browse has a binder's row** (2026-09-12): the search field, then Filters, Sort and View over the
  shelf, as a binder has them. Search narrows the shelf to sets whose name or local name has the
  term (`?q=`, the binder's own field). The language sits behind Filters as a menu in the sheet, with the badge
  on when it is not English; the chip row of its own is gone. Sort is Newest first (the API's
  order), Oldest first (the series and the sets in each turned around) or Name (one A to Z list,
  no series headings), in `?sort=`. View is Grid (the tiles) or List (rows: small logo, name,
  release date or local name, count), in a `sets-view` cookie the server reads. Measured in the
  pane on the dev server: the three menus, the badge, `?language=ja&sort=oldest`, the rows, and
  "jungle" leaving one tile with the caret still in the field; the row is one line at 375 px.
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
  all fixed (web #352, #354, cardorb-api#292, #293, #295): one count for a collection — the collection said
  1,915 (rows), the public page 1,609 (distinct cards), Home 1,933 (copies) about the same binder,
  and copies is the number everywhere now, `copies` beside `total` in every list answer and the
  folder counts; the public page said "You hold ×1" to a visitor, and says "Holds"; no "×1"
  under a wish; a binder's Delete sits behind the kit's dots trigger, not beside Edit and Add.
  Measured on the dev server: Collection "1,933 cards", Kanto 734, the dots menu opens by mouse
  and the confirm dialog takes focus. The public page's own items counted rows as copies and its
  folders distinct cards (#293), and then still the rows, because the public shape carries no
  quantity by design: #295 lays the count over each item off the private rows, the way
  `favorite` is. Measured live at the end: cardorb.com/user/bartdunweg "1,931 cards", the API
  `copies: 1931`, Kanto 734, and the database's own sum of owned quantities 1,931 — one number. Keyboard on the menu is not measured: the pane delivers no
  key to a react-aria button. The Mobbin pass stays owed until the connector is on.
- **Waiting has a component** (2026-09-11, web #358, #365, #367). The kit's LoadingIndicator is
  in the design system under Data display, from the kit's GitHub source rather than the CLI,
  which overwrites the vendored dirs. Four changes from the kit, written above it: a status
  region, so a screen reader hears the label or "Loading…"; gradient ids from `useId`, where
  the kit's fixed ids made every second dot-circle on a page point at the first; reduced motion
  slows the spin to a third instead of freezing a broken arc; a `className`. Its one use is the
  search menu's next-page row (#365), which was a grey line the size of a result's set line.
  Bart's second call the same day: the skeletons drew too hard in the dark. Measured against the
  page, the shared `bg-quaternary` stood at 1.2:1 in the light and 2.7:1 in the dark; one step
  lower in the light came to 1.04:1, invisible, and a `dark:` variant is what the linter forbids,
  so the outline has its own token, `bg-skeleton`, unchanged in the light and 2.0:1 in the dark
  (#367). The next-page row itself was not caught live: the pane was hidden when the second page
  had to load; the same markup was measured in the gallery.
- **One place to search and add** (2026-09-11, web #373, then #375). Search (cmd+K) and Add card
  opened two dialogs on the same catalogue, and the palette was the better one: set and type
  filters, the next page on scroll, and since #368 the card's sheet with its price line. Bart's
  call: one solution for both, and then sharper — the same function, no difference in the
  interface. Add card on every page opens the plain palette; the sheet offers the collection
  first and the wishlist second wherever it was opened from. #373 had let the page tilt that
  pair and file a card in a binder; #375 took that out again. The Add dialog and the
  recent-searches list only it drew are gone. The Binders page has Add card too, and New binder
  went secondary with a folder icon beside it: two pluses in one bar were two guesses. Measured on
  the dev server: from Binders, Add card opens the palette and a hit's sheet reads Add to
  collection then Add to wishlist, the same as from the sidebar.
- **Two screen-reader points closed** (2026-09-11, web #379). Clearing a search back to the whole
  list was silent: the count's live region asked "is this list filtered" where the question is
  "did the reader change this list, or arrive at it". It now remembers, per tab, the URL of the
  list shown last — a module variable read once in the state's initialiser, written by an effect
  — and treats the same page with a different query as a change: mounted empty, spoken a beat
  later. Arriving from another page still writes the count at once and is not narrated. And the
  sidebar kit's root is a `<div>` instead of an `<aside>`, so Chrome no longer exposes a nameless
  complementary landmark inside the navigation. Measured in the pane's accessibility tree: one
  navigation landmark, no complementary. The clear-a-search path is measured by its DOM — region
  empty at mount, the count 100 ms later — not with a screen reader.
- **A binder's page: the plus asks which kind, the dots hold the rest** (2026-09-11, branch
  `palette-from-tablet-width`). Bart's calls, three in a row: Edit rule goes behind the dots; a
  plus sits beside them; and pressing that plus is the choice, since you already know whether
  you are after a card you do not have or one you hold. So on a hand-filled binder the plus is a
  menu of two — Search all cards (the palette) and From your collection (your own cards, a
  checkbox per hit, one "Add 3 cards" press through `editCopies`) — and the dots hold Edit
  binder and Delete binder. A rule binder fills itself: its plus is the plain Add card. The
  sheet reads the binder from the path (`binderFromPath`; the palette's sheet hangs from the
  layout, out of reach of anything the page provides) and, opened on a hand-filled binder's
  page, puts "Add to <binder>" first: a card you do not own lands in the collection and the
  binder in one press, a card you hold gets its first unfiled row moved there. Found on the
  way: `FolderPage` drops `actions` whenever `settings` or `add` is given, so since #172 a
  hand-filled binder had shown only the plus — no Edit, no Delete, and an "Add cards" dialog
  nobody could reach; both kinds use the `settings`/`add` pair now. The Binders overview's
  phone bar had lost its plus on main the same hour; the desktop pair from #375 stands.
- **Pokémon Card 151's Japanese cards looked like reverse holos** (cardorb-api#277). Bart saw it;
  it was the scan, not the app: TCGdex photographed SV2a in its Master Ball variant, every card
  (001, 011, 025, 150 looked at), no other Japanese set sampled. A set list in `artwork.ts`, SV2a
  alone in it, and the shelf and the collection take Limitless's plain print for those without
  probing TCGdex. Measured on the dev server after the deploy: 210 of 210 tiles from Limitless,
  0 broken.
- **Every acquired date is picked from the kit's calendar** (#359, #362). Bart's ask. The copy
  card, the add-copy form and the mark-owned form used the browser's own date field; all three
  use Untitled UI's DatePicker now, through `AcquiredDatePicker` (ours, for the seam only: the
  API's `YYYY-MM-DD` to a CalendarDate and back, the calendar ending at today, the day handed on
  at Apply). The range picker the CLI brought along is not added. Measured in the pane: a picked
  day lands at Apply, Cancel leaves the value, 12 September and later disabled with today as
  "Last available date". One accessibility finding accepted and logged: the dialog keeps the
  kit's name "Date picker"; the button and the date segments carry the field's own label.
- **The Mobbin pass, paid** (2026-09-11, web #381, #382, #383). The connector was on all along:
  a hand-added `mobbin` server in `~/.claude.json`, with no token, shadowed the claude.ai
  connector that has one; removed, and the session's tools are `mcp__claude_ai_Mobbin__*`. A
  session started before the fix never gets them, so the search ran in a helper `claude -p` per
  query. Thirteen pages against three or four references each. Follows the pattern, no PR: Home
  (Rocket Money, Monarch), Collection (OpenSea), Binders, Favorites, sign-in. Seven departures;
  Bart picked three, merged: the landing shows Home under the words, built from the app's own
  parts with sample data so it moves with the design, not a screenshot (#381, then his three
  calls in the same PR: under the copy and half below the fold, then on the page's own ground
  so the dot grid stops at its edge); Browse draws a set as its logo with the name and count
  under it, no bar — his call (#383); a wishlist tile carries "Got it", a sibling of the
  pressable so no button sits in a button (#382). The four not taken, ready when wanted: the
  public-profile switch and URL visible on Settings (Clay); recent cards, not terms, in the
  palette, with a ⌘K/Esc footer (v0, Bonsai); the Pokédex grouped per generation with a count
  each (Headspace); the price's change beside the price in the sheet (Fey). Not measured: the
  public profile (Bart's is private), the set page (the query returned onboarding "set-up"
  screens — name the object, never the word "set"). Seen in passing: `/dashboard/you` renders
  the Settings page under another heading.
- **One search on a phone too** (2026-09-11). The bar at the top of Home opened a full-screen
  sheet of its own — the collection search with every set listed under it — while Add card on
  the page beside it opened the palette as a floating card. Bart's call: the phone gets the same
  elements as the desktop, the mobile version of the one thing. The bar opens the palette now,
  as the sidebar's trigger and Add card do; the sheet, its shelf list and the top row are gone
  (`searchMyCards` stays: the binder's add-from-collection dialog is on it). The sheet was also
  the only way into Browse on a phone, so Browse has a tab, the sidebar's order — Home, Browse,
  Wishlist, Collection, Binders — with the pill a fifth wide, and the Browse page wears its title
  on a phone as the other tabs do. Measured on the dev server at 375 px: the bar opens the palette
  over Home with the recent searches, five tabs of 67 px each, Browse's pill on its page.
- **The Mobbin pass, the rest of it** (2026-09-11, web #387, #388, #389, #395, #397, #399).
  Bart picked the four departures left and three more he saw the same evening, all merged: the
  skeletons a step off the page in both themes, barely there (#387, his call after #367 still
  read as blocks); the palette opens on "Recently viewed" — a card that stood a second in the
  preview, eight kept in the browser, previewed and taken as hits are, marks re-read on open —
  and recent searches are gone with their hook (#388); on a phone the binders are rows with a
  line between, and the bar there adds a binder, not a card (#389); the sheet's price carries its
  change against the 30-day average the sheet already had, sign and colour, no new request
  (#395); Settings has the "Public profile" switch and the address in view, first in Account,
  Manage keeping the full form and its label renamed to the same words (#397); the Pokédex is
  nine sections, "Gen 1 · Kanto" with "69 of 151" each, from the same count as the top line,
  cut at the range setting (#399). Not measured in a browser: the palette's one-second dwell,
  the binder rows at 375, the sheet's line in the light theme. Left where it was: the palette's
  list does not stretch to the preview's height — the `palette-from-tablet-width` branch of
  another session is in that layout. Glass on the palette: no; card art behind translucent
  prices is unreadable, and Linear and v0 keep the panel solid too.

- **Stepping through a list reads as paging** (2026-09-11, web #392). Bart could not see the
  crossfade from #366, and was right: it was tuned to go unnoticed, and the fade only played
  once the next picture was in, so on a cold list you saw the old card stand still and then a
  jump. Now the scan travels 12 px in from its arrow's side while the last one leaves the other
  way, 250 ms on the enter curve, reduced motion keeping the fade alone; and the sheet fetches
  the neighbours' scan and blur hidden, at the size it draws them, so the slide starts on the
  press. Clicking faster than 250 ms cuts the slide short, by design. Measured: the three
  animations start on the right layers with the right keyframes, and the neighbour's pictures
  are loaded before the press. Not measured: the feel, the pane was hidden; Bart merged on the
  gate. A note for every session: on 2026-09-11 a `git checkout --` in the shared checkout
  erased another session's uncommitted lines; edit in a worktree from the first line.
- **A revoked session now stays open for ten minutes, not an hour** (2026-09-11, #79 closed,
  cardorb-api#304). Both the middleware and the API verify a token locally, so a session ends
  when its token does. JWT expiry is 600 in the Supabase project, pushed from the API's
  `config.toml` with `supabase config push`; a second push reported every remote config up to
  date. The clients refresh on their own; not lower, since under five minutes iOS on a poor
  connection refreshes while you scroll. Same day: a set tile's two buttons moved to a line of
  their own under the price (#391) — on a phone's 110 px tile they broke the price and ran past
  the tile — and a probe of twelve screens at 393 px found nothing else overflowing.
- **The palette is the whole screen on a phone, and the preview has View details** (2026-09-11).
  It floated in the middle with the page blurred behind it, and that felt like a modal; the
  keyboard took its lower half the moment the field was focused. Bart's calls, three in a row:
  full screen, sliding up from the bottom as the card sheet does, on the page's own ground, with
  Close at the right end of the field's row since a phone has no Escape and no scrim to tap; a
  pressed hit's preview lays itself over the list, the whole screen under the field, with Back
  at its top (it used to sit under the list and squeeze it to a strip of 20 px — main did that
  too); and View details in the preview, at every width, opens the card's sheet over the palette
  — the preview is a preview, the sheet is the card. The kit's `CommandMenuContext` is exported
  for Back, which clears the selection. The sheet reads the hit's rows whether the hit is marked
  or not, because the marks land a beat after the hits (the lookup in `command-search.tsx`) and
  a hit pressed before they land has none. Measured on the dev server at 375 px: the dialog at
  0,0 375×812, Close at 8 px from the top right, the list to the bottom with 112 hits, the
  preview over it with Back at 16 px, View details opening the sheet and its Close back at the
  preview, Back back at the hits; at 1280 px the card unchanged, Back and Close display none,
  the sheet a drawer at the right. Not measured: a held hit opening on its row (see below), the
  keyboard, a screen reader. Seen in passing and run down: the palette marked Mega Charizard Y
  ex (`me02.5-022`) "In your collection" while its sheet said "You do not hold this card yet".
  Not the lookup: asked again, `/v1/catalog/cards?ids=me02.5-022` answers `owned: false`, the
  database holds no such row, and its rows show other sessions adding and removing cards all
  evening (a Charizard wish at 18:23 UTC among them). A row that stood for a minute, marked while
  it stood.
- **The palette's phone screen is one surface** (2026-09-11, #404 follow-up). On the page's grey
  ground the kit's field, white and `rounded-xl`, drew itself as a rounded card at the top of the
  screen, a sheet's head over a list, and the whole read as a bottom sheet — on a desktop the
  card's `overflow-hidden` clips those corners. Bart's call: the phone keeps the desktop card's
  own ground (`glass-thick`, blur off) edge to edge, the field loses its corners under `sm`
  (a one-class kit edit, marked ours), the preview sits on `bg-primary` to match. Slide-up,
  Close and Back stay. Not yet seen on the dev server at 375 px: the pane had no session.
- **The landing page's dots came back only on a refresh** (2026-09-12). The pattern was a
  picture fetched from untitledui.com, and the pages a person clicks to the landing from — sign
  out, the Cardorb link on /login — carry the image policy that names the card hosts and not that
  one; a click keeps the document, so the browser refused it without a request or a word, and a
  refresh, which loads the landing as its own document with only the frame rule, showed it. The
  two SVGs (1.2 KB each) are in `public/patterns` now, under `'self'`. Measured in headless
  WebKit and Chromium: the click route loads the picture at 1920 px wide, where it loaded nothing.
  Also seen: in dark mode the dots sit at 20% brightness, near invisible by design; untouched.

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
  is refused by the CSP nonce. **Dev-only, measured the same day:** the seven scripts without a
  nonce on a dev page are all Turbopack's HMR runtime and what it inserts; on the production build
  served locally (`pnpm start`, the `prod` entry in `.claude/launch.json`) /dashboard/cards loads,
  the sheet opens, and the page reports zero `securitypolicyviolation` events and zero console
  errors. Nothing to change in the policy. The other two
  things seen that day are closed: TCGdex's fifteen トリプレットビート placeholder sets are off the
  shelves (cardorb-api#282) and CSV1C, which TCGdex lists twice, shows once, as the entry its
  own page opens on (cardorb-api#289).
- **The holo CSS is GPL-3.0.** Accepted while Cardorb is free; before it charges, swap the folder
  for an own implementation of the same recipe or write to @simeydotme. It no longer ships on
  every route: since #327 it loads with the sheet (`src/styles/holo.css`, same cascade layer),
  and the shared stylesheet went 260 → 204 KB (37.4 → 30.8 KB gzip), the effect computing the
  same styles before and after.
- **Verified this session, so nobody need re-check:** cardorb-api scopes card writes by
  `id AND user_id` *and* by RLS, with `cards.user_id` defaulting to `auth.uid()`; the service-role
  key is reachable from two routes and neither touches cards; HSTS is set on both hosts; and the
  `/api/v1/*` rewrite is not a CSRF surface — the API answers 401 to a cookie with no bearer.
- Supabase's own side is in `docs/supabase.md`. The advisor still lists few MFA options and
  `citext` in `public`; neither is on the list.
- Accepted accessibility decisions live in `docs/accessibility-decisions.md` and are not raised
  again. Deliberate departures from the kit carry `kit-drift: <why>` in a comment; two exist, and
  `scripts/kit-drift-baseline.json` is at zero.
