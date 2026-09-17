# End-to-end smoke tests

## Why

353 pull requests in six days, 70 unit test files, no test that clicks through the app. The bugs
that keep coming back sit between the pieces a unit test sees: a write that one screen shows and
another does not (#544, #546, #658, #659, #660), a cache that answers with yesterday's number
(#651, #652, api#517, api#518), a list that forgets or keeps its search and filters (#650, #654,
#656). A unit test against a mock proves none of these. A browser against the real app and API does.

## Decisions

- **Everything local in CI.** A local Supabase, the Card Orb API and this app, all built from
  source in the runner. No real account, no real data, no shared database with the iOS app.
- **Production builds.** Both apps run `next build && next start`, so the Data Cache and
  `revalidateTag` behave as in production. What stays out of reach: Vercel-only behaviour such as
  a cache entry surviving a deploy.
- **Every pull request.** A job `e2e` beside `check`. A pull request merges when both are green.

## How a run is put together

1. Check out this repo and `bartdunweg/cardorb-api` at its `main`.
2. `supabase start` in the API checkout: its migrations make an empty local database.
3. `e2e/seed.ts` writes one test user (through the local auth admin API) and a small catalogue:
   one set of about twelve cards with prices and a picture each.
4. API: `next build && next start` on port 3001, pointed at the local Supabase.
5. Web: `next build && next start` on port 3000, `CARDORB_API_URL=http://localhost:3001/api/v1`.
6. Playwright (Chromium) signs in once, stores the session, runs the scenarios. On a failure the
   job uploads the trace.

Target: under ten minutes. If the Supabase images make it slower, cache them.

## Scenarios

Writes, read back at once and after a reload:

1. Adding a card from a set page shows it on the tile, in the sheet, on Collection and in Home's count.
2. Two quick presses on plus give exactly the rows two presses should.
3. Removing a card and undoing brings it back everywhere.
4. Favourite on and off: the star and the Favorites binder agree.
5. Moving a card to the wishlist takes it out of Collection and the counts and onto the wishlist.

Cache:

6. After each write, a reload and a navigation away and back show the new number.
7. The public profile shows the change within its cache window.

List state:

8. Search, filter, sort and view survive a reload.
9. They survive Back and Forward.
10. A cleared search or filter stays cleared after a reload and after Back.

## Isolation from the outside

- The API falls back to TCGdex and other hosts when our own copy is empty. In the test run those
  hosts are blocked, so an outage elsewhere never turns the build red. If a screen then breaks, the
  seed is too thin and gets what the screen needs.
- Pictures come from our own bucket in production. The seed points them at a local placeholder.

## Out of scope for now

- A pull request on the API repo does not run these tests. A second step can add that.
- Visual comparison, phone layouts and the card sheet's printing matrix. Those follow once the
  ten scenarios are stable.

## Done when

- `e2e` runs on a pull request, all ten scenarios pass on `main`, and it finishes under ten minutes.
- Reintroducing one of the bugs above (for example reverting #656) turns `e2e` red.
- `CLAUDE.md` and the merge gate name the `e2e` job.
