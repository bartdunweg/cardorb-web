# The Pokédex is a binder you make yourself: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The built-in Pokédex becomes an ordinary binder: made, edited and deleted like any other, with nothing left behind on any account.

**Architecture:** Any binder can already be shown as a Pokédex (`collections.pokedex`), so this moves data onto machinery that exists and then deletes the fixture. One data pass turns every profile's Pokédex setting into a real binder; the web reads binders instead of the profile; the profile columns, the `/v1/pokedex` route and the `list=pokedex` gate are then dropped.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, zod, Vitest, Supabase Postgres.

**Spec:** `docs/superpowers/specs/2026-09-12-pokedex-is-an-ordinary-binder-design.md`

## Global Constraints

- Two repositories, both shared checkouts: `git fetch` then `git worktree add <dir> -b <branch> origin/main`, `CI=true pnpm install`. Never `git stash`, never discard a file with `git checkout --`.
- No em dashes anywhere (R-COPY-001). Interface language is English.
- Database writes are blocked from here. Migration files are committed; the line that runs one is handed to Bart with the full path: `/Users/bartdunweg/.nvm/versions/node/v20.20.1/bin/supabase db query --linked "..."`, run from `/Users/bartdunweg/Documents/Projects/cardorb-api`.
- `./scripts/verify.sh` is the gate in both repos, and the words to look for are "All checks passed". Exit 2 is not a pass.
- Stage by path. Never `git add -A`.
- The state this runs against, read from the live database on 2026-09-12: 6 profiles, 1 with a `pokedex` setting, 1 with `pokedex_public`, and 1 collection ("Kanto", public, not shown as a Pokédex).
- **Bart's rule, and the reason for the task order:** nothing legacy may stay on an account. The three pull requests below are one change and ship the same day, ending with the drops. Stopping after Task 4 leaves dead columns, which is the thing this is not allowed to do.

---

### Task 1: Every profile's Pokédex becomes a binder (API, PR 1)

**Files (cardorb-api):**
- Create: `supabase/migrations/20260912120000_pokedex_becomes_a_binder.sql`
- Create: `changelog.d/2026-09-12-pokedex-becomes-a-binder.md`

**Interfaces:**
- Consumes: nothing.
- Produces: one `collections` row per profile, named "Pokédex", carrying that profile's setting, `is_public` from `pokedex_public`. No code reads it differently yet: a binder shown as a Pokédex already works.

- [ ] **Step 1: Write the migration**

```sql
-- The Pokédex stops being a fixture and becomes a binder like any other, so the setting that
-- lived on the profile becomes a binder of its own. A profile that never touched the Pokédex
-- still saw one, with every Pokémon and the missing ones shown, so that is what it keeps.
--
-- Idempotent on purpose: run twice and the second run inserts nothing, because a profile that
-- already has a binder shown as a Pokédex is a profile this has already visited.
insert into public.collections (user_id, name, pokedex, is_public)
select
  p.id,
  'Pokédex',
  coalesce(p.pokedex, '{"missing": true}'::jsonb),
  coalesce(p.pokedex_public, false)
from public.profiles p
where not exists (
  select 1 from public.collections c where c.user_id = p.id and c.pokedex is not null
);
```

- [ ] **Step 2: Check the shape against the live rows before it runs**

Run (a select, which is allowed from here):

```bash
/Users/bartdunweg/.nvm/versions/node/v20.20.1/bin/supabase db query --linked "select count(*) as profiles, count(pokedex) as with_setting, count(*) filter (where pokedex_public) as public_dex from public.profiles;"
```

Expected: 6, 1, 1. If those numbers have moved, say so rather than running anything.

- [ ] **Step 3: Write the changelog fragment**

```markdown
- The Pokédex is a binder you make yourself now, not a fixture. The setting that lived on your profile became a binder called "Pokédex" carrying the same range, rarities and public flag, and it can be edited and deleted like any other binder.
```

- [ ] **Step 4: Verify and commit**

Run: `pnpm run changelog && ./scripts/verify.sh`

```bash
git add supabase/migrations/20260912120000_pokedex_becomes_a_binder.sql changelog.d/2026-09-12-pokedex-becomes-a-binder.md CHANGELOG.md
git commit -m "Every profile's Pokédex becomes a binder"
```

- [ ] **Step 5: Open the pull request, merge on the check, hand Bart the line**

Poll the `check` job and merge on "All checks passed". Then give Bart, as one runnable line:

