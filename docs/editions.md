# An edition is a print run, and the catalogue already names it

Bart raised it on 2026-09-12: a 1st Edition Charizard is not the same card as an unlimited one,
not in the collection and not in the price. This is what is there to work with, what it touches,
and the three things that need his answer before any of it is built. Nothing here is built.

## What an edition is, beside what a copy already carries

A copy carries a `finish` (normal, reverse-holo, holo, poke-ball, master-ball) and a
`foil_pattern` (cosmos, cracked-ice, starlight, confetti, vertical-line). Those two answer
different questions on purpose: the finish says which of Cardmarket's two price series a copy
reads, the pattern says what the foil looks like and has no price of its own
(`cardorb-api/src/lib/core/collection/collection-row.ts`).

An edition is a third question, and it is neither of those. It is which print run a copy is from:
the same card, the same foil, a different product on Cardmarket with a price of its own.

## The catalogue says it, and prices it, for one of the two

TCGdex answers `variants` and `variants_detailed` per card. Measured today, 2026-09-12:

| Card              | Variant | Subtype                  | Cardmarket product | Trend    |
| ----------------- | ------- | ------------------------ | ------------------ | -------- |
| base1-4 Charizard | holo    | unlimited                | 273699             | €583.52  |
| base1-4 Charizard | holo    | shadowless               | 660224             | €3567.07 |
| base1-4 Charizard | holo    | 1999-2000-copyright      | none               | none     |
| base1-2 Blastoise | holo    | unlimited                |                    | €218.86  |
| base1-2 Blastoise | holo    | shadowless               |                    | €914.17  |
| base2-15 Beedrill | holo    | missing-expansion-symbol | none               | none     |

So:

- **Shadowless is a priced product.** Its own Cardmarket id, its own figures, six times the
  unlimited card on Charizard. A Shadowless copy shown at the unlimited price is wrong by €3000.
- **1st Edition is not.** Every classic card answers `variants.firstEdition: true`, which says
  the card exists as a 1st Edition print, and no subtype in `variants_detailed` carries a 1st
  Edition product or price. The catalogue knows the fact and not the money.
- Two more subtypes turn up in the same field (`1999-2000-copyright`, `missing-expansion-symbol`).
  They are the same family: print-run facts, no price. A vocabulary to read from the catalogue,
  then, not one to invent.

Nothing in `cardorb-api` reads `variants_detailed` today (grepped, no hits): the sync reads the
plain `variants` flags. That read is the first piece of work whichever way the decisions go.

## What it touches

| Where                        | What                                                                                                                                                         |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `cardorb-api` catalogue sync | Read `variants_detailed`: which subtypes a card has, each one's Cardmarket product and figures                                                               |
| `cards` table                | A column, and the check constraint beside `cards_finish_check` (migrations are Bart's to run)                                                                |
| `collection-row.ts`          | An `EDITIONS` list beside `FINISHES`, its type guard, the copy shape                                                                                         |
| Price basis                  | `priceForCopy` chooses between `price` and `priceHolo` by finish. An edition with a product of its own is a third figure, not a third branch of the same two |
| `cardorb-ios`                | Reads the same API. A new field on a copy is additive; a changed price rule is not                                                                           |
| CSV in                       | Dex writes "1st Edition" in its Variant column; `finishFrom()` reads it as nothing, so the fact is dropped on every import today                             |
| CSV out                      | Dex's own Variant column has to carry it back, or a round trip loses it                                                                                      |
| Web                          | The copy editor (add a copy, split a copy), the card sheet's copy rows, the filters, the design page                                                         |

## The three decisions

1. **A copy fact, or a card of its own?** Recommended: a copy fact, a column beside `finish`.
   Cardmarket treats it as a separate product, so the other reading is defensible, but a separate
   card row doubles the catalogue for a fact that only matters to people who hold one, and every
   binder, the Pokédex and the set pages count cards.
2. **What is a 1st Edition copy worth, while nothing prices it?** Recommended: unpriced, and
   marked as such. The app already shows "no price" honestly and counts unpriced copies. The
   other reading, the unlimited price with a marker, makes the collection's total look right and
   be wrong.
3. **Does Shadowless get its own price now?** Recommended: yes, and it is the reason to do the
   work at all. It needs the sync to read `variants_detailed` and a per-subtype figure to travel
   with the card; without it a Shadowless copy is priced as unlimited, which is the largest known
   error in the collection's value.

## What a first slice would be, once those are answered

The column and the vocabulary from the catalogue, the CSV import keeping what Dex already writes,
the copy editor offering it, and the sheet showing it. The price half (the sync reading
`variants_detailed`, a per-subtype figure, `priceForCopy` learning it) is its own slice after,
because it moves the value history that the snapshots are built on.
