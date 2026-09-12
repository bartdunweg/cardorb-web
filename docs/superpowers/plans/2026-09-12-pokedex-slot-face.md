# Pokédex slot face Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A Pokédex slot remembers which of its cards is its face, and the words around the picture describe the card you are looking at.

**Architecture:** A boolean on the card row, `cards.dex_face`, answered and patched exactly the way `is_favorite` already is. The web builds its Pokédex from `GET /v1/cards` (`groupByDex`), so the flag costs no extra read: the flagged card is simply ordered first in its slot. A settled swipe writes the flag with two PATCHes, the new card on and the old card off, because species is not a column the API could search on.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, zod, Vitest, Supabase Postgres.

**Spec:** `docs/superpowers/specs/2026-09-12-pokedex-slot-face-design.md`

## Global Constraints

- Two repositories. API: `bartdunweg/cardorb-api`. Web: `bartdunweg/cardorb-web`. Both checkouts are shared with other sessions: `git fetch` then `git worktree add <dir> -b <branch> origin/main`, and `CI=true pnpm install` in the new worktree. Never `git stash`, never `git checkout --` a file.
- No em dashes anywhere, code comments and commit messages included (R-COPY-001). A comma, a colon, parentheses or two sentences instead.
- Interface language is English. Strings live in the components.
- Database writes are blocked from here. A migration file is committed, and the one line that runs it is handed to Bart.
- Stage by path. Never `git add -A`.
- Vitest skips `.claude` worktrees in this project: run a touched test file by its path (`pnpm vitest run src/lib/dex-groups.test.ts`), and trust CI for the whole suite.
- `./scripts/verify.sh` is the gate in both repos. Exit 2 is not a pass: say which stage could not run.
- The API is deployed before the web change ships: the web reads `dexFace` as optional, so a web deploy against an older API is not broken.

---

### Task 1: The card carries `dex_face`, and a PATCH can set it

**Files (cardorb-api):**

- Create: `supabase/migrations/20260912090000_card_dex_face.sql`
- Modify: `src/lib/storage/postgres.ts` (row type near line 59, `COLUMNS` near line 64, row to domain near line 187, insert near line 492, patch near line 539)
- Modify: `src/lib/core/collection/collection-row.ts` (`CollectionRow`/draft near line 191 and 242, `CardPatch` near line 509, `validateCardPatch` flag loop near line 580)
- Modify: `src/lib/core/collection/items.ts` (`CollectionItem` near line 52, the item answer near line 142)
- Test: `src/lib/core/collection/collection-row.test.ts`, `src/app/api/v1/collection/items/[id]/route.test.ts`

**Interfaces:**

- Consumes: nothing.
- Produces: `CardPatch.dexFace?: boolean`; `CollectionRow.dexFace: boolean`; `CollectionItem.dexFace: boolean`; the card item answer carries `dexFace: boolean`; `PATCH /v1/collection/items/{id}` accepts `{ dexFace: boolean }`.

- [ ] **Step 1: Write the failing test for the patch validator**

In `src/lib/core/collection/collection-row.test.ts`, beside the existing `isFavorite` cases:

```ts
it("takes dexFace as a flag, and refuses anything that is not one", () => {
    const ok = validateCardPatch({ dexFace: true });
    expect(ok).toEqual({ kind: "ok", patch: { dexFace: true } });
    const bad = validateCardPatch({ dexFace: "yes" });
    expect(bad).toEqual({ kind: "invalid", error: "dexFace must be true or false." });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm vitest run src/lib/core/collection/collection-row.test.ts -t dexFace`
Expected: FAIL, the patch comes back `{}` and the bad body is accepted.

- [ ] **Step 3: Add the field to the validator and the types**

In `collection-row.ts`, the flag loop becomes:

```ts
  for (const key of ["owned", "excluded", "isFavorite", "dexFace"] as const) {
```

`CardPatch` gains, beside `isFavorite`:

```ts
/** This card leads its Pokémon's Pokédex slot. One per species, kept by the caller: species is not a column. */
dexFace: boolean;
```

`CollectionRow` (both the stored shape near line 191 and the draft near line 242) gains `dexFace: boolean;`, and the draft builder near line 406 gains `dexFace: dexFace === true,` beside `isFavorite`. Destructure `dexFace` from the body where `isFavorite` is destructured.

