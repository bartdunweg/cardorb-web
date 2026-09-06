# State

Where this project stands right now. Read it at the start of a session; update it at the end.
This file is deliberately short — it orients, it does not document. The rules that apply now
live in `CONVENTIONS.md`.

Rewrite it in place. This file has no history worth keeping; the history is in git.

## Now

Trading card management web app on Next.js 16 + React 19 + Tailwind 4 + Untitled UI (PRO).
**Live at https://cardorb.com** on Vercel project `cardorb`, `main` is production.

**Since 2026-09-02 this app reads and writes cards, folders and profiles through the Card Orb API**
(`bartdunweg/cardorb-api`, api.cardorb.com), the same API the iOS app uses (R-DATA-003). Supabase
is touched directly for auth and the session only; the same project signs both, so the session's
access token is the API's bearer. `src/lib/api.ts` is the client, `src/lib/api-shapes.ts` turns
the API's answers into what the screens already render (tested). `scripts/verify.sh` fails on a
`.from("` outside `src/lib/supabase/`. Live: landing, app shell, Home, Cards, Collections
(folders in the API), Favorites, Wishlist, Pokédex, Sets, command-palette search (the API's catalogue,
which also says what is already yours), Settings (avatar through the API), public profile.

## Last session

- **2026-09-05, one day, sixteen web PRs and five API PRs.** Dark mode one step above black,
  hairline borders, glass chrome, four phone tabs with You as the avatar in Home's bar, sheets on a phone, dialogs
  centred (#101, #103). Icons in buttons take the label's colour, thick glass is 92% (#103). The
  collection is folders: All cards, Favorites, Pokédex and the ones you make, flat under one
  heading, with New folder at its end; Home, Browse (sets) and Wishlist sit beside it (#104,
  #106, #108, #109, #110). A folder can fill itself from a rule: dex range, sets, rarities
  (#105; cardorb-api#166, #167). Every folder page has one shape: title, what it holds and is
  worth, actions, one row (search, Filters, Sort, View), the list; Pokédex is a folder setting,
  "Pokédex number" a sort (#111, #113, #114; cardorb-api#168). Controls draw one hairline ring,
  surfaces a shadow (#115); the sidebar and the tab bar draw the control's ring over a lift
  without a rim (`shadow-lift-lg`), so their edge is the inputs' line. A card can be starred from its sheet (#116). Home's search bar is
  the larger pill with a scan button (#107). A review of the day found three blocking defects
  in each repository, fixed in cardorb-api#169 and the PR after #116: the toolbar kept its
  place in the tree, the New folder dialog forgets its last folder, rule chips and "In
  folders" read set titles; a rule folder keeps its matches with `owned=false`, a folder body
  may be 8 kB, the folder list flags a catalogue outage. Open: GitHub Actions is blocked on
  billing, so merges go on the local gate; `UNTITLED_UI_TOKEN` is unset, so PRO filled icons
  cannot be added; the light theme has not had a design pass.
- **A set page is a checklist.** Every tile is a menu: a card you lack goes to the collection or
  the wishlist, a wished card is "Got it" or removed, an owned card gains or loses a copy or is
  removed, and each opens its place in Cards or Wishlist. Copies are offered only when the card is
  one collection row; two printings are managed in Cards. New actions `setCopies` and `removeCard`
  in `cards/actions.ts`; the item DELETE needs a JSON content type, so it sends `{}`.
- **A folder can be public.** The folder dialog has "Show on my public profile" (`isPublic`
  on the API's folders, cardorb-api#175); a public profile lists those folders as chips over
  the list (All cards first, each with its card count, `GET /v1/public/<username>/folders`)
  and `?folder=<id>` narrows the list through the API's `collection` parameter. The wishlist
  and a Pokédex "full art only" setting are asked for next.
- **What streams in arrives; what opens follows one curve.** `arrive` (globals.css) fades what
  lands after the page is standing up 4 px into place, 200 ms on `--ease-enter`, from
  `@starting-style`, with `--arrive-delay` for a row's stagger (cards 20 ms to the 12th, stat
  tiles 40 ms, sets 30 ms); reduced motion keeps the fade. The kit's modal, sheet and dropdown
  enter and exit on `--ease-enter` (the sheet on `--ease-drawer`), never `ease-in`, and drop
  their zoom or slide under reduced motion. The command palette, hover and keyboard actions
  stay unanimated on purpose.
- **A folder page opens before its cards.** The five list pages (All cards, a folder, Favorites,
  Wishlist, Pokédex) no longer await the list: the title, actions and the row (search, Filters,
  Sort, View) go out at once, the count and value under the title and the cards themselves
  stream in from one promise (`FolderPage` takes `datapoints` as a promise, `CardsView` and
  `DexView` a promise they `use()` under Suspense). The first batch is 48 cards (`LIST_BATCH`);
  `CardsList` asks for the next 48 through the `loadMoreCards` server action when a sentinel
  comes within a screen, with a Show more button as the manual way. `?page=` is gone from the
  owner's lists; the public profile still pages by URL. The card sheet asks for the folder list
  and the facets when a card first opens, not when the page mounts.
- **The app frame streams before its reads.** The app layout no longer awaits the profile and
  the folders: it hands their promises to the sidebar and the tab bar, which draw the frame at
  once and fill the folder rows and the account card through Suspense (`use()`) when each read
  lands, so the page's loading.tsx shows while the API answers instead of a blank tab. A
  `SessionGuard` inside its own Suspense awaits both, redirects to /login on a 401 while streaming,
  and logs any other failure, so the root error page no longer sees layout reads.
- **The app frame survives a folder read that fails.** The layout asks for the folder names only
  (`getMyFolders`), no longer the stats of the whole collection, and draws the sidebar without
  folders when that read fails; a 401 still goes to /login. On 2026-09-04 a TCGdex outage made
  every collection read a 503 and this one read took every screen down with it.
- **A Sets page** (`/dashboard/sets`) shows every set the catalogue knows, grouped by series, with
  how much of each is in the binder; a set opens as a grid of all its cards, yours in colour, the
  missing ones grey (`GET /catalog/sets`, `GET /catalog/sets/:id`, `src/lib/sets.ts`). The API
  counts distinct cards per set since cardorb-api#162, so the list shows its number as is. Set
  logos come from images.scrydex.com, now an allowed image host.
- **next-themes is gone.** React 19 logged "Encountered a script tag while rendering React
  component" on every page: the package renders its boot script inside a component. Now
  `src/lib/theme-script.ts` holds the script as a string literal, the root layout emits it once
  in `<head>`, the CSP allows it by hash, and `src/providers/theme.tsx` is one `ThemeProvider`
  in the root layout (useSyncExternalStore, no effects on mount). The auth layout is
  `force-dynamic` so Next signs its own scripts with the request nonce; `x-nonce` is no longer
  passed around. `ThemeToggle` (unused) and the `light-mode` class (unselected) went with it.
- **`@strakzat/eslint-config-ui` comes from npm now** (0.4.0, public, MIT; strakzat/meridian#39).
  No `.npmrc`, no `NPM_RC` on Vercel, no `PACKAGES_TOKEN` in CI: the private GitHub Packages
  registry wanted a token even to read, and a preview build that changed the lockfile failed on
  it. `pnpm-workspace.yaml` exempts the version from pnpm's day-old rule. vitest and Prettier skip
  `.claude/**` like ESLint does.

- **A public profile can be searched, filtered and sorted** like the owner's Cards page: `q`,
  set, rarity, and set order or name (a public page has no price and no date). The API's public
  cards route took the keys and answers with `facets` over the whole collection, one spelling
  per rarity (cardorb-api#159, #160). Search, filters and sort share one row; on Cards, search
  and filters do (#69, #70, #72). The default sort is called "Newest set first", which is what
  the API has always done (#71).
- **The proxy lives in `src/proxy.ts`.** `middleware.ts` at the root ran in production only:
  with the app under `src/`, the dev server looks beside it. Now every local check sees the
  nonce policy on `/login`. The public pages' `frame-ancestors` rule is set there too, since a
  header from `next.config.mjs` replaced the proxy's in development. ESLint skips `.claude/**`,
  where Claude Code keeps worktrees of other branches inside the checkout (#73).
- **Flamigo** was filed as Paldean Fates #211 (Shiny rare) since the import; the owner has the
  Paldea Evolved #227 Illustration rare. Corrected in the database by hand: the app has no field
  for a card's set or number. The API's collection cache is an hour; a direct database change
  shows after that.
- **Open:** Ancient Mew (Miscellaneous Promos #001) has no scan in any catalogue; it needs one of
  the owner's own under the API's `public/artwork`.

- **Every kit Button is a pill** (`shape="pill"` default, `shape="rect"` by hand), and so are
  `ButtonUtility` and `CloseButton`; the marker line at the top of each changed kit file says so
  (#61, #66).
- **Sign-up asks for an email and a password.** `usernameFromEmail` gives the profile its
  username from the first moment (local part, database shape, four random characters); the
  display name waits for Settings. Settings validates a username as the database does: lowercase,
  digits, hyphens (#62, #63).
- **The public profile is lighter**: the avatar goes through the image optimizer (a 90 KB PNG
  became 1.5 KB AVIF), card thumbnails are AVIF at quality 60. Lighthouse mobile, warm: 93, LCP
  3.2 → 2.7 s, 989 → 612 KiB. The first request after a deploy is slow while the optimizer
  encodes (#64).
- **A signed-in person sees their account menu on a public profile**, through `getViewer()` and
  the shared `PublicTopBar` (#65).

- **The public pages share one top bar** (`src/components/app/public-top-bar.tsx`): wordmark,
  Sign in, Get started as pills; the hero keeps one Get started; the landing has a one-row footer
  with Privacy and Terms. The API reference is not linked from the landing, since the API serves
  only our own apps. Sign in replaced Log in everywhere; `/login` stays (#59).
- **The cards table is the kit's `Table`**, fetched through the Untitled UI MCP; the row is the
  action. The three kit files this project changed (`input`, `progress-indicators`, `toggle`) say
  so at the top: the CLI overwrites them on the next `add`, and did. R-UI-002 now names
  `AppEmptyState` and why it exists (#58).
- Footer links on the landing and the legal pages went from 20 to 24 px tall (WCAG 2.5.8).

- **Lighthouse on the live site** (mobile, 3 September 2026): landing 98, login 97, public
  profile 87 with LCP 4.0 s. From it: a `<main>` landmark on the landing and the auth screens, a
  24 px hit area on the password toggle, and the first row of card tiles fetched with priority.
  Left as they are: the avatar from Supabase storage is served with a one-hour cache (their
  header), and the optimizer's thumbnails could compress harder (`quality`), each worth ~100 KB
  on the profile page.
- **Three review agents over today's diff** (conventions, security, design and copy) and the PRs
  from them: a new search starts on page one, the panel's folder select checks the answer, no
  Supabase env closes the dashboard instead of opening it; four response headers; copy that
  agrees with itself (Sign in, Mark as owned, empty states); every list page carries its count in
  the header line and Sort in the header's actions; each page shape has its own loading outline
  (`src/components/app/skeletons.tsx`). Not taken up: a nonce-based `script-src`, and whether a
  starred wishlist card belongs on Favorites (CLAUDE.md says a favourite is a card you own).
- **`~/Documents` is synced by iCloud Drive** (Desktop & Documents). That is where the
  `name 2.ts` copies come from, in the working tree and inside `.next` and `node_modules`; the
  gate refuses tracked ones. Moving `Projects` out of `~/Documents` ends it.
- **Home shows the collection's value over time.** `src/components/app/value-chart.tsx` draws
  the nightly readings from `GET /v1/value-history` (`src/lib/value-history.ts`, kept per person
  like the stats) as one line in hand-drawn SVG — a chart library would weigh more than the rest of
  Home — with a hover and keyboard layer, a tooltip per reading, and the same numbers under "Show
  as table". The axis spans the readings rather than starting at zero, or a month's movement is
  a flat line. The arithmetic is `src/lib/value-chart-math.ts`, tested. Checked at desktop and
  375 px, light and dark, with a throwaway route that is not committed. Fewer than two readings
  shows a sentence instead of a line.
- **R-SEC-002 moved to `cardorb-api`.** It said every "my data" query filters on `user_id`; this
  app has made no database query since R-DATA-003, so the rule and the "Watch out for" line that
  repeated it are gone here. The API, which runs those queries, carries it as its own rule now.
- **A page header that behaves like a phone screen (#46).** `src/components/app/page-header.tsx`
  on the seven dashboard pages with a title: on a phone a bar stays at the top with Back to the
  parent page (Collections, Cards or Home) on the left, and once the large title scrolls out the
  bar shows it small in the centre. The tab bar stays. From `lg` up nothing changes. Bart's four
  answers: large title that hands over on scroll; every page where it makes sense; keep the tab bar;
  Back goes to the parent. Checked on a 375-px viewport with a throwaway route, not committed.
- **Set and rarity filters on Cards.** Two menus under the search, "All sets" and "All rarities"
  on top, a "Clear filters" link while one is on. The lists came from the grouped collection
  (`src/lib/facets.ts`) until #78; now the API's `/cards` answer carries them as `facets`.
  The choice lives in the URL beside the sort (`set=`, `rarity=`, the API matches them whole).
- **Supabase, through its connection (cardorb-api#153).** The revoke of 2026-09-02 had also taken
  EXECUTE on `handle_new_user()` from `supabase_auth_admin`, the role the `auth.users` trigger runs
  as, so every signup since would have failed at the trigger; nobody signed up in between. One grant
  to that role, applied. Same PR: every RLS policy reads `auth.uid()` once per query instead of per
  row, and `collections.user_id` and `imports.user_id` got the index the advisor asked for.
  Advisors after: performance clean; security still names leaked password protection (dashboard).
- **A "Sort" menu on every card list** (Cards, Favorites, Wishlist, a folder): set order, name,
  price both ways, newest or oldest first, through `sort=`/`order=` on `GET /v1/cards`
  (cardorb-api#151). The choice lives in the URL (`src/lib/list-query.ts`, tested), so a sorted
  page is a link.
- **Home shows what the collection is worth (#38, cardorb-api#149/#150).** `GET /v1/stats`
  carries `value` (euros, printing by printing, over the whole collection) and `unpriced`; the
  fourth tile on Home shows the amount and, only when it applies, how many copies have no price.
  cardorb-api#149 merged with a red check by mistake — a failed force-push left the test fix
  behind — and #150 is that fix; the route code was right throughout.
- **README on the documentation template (#34)**, and the GitHub About box in the house style:
  no technology in the description or the topics. `scripts/verify.sh` now fails on a tracked
  Finder copy (`name 2.ts`): six had reached main on 2 September 2026, all byte-identical to
  their originals; removed.
- **Time limits on every outbound call (#35, cardorb-api#148).** `src/lib/api.ts` gives the API
  thirty seconds; the API gives each catalogue eight. Before, a server that accepted the
  connection and never answered — TCGdex on 2026-09-02 — held a page until Vercel's five-minute
  limit. The performance review's list is now closed; what remains of it is the check a signed-in
  visit gives the per-person cache (#26).
- **One `useDebouncedSearch`** (`src/hooks`, tested with fake timers) replaces the four copies of
  "wait for the typing to pause, ask once, ignore a late answer" in the add-card modal, the
  folder's add-cards dialog, the mobile search and the command palette. Same minimum lengths and
  delays as before. `cards-search` is a different thing (it pushes `?q=` to the URL) and stays.
- **The kit holds what is imported.** 200 of 252 vendored Untitled UI files were reachable from
  nothing (computed from the import graph out of `src/app`, `src/components/app`, `src/providers`
  and `src/lib`) and they kept seven dependencies alive: `motion`, `recharts`,
  `embla-carousel-react`, `qr-code-styling`, `input-otp`, `@untitledui/file-icons`,
  `@react-aria/utils`. Gone, with the policy written under R-STRUCT-001: only what is imported
  stays, a component needed later comes back through the Untitled UI MCP.
- **Empty states without the kit's module.** `AppEmptyState` draws the "lg" empty state itself:
  the kit's `EmptyState` imports every file-type icon for a variant nobody uses, and that put
  60 KB (gzip) of SVG on every page that can be empty. Measured from the client-reference
  manifests: Cards 201 → 159 KB gzip, Wishlist the same; Home stays 132, the landing 38. The
  budget of 150 KB is a marketing-site bar; the dashboard shell (sidebar, command menu, dropdowns,
  all react-aria) is 132 of it, and the rest of Cards is the add-card modal and the detail panel.
- **The public page reads the paged route (#29).** `/user/[username]` asks
  `GET /v1/public/<username>/cards?limit=100`, thirty kilobytes instead of the whole collection's
  nine hundred; `publicCardFromItem()` in `api-shapes.ts` makes the tile. The set count on the
  profile line comes from the same answer (`sets`, added in cardorb-api#147). That API PR also
  stops a TCGdex outage from being cached as "no pictures" for a day, which is what emptied the
  newest set's tiles on 2026-09-02. Left alone on purpose: JS on first load is 228 KB Brotli, of
  which 40 KB is the polyfill only old browsers download and ~150 KB is React, Next and React
  Aria under Untitled UI — nothing to cut without leaving the kit.
- **Four small things a user meets.** Deleting a folder asks first and says the cards stay. The
  name asked at sign-up travels as user metadata and, when a session comes back, is set on the
  profile straight away. Favorites, Wishlist, a folder and the public profile page on `?page=`
  through one `CardsPagination`, the same as Cards; the profile's canonical names its page. The
  three `scripts/backfill-*.mjs` are gone: they wrote to the database directly, against
  R-DATA-003, for columns nothing reads any more.
- **The landing prerenders and the public pages carry their metadata.** The signed-in redirect on
  `/`, `/login` and `/signup` lives in the middleware now, so `page.tsx` at the root touches no
  session and builds static. `robots.ts`, `sitemap.ts` (the six public pages) and a generated
  `opengraph-image`; own titles and descriptions for `/login` and `/signup`; a canonical on every
  public page; the profile page gets its own OG title and the brand only once. Preview deploys
  carry `noindex`. Dev port is 3210: the portfolio project's server took 3111 and 3112.
- **Mobbin pattern check** over every page (Bart wants this as a standing check, see memory). Three
  PRs came out of it: the market price carries the name's weight on the tile and sits under the
  title in the panel; the public profile shows display name, handle and "cards · sets"; the
  Pokédex has a progress bar and the Cards count sits by the search. Settings, forgot-password and
  Home already follow their references. Still open from the check: sort and set/rarity filters on
  Cards, which need parameters on `GET /v1/cards` first.
- **Card pictures through the image optimizer, and the functions in Dublin (#21).** A performance
  review found the pictures came straight from `assets.tcgdex.net` — one server in France, no CDN,
  unreachable that day — and the functions ran in `iad1` while the API sits in `dub1`. Every card
  `<img>` is now `CardImage` (`src/components/app/card-image.tsx`) over `next/image`, with the
  allowed hosts in `next.config.mjs`; `vercel.json` pins `regions: ["dub1"]`. One thumbnail went
  from 176 KB PNG to 23 KB WebP.
- **The layout's answers are kept per person (#26).** Profile, folders and stats go through
  `perUser()` in `src/lib/user-cache.ts`: five minutes under one tag per user id, and every
  server action that writes calls `forgetMine()`, which drops the tag with `updateTag` and
  revalidates the layout. `src/app/(app)/dashboard/loading.tsx` shows the outline of a grid while a
  page still fetches. Not measured with a session; the first signed-in visit after deploy is the
  check that a write shows up on the next screen. Still open: JS on first load is 228 KB Brotli
  against a 150 KB budget (settled in #29's note above).
- **"Forgot password?" on `/login`** leads to `/forgot-password`: one email field, and
  `requestPasswordReset` calls Supabase's `resetPasswordForEmail`. The answer is the same for a
  known and an unknown address. The link in the email lands on `/auth/confirm` like every other.
- **Prices on the cards.** `priceForCopy` in `src/lib/api-shapes.ts` picks one number per copy from
  the API's `price`/`priceHolo` (the Near Mint midpoint, else the market price; a holo or
  reverse-holo copy takes the holo price) and `formatPrice` writes it as `€12.50`. Shown on the grid
  tile, as a "Price" column in the table and as a "Price" row in the detail panel. The public
  profile still carries no price: its routes never send one.
- **The API reference lives here now**, at `/docs/api`: `src/lib/api-reference.ts` reads the
  contract from `https://api.cardorb.com/openapi.yaml` (fetched once an hour) and the page draws
  it in the legal-page shell, which gained an optional version line and an "API" footer link.
  `api.cardorb.com/` redirects here.
- **The web app moved onto the API.** `lib/cards.ts`, `collections.ts`, `profile.ts`,
  `public-profile.ts`, `pokedex.ts` and every server action call `api.cardorb.com`; `pokemontcg.ts`
  is gone (the API matches a card against three catalogues and picks the picture and the price).
  Adding a card sends name, set and number; the API does the rest. The Pokédex comes from the
  catalogues rather than a stored number. The public page reads the three unkeyed public routes.
- Earlier the same day: `/auth/confirm` and `/reset-password` (#15), where every auth email lands.

## Next

Backlog from the review, ranked. Each is one PR.

- Ancient Mew (Miscellaneous Promos #001) has no scan anywhere; a scan of the owner's own copy
  goes under the API's `public/artwork` with a lookup by tcgId in the resolver.

From the audit of 2026-09-06 (night): everything shipped that night (#166–#173; cardorb-api
#194–#201). Every card in the collection has a Cardmarket product linked and a price. The SM
tag-team promos SM168, SM201, SM230, SM240 and SM241 were picked among several products of one
name by their place in the expansion's id sequence; if one of them shows a price that does not
match Cardmarket's page, the other candidates are in `node scripts/cardmarket-ids-fill.mjs`'s
output before the id was set (git history of `cardmarket-ids.generated.json`).

Load time (2026-09-06, morning; web #175–#178, cardorb-api #202–#203). Measured on production
from the Browser pane, warm, whole HTML fetched:

| page | before | after |
|---|---|---|
| Home | 164 ms, 68 KB | 157 ms, 70 KB |
| Collection | 198 ms, 70 KB | 145 ms, 73 KB |
| Browse | 439 ms, 670 KB | 222 ms, 582 KB |
| All cards | 626 ms, 215 KB | 244 ms, 190 KB |
| Pokédex | 1363 ms, 1.6 MB | 362 ms, 1.17 MB |

What did it: skeletons that are the page's frame; two srcset candidates per picture instead
of nine; no page waits for the facets before its first byte, Browse and Collection stream; the
Pokédex reads its cards in one request; the API keeps an assembled collection per instance for
ten minutes by the rows' version. The first request after an API deploy still rebuilds every
set (13 s measured once): `unstable_cache` keys carry the function's source, so a deploy that
touches collection.ts empties the set-facts entries. A warm-up cron every ten minutes covers
it (cardorb-api, `/api/v1/cron/warm`).

Then (#180–#182): the router keeps a shown page for a minute (`staleTimes.dynamic`), the tab bar's
links prefetch the whole page and the sidebar prefetches its seven routes once, a list's first
batch is a per-person cache read, and nothing under a title moves when the count lands (the
count line's outline keeps its height; the Pokédex's count is two lines always). A soft
navigation between the tabs commits in about 25 ms with no request (MutationObserver; a timer
poll in the Browser pane reads 1 s for everything, which is the pane's throttling, not the page).

Load time, closed on 2026-09-06 evening (#211): the Pokédex draws ninety-six slots at a time, a
screen ahead of a sentinel (`DexGrid`); its HTML went from 1.17 MB to 411 KB in the dev pane,
688 `<img>` tags to 59. The CSP noise is traced: on production two `<script src=… async>`
tags for streamed chunks carry no nonce (Next emits them for a Suspense boundary's chunk
preload); the nonced loader fetches the same chunks, so nothing breaks. A Next fix or a
`script-src-elem` with the chunk host would silence it; left as is.

Also that evening (#210, #212): a folder filled by hand takes a card straight from its own
page (filed in it at once); the sheet shows the illustrator, HP, stage, regulation mark and a
link to the Cardmarket page, from `GET /v1/cards/{tcgId}` (`cardFacts`).

Afternoon of 2026-09-06 (#185, #186; cardorb-api #205–#207). The tab bar's pill slides to the
tapped tab (transform only, 200 ms on `--ease-move`); Filters, Sort and View are `RowButton`s,
circles on a phone; `OverlayThemeColor` sets the theme-color meta while a sheet or dialog is
open so Safari's bars darken with the page (Safari animates the bar itself, at its own pace).
Home leads with the value: the list's name is a menu (All cards, Favorites, each folder;
`?value=` in the URL), the number in display size, the change over 7D/1M/3M/6M/Max in green
or red with the sign in the text, the line edge to edge in that colour, the table behind Show as
table; the fourth tile is Pokémon collected, counted as the Pokédex page counts. The API answers
`GET /v1/value-history?folder=<id|favorites>` from the daily card prices (`folderSeries`);
`listCardPrices` pages past PostgREST's 1,000-row cap (#206), and the cache key moved to v2 so
the truncated entries did not stand for an hour (#207).

Later that afternoon (#188, #189; cardorb-api #208–#210): the value menu offers the wishlist
("Wishlist cost": every wish once, `?folder=wishlist`); a card's sheet shows its price over the
last ninety days (`PriceHistory`, `GET /v1/cards/{tcgId}/prices`) with the change since the
first reading; Sort has Highest price and Lowest price; Show as table is gone from the value
chart. Found on the way: the API's card-price cache was keyed by person and day but not by the
ids asked, so one card's line came back as the whole collection's (v3 key hashes the ids, #210).

The card's sheet (#191–#194): the whole screen on a phone, the card first on a blurred, dimmed
copy of its own art that fades into the sheet (`fade-to-glass-thick`); Close at the top left,
the star and a dots menu (Add a copy, Remove a copy, Remove from collection; on a wish Mark as
owned, Remove from wishlist) at the top right; under the title two tabs, Details (folder, where
the card is, attributes) and Price (the line, taller, market price, copies, holding value,
purchase price, the change since purchase). `SlideoutMenu.Header` takes `close="circle"` or
`close="none"`.

Closed later that day (cardorb-api #211): the nightly cron reads the same assembly every
request reads (`assembleFor`), blended prices and memo included, and writes that figure for
the collection and per card (`snapshotFromSets`, `cardPricesFromSets`), dated by the night in
UTC. From the next run the lines end where the live number stands; readings before 2026-09-07
are the guide-only ones. Price history reaches back only as far as our own table: the first
nightly per-card reading is 2026-08-16. Cardmarket's guide is today's file only, TCGdex and
pokemontcg.io carry no history, so nothing earlier can be fetched; the line grows a night a night.

The card's sheet also has the kit's Tabs (#198; `components/application/tabs`), type icons
drawn in `type-icon.tsx`, the series logo beside Generation (`seriesLogo` from the shelf), and
the buttons over the art above the card's block (they were under it and took no taps).

Copies (evening of 2026-09-06; web #207–#208, cardorb-api #214–#215). A `cards` row is still
N identical copies; a copy that differs gets a row of its own. API: `language` on every card
shape (en, de, fr, it, es, pt, nl, ja, ko, zh, null reads as English); `POST
/v1/collection/items/{id}/copies` (one more, the differences applied, pulled now) and
`…/split` (some of a row's copies to a row of their own, the source's acquired date kept;
`split_card` in Postgres does both writes in one transaction); `GET /v1/cards?set=&number=`
names one card's every row; a draft may carry `collectionId`; PATCH takes `acquiredAt`. Web:
the sheet's Copies tile (flag, finish, condition or grade, folder, count; a tap shows that
row; One more, Different…, One is different…), `CopyFormDialog`, `FlagIcon` from ten
`flag-icons` SVGs (not the stylesheet, which pulls in five hundred), the Generation row as the
series' logo alone, Acquired as a date field, a flag on a non-English tile. A card added from a manual
folder's page is filed in it (#210).

Languages, step 1 (evening of 2026-09-06; cardorb-api #216, web this PR). The shelf and a set
page can be another language's catalogue: `GET /v1/catalog/sets?language=ja|zh-tw|zh-cn|ko`
and `…/sets/{id}?language=` read TCGdex's own catalogues (184 Japanese sets, 98 and 57
Chinese, 95 Korean), names in that language only (there is no English name for a Japanese set),
scans at the address every TCGdex scan has. On the web: a row of flag chips (`LanguageChips`)
on Browse (`?language=` in the URL) and in the search sheet's shelf; set pages carry the
language; another language's tiles are read-only. Step 2, not done: adding such a card to the
collection (the assembly resolves facts by English set name against TCGdex `en`; it needs the
row's language to pick the catalogue), search per language, and prices (Japanese cards have
Cardmarket product ids in TCGdex's pricing block; Chinese have next to none). Home's search sits
in the bar with the avatar, lists every set until something is typed, and Browse left the tab
bar (#223–#225).

Later that evening (web #227–#235, cardorb-api #217–#222). Japanese sets are named in English
where the translation list knows them (`set-names.ja.json`, 164 of 184; Chinese and Korean take
it for the ids they share, plus `set-names.zh.json` and `set-names.zh-cn.json`), the set's own
name beside it as `localName`. No logo exists for those sets anywhere; the first card stood in
for a while and read as the wrong thing, so the box stays empty. Another language's catalogue
carries no ownership marks until the index knows languages (a Japanese "Black Bolt" counted the
English cards). The language chips say the word in full and scroll on one line. The search opens
the same full sheet a card does, without a title, the chips in its head; the sheets' shadow box
and the card's head are rounded like the sheet. A copy's language follows its catalogue
(`languagesFor`): the Western printings for an English-catalogue card, one fixed language for
the others, and only the printings the card has, which `GET /v1/cards/{tcgId}` reports as
`languages` by asking each Western TCGdex catalogue for the id (Pikachu with Grey Felt Hat:
English and Portuguese).

Navigation, the evening of 2026-09-06 (this PR). All cards is a tab of its own beside Home on
the phone and the second item in the sidebar; the tab bar reads Home, All cards, Collections,
Wishlist. The sidebar's top group is Home, All cards, Wishlist, Browse; under the Collections
heading Favorites, the Pokédex and the folders you made. The phone's Collections page lost its
All cards tile, and the pages under it say Back to Collections. A page bar's buttons (Back, the
plus, the dots) are 44 px, the avatar's and Home's search's size. The card sheet scrolls as one
page, art and all; a sticky bar (`sheet-bar.tsx`) holds Close, the star and the menu, and takes
the card's name and the page's colour as the title slides under it, the page bar's collapse for
a sheet. The fill under a chart's line runs out to nothing at the bottom. The Supabase migration
history of the API project is in step with its files again (`supabase migration repair`: two
entries recorded under the timestamp of their apply, three applied by hand, all five marked).

## Open

- **A revoked session stays open on the web for up to an hour (#79).** The middleware and the
  API both verify the token locally with `getClaims`, so a sign-out everywhere from the iOS app,
  a ban or a password change is felt on the next token refresh, not the next page; the access
  token lives 3600 s by Supabase's default. Accepted for the 70 to 360 ms `getUser` cost per page.
  To shorten the window: lower the JWT expiry in the Supabase project (Auth → Sessions), which
  both apps follow without a change.
- **API answers are cast, not parsed.** `api<T>()` returns `json as T`; the mappers in
  `api-shapes.ts` pick fields but no zod schema checks an answer, though CLAUDE.md says zod at
  every boundary. The one field that has bitten (`facets`) has a default. A zod pass per route is
  the honest fix; until then a drifted API field reaches the mapper unchecked.
- Supabase side is recorded in `docs/supabase.md`: anon holds column-level SELECT on the public
  card columns only, the `avatars` bucket has type and size limits, the SECURITY DEFINER functions
  are not callable by anon. The advisor still lists few MFA options and `citext` in `public`;
  neither is on the list.
- Rotate the Supabase service-role key that was once pasted in chat: Project Settings → API →
  Reset next to `service_role`, then the API's Vercel env. The web app never uses it.
