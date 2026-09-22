# Browse without an account (cardorb-web) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A visitor with no account can open `/sets`, read any set, open any card's sheet and use
the command palette, inside the app's own frame, and is invited to sign in at the moment they try
to keep something.

**Architecture:** Three layers, in order. The read layer learns to ask the API without a token and
to cache those answers once for everybody instead of once per person. The frame learns to draw
itself without a session. Then Browse and the set page move out of `/dashboard`, which is what
actually opens them, and the landing page gets a door to them.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind 4, Untitled UI (vendored), zod, vitest,
Playwright.

**Spec:** `docs/superpowers/specs/2026-09-22-app-without-an-account-design.md`

**Depends on:** cardorb-api #584 (merged 2026-09-22) and its follow-up for `/catalog/index` and
`/catalog/cards`. Every catalogue route this plan reads must already answer without a token.

## Global Constraints

- No em dashes anywhere, in copy, comments, docs or commit messages (R-COPY-001).
- WCAG 2.2 AA while writing, not afterwards. Every control reachable by keyboard, focus visible,
  nothing carried by colour alone, every input labelled.
- Interface language is English. Strings live in the components; there is no translation file.
- The gate is `./scripts/verify.sh`, and its exit code is read: 0 whole, 1 broken, 2 a check could
  not run. A 2 is not a pass, and which stage could not run is named.
- `pnpm test` inside a worktree under `.claude/` runs zero tests. Run touched test files by path.
- Never write to the owner's collection. The local dev server writes to production as Bart, so a
  test that writes belongs in the CI e2e stack and nowhere else.
- A holding field absent from the API means "not asked", not "none". Render the difference.

## File structure

| File | Responsibility after this plan |
|---|---|
| `src/lib/api.ts` | `api()` gains a third auth state: ask with the token when there is one, without when there is not |
| `src/lib/user-cache.ts` | `perUser()` unchanged; a new `sharedRead()` beside it for readers with no session |
| `src/lib/sets.ts` | `getShelf`/`getSet` pick the per-person or the shared path from the session, not from an argument |
| `src/app/(app)/layout.tsx` | Skips the profile, binder and favourites reads without a session; `SessionGuard` with them |
| `src/components/app/app-sidebar.tsx` | An account card that says "Sign in", a binder section that invites one |
| `src/components/app/mobile-nav.tsx` | The same four tabs, the closed ones leading to an invitation |
| `src/app/(app)/sets/` | Browse and the set page at their new addresses, same layout |
| `src/app/(app)/dashboard/sets/` | Permanent redirects to the above |
| `src/components/app/public-top-bar.tsx` | A "Browse the sets" link, so every public page has the door |
| `e2e/signed-out.spec.ts` | The crawl that proves what is open and, more importantly, what is not |

---

### Task 1: `api()` may ask without a token

**Files:**
- Modify: `src/lib/api.ts` (the `Init` type at its `auth?: boolean`, and the `withAuth` branch around line 154)
- Test: `src/lib/api.test.ts`

**Interfaces:**
- Produces: `auth?: boolean | "optional"` on `Init`. `true` (the default) throws 401 without a
  token, `false` never sends one, `"optional"` sends one when the session has one and asks
  anyway when it does not.

- [ ] **Step 1: Write the failing tests**

In `src/lib/api.test.ts`, following the fetch-stubbing pattern already in that file:

```ts
describe("auth: optional", () => {
    it("sends the token when there is a session", async () => {
        // with a session stubbed to a token
        await api("/catalog/sets", { auth: "optional", schema: z.object({}) });
        expect(headersOfLastCall().authorization).toBe("Bearer a-token");
    });

    it("asks anyway when there is none, rather than throwing", async () => {
        // with the session stubbed to null
        await expect(api("/catalog/sets", { auth: "optional", schema: z.object({}) })).resolves.toBeDefined();
        expect(headersOfLastCall().authorization).toBeUndefined();
    });

    it("still throws for a route that requires a token", async () => {
        await expect(api("/stats", { schema: z.object({}) })).rejects.toMatchObject({ status: 401 });
    });
});
```

Use the file's own helpers for stubbing the session and reading the last call's headers; if it has
none, add one small helper rather than repeating the stub in three tests.

- [ ] **Step 2: Run the tests and watch them fail**

