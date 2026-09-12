# An edition is a print run, and most of it is already built

Bart raised it on 2026-09-12: a 1st Edition Charizard is not the same card as an unlimited one,
not in the collection and not in the price. This is what exists, what is missing, and the answers
he gave for the rest. Nothing here is built in this repo yet.

## What a copy already carries, and what an edition adds

A copy carries a `finish` (normal, reverse-holo, holo, poke-ball, master-ball) and a
`foil_pattern` (cosmos, cracked-ice, starlight, confetti, vertical-line). Those two answer
different questions on purpose: the finish says which of Cardmarket's two price series a copy
reads, the pattern says what the foil looks like and has no price of its own
(`cardorb-api/src/lib/core/collection/collection-row.ts`).

An edition is a third question, neither of those: which print run a copy is from. The same card,
the same foil, a different product on Cardmarket with a price of its own.

## The API side is done, today

cardorb-api#313, "A copy says which print run it is from", landed on 2026-09-12 while this was
being written up. It carries:

- `cards.edition`, nullable, `cards_edition_check` for `1st-edition`, `shadowless`, `unlimited`.
  **Applied in production**: the column answers `information_schema` on the live project, checked
  2026-09-12.
- `EDITIONS`, `isEdition` and `edition` on `CollectionRow`, and the field on what `/v1/cards`
  answers and what a write accepts.
- Sameness: `fold_card`, `fold_identical_cards` and `split_card` all compare `edition`, so a 1st
  Edition copy is not folded into the unlimited row.
- The CSV import reads it, from an Edition column or from Dex's Variant word
  (`editionFrom`, matching "1st Ed", "1st Edition", "First Edition").
- Null is not "unlimited": every row today says nothing, and a row says unlimited when somebody
  says so.

So the vocabulary, the store and the contract exist. **This app knows none of it**: `edition` does
not appear anywhere in `src` (grepped 2026-09-12).

## What the catalogue knows about the money

TCGdex answers `variants` and `variants_detailed` per card. Measured 2026-09-12:

| Card              | Variant | Subtype             | Cardmarket product | Trend    |
| ----------------- | ------- | ------------------- | ------------------ | -------- |
| base1-4 Charizard | holo    | unlimited           | 273699             | €583.52  |
| base1-4 Charizard | holo    | shadowless          | 660224             | €3567.07 |
| base1-4 Charizard | holo    | 1999-2000-copyright | none               | none     |
| base1-2 Blastoise | holo    | unlimited           |                    | €218.86  |
| base1-2 Blastoise | holo    | shadowless          |                    | €914.17  |

- **Shadowless is a priced product**, its own Cardmarket id and figures, six times the unlimited
  card on Charizard. A Shadowless copy priced as unlimited is wrong by €3000.
- **1st Edition is not.** The classics answer `variants.firstEdition: true`, which says the card
  exists as a 1st Edition print, and no subtype carries a 1st Edition product or price. The
  catalogue knows the fact and not the money.
- Nothing in cardorb-api reads `variants_detailed` (grepped): the sync reads the plain `variants`
  flags, so every copy is priced as the unlimited product whatever its edition says.

## The three decisions, answered by Bart on 2026-09-12

The reasons stay written out, because a decision without its reason is a decision the next reader
reopens.

1. **A copy fact, or a card of its own?** **A copy fact**, a column beside `finish`, which is what
   the API built. Cardmarket treats it as a separate product, so the other reading is defensible,
   but a separate card row doubles the catalogue for a fact that only matters to people who hold
   one, and every binder, the Pokédex and the set pages count cards.
2. **What is a 1st Edition copy worth, while nothing prices it?** **Unpriced, and marked as
   such.** The app already shows "no price" honestly and counts unpriced copies. The other
   reading, the unlimited price with a marker, makes the collection's total look right and be
   wrong.
3. **Does Shadowless get its own price now?** **Yes**, and it is the reason to do the work at all.

## What is left, in two slices

**The fact, in this app.** `edition` through `api-shapes.ts` onto a `Card`, the copy editor
offering it (add a copy, split a copy), the sheet's copy rows showing it, the CSV export carrying
it back so a round trip does not lose what the import now keeps, and the design page. Then the
filters, if a person wants to see what they hold of one run.

**The money, in the API.** The sync reading `variants_detailed`: which subtypes a card has, each
one's Cardmarket product and figures, a per-subtype figure travelling with the card, and
`priceForCopy` choosing by edition as it chooses by finish today. This moves the value history the
snapshots are built on, which is why it is its own slice and goes second. A 1st Edition copy stays
unpriced by decision 2, so this slice is Shadowless and whatever else the catalogue prices.

`cardorb-ios` reads the same API. The field is additive, so nothing there breaks; it shows the
edition when somebody teaches it to.