- [ ] **Step 4: Run it and watch it pass**

Run: `pnpm vitest run src/lib/core/collection/collection-row.test.ts -t dexFace`
Expected: PASS.

- [ ] **Step 5: Carry the column through the store**

In `src/lib/storage/postgres.ts`:

```ts
// the row type, beside is_favorite
dex_face: boolean;
```

```ts
// COLUMNS: the same list, with the new column at the end of the inventory fields
"id,name,number,set_name,rarity,gen,types,tcg_id,owned,excluded,acquired_at,finish,foil_pattern,quantity,condition,grade,language,purchase_price,purchase_date,notes,is_favorite,dex_face,collection_id";
```

```ts
  // row to domain, beside isFavorite
  dexFace: r.dex_face ?? false,
```

```ts
  // the insert, beside is_favorite: draft.isFavorite
  dex_face: draft.dexFace,
```

```ts
// the patch, beside the isFavorite line
if ("dexFace" in patch) row.dex_face = patch.dexFace;
```

Leave the copy near line 1244 alone: a new copy of a card is not the slot's face, and the column's default says so.

- [ ] **Step 6: Answer it in a card item**

In `src/lib/core/collection/items.ts`, `CollectionItem` gains beside `isFavorite`:

```ts
/** This card leads its Pokémon's Pokédex slot. */
dexFace: boolean;
```

and the item answer near line 142 gains:

```ts
  dexFace: v.dexFace,
```

Every fixture that builds a variant by hand (`csv.ts` near line 391, `cards.ts` near lines 472 and 1125 and 1159, `dex.ts` near line 156) gains `dexFace: false` or `dexFace: row.dexFace` where it already carries `isFavorite` the same way. Let the typechecker find them: `pnpm typecheck`.

- [ ] **Step 7: Write the migration**

```sql
-- One card of a Pokémon leads its Pokédex slot: the card whose picture the slot shows. Set by
-- swiping to it in the app; the app clears the one it replaces, because species_id is derived
-- from the catalogue at read time and is not a column anything here could search on.
alter table public.cards add column if not exists dex_face boolean not null default false;
comment on column public.cards.dex_face is
  'True for the card that leads its Pokémon''s Pokédex slot. At most one per owner per species, kept by the app.';
```

- [ ] **Step 8: Write the failing route test**

In `src/app/api/v1/collection/items/[id]/route.test.ts`, beside the `isFavorite` case:

```ts
it("takes dexFace", async () => {
    const res = await PATCH(patchRequest({ dexFace: true }), { params: Promise.resolve({ id: ROW_ID }) });
    expect(res.status).toBe(200);
    expect(updated).toMatchObject({ dexFace: true });
});

it("refuses a dexFace that is not a flag", async () => {
    const res = await PATCH(patchRequest({ dexFace: 1 }), { params: Promise.resolve({ id: ROW_ID }) });
    expect(res.status).toBe(400);
});
```

Read the file first and reuse its own helpers and names for the request and the captured patch; the two names above stand in for whatever that file already calls them.

- [ ] **Step 9: Run the route test**

Run: `pnpm vitest run "src/app/api/v1/collection/items/[id]/route.test.ts"`
Expected: PASS, no route change needed, because `validateCardPatch` is the whole gate.

- [ ] **Step 10: Verify and commit**

Run: `./scripts/verify.sh`

```bash
git add supabase/migrations/20260912090000_card_dex_face.sql src/lib/storage/postgres.ts src/lib/core/collection/collection-row.ts src/lib/core/collection/items.ts src/lib/core/collection/cards.ts src/lib/core/collection/csv.ts src/lib/core/collection/dex.ts src/lib/core/collection/collection-row.test.ts "src/app/api/v1/collection/items/[id]/route.test.ts"
git commit -m "A card can be the face of its Pokédex slot"
```

- [ ] **Step 11: Hand Bart the line that runs the migration**

Print it for him, do not try to run it:

```bash
supabase db query --linked "alter table public.cards add column if not exists dex_face boolean not null default false;"
```

---

### Task 2: A public profile's cards carry the face too

**Files (cardorb-api):**

- Modify: `src/lib/core/collection/items.ts` (`PublicItem` near line 490, `forPublic` near line 526)
- Test: `src/lib/core/collection/items.test.ts`

**Interfaces:**