```bash
cd /Users/bartdunweg/Documents/Projects/cardorb-api && /Users/bartdunweg/.nvm/versions/node/v20.20.1/bin/supabase db query --linked "insert into public.collections (user_id, name, pokedex, is_public) select p.id, 'Pokédex', coalesce(p.pokedex, '{\"missing\": true}'::jsonb), coalesce(p.pokedex_public, false) from public.profiles p where not exists (select 1 from public.collections c where c.user_id = p.id and c.pokedex is not null);"
```

- [ ] **Step 6: Check it landed, yourself**

```bash
/Users/bartdunweg/.nvm/versions/node/v20.20.1/bin/supabase db query --linked "select name, is_public, pokedex from public.collections where pokedex is not null;"
```

Expected: 6 rows named "Pokédex", one of them public, one carrying Bart's own range and rarities. Do not go on to Task 2 until this says so.

---

### Task 2: The web reads the binder, not the profile (web, PR 2, part 1)

**Files (cardorb-web):**
- Modify: `src/lib/collections.ts` (a helper that finds the binder shown as a Pokédex)
- Modify: `src/components/app/dex-stat.tsx`
- Test: `src/lib/collections.test.ts` if it exists, else the helper's own new test file

**Interfaces:**
- Consumes: the binders from Task 1.
- Produces: `getDexBinder(): Promise<{ id: string; name: string; pokedex: PokedexSetting } | null>`, the first binder shown as a Pokédex, in the order `/v1/folders` answers.

- [ ] **Step 1: Write the failing test**

```ts
it("finds the binder shown as a Pokédex, and says none where there is none", async () => {
    folders.mockResolvedValue([
        { id: "a", name: "Kanto", kind: "manual", rule: null, pokedex: null, isPublic: false },
        { id: "b", name: "Pokédex", kind: "manual", rule: null, pokedex: { missing: true }, isPublic: false },
    ]);
    expect(await getDexBinder()).toMatchObject({ id: "b" });
    folders.mockResolvedValue([]);
    expect(await getDexBinder()).toBeNull();
});
```

Read `src/lib/collections.ts` first and mock what `folders()` already reads through.

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm vitest run src/lib/collections.test.ts`
Expected: FAIL, `getDexBinder` is not exported.

- [ ] **Step 3: Implement**

```ts
/**
 * The binder shown as a Pokédex, which is where the Pokédex lives now: it stopped being a
 * fixture on the profile. The first one, where somebody made two: a person with two dexes has
 * said the second is worth keeping, not that the first stopped counting.
 */
