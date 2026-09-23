# The catalogue without a token (cardorb-api) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The three catalogue routes answer a request that carries no credential, with the
viewer's own holdings left out, so cardorb.com can show Browse, a set page and search to someone
who has no account.

**Architecture:** One new door beside `authorise()` that may answer "nobody", one new header set
for an answer that belongs to nobody, and the same three-line change in each of the three routes:
no viewer means no rows read and no ownership marks. Nothing about a request that carries a
token changes, so the iOS app does not notice this release.

**Tech Stack:** Next.js App Router route handlers, vitest, Supabase for the store.

**Spec:** `docs/superpowers/specs/2026-09-22-app-without-an-account-design.md` (in cardorb-web)

**Repository:** This plan runs in `bartdunweg/cardorb-api`, not in the web repo where it is
filed. The spec and both plans live together on purpose; the work does not.

## Global Constraints

- No em dashes anywhere, in copy, comments, docs or commit messages (R-COPY-001). Use two
  sentences, a comma, a colon or parentheses.
- The answer shapes are a contract the iOS app reads. Fields may be **added** or **omitted**,
  never renamed or retyped.
- A holding field is **absent** for an anonymous reader, never `0`. "None" and "not asked" have
  to stay different things, or a client cannot tell an empty collection from a stranger's view.
- A request that carries a credential which does not verify is **refused**, never downgraded to
  anonymous. Someone whose session expired must see an error, not a catalogue with their
  collection silently missing.
- Prices stay in the anonymous answer, the current price and the history both. The owner decided
  this on 2026-09-22 knowing it can be harvested.
- Before opening a branch here: `git fetch`, then `git worktree add .claude/worktrees/<topic> …
origin/main` **inside** the api repo. Never `git checkout -b` in the shared checkout, and never
  a `../cardorb-api-x` sibling.
- There is a stray Finder copy at `src/app/api/v1/folders/[id] 2` in the shared checkout. Delete
  it before running typecheck or it fails for a reason that has nothing to do with this work.

---

### Task 1: A door that may answer "nobody"

`authorise()` refuses a request with no credential. The catalogue routes need a door that tells
"no credential offered" apart from "a credential that is wrong", and that does not hold an
anonymous reader to the 10-a-minute ceiling meant for someone guessing at a key.

**Files:**

- Modify: `src/lib/api/guard.ts` (add `openRead` limiter and `authoriseOpen`, beside `authorise` at line 165)
- Test: `src/lib/api/guard.test.ts`

**Interfaces:**

- Consumes: `originAllowed`, `createRateLimiter`, `configured`, `requestViewer`, `carriesCredential`, `REFUSALS`, `retryAfter`, type `Refusal`, type `Viewer`, all already in this file.
- Produces: `authoriseOpen(req: Request): Promise<Refusal | Viewer | null>`. `null` means nobody is asking and that is allowed. Narrow a non-null result with the existing `refused()`.

- [ ] **Step 1: Write the failing tests**

Add to `src/lib/api/guard.test.ts`, following the `req({ … })` helper already in that file:

```ts
describe("authoriseOpen", () => {
    it("answers null when no credential is offered", async () => {
        expect(await authoriseOpen(req({}))).toBeNull();
    });

    it("refuses a credential that does not verify, rather than treating it as nobody", async () => {
        const answer = await authoriseOpen(req({ bearer: "not-a-real-token" }));
        expect(answer).not.toBeNull();
        expect(refused(answer!)).toBe(true);
        expect((answer as { status: number }).status).toBe(401);
    });

    it("answers the viewer when the credential verifies", async () => {
        const answer = await authoriseOpen(req({ bearer: VALID_TOKEN }));
        expect(refused(answer!)).toBe(false);
        expect((answer as { userId: string }).userId).toBe(VIEWER_ID);
    });

    it("still refuses a cross-site origin", async () => {
        const answer = await authoriseOpen(req({ origin: "https://evil.example" }));
        expect((answer as { status: number }).status).toBe(403);
    });
});
```

Use the same token and viewer fixtures the existing `authorise` describe block uses in this file;
name them `VALID_TOKEN` and `VIEWER_ID` if they are not already named.

- [ ] **Step 2: Run the tests and watch them fail**