- Consumes: `CollectionItem.dexFace` from Task 1.
- Produces: a public card item carries `dexFace: boolean`.

- [ ] **Step 1: Write the failing test**

```ts
it("says which card leads its slot, so a visitor's Pokédex opens on it", () => {
    const [card] = forPublic([ownedCardWith({ dexFace: true })]);
    expect(card.dexFace).toBe(true);
});
```

Read the file and build the card with its own existing fixture helper rather than a new one.

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm vitest run src/lib/core/collection/items.test.ts -t "leads its slot"`
Expected: FAIL, `dexFace` is undefined.

- [ ] **Step 3: Add it**

`PublicItem` gains, beside `favorite`:

```ts
/** One of the owned copies leads this Pokémon's Pokédex slot. */
dexFace: boolean;
```

and `forPublic` gains, beside the `favorite` line:

```ts
    dexFace: card.variants.some((v) => v.owned && v.dexFace),
```

- [ ] **Step 4: Run it and watch it pass**

Run: `pnpm vitest run src/lib/core/collection/items.test.ts -t "leads its slot"`
Expected: PASS.

- [ ] **Step 5: Verify and commit**

Run: `./scripts/verify.sh`

```bash
git add src/lib/core/collection/items.ts src/lib/core/collection/items.test.ts
git commit -m "A public profile says which card leads a Pokédex slot"
```

- [ ] **Step 6: Open the API pull request**

```bash
git push -u origin HEAD
gh pr create --title "A card can be the face of its Pokédex slot" --body "$(cat <<'EOF'
`cards.dex_face`, answered and patched the way `is_favorite` is: the card whose picture a Pokédex slot shows. The app keeps "one per species" itself, because `species_id` is derived from the catalogue and is not a column.

The migration is in the tree; the line that runs it goes to Bart by hand.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Poll the `check` job and merge on a pass, per the house rule. Then confirm the field is live before Task 6 is judged:

```bash
curl -s "https://api.cardorb.com/v1/health" >/dev/null && echo deployed
```

---

### Task 3: The web reads the flag

**Files (cardorb-web):**

- Modify: `src/lib/api-shapes.ts` (`cardItemSchema` near line 117, `Card` near line 183, `cardFromItem` near line 272, the `PublicCard` pick list near line 309, `publicItemSchema` near line 332, `publicCardFromItem` near line 351)
- Test: `src/lib/api-shapes.test.ts`

**Interfaces:**

- Consumes: the API's `dexFace` from Tasks 1 and 2.
- Produces: `Card.dex_face: boolean`, `PublicCard` includes `dex_face`.

- [ ] **Step 1: Write the failing test**

```ts
it("reads which card leads its Pokédex slot, and says false where an older API is silent", () => {
    expect(cardFromItem(item({ dexFace: true })).dex_face).toBe(true);
    expect(cardFromItem(item({})).dex_face).toBe(false);
});
```

Use the file's own `item` fixture helper; read it first.

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm vitest run src/lib/api-shapes.test.ts -t "leads its Pokédex slot"`
Expected: FAIL, `dex_face` is not a property.

- [ ] **Step 3: Add it**

```ts
// cardItemSchema, beside isFavorite. Optional: an API older than this change says nothing.
/** This card leads its Pokémon's Pokédex slot; absent from an API before it said so. */
dexFace: z.boolean().nullish(),
```

```ts
// Card, beside is_favorite
/** This card is the one its Pokémon's Pokédex slot shows. */
dex_face: boolean;
```

```ts
// cardFromItem, beside is_favorite
dex_face: item.dexFace ?? false,
```

```ts
// publicItemSchema, beside favorite
/** One of the owned copies leads its Pokédex slot; absent from an API before it said so. */
dexFace: z.boolean().nullish(),
```

```ts
// publicCardFromItem, beside is_favorite
dex_face: item.dexFace ?? false,
```

and `"dex_face"` joins the `PublicCard` pick list after `"is_favorite"`.

- [ ] **Step 4: Run it and watch it pass**

Run: `pnpm vitest run src/lib/api-shapes.test.ts -t "leads its Pokédex slot"`
Expected: PASS. Then `pnpm typecheck`, and give every hand-built `Card` fixture the typechecker names `dex_face: false`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/api-shapes.ts src/lib/api-shapes.test.ts
git commit -m "Web reads which card leads a Pokédex slot"
```