Run: `pnpm vitest run src/lib/api.test.ts -t "auth: optional"`
Expected: FAIL, the second test throws 401.

- [ ] **Step 3: Write the implementation**

In the `Init` type, replace the `auth?: boolean` field and its comment with:

```ts
    /**
     * Whether this call needs somebody.
     *
     * `true`, the default, throws before calling when there is no token: the route would answer
     * 401 anyway and this says so without a round trip. `false` is a route that never takes one.
     * `"optional"` is the catalogue since it opened (the app without an account): the same route
     * answers a signed-in reader with their holdings on it and a visitor with the catalogue
     * alone, so the call is made either way and the answer differs.
     */
    auth?: boolean | "optional";
```

Then the branch, where `withAuth` is decided:

```ts
    const token = init.auth === false ? null : (init.token ?? (await accessToken()));
    if (init.auth !== false && init.auth !== "optional" && !token) throw new ApiError(401, "Sign in to see this.");
    if (token) headers.authorization = `Bearer ${token}`;
    else headers["x-cache-window"] = cacheWindow();
```

Keep the `cache` choice keyed on whether a token was sent, not on the `auth` value: an answer
carrying somebody's holdings is `no-store` and a shared one is cacheable, and with `"optional"`
the same call site can be either.

- [ ] **Step 4: Run the tests and watch them pass**

Run: `pnpm vitest run src/lib/api.test.ts`
Expected: PASS, every existing test included.

- [ ] **Step 5: Commit**

```bash
git add src/lib/api.ts src/lib/api.test.ts
git commit -m "A call may name the reader, or not

The catalogue answers both now, so the third state is the honest one: send
the token when the session has one and ask anyway when it has none. The
cache choice follows whether a token went out, not what the call asked for.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: There is no Task 2

Written as "build `sharedRead()`, a shared cache beside `perUser()`". Reading the code first
showed the road already exists.

`api()` with no token sets `next: { revalidate: CACHE_SECONDS, tags }`, which **is** the shared
Data Cache: one entry per URL, params and the `x-cache-window` header, held for five minutes and
the same for every reader. `public-profile.ts` has used exactly that since the public profile
shipped, with `auth: false` and a `publicTag`. A second caching layer over it would have been a
wrapper around a cache, with its own key version to keep in step.

So the shared path is: `api(..., { auth: "optional", tags: [CATALOGUE_TAG] })` when there is no
session, and `perUser(...)` when there is. The only new thing needed was the tag, which is in
`src/lib/cache-scopes.ts` beside `userTag`, with no person in it on purpose.

Kept as a task rather than deleted, because a plan that quietly loses a step reads as if the step
was never needed.

### Task 3: The shelf and the set page read either way

**Files:**
- Modify: `src/lib/sets.ts` (`getShelf` at line 27, `getSet` at line 97, `readSet` at line 108)
- Test: `src/lib/sets.test.ts`

**Interfaces:**
- Consumes: `sharedRead` and `PUBLIC_TAG` from Task 2, `auth: "optional"` from Task 1.
- Produces: `getShelf` and `getSet` unchanged in signature. Their answers gain nullable holdings:
  `SetSummary.owned` and `SetDetail.owned` become `number | null`, `null` meaning nobody asked.

- [ ] **Step 1: Write the failing tests**

```ts
describe("the shelf for a reader with no account", () => {
    it("reads the catalogue and marks nothing", async () => {
        sessionIs(null);
        apiAnswers({ sets: [{ id: "base1", name: "Base", series: "Base", total: 102 }] });
        const shelf = await getShelf("en");
        expect(shelf.series[0].sets[0].owned).toBeNull();
    });

    it("sends no token", async () => {
        sessionIs(null);
        await getShelf("en");
        expect(lastCall().init.token).toBeUndefined();
    });

    it("still marks for a reader who is signed in", async () => {
        sessionIs({ userId: "me", token: "t" });
        apiAnswers({ sets: [{ id: "base1", name: "Base", series: "Base", total: 102, ownedCount: 3 }] });
        const shelf = await getShelf("en");
        expect(shelf.series[0].sets[0].owned).toBe(3);
    });
});
```

- [ ] **Step 2: Run the tests and watch them fail**

Run: `pnpm vitest run src/lib/sets.test.ts -t "no account"`
Expected: FAIL, the first two throw 401 out of `perUser`.

- [ ] **Step 3: Write the implementation**

`getShelf` picks its path from the session rather than taking an argument, so no call site has to
know:

```ts
export async function getShelf(language: BrowseLanguage = "en") {
    const read = (token?: string) =>
        api("/catalog/sets", {
            auth: "optional",
            ...(token ? { token } : {}),
            params: language === "en" ? {} : { language },
            schema: catalogueSetsAnswer,
        });
    try {
        // Signed in, the counts are this person's and the entry is theirs. Signed out there is
        // nothing of anybody's in the answer, so every visitor shares one.
        const sets = await (await session())
            ? perUser("sets", `sets:${language}`, async (token) => (await read(token)).sets)
            : sharedRead(`sets:${language}`, async () => (await read()).sets);
        return seriesFromSets(sets);
    } catch (err) {
        if (catalogueDown(err)) throw new CatalogueUnavailable();
        throw err;
    }
}
```

Watch the `await` placement above: `await (await session()) ? … : …` is a precedence trap. Write
it as `const mine = await session();` on its own line and branch on `mine`.

In the zod shape (`api-shapes.ts`), `ownedCount` becomes `.optional()` on both the shelf's set and
the set detail, and the mappers write `owned: answer.ownedCount ?? null`. Do not default to 0:
every renderer downstream has to be able to tell "none" from "not asked", and Task 5 depends on it.

Apply the same to `getSet`/`readSet`.

- [ ] **Step 4: Run the tests and watch them pass**

Run: `pnpm vitest run src/lib/sets.test.ts`
Expected: PASS.

- [ ] **Step 5: Find every renderer of `owned` and make it handle null**

Run: `grep -rn "\.owned" src/components src/app --include=*.tsx`
Each hit either shows a count or a progress bar. With `null` it must render nothing at all, not
"0 of 102". Fix each, and add one test per component that has a test file already.

- [ ] **Step 6: Run the touched tests and commit**

```bash
pnpm vitest run src/lib/sets.test.ts src/components/app/set-tile.test.tsx
git add src/lib/sets.ts src/lib/api-shapes.ts src/lib/sets.test.ts src/components
git commit -m "A set knows whether anybody asked what they hold