Run: `pnpm vitest run src/lib/api/guard.test.ts -t authoriseOpen`
Expected: FAIL, `authoriseOpen is not exported` or `is not a function`.

- [ ] **Step 3: Write the implementation**

In `src/lib/api/guard.ts`, beside the two limiters near the top:

```ts
/**
 * A third ceiling, for the routes a stranger may read.
 *
 * `guessing` is ten a minute because a request with no credential used to be
 * a probe and nothing else. Since the catalogue opened (the app without an
 * account, 2026-09-22) a request with no credential is usually a visitor
 * reading Browse, and ten would stop the second one. This sits between: high
 * enough for a person turning pages, low enough that walking the whole
 * catalogue from one address takes visible effort.
 */
const openRead = createRateLimiter(60_000, 120);
```

And beside `authorise`:

```ts
/**
 * The same door, for a route that has something to say to nobody.
 *
 * Three answers rather than two. A Refusal is sent as it is; a Viewer is the
 * person asking; null is "no credential was offered, and this route allows
 * that". Only the catalogue routes use it, and only because their answer minus
 * the holdings is nobody's secret.
 *
 * A credential that is offered and does not verify is refused, not treated as
 * null. Downgrading it would show someone whose session had just expired a
 * catalogue with their own collection missing from it, which reads as data
 * loss and is the worst lie this door could tell.
 */
export async function authoriseOpen(req: Request): Promise<Refusal | Viewer | null> {
    if (!originAllowed(req)) return { status: 403, error: "Forbidden" };

    const ip = req.headers.get("x-real-ip")?.trim() || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const offered = carriesCredential(req);
    const wait = (offered ? withCredential : openRead)(ip);
    if (wait) return { ...REFUSALS.tooMany, headers: retryAfter(wait) };

    if (!configured()) {
        console.error("No database is configured: every request will be refused");
        return { status: 503, error: NO_DATABASE_CONFIGURED };
    }

    if (!offered) return null;

    const viewer = await requestViewer(req);
    if (!viewer) return { ...REFUSALS.signIn };
    return viewer;
}
```

- [ ] **Step 4: Run the tests and watch them pass**

Run: `pnpm vitest run src/lib/api/guard.test.ts`
Expected: PASS, including every existing `authorise` test unchanged.

- [ ] **Step 5: Commit**

```bash
git add src/lib/api/guard.ts src/lib/api/guard.test.ts
git commit -m "A door the catalogue routes can open to nobody

authoriseOpen() answers null where no credential was offered, refuses one
that was offered and does not verify, and holds an anonymous reader to its
own ceiling rather than the one meant for someone guessing at a key.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: Headers for an answer that belongs to nobody

`readHeaders()` sends `private, no-store`, which is right for an answer carrying someone's
holdings and wasteful for one that does not. An anonymous catalogue answer is the same for every
reader and should be cached.

This is the task to be careful in. The same URL now answers two different things depending on
the request's credential, so without a correct `Vary` a shared cache can hand a signed-in
answer, holdings and all, to a stranger.

**Files:**

- Modify: `src/lib/api/guard.ts` (beside `readHeaders`, line 239)
- Test: `src/lib/api/guard.test.ts`

**Interfaces:**

- Consumes: `allowed()`, in this file.
- Produces: `openReadHeaders(req: Request): Record<string, string>`.

- [ ] **Step 1: Write the failing tests**

```ts
describe("openReadHeaders", () => {
    it("lets a shared cache hold the answer", () => {
        expect(openReadHeaders(req({}))["Cache-Control"]).toBe("public, s-maxage=300, stale-while-revalidate=86400");
    });

    it("varies on everything that changes the answer", () => {
        const vary = openReadHeaders(req({}))
            ["Vary"].split(",")
            .map((v) => v.trim());
        expect(vary).toContain("Origin");
        expect(vary).toContain("Authorization");
        expect(vary).toContain("Cookie");
    });

    it("still names an allowed origin", () => {
        process.env.ALLOWED_ORIGINS = "https://cardorb.com";
        const h = openReadHeaders(req({ origin: "https://cardorb.com" }));
        expect(h["Access-Control-Allow-Origin"]).toBe("https://cardorb.com");
    });
});
```

- [ ] **Step 2: Run the tests and watch them fail**

Run: `pnpm vitest run src/lib/api/guard.test.ts -t openReadHeaders`
Expected: FAIL, `openReadHeaders is not a function`.

- [ ] **Step 3: Write the implementation**

```ts
/**
 * What a catalogue route sends when it answered nobody in particular.
 *
 * readHeaders() says `private, no-store` because its answer carries the
 * reader's holdings. This answer carries none, so it is the same for everyone
 * and worth holding: five minutes fresh, a day servable while it refreshes.
 *
 * Vary is the dangerous line and it names all three. The same address answers
 * one thing with a credential and another without, so a shared cache that did
 * not vary on Authorization and Cookie could hand one person's marked-up
 * catalogue to the next stranger who asked. Origin is there for the CORS pair
 * above, as in readHeaders().
 */