export async function getDexBinder(): Promise<{ id: string; name: string; pokedex: PokedexSetting } | null> {
    const list = await folders();
    const found = list.find((f) => f.pokedex);
    return found ? { id: found.id, name: found.name, pokedex: found.pokedex! } : null;
}
```

`dex-stat.tsx` reads it instead of `me.profile?.pokedex`, links to `/dashboard/collections/${id}`, and returns null where there is no such binder.

- [ ] **Step 4: Run it and watch it pass**

Run: `pnpm vitest run src/lib/collections.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/collections.ts src/lib/collections.test.ts src/components/app/dex-stat.tsx
git commit -m "The Pokédex on Home is a binder's, not a profile's"
```

---

### Task 3: The fixture goes (web, PR 2, part 2)

**Files (cardorb-web):**
- Modify: `src/app/(app)/dashboard/pokedex/page.tsx` (becomes a redirect, nothing else)
- Modify: `src/components/app/app-sidebar.tsx`, `src/components/app/collections-grid.tsx`, `src/components/app/mobile-nav.tsx`, `src/lib/collections.ts`, `src/app/(app)/layout.tsx`, `src/lib/csp.ts`, `src/lib/list-query.ts`
- Delete: `src/components/app/pokedex-settings-dialog.tsx`
- Modify: `src/app/(app)/dashboard/settings/actions.ts` (drop `updatePokedexSetting`)

**Interfaces:**
- Consumes: `getDexBinder` from Task 2.
- Produces: no route, sidebar row, grid card or settings dialog of its own; `/dashboard/pokedex` redirects.

- [ ] **Step 1: Write the redirect**

```tsx
// The Pokédex stopped being a fixture: it is a binder like any other. The address stays a while
// for the bookmarks that have it, and leads where the Pokédex went.
export default async function PokedexPage() {
    const binder = await getDexBinder();
    redirect(binder ? `/dashboard/collections/${binder.id}` : "/dashboard/collections");
}
```

Everything else in that file goes, `metadata` included: the binder's page titles itself.

- [ ] **Step 2: Take the fixture out of the sidebar, the grid and the tab bar**

In `app-sidebar.tsx` remove the Pokédex row and the `pokedexCount` prop with its `LateCount`; the binder appears in the list of binders below, which already reads `/v1/folders`. In `collections-grid.tsx` remove the `FolderCard href="/dashboard/pokedex"` and its `pokedexCount` prop. In `mobile-nav.tsx` drop `/dashboard/pokedex` from the Binders match. In `collections.ts` remove `getPokedexCount` and `pokedexCount` from what the layout gathers, and in `layout.tsx` stop passing it.

- [ ] **Step 3: Delete the settings dialog and its action**

`pokedex-settings-dialog.tsx` goes; `folder-dialog.tsx` already carries the range, the rarities, the missing toggle and the public flag under Edit binder. `updatePokedexSetting` goes from `settings/actions.ts`, with `pokedexSettingSchema` if nothing else imports it.

- [ ] **Step 4: Run the whole gate and follow the typechecker**

Run: `rm -f tsconfig.tsbuildinfo && ./scripts/verify.sh`
Expected: "All checks passed", after the typechecker has named every remaining reader of the removed props. `pokedex-rarity-note.tsx` belongs to the binder's page now; keep it where it is used and delete it only if nothing renders it.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(app)/dashboard/pokedex/page.tsx" src/components/app/app-sidebar.tsx src/components/app/collections-grid.tsx src/components/app/mobile-nav.tsx src/lib/collections.ts "src/app/(app)/layout.tsx" "src/app/(app)/dashboard/settings/actions.ts" src/lib/csp.ts src/lib/list-query.ts
git rm src/components/app/pokedex-settings-dialog.tsx
git commit -m "The Pokédex is a binder, so it stops being a fixture"
```

---

### Task 4: A public profile draws a Pokédex binder as slots (web, PR 2, part 3)

**Files (cardorb-web):**
- Modify: `src/app/(public)/user/[username]/page.tsx`, `src/lib/public-profile.ts`
- Test: `src/lib/public-profile.test.ts`

**Interfaces:**
- Consumes: a public folder's `pokedex` setting from `/v1/public/{username}/folders`.
- Produces: a public binder shown as a Pokédex renders its slots, not a list of cards.

- [ ] **Step 1: Write the failing test**

```ts
it("says a public folder is shown as a Pokédex, so the profile can draw its slots", async () => {
    fetchMock.mockResolvedValue(answer({ folders: [{ id: "b", name: "Pokédex", pokedex: { missing: true }, isPublic: true }] }));
    const [folder] = await publicFolders("bart");
    expect(folder.pokedex).toEqual({ missing: true });
});
```