---

### Task 4: The flagged card leads its slot, and a slot's card carries its price

**Files (cardorb-web):**

- Modify: `src/lib/dex-groups.ts` (`DexCardLike` near line 24, the slot builder near line 75)
- Modify: `src/lib/api-shapes.ts` (`DexCard` near line 358)
- Test: `src/lib/dex-groups.test.ts`

**Interfaces:**

- Consumes: `Card.dex_face` from Task 3.
- Produces: `DexCard` gains `price: number | null` and `isFace: boolean`; a slot's `cards` are ordered with the face first.

- [ ] **Step 1: Write the failing tests**

```ts
it("puts the card that leads a slot first, and leaves the rest in the order they came", () => {
    const face = { ...card("p2", 25), dex_face: true } as Card;
    const out = groupByDex([card("p1", 25), face, card("p3", 25)], names, { missing: false });
    expect(out.slots[0].cards.map((c) => c.id)).toEqual(["p2", "p1", "p3"]);
    expect(out.slots[0].cards[0].isFace).toBe(true);
});

it("takes the first flag where two cards of a species carry one", () => {
    const one = { ...card("a", 25), dex_face: true } as Card;
    const two = { ...card("b", 25), dex_face: true } as Card;
    const out = groupByDex([one, two], names, { missing: false });
    expect(out.slots[0].cards.map((c) => c.id)).toEqual(["a", "b"]);
});

it("hands a slot's card its price, so the tile can say what it is worth", () => {
    const held = { ...card("p", 25), price: 12.5 } as Card;
    const out = groupByDex([held], names, { missing: false });
    expect(out.slots[0].cards[0].price).toBe(12.5);
});
```

- [ ] **Step 2: Run them and watch them fail**

Run: `pnpm vitest run src/lib/dex-groups.test.ts`
Expected: FAIL on the order, on `isFace` and on `price`.

- [ ] **Step 3: Implement**

`DexCardLike` gains:

```ts
    /** True for the card that leads its slot: the picture the slot opens on. */
    dex_face?: boolean | null;
```

`DexCard` in `api-shapes.ts` gains:

```ts
/** What one copy is worth in euros; null on a public profile, which carries no prices. */
price: number | null;
/** The card the slot opens on: the owner swiped to it and it was remembered. */
isFace: boolean;
```

and the slot builder maps the held cards face-first:

```ts
// The face leads, the rest keep the order the list gave them. Two flags on one species is
// not an error (another client may have left one): the first one found leads.
const faceFirst = held.some((c) => c.dex_face) ? [...held].sort((a, b) => Number(!!b.dex_face) - Number(!!a.dex_face)) : held;
```

with `cards: faceFirst.map((c) => ({ ... , price: c.price ?? null, isFace: !!c.dex_face }))`. `Array.prototype.sort` is stable in every engine this runs on, so the rest of the order stands.

- [ ] **Step 4: Run them and watch them pass**

Run: `pnpm vitest run src/lib/dex-groups.test.ts`
Expected: PASS, every case in the file.

- [ ] **Step 5: Commit**

```bash
git add src/lib/dex-groups.ts src/lib/api-shapes.ts src/lib/dex-groups.test.ts
git commit -m "The card a Pokédex slot leads on is the one that was left standing"
```

---

### Task 5: Where you stop swiping is written down

**Files (cardorb-web):**

- Modify: `src/app/(app)/dashboard/cards/actions.ts` (beside `setFavorite` near line 311)
- Modify: `src/components/app/dex-slider.tsx`
- Test: `src/app/(app)/dashboard/cards/actions.test.ts` if the file exists; otherwise no test here and the slider's own is in Task 6.

**Interfaces:**

- Consumes: `DexCard.isFace` from Task 4.
- Produces: `setDexFace(cardId: string, previousId: string | null): Promise<Result>`; `DexSlider` gains `onShow?: (card: DexCard) => void` and `onSettle?: (card: DexCard) => void`.

- [ ] **Step 1: Write the action**

