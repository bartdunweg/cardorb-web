# A Pokédex slot remembers its card, and says what that card is

2026-09-12. Bart's ask: a slot can hold several cards of the same Pokémon, and there is no way to
say which one belongs there. Swiping works today but forgets, and the caption says nothing about
the card you are looking at.

Two changes, one idea: a slot has a current card, the app remembers it, and the words around the
picture follow it.

## What a person sees

A slot with several cards keeps its slider. Above the picture stands the slot: `#025 Pikachu`
and how many cards you hold of it. Below the picture stands the card you are looking at now: its
set and its price. Swipe, and the line below changes with the picture.

The card you leave standing is the slot's card. Come back tomorrow, on this machine or another,
and the slot opens on it. Nothing is tapped and nothing is confirmed: where you stop is the
answer. The arrows do the same thing, so a keyboard chooses too.

A slot you hold one card of keeps the same two lines, and nothing to swipe. A slot you hold none
of keeps the line above and nothing below: there is no card to describe.

On a public profile a visitor sees the owner's chosen card first and may swipe past it, and
swiping writes nothing. A public card carries no price, so only its set is written under it.

## Where the choice lives

A flag on the card, `cards.dex_face`, beside the `is_favorite` it will read exactly like.

The reasons it is a flag and not a table of its own:

- `GET /v1/cards` already answers with every field a card has, and the Pokédex is built from that
  answer (`groupByDex` in web, not the API's `/pokedex` route). A flag costs no second read and no
  second cache.
- A card that leaves the collection takes its flag with it. A sold card cannot stay a slot's face.
- iOS reads the same answer, so the choice is the same in both apps and on the public profile.

What a table would have bought is the database holding "one face per Pokémon" itself. It cannot
here anyway: `species_id` is derived from the catalogue at read time and was dropped from the
`cards` table (`20260902210000_drop_wishlist_and_pokedex_numbers.sql`), so no SQL constraint can
see a species. The app keeps the rule instead, and the reader tolerates a break in it.

## How it is written

The slider reports the card that settles. Where the page is the owner's own, the app waits for the
scroll to stop (400 ms) and then sends two writes, both the PATCH the star already uses:

    PATCH /v1/collection/items/{new}  { dexFace: true }
    PATCH /v1/collection/items/{old}  { dexFace: false }

The app sends the clearing write because the API cannot find the old card itself: species is not a
column. The slot has both cards in hand, so the app can.

No revalidation. `getAllMyCards` is deliberately outside the five-minute list cache ("a whole
Pokédex goes straight", `src/lib/cards.ts`), so the next read of the page is already fresh, and
re-rendering a thousand-slot grid on every swipe would cost far more than it fixes. The picture
the person is looking at is the picture they chose: there is nothing to redraw.

Two flags on one species, should another client ever leave one, is not an error: the slots keep
their existing order and the first flagged card leads. The next swipe settles it.

## The pieces

**API.**

- Migration: `alter table public.cards add column if not exists dex_face boolean not null default false;`
  with a comment saying what it means. Bart runs it; writes from here are blocked.
- The card row and its variants carry `dexFace` (`collection-row.ts`, `cards.ts`, `items.ts`),
  answered as `dex_face` in a card item beside `is_favorite`.
- `PATCH /v1/collection/items/{id}` accepts `dexFace: boolean`, the same shape and the same guard
  as `isFavorite`.
- A split or a fold carries the flag the way it carries `isFavorite`: a copy is not a face.

**Web.**

- `api-shapes.ts`: `dex_face` on the card item, `dexFace` on `Card`.
- `dex-groups.ts`: `DexCardLike` gains `dex_face` and `price` reaches `DexCard`; a slot's cards are
  ordered with the flagged one first, the rest in the order they already had.
- `dex-slider.tsx`: reports the settled card (`onShow`), and on the owner's own page writes it.
- `dex-grid.tsx`: the slot's own two lines, the one below fed by the slider's current card.
- `card-tile.tsx`: a line above the picture, used by the Pokédex slot and nothing else yet.
- `actions.ts`: `setDexFace(cardId, isFace)`, shaped like `setFavorite`, without `forgetMine`.

## Testing

- `groupByDex`: the flagged card leads its slot; a slot with no flag keeps its order; a flag on a
  card the rule leaves out changes nothing; two flags take the first.
- The API route: `dexFace` is accepted, written, and refused on somebody else's card.
- The slider: the settled card is reported once per swipe, not per scroll event, and never on a
  page that is not the owner's.

## Not in this

- A deliberate "set as the face" button. Where you stop is the choice; a button is a second way to
  say the same thing.
- Anything about the Pokédex becoming an ordinary binder. That is Bart's third ask of the day and
  it restructures the page around this one: its own spec, after this ships.