Read the file first and use its own fetch fixture shape.

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm vitest run src/lib/public-profile.test.ts`
Expected: FAIL, `pokedex` is dropped on the way through.

- [ ] **Step 3: Implement**

`publicFolders` keeps each folder's `pokedex`; the profile page, where the chosen list is a folder carrying one, builds `groupByDex` over that folder's cards with that setting and hands `FolderBody` its `pokedex={{ dex }}`, the way `/dashboard/collections/[id]` does. The profile's own `pokedex` and `pokedex_public` readers go: the sections are the wishlist, the favorites and the public folders.

- [ ] **Step 4: Run it and watch it pass**

Run: `pnpm vitest run src/lib/public-profile.test.ts`
Expected: PASS.

- [ ] **Step 5: Look at it**

`pnpm dev`, open `/user/<your username>` signed out (a fresh Browser pane tab is signed out on a deployed site; locally use a private context or sign out), and confirm the Pokédex binder draws as slots with the missing ones grey.

- [ ] **Step 6: Update the words, verify, and open the pull request**

`CLAUDE.md`: the Domain section's Binder entry says two are always there. It becomes one, Favorites. Then:

Run: `./scripts/verify.sh`

```bash
git add "src/app/(public)/user/[username]/page.tsx" src/lib/public-profile.ts src/lib/public-profile.test.ts CLAUDE.md
git commit -m "A public profile draws a Pokédex binder as a Pokédex"
git push -u origin HEAD
```

Open the pull request, poll the `check` job, merge on "All checks passed", delete the branch.

---

### Task 5: The old columns and the dead route go (API, PR 3)

Runs only once Task 4 is merged and deployed: until then the web still answers with the profile's fields in its cached reads.

**Files (cardorb-api):**
- Create: `supabase/migrations/20260912140000_profiles_drop_pokedex.sql`
- Modify: `src/app/api/v1/profile/route.ts`, `src/lib/storage/postgres.ts` (the two profile column lists and their row types), `src/lib/core/collection/items.ts` (`PUBLIC_LISTS`), the public cards route's list gate
- Delete: `src/app/api/v1/pokedex/route.ts` and `src/app/api/v1/pokedex/route.test.ts`, and `getPokedex`/`summariseDex` if nothing else calls them
- Create: `changelog.d/2026-09-12-pokedex-columns-dropped.md`

**Interfaces:**
- Consumes: nothing. Everything that read these is gone by now.
- Produces: a profile with no Pokédex fields; no `/v1/pokedex`; no `list=pokedex`.

- [ ] **Step 1: Prove nothing calls them**

```bash
grep -rn "v1/pokedex\|list=pokedex\|pokedexPublic" /Users/bartdunweg/Documents/Projects/cardorb-web/src /Users/bartdunweg/Documents/Projects/cardorb-ios/CardOrb | grep -v "\.test\." | head
```

Expected: nothing. If anything appears, stop and fix that first.

- [ ] **Step 2: Write the migration**

```sql
-- The Pokédex is a binder now (20260912120000_pokedex_becomes_a_binder.sql), and these two
-- columns are what the fixture left behind. Nothing reads them: the web takes its setting from
-- the binder, the iOS app has no Pokédex, and /v1/pokedex went with this change.
alter table public.profiles drop column if exists pokedex;
alter table public.profiles drop column if exists pokedex_public;
```

- [ ] **Step 3: Take the fields out of the API**

`PATCH /v1/profile` stops reading `pokedex` and `pokedexPublic` (the `for` loop over the three public flags loses one, and the `if ("pokedex" in body)` block goes). The two column lists in `postgres.ts` lose `pokedex_public,pokedex`, and their row types lose the fields. `PUBLIC_LISTS` becomes `["wishlist", "favorites"]`, and the public cards route refuses `list=pokedex` as it refuses any other unknown list.

- [ ] **Step 4: Delete the route**

```bash
git rm src/app/api/v1/pokedex/route.ts src/app/api/v1/pokedex/route.test.ts
```

Then follow the typechecker: `getPokedex` in `src/lib/core/collection/pokedex.ts` and `summariseDex` in `items.ts` go if this was their only caller, and their tests with them.

- [ ] **Step 5: Write the changelog fragment**

```markdown
- The two Pokédex fields on a profile are gone, and so is `GET /v1/pokedex`. The Pokédex is a binder, and a binder carries its own setting; nothing was left on an account for a thing the app no longer has.
```

- [ ] **Step 6: Verify, commit, open the pull request, hand Bart the line**

Run: `pnpm run changelog && ./scripts/verify.sh`

```bash
git add supabase/migrations/20260912140000_profiles_drop_pokedex.sql src/app/api/v1/profile/route.ts src/lib/storage/postgres.ts src/lib/core/collection/items.ts changelog.d/2026-09-12-pokedex-columns-dropped.md CHANGELOG.md
git commit -m "A profile carries no Pokédex, because a binder does"
```

Merge on "All checks passed", then hand Bart:

```bash
cd /Users/bartdunweg/Documents/Projects/cardorb-api && /Users/bartdunweg/.nvm/versions/node/v20.20.1/bin/supabase db query --linked "alter table public.profiles drop column if exists pokedex; alter table public.profiles drop column if exists pokedex_public;"
```

- [ ] **Step 7: Check the account is clean**

```bash
/Users/bartdunweg/.nvm/versions/node/v20.20.1/bin/supabase db query --linked "select column_name from information_schema.columns where table_name='profiles' and column_name like 'pokedex%';"
```

Expected: no rows. That is the sentence this whole change is held to.

---

## Self-review notes

- Spec coverage: the migration (Task 1), the web reading binders (Task 2), the fixture removed and the redirect (Task 3), the public profile drawing slots and the words (Task 4), the drops and the dead route (Task 5).
- `getDexBinder` is named once in Task 2 and used under that name in Tasks 2 and 3.
- The order is forced by the rule, not by taste: binders exist before anything reads them, and the columns are dropped after nothing does.