```ts
// The card a Pokédex slot shows. Two writes, not one: species_id is derived from the catalogue and
// is not a column, so the API cannot find the card this one replaces. The slot has both in hand.
//
// No forgetMine: a Pokédex reads every card, and that read is deliberately outside the list cache
// (see getAllMyCards), so the next visit is already fresh. Dropping the cache here would redraw a
// thousand slots for a picture that is already on screen.
export async function setDexFace(cardId: string, previousId: string | null): Promise<Result> {
    const parsed = z.object({ cardId: z.string().uuid(), previousId: z.string().uuid().nullable() }).safeParse({ cardId, previousId });
    if (!parsed.success) return { ok: false, error: "Invalid card." };
    try {
        await api(`/collection/items/${parsed.data.cardId}`, { method: "PATCH", body: { dexFace: true } });
        if (parsed.data.previousId && parsed.data.previousId !== parsed.data.cardId) {
            await api(`/collection/items/${parsed.data.previousId}`, { method: "PATCH", body: { dexFace: false } });
        }
    } catch (err) {
        return failed(err);
    }
    return { ok: true };
}
```

- [ ] **Step 2: Report the settled card from the slider**

`DexSlider` gains the two callbacks and one scroll listener. The index is the scroll position over the slider's own width, which is one slide wide:

```tsx
export function DexSlider({ cards, onSelect, onShow, onSettle }: {
    cards: DexCard[];
    onSelect?: (card: DexCard) => void;
    /** The card now in view, on every step of the scroll: the tile's words follow it. */
    onShow?: (card: DexCard) => void;
    /** The card still in view once the scrolling stopped: the one worth remembering. */
    onSettle?: (card: DexCard) => void;
}) {
    const ref = useRef<HTMLDivElement>(null);
    const shown = useRef(0);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
    // Scroll-snap has no event of its own for "it landed": the position is read on every scroll,
        // and a card that is still in view a short while later is the one the person chose.
    const onScroll = () => {
        const el = ref.current;
        if (!el) return;
        const index = Math.max(0, Math.min(cards.length - 1, Math.round(el.scrollLeft / el.clientWidth)));
        if (index !== shown.current) {
            shown.current = index;
            const card = cards[index];
            if (card) onShow?.(card);
        }
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => {
            const card = cards[shown.current];
            if (card) onSettle?.(card);
        }, SETTLED_MS);
    };
    useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
```

with `const SETTLED_MS = 400;` beside the file's other constants, and `onScroll={onScroll}` on the scrolling div.

- [ ] **Step 3: Check it by hand in the running app**

Run `pnpm dev` in this worktree (its own `.env.local`), open `/dashboard/pokedex`, swipe a slot with several cards, and read the network panel: one PATCH pair after the swipe settles, not one per scroll event. The Browser pane throttles timers to a second, so read the requests rather than counting them in a loop.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(app)/dashboard/cards/actions.ts" src/components/app/dex-slider.tsx
git commit -m "A Pokédex slot remembers the card you left standing"
```

---

### Task 6: The slot says its number above and its card below

**Files (cardorb-web):**

- Modify: `src/components/app/card-tile.tsx` (an optional line above the picture)
- Modify: `src/components/app/dex-grid.tsx` (`DexTile` near line 129)
- Test: `src/components/app/dex-grid.test.tsx` (create if it is not there)

**Interfaces:**

- Consumes: `DexCard.isFace`, `DexCard.price` (Task 4), `DexSlider`'s `onShow`/`onSettle` and `setDexFace` (Task 5).
- Produces: `CardTile` gains `header?: ReactNode`.

- [ ] **Step 1: Write the failing test**

```tsx
it("writes the slot above the picture and the card in view below it", () => {
    render(<DexGrid generations={[generation([slot(25, [dexCard("a", { set: "Base Set", price: 12.5 })])])]} />);
    expect(screen.getByText("#025")).toBeInTheDocument();
    expect(screen.getByText("Pikachu")).toBeInTheDocument();
    expect(screen.getByText(/Base Set/)).toBeInTheDocument();
    expect(screen.getByText(/€12.50/)).toBeInTheDocument();
});

it("says nothing under a slot nobody holds a card of", () => {
    render(<DexGrid generations={[generation([slot(1, [])])]} />);
    expect(screen.getByText("Missing")).toBeInTheDocument();
    expect(screen.queryByText(/€/)).not.toBeInTheDocument();
});
```

Build `generation`, `slot` and `dexCard` as local helpers in the test file, shaped to `DexGeneration`, `NamedDexSlot` and `DexCard`.

- [ ] **Step 2: Run them and watch them fail**

Run: `pnpm vitest run src/components/app/dex-grid.test.tsx`
Expected: FAIL, the price and the set are nowhere on screen.

- [ ] **Step 3: Give CardTile a line above the picture**

```tsx
    /** A line above the picture, where a list says what the tile stands for before showing it. */
    header?: ReactNode;