export function openReadHeaders(req: Request): Record<string, string> {
    const origin = req.headers.get("origin");
    return {
        ...(origin && allowed().includes(origin) ? { "Access-Control-Allow-Origin": origin, "Access-Control-Allow-Credentials": "true" } : {}),
        Vary: "Origin, Authorization, Cookie",
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=86400",
    };
}
```

- [ ] **Step 4: Run the tests and watch them pass**

Run: `pnpm vitest run src/lib/api/guard.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/api/guard.ts src/lib/api/guard.test.ts
git commit -m "Headers for a catalogue answer that belongs to nobody

Cacheable for five minutes, servable stale for a day, and varying on
Authorization and Cookie as well as Origin: one address now answers two
different things and a shared cache has to be told so.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: GET /catalog/sets answers a stranger

**Files:**

- Modify: `src/app/api/v1/catalog/sets/route.ts` (the `authorise` call at line 37, the `getRows` read, the `ownershipIndex` join, and every `readHeaders` in the success path)
- Test: `src/app/api/v1/catalog/sets/route.test.ts`

**Interfaces:**

- Consumes: `authoriseOpen`, `openReadHeaders` from Task 1 and Task 2.
- Produces: the same answer shape, with each set's `ownedCount` **absent** when nobody is asking. `failed` is absent too: nothing was read, so nothing failed.

- [ ] **Step 1: Write the failing tests**

The existing file mocks `@/lib/api/guard`. Extend that mock with the two new names, then add:

```ts
describe("without a credential", () => {
    beforeEach(() => {
        authoriseOpen.mockResolvedValue(null);
        listSets.mockResolvedValue([SET]);
    });

    it("answers the shelf", async () => {
        const res = await GET(new Request("https://api.test/api/v1/catalog/sets"));
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.sets).toHaveLength(1);
        expect(body.sets[0].id).toBe("base1");
    });

    it("leaves the holdings out rather than answering zero", async () => {
        const res = await GET(new Request("https://api.test/api/v1/catalog/sets"));
        const body = await res.json();
        expect(body.sets[0]).not.toHaveProperty("ownedCount");
        expect(body).not.toHaveProperty("failed");
    });

    it("never reads the collection", async () => {
        await GET(new Request("https://api.test/api/v1/catalog/sets"));
        expect(getRows).not.toHaveBeenCalled();
    });
});
```

Keep every existing test in the file: they cover the signed-in answer and must go on passing
untouched.

- [ ] **Step 2: Run the tests and watch them fail**

Run: `pnpm vitest run src/app/api/v1/catalog/sets/route.test.ts`
Expected: FAIL. The new block fails; the existing blocks still pass.

- [ ] **Step 3: Write the implementation**

Replace the guard at the top of `GET` with:

```ts
const who = await authoriseOpen(req);
if (who && refused(who)) {
    return apiError(who.status, who.error, undefined, {
        headers: { ...readHeaders(req), ...who.headers },
    });
}
// Nobody asking is allowed here: the shelf minus the counts is the catalogue,
// and the catalogue is nobody's secret (the app without an account).
const headers = who ? readHeaders(req) : openReadHeaders(req);
```

Then make the rows read conditional, and the join with it:

```ts
const { rows, failed } = who ? await timed("shelf rows", () => getRows(who.userId, bearer(req) ?? undefined)) : { rows: [], failed: false };
const index = who ? ownershipIndex(rows, isBrowseLanguage(language) ? language : null, sets) : null;
```

Where each set is built, add the count only when there is an index, so the field is absent
rather than zero:

```ts
    ...(index ? { ownedCount: setCounts(index, set) } : {}),
```

Use whatever expression the file already uses for that count; the point of the change is the
spread, not the arithmetic. Do the same for the top-level `failed`, and use `headers` in place of
every `readHeaders(req)` in the success path (the refusal paths keep `readHeaders`: a refusal is
never cached).

- [ ] **Step 4: Run the tests and watch them pass**

Run: `pnpm vitest run src/app/api/v1/catalog/sets/route.test.ts`
Expected: PASS, new and existing.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/v1/catalog/sets/route.ts src/app/api/v1/catalog/sets/route.test.ts
git commit -m "The shelf answers a reader with no account

Every set there is, without the counts that say what the reader holds: the
field is absent rather than zero, so a client can still tell an empty
collection from a stranger's view. No collection is read at all.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4: GET /catalog/sets/[setId] answers a stranger

**Files:**

- Modify: `src/app/api/v1/catalog/sets/[setId]/route.ts` (the guard, the `rowsRead` at line 88, the `ownershipIndex` at 148, the `who.userId` use at 204, the `ownedCount` at 250, and the success-path headers)
- Test: `src/app/api/v1/catalog/sets/[setId]/route.test.ts`

**Interfaces:**

- Consumes: `authoriseOpen`, `openReadHeaders`.
- Produces: the same answer, with the top-level `ownedCount` absent and each card's ownership
  marks absent. `set`, `cards`, `totalCount`, `hasMore` and every price are unchanged.

- [ ] **Step 1: Write the failing tests**

```ts
describe("without a credential", () => {
    beforeEach(() => authoriseOpen.mockResolvedValue(null));

    it("answers the set and its cards", async () => {
        const res = await GET(new Request("https://api.test/api/v1/catalog/sets/base1"), {
            params: Promise.resolve({ setId: "base1" }),
        });
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.set.id).toBe("base1");
        expect(body.cards.length).toBeGreaterThan(0);
    });

    it("keeps the prices, which are catalogue facts", async () => {
        const res = await GET(new Request("https://api.test/api/v1/catalog/sets/base1"), {
            params: Promise.resolve({ setId: "base1" }),
        });
        const body = await res.json();
        expect(body.cards[0]).toHaveProperty("price");
    });

    it("leaves every ownership mark out", async () => {
        const res = await GET(new Request("https://api.test/api/v1/catalog/sets/base1"), {
            params: Promise.resolve({ setId: "base1" }),
        });
        const body = await res.json();
        expect(body).not.toHaveProperty("ownedCount");
        expect(body.cards[0]).not.toHaveProperty("owned");
        expect(getRows).not.toHaveBeenCalled();
    });
});
```

Match the existing file's call signature for `GET` and its fixtures; the second argument above is
the App Router's params shape and must be whatever the existing tests in that file pass.

- [ ] **Step 2: Run the tests and watch them fail**

Run: `pnpm vitest run "src/app/api/v1/catalog/sets/[setId]/route.test.ts"`
Expected: FAIL on the new block.

- [ ] **Step 3: Write the implementation**

Same three moves as Task 3, in this file's own terms:

```ts
const who = await authoriseOpen(req);
if (who && refused(who)) {
    return apiError(who.status, who.error, undefined, {
        headers: { ...readHeaders(req), ...who.headers },
    });
}
const headers = who ? readHeaders(req) : openReadHeaders(req);
const rowsRead = who ? getRows(who.userId, bearer(req) ?? undefined) : null;
```

Guard every later use. `markOwnership` is skipped entirely when `rowsRead` is null, so the cards
go out as the catalogue has them; `ownedCount` becomes a conditional spread as in Task 3; and the
`who.userId` use at line 204 is skipped with its read. Read the surrounding lines before changing
them: if that call is a price or note read keyed to the person, it goes with the rest; if it
turns out to serve the catalogue, it stays.

- [ ] **Step 4: Run the tests and watch them pass**

