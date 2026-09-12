# Where a price comes from, and why in that order

Bart, 2026-09-12, after seeing two of his own cards read the wrong figure: forget Cardmarket for
now, one source. This is what was measured, what was decided, and what it costs, because a price
nobody can retrace is a price the next person will change back.

## The sources

| Source                             | Market                 | What it is                                                        | Where it is used                                         |
| ---------------------------------- | ---------------------- | ----------------------------------------------------------------- | -------------------------------------------------------- |
| TCGplayer, relayed by TCGdex       | United States, dollars | A figure per printing, from sales, with a product id per printing | The figure a copy reads, converted to euros              |
| Cardmarket's public price guide    | Europe, euros          | One figure per product, rebuilt nightly, 79,033 products          | Every card TCGplayer does not price, and the value chart |
| Frankfurter (the ECB's daily rate) |                        | The dollar rate a bank statement would use                        | Converting the above                                     |
| TCGdex                             |                        | The catalogue: which card this is, its scan, its set              | Everything                                               |
| Limitless                          |                        | Scans TCGdex knows but has not photographed                       | Pictures only                                            |

Consulted and not used: pokemontcg.io's prices (it refuses three requests in five), PokemonPriceTracker
(free or $9.99 a month, RAW and PSA, dollars) and PriceCharting ($49 a month, and redistribution
needs their written consent, which a public profile page is).

## Why TCGplayer answers first

**It knows which card it is pricing.** Cardmarket names a product after the card and never after
its number, so several printings share one product. Measured on the owner's own cards, 2026-09-12:

| Card                               | Cardmarket               | TCGplayer |
| ---------------------------------- | ------------------------ | --------- |
| Jungle Scyther #10, holo           | €20.72                   | €53.23    |
| Jungle Scyther #26, plain          | €20.72, the same product | €15.19    |
| Team Rocket Dark Golbat #24, plain | €30.46                   | €5.83     |

A plain rare reading €30.46 is not a market disagreeing, it is the holo's figure standing on
another card. cardorb-api#345 counts 2,054 cards still sharing a product.

**It can be opened.** Every printing carries a TCGplayer product id, so a figure has a page behind
it. Cardmarket publishes product ids and not the expansion half of an address, and its site
answers every probe from a tool with a bot check, so no link can be built (cardorb-api#267).

## What it costs, said plainly

**It is not this collection's market.** Dollars, American scarcity. The owner's Team Rocket's
Mewtwo ex is €613.15 on Cardmarket and €389.54 on TCGplayer converted. Selling in Europe returns
the first figure. So the collection's total now reads what an American would pay, in euros.

**It does not know everything.** In a sample of 45 of the owner's cards, one in eight had no
TCGplayer figure at all, mostly promos. Those read Cardmarket, which is why it is still here.

**The two markets differ by a median of 42%** on the cards where both answer, in both directions.
Whatever is chosen, one of the two numbers is not what the owner would get.

The trade, in one line: **which market was given up for which card.** A right figure for the wrong
market can be converted by the person reading it; a wrong figure for the right market cannot even
be seen.

## What is still Cardmarket's

The value chart and the nightly snapshot read Cardmarket's guide, so the line under the total and
the figure on the card can disagree until that is moved too. The Shadowless run is Cardmarket's
own product and stays theirs (cardorb-api#329); the stamped first run is TCGplayer's.

## When to reopen this

- If TCGplayer's coverage of promos improves, Cardmarket's fallback shrinks on its own.
- If Cardmarket ever publishes a product per printing, the granularity argument disappears and
  their market is the owner's, which would put them first again.
- If the owner starts selling rather than holding, the market he sells in is the one that counts.