```

drawn before `{picture}` in both branches of the component.

- [ ] **Step 4: Rebuild the slot's words**

In `DexTile`: the slot's own line goes above, and the card in view goes below.

```tsx
const [shown, setShown] = useState(slot.cards[0] ?? null);
const header = (
    <div className="flex items-baseline justify-between gap-2">
        <span className="truncate text-sm font-medium text-primary">{slot.name}</span>
        <span className="shrink-0 text-xs text-tertiary tabular-nums">{dexNumber(slot.number)}</span>
    </div>
);
// Under the picture: the card you are looking at, not the slot. A slot you hold none of has no
// card to describe, so it says what it is instead.
const words =
    held === 0 ? (
        <span className="truncate text-xs text-tertiary">Missing</span>
    ) : (
        <div className="flex items-baseline justify-between gap-2">
            <span className="truncate text-xs text-tertiary">{shown?.set ?? ""}</span>
            <span className="shrink-0 text-xs text-tertiary tabular-nums">{formatPrice(shown?.price)}</span>
        </div>
    );
```

The count moves into the header's line for a slot with more than one card: `{held > 1 ? ` · ${held} cards` : ""}` after the name, so the number and the count stand together above the picture as Bart asked.

The slider is handed both callbacks, and writes only where the page is the owner's (`onSelect` is what says so today, so pass a `linked` flag down to `DexTile` rather than inferring it):

```tsx
<DexSlider
    cards={slot.cards}
    onSelect={onSelect}
    onShow={setShown}
    onSettle={
        linked
            ? (card) => {
                  if (!card.isFace) void setDexFace(card.id, slot.cards.find((c) => c.isFace)?.id ?? null);
              }
            : undefined
    }
/>
```

- [ ] **Step 5: Run them and watch them pass**

Run: `pnpm vitest run src/components/app/dex-grid.test.tsx`
Expected: PASS.

- [ ] **Step 6: Walk the accessibility checks**

The caption is not a live region: it describes the picture beside it, and a slot that announced a
set and a price on every swipe would talk over a person paging through a thousand tiles. What has
to hold instead: each slide is a button named after its card (it is today), the two arrows keep
their labels, the header's name and number are plain text in reading order above the picture, and
the price is never the only thing that carries a meaning. Check the contrast of the price and the
set against the page ground, both themes, resolving the computed colour through a canvas: oklab
parsed as RGB gives a wrong ratio.

- [ ] **Step 7: Look at it**

`pnpm dev`, then `/dashboard/pokedex` at a phone width and a desktop width: the header does not wrap, a long set name truncates rather than pushing the price out, and the price sits hard right. Screenshot both for the pull request.

- [ ] **Step 8: Verify, commit, open the pull request**

Run: `./scripts/verify.sh`

```bash
git add src/components/app/card-tile.tsx src/components/app/dex-grid.tsx src/components/app/dex-grid.test.tsx
git commit -m "A Pokédex slot says its number above and its card below"
git push -u origin HEAD
gh pr create --title "A Pokédex slot remembers its card, and says what that card is" --body "$(cat <<'EOF'
A slot with several cards keeps its slider, and where you stop is the slot's card: written to `cards.dex_face` and read back face-first, so the slot opens on it here, on the public profile and in the iOS app.

Above the picture: the Pokémon, its number and how many cards you hold. Below it: the set and the price of the card in view, which changes as you swipe.

Needs cardorb-api#<n> deployed, and its migration run.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Poll the `check` job. Merge on "All checks passed", then delete the branch.

---

## Self-review notes

- Spec coverage: storage (Task 1), public profile (Tasks 2 and 3), face-first order and price (Task 4), writing on settle (Task 5), the two lines and the live caption (Task 6). The spec's "not in this" list stays out.
- The spec says a copy is not a face: Task 1 Step 5 says so and leaves the copy path alone.
- `isFace` and `price` are named once in Task 4 and used under those names in Tasks 5 and 6.