Run: `pnpm vitest run "src/app/api/v1/catalog/sets/[setId]/route.test.ts"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add "src/app/api/v1/catalog/sets/[setId]/route.ts" "src/app/api/v1/catalog/sets/[setId]/route.test.ts"
git commit -m "A set page answers a reader with no account

Every card in the set, with its picture and its price, and not one mark
saying what the reader holds.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 5: GET /catalog/search answers a stranger, and the reference says so

**Files:**

- Modify: `src/app/api/v1/catalog/search/route.ts` (the guard at line 68, the `getRows` at 125, the ownership join, the success-path headers)
- Modify: the API reference page that documents these three routes (find it with `grep -rln "catalog/sets" src/app --include=*.tsx`)
- Modify: `CHANGELOG.md` if the repo keeps one at its root
- Test: `src/app/api/v1/catalog/search/route.test.ts`

**Interfaces:**

- Consumes: `authoriseOpen`, `openReadHeaders`.
- Produces: results without `owned`, `wishlist` or `quantity` when nobody is asking.

- [ ] **Step 1: Write the failing test**

```ts
describe("without a credential", () => {
    beforeEach(() => authoriseOpen.mockResolvedValue(null));

    it("answers hits with no marks on them", async () => {
        const res = await GET(new Request("https://api.test/api/v1/catalog/search?q=pikachu"));
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.cards.length).toBeGreaterThan(0);
        expect(body.cards[0]).not.toHaveProperty("owned");
        expect(body.cards[0]).not.toHaveProperty("wishlist");
        expect(body.cards[0]).not.toHaveProperty("quantity");
        expect(getRows).not.toHaveBeenCalled();
    });
});
```

- [ ] **Step 2: Run the test and watch it fail**

Run: `pnpm vitest run src/app/api/v1/catalog/search/route.test.ts`
Expected: FAIL on the new block.

- [ ] **Step 3: Write the implementation**

The same shape as Tasks 3 and 4: `authoriseOpen`, a `headers` chosen once, the rows read skipped
when there is no viewer, and the marks applied only when there are rows. Then say so in the
reference page: for each of the three routes, one line that a request without a bearer token is
answered with the catalogue and without the holding fields, and that a token that does not verify
is still refused.

- [ ] **Step 4: Run the whole suite**

Run: `pnpm vitest run && pnpm typecheck && pnpm lint`
Expected: PASS. If typecheck fails on a path containing a space and a digit, delete
`src/app/api/v1/folders/[id] 2` and run it again.

- [ ] **Step 5: Commit and open the pull request**

```bash
git add -- src/app/api/v1/catalog/search/route.ts src/app/api/v1/catalog/search/route.test.ts
git add -- CHANGELOG.md
git commit -m "Search answers a reader with no account, and the reference says so

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

Stage by path, never `git add -A`: this checkout is shared with other sessions.

---

### Task 6: Prove it against the running API

The unit tests all run against mocks of the guard, so none of them proves that a real request
with no Authorization header gets through. That has to be read once, live.

**Files:** none. This task produces evidence, not a diff.

- [ ] **Step 1: Run the API locally and ask it three questions**

```bash
curl -s -o /dev/null -w '%{http_code} %header{cache-control}\n' http://localhost:3000/api/v1/catalog/sets
curl -s http://localhost:3000/api/v1/catalog/sets | head -c 400
WRONG=not-a-real-token
curl -s -H "authorization: Bearer $WRONG" -o /dev/null -w '%{http_code}\n' http://localhost:3000/api/v1/catalog/sets
```

Expected, in order: `200 public, s-maxage=300, stale-while-revalidate=86400`; a body whose first
set carries no `ownedCount`; and `401`.

- [ ] **Step 2: Report the three answers verbatim in the pull request**

A green suite is not evidence for this change. The three lines above are.

---

## What this plan does not do

- Nothing in cardorb-web. Browse still sends a token and still gets the counts; the web work is
  its own plan and its own pull request, and it can only start once this is merged and deployed.
- No change to any route that answers "your" anything: `/collection`, `/stats`, `/folders`,
  `/movers`, `/value-history` and the rest stay exactly as closed as they are.
- No new public route family. The three that exist learn to answer one more kind of caller.