owned is a number or null, never 0 for a reader who was never asked. A tile
that says '0 of 102' to a visitor is telling them something false about a
collection they do not have.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4: The frame draws itself without a session

`(app)/layout.tsx` reads the profile, the binders and the favourites count on every screen, and
`SessionGuard` sends a 401 to `/login`. Signed out all three are skipped. This is what makes a
signed-out page possible at all: today those reads alone bounce a visitor before the page renders.

**Files:**
- Modify: `src/app/(app)/layout.tsx` (the three reads and `SessionGuard`)
- Test: `src/app/(app)/layout.test.tsx` (create if absent)

**Interfaces:**
- Consumes: `session()` from `src/lib/api.ts`.
- Produces: `AppSidebar` receives `account: Promise<Account> | null` and `binders:
  Promise<Binder[]> | null`, `null` meaning nobody is signed in. Task 5 renders that.

- [ ] **Step 1: Write the failing test**

```tsx
it("draws the frame for a visitor without reading a profile", async () => {
    sessionIs(null);
    const profile = vi.fn();
    const layout = await AppLayout({ children: <p>a page</p> });
    render(layout);
    expect(screen.getByText("a page")).toBeInTheDocument();
    expect(profile).not.toHaveBeenCalled();
});

it("does not send a visitor to the login page", async () => {
    sessionIs(null);
    await AppLayout({ children: <p>a page</p> });
    expect(redirect).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm vitest run "src/app/(app)/layout.test.tsx"`
Expected: FAIL, the reads run and `SessionGuard` redirects.

- [ ] **Step 3: Write the implementation**

```tsx
    const mine = await session();
    // Nobody signed in: there is no profile to draw, no binders to list and no favourites to
    // count, and asking would be three 401s and a redirect to /login before the page rendered.
    const me = mine ? getMyProfile() : null;
    const binderRead = mine ? getMyBinders() : null;
    const account = me ? me.then(accountFrom, () => NO_ACCOUNT) : null;
    const binders = binderRead ? binderRead.catch(() => []) : null;
    const favoritesCount = mine ? getFavoritesCount().catch(() => null) : null;
```

and give `SessionGuard` nothing to guard when there is no session:

```tsx
    {mine ? (
        <Suspense fallback={null}>
            <SessionGuard reads={[me!, binderRead!]} />
        </Suspense>
    ) : null}
```

`RememberListQuery` and `WarmLists` both read lists. Check each: anything reading a person's list
is skipped the same way, and anything reading the catalogue stays.

- [ ] **Step 4: Run the test and watch it pass**

Run: `pnpm vitest run "src/app/(app)/layout.test.tsx"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(app)/layout.tsx" "src/app/(app)/layout.test.tsx"
git commit -m "The frame stands without a session

Three reads and a guard, all of them about a person, ran on every screen.
For a visitor they were three 401s and a redirect to /login before the page
had a chance to render, which is why no page under this layout could ever be
open.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 5: The sidebar invites rather than lists

**Answered by the owner, 2026-09-22.** Nothing is greyed out and nothing is hidden. Every
section stays in the navigation and stays pressable, and the explanation arrives at the moment of
the press: press "New binder" as a visitor and you get the state that says an account is what
makes binders possible. The same for Collection, Wishlist and the Pokedex.

That is the Suno shape from the spec's Sources, and it is the harder one to build, because a
disabled control needs no copy and a working one that cannot finish does. Every closed thing
therefore leads to the same component, saying what an account adds in that place.

**Files:**
- Modify: `src/components/app/app-sidebar.tsx` (the account card at the foot, the Binders section, `SIDEBAR_ROUTES`)
- Create: `src/components/app/sign-in-invite.tsx` (the one component both the sidebar and the closed pages use)
- Test: `src/components/app/sign-in-invite.test.tsx`, `src/components/app/app-sidebar.test.tsx`

**Interfaces:**
- Consumes: `account: Promise<Account> | null`, `binders: Promise<Binder[]> | null` from Task 4.
- Produces: `<SignInInvite what="binders" />`, which renders one sentence naming what an account
  adds and a link to `/login` carrying the current address as its destination.

- [ ] **Step 1: Write the failing tests**

```tsx
describe("the sidebar for a visitor", () => {
    it("offers a way in where the account would be", () => {
        render(<AppSidebar account={null} binders={null} favoritesCount={null} initialCollapsed={false} />);
        expect(screen.getByRole("link", { name: /sign in/i })).toHaveAttribute("href", expect.stringContaining("/login"));
    });

    it("keeps Browse reachable", () => {
        render(<AppSidebar account={null} binders={null} favoritesCount={null} initialCollapsed={false} />);
        expect(screen.getByRole("link", { name: "Browse" })).toHaveAttribute("href", "/sets");
    });

    it("says what an account is for instead of listing binders", () => {
        render(<AppSidebar account={null} binders={null} favoritesCount={null} initialCollapsed={false} />);
        expect(screen.getByText(/binders/i)).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: /new binder/i })).not.toBeInTheDocument();
    });
});
```

- [ ] **Step 2: Run them and watch them fail**

Run: `pnpm vitest run src/components/app/app-sidebar.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Write the implementation**

Build `SignInInvite` first, once, with the copy from the answered design question. It carries the
current path so signing in returns the visitor to where they were. Every closed section and every
closed page uses this one component: four hand-written variations of the same sentence is how a
product starts sounding careless.

Accessibility, applied while writing and not reviewed afterwards: it is a link and not a button,
because it navigates; it has a visible focus ring from the kit's own token; and the sentence is
real text, not a tooltip, because a tooltip is unreachable by touch.

- [ ] **Step 4: Run the tests and watch them pass**

Run: `pnpm vitest run src/components/app/app-sidebar.test.tsx src/components/app/sign-in-invite.test.tsx`

- [ ] **Step 5: Commit**

```bash
git add src/components/app
git commit -m "The sidebar invites where it cannot list

One component for every closed section, so the same sentence is not written
four slightly different ways.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 6: Browse moves to /sets

**Files:**
- Move: `src/app/(app)/dashboard/sets/page.tsx` to `src/app/(app)/sets/page.tsx`
- Move: `src/app/(app)/dashboard/sets/[id]/page.tsx` to `src/app/(app)/sets/[id]/page.tsx`
- Create: `src/app/(app)/dashboard/sets/page.tsx` and `[id]/page.tsx` as permanent redirects
- Modify: `src/lib/csp.ts` (`NONCE_ROUTES`), `src/components/app/app-sidebar.tsx`,
  `src/components/app/mobile-nav.tsx`, `src/lib/list-memory-server.ts`,
  `src/components/app/warm-lists.tsx`, `src/app/sitemap.ts`
- Test: `src/lib/csp.test.ts`, and a new `src/app/sets-address.test.ts`

**Interfaces:**
- Produces: `/sets` and `/sets/[id]`, inside the `(app)` route group, so the layout is unchanged.
  `/dashboard/sets*` answers 308 to the new address.

- [ ] **Step 1: Write the failing tests**

```ts
describe("the catalogue's addresses", () => {
    it("wears the app's own policy at its new address", () => {
        expect(needsNonce("/sets")).toBe(true);
        expect(needsNonce("/sets/base1")).toBe(true);
    });

    it("is not behind the wall", () => {
        expect(needsSession("/sets")).toBe(true); // the session is still read, to mark the tiles
        expect(isProtected("/sets")).toBe(false);
    });

    it("keeps the old address working", async () => {
        const res = await GET(new Request("https://cardorb.com/dashboard/sets"));
        expect(res.status).toBe(308);
        expect(res.headers.get("location")).toBe("/sets");
    });
});
```

`isProtected` does not exist yet: export the `PROTECTED_PREFIXES` test out of
`src/lib/supabase/middleware.ts` as a named function so it can be asserted rather than inferred.

- [ ] **Step 2: Run them and watch them fail**

Run: `pnpm vitest run src/lib/csp.test.ts src/app/sets-address.test.ts`

- [ ] **Step 3: Move the pages and fix every reference**

```bash
git mv "src/app/(app)/dashboard/sets" "src/app/(app)/sets"
grep -rn "/dashboard/sets" src e2e scripts docs
```

Every hit is either a link to update or a redirect to write. The `match:` predicates in
`mobile-nav.tsx` and the `SIDEBAR_ROUTES` list both contain the old prefix and both decide which
tab reads as current, so a missed one looks like a bug in the navigation rather than in a string.

`NONCE_ROUTES` in `csp.ts` must gain `/sets` and `/sets/[^/]+`. A policy follows the document and
not the route, so a miss here shows up as "it only works on a refresh", which is the hardest
symptom in this codebase to trace back to its cause.

Then add `/sets` and every set's address to `sitemap.ts`, generated from the shelf.

- [ ] **Step 4: Run the tests, then the whole gate**

Run: `pnpm vitest run src/lib src/app` then `./scripts/verify.sh`
Expected: exit 0. An exit 2 names which stage could not run and is not a pass.

- [ ] **Step 5: Commit**

```bash
git add -- "src/app/(app)/sets" "src/app/(app)/dashboard/sets" src/lib/csp.ts src/components/app/app-sidebar.tsx src/components/app/mobile-nav.tsx src/lib/list-memory-server.ts src/components/app/warm-lists.tsx src/app/sitemap.ts
git commit -m "Browse lives at /sets

The word dashboard has no business in the address of the page that has to
earn a stranger's click. The route group is a folder and not a segment, so
the frame around it does not change.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

Stage by path, never `git add -A`: this checkout is shared, and a streamed log dump reached main
that way once. `git status` after the move, so a file the rename left behind is seen.

---

### Task 7: The door, and the way back

**Files:**
- Modify: `src/components/app/public-top-bar.tsx` (a "Browse the sets" link before the pair)
- Modify: `src/components/marketing/header-section/hero-geometric-shapes-04.tsx` (a second button)
- Modify: `src/components/app/app-sidebar.tsx` (the logo's destination)
- Test: `src/components/app/public-top-bar.test.tsx`

- [ ] **Step 1: Write the failing tests**

```tsx
it("offers the way into the app from every public page", () => {
    render(<PublicTopBar />);
    expect(screen.getByRole("link", { name: /browse/i })).toHaveAttribute("href", "/sets");
});

it("sends the logo home, which for a visitor is the landing page", () => {
    render(<AppSidebar account={null} binders={null} favoritesCount={null} initialCollapsed={false} />);
    expect(screen.getByRole("link", { name: /cardorb/i })).toHaveAttribute("href", "/");
});
```

- [ ] **Step 2: Run them and watch them fail**

Run: `pnpm vitest run src/components/app/public-top-bar.test.tsx src/components/app/app-sidebar.test.tsx`

- [ ] **Step 3: Write the implementation**

The hero's second button is secondary beside "Get started". A visitor who already trusts us
presses the first and needs to see nothing; the second is for the one who does not, which is the
person this whole change is for. Equal weight would make neither read as the answer.

- [ ] **Step 4: Run the tests and commit**

```bash
git add src/components
git commit -m "A door into the app, and the logo as the way back

The landing page had one button and it went to /signup, so there was no way
to see the thing before deciding about it. The logo goes to your home, which
signed in is Home and signed out is the landing page.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 8: The crawl that proves what is closed

**Files:**
- Create: `e2e/signed-out.spec.ts`
- Modify: `e2e/README.md` if one exists, else the e2e section of `STATE.md`

- [ ] **Step 1: Write the spec**

Model it on `e2e/crawl.spec.ts`, in a context with no storage state, so the browser is a stranger.

```ts
const OPEN = ["/", "/sets", "/sets/sv01", "/login", "/signup", "/privacy", "/terms", "/docs/api"];
const CLOSED = ["/dashboard", "/dashboard/cards", "/dashboard/collections", "/dashboard/wishlist", "/dashboard/pokedex", "/dashboard/settings"];

for (const path of OPEN) {
    test(`a visitor may read ${path}`, async ({ page }) => {
        const res = await page.goto(path);
        expect(res?.status()).toBeLessThan(400);
        await expect(page.locator("h1")).toBeVisible();
    });
}

for (const path of CLOSED) {
    test(`a visitor is sent to sign in from ${path}`, async ({ page }) => {
        await page.goto(path);
        await expect(page).toHaveURL(/\/login/);
    });
}

test("a set page shows cards and no collection of anybody's", async ({ page }) => {
    await page.goto("/sets/sv01");
    await expect(page.getByRole("link", { name: /Sign in/i })).toBeVisible();
    await expect(page.getByText(/0 of /)).toHaveCount(0);
});
```

The CLOSED half is the point of this file. The risk this whole change carries is not that too
little opens, it is that too much does, and that is the half a passing test can actually hold.

Do not use `networkidle`: it is flaky in this stack. Assert a positive before a zero, so an empty
page cannot pass by having nothing at all.

- [ ] **Step 2: Run it locally against the e2e stack**

Run: `pnpm e2e` (needs Docker; `scripts/e2e-stack.sh`)
Expected: every test passes. If the runner cannot reach the catalogue, say so rather than
weakening the test: an offline runner is a stage that could not run, not a pass.

- [ ] **Step 3: Commit, run the gate, open the pull request**

```bash
./scripts/verify.sh; echo "exit $?"
git add e2e STATE.md
git commit -m "A crawl that proves what is closed

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 9: Read it in a real browser

Every test above runs against a mock or a fixture. None proves that a person with no account can
use this.

**Files:** none. This task produces evidence.

- [ ] **Step 1: Sign out and walk the app**

In the Browser pane, against the local dev server, in a context with no session: open `/`, press
the new button, read `/sets`, open a set, open a card's sheet, open the palette and search, then
press the star. Screenshot each, and read the console at every step.

- [ ] **Step 2: Check the two things only a browser can answer**

- The palette: it calls `/api/v1/catalog/index` and `/catalog/cards` from the browser itself with
  `credentials: "include"`. Confirm in the network panel that both answer 200 without a session.
- The rate limiter carried over from the API work: log the address the API resolves for an
  anonymous request, once through the `/api/v1` rewrite and once direct. If they collapse to one
  address, the whole signed-out audience shares one ceiling of 120 a minute and the API needs a
  follow-up before this ships.

- [ ] **Step 3: Report both, with the screenshots**

---

## Not in this plan

- The press carried through after signing in. It is designed in the spec and is its own plan: it
  needs a parked intent, and the hazards around a confirmation mail opened in another browser
  deserve their own tests.
- The public profile moving into the app shell. Named in the spec as a rough edge, deliberately
  left.
- Anything that writes without an account.
