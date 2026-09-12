# Where a price comes from

One market: TCGplayer. A card it does not price has no price, and the app says so.

Bart, 2026-09-12, after two of his own cards read the wrong figure. This is what was measured, what
was decided, and what it costs, because a price nobody can retrace is a price the next person will
change back.

## The sources

| Source                             | What it is                                                        | Where it is used                                       |
| ---------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------ |
| TCGplayer, relayed by TCGdex       | A figure per printing, from sales, with a product id per printing | Every price on a card, converted to euros              |
| TCGplayer, archived by tcgcsv.com  | The same figures, a file per set per day since 2024-02-08         | The price history, and the weekly point for every card |
| tcgdex/price-history on GitHub     | TCGplayer sales per card per day, 2022-11 to 2024-09              | The price history before tcgcsv's archive starts       |
| Frankfurter (the ECB's daily rate) | The dollar rate a bank statement would use                        | Converting all of the above                            |
| eBay sold listings                 | Finished sales, linked, never read                                | The sheet's links, to check a price and a PSA 10       |

Cardmarket's price guide is still read by Browse and search for their shelf prices. That moves next,
and then nothing on screen reads Cardmarket.

## Why TCGplayer, and only TCGplayer

**It knows which card it is pricing.** Cardmarket names a product after the card and never after its
number, so several printings share one product. Measured on the owner's own cards, 2026-09-12:

| Card                               | Cardmarket               | TCGplayer |
| ---------------------------------- | ------------------------ | --------- |
| Jungle Scyther #10, holo           | €20.72                   | €53.23    |
| Jungle Scyther #26, plain          | €20.72, the same product | €15.19    |
| Team Rocket Dark Golbat #24, plain | €30.46                   | €5.83     |

A plain rare reading €30.46 is not a market disagreeing, it is the holo's figure standing on another
card. cardorb-api#345 counts 2,054 cards still sharing a product.

**It can be opened.** Every printing carries a TCGplayer product id, so a figure has a page behind it.
Cardmarket publishes no expansion half of a product's address and answers every probe with a bot check.

**Why not both.** The app used to average the two, and before that fell back to Cardmarket where
TCGplayer said nothing. An average of a figure that names the printing and one that names only the
card is truer than neither, and the reader cannot see which half is which. So one market answers,
and where it is silent the card has no price (cardorb-api#354).

**The Near Mint band is gone.** The figure used to be put through a ratio, about a quarter up above
€20 and an eighth down between €5 and €20, fitted to Cardmarket's trend on thirteen cards. Nothing
reads that trend now, and a band measured on one market is not evidence about another.

## What it costs, said plainly

- **It is not this collection's market.** Dollars, American scarcity. The owner's Team Rocket's Mewtwo ex
  is €613.15 on Cardmarket and €389.54 on TCGplayer converted. Selling in Europe returns the first.
- **About one card in eight has no price**, in a sample of 45 of the owner's cards, mostly promos.
- **Korean and Chinese cards have no price.** TCGplayer does not sell them.
- **A Shadowless copy reads the ordinary price.** TCGplayer files Shadowless as a set of its own on
  tcgcsv ("Base Set (Shadowless)"), which is not read yet.
- **The price history steps nowhere.** `card_prices` was rebuilt from TCGplayer on 2026-09-12
  (`backfill-card-prices.mjs --only recent`, cardorb-api#355): 135,271 readings written over 63,881
  Cardmarket ones, and 6,970 Cardmarket readings deleted for cards TCGplayer had no figure for.

## Checking a price

The Price tab links to the TCGplayer product the figure came from, to eBay's sold listings for the
card with graded slabs left out, and to eBay's sold PSA 10s. The last is the only graded price the app
can offer, since neither market publishes one.

## When to reopen this

- If Cardmarket ever publishes a product per printing, the granularity argument disappears and their
  market is the owner's, which would put them first again.
- If the owner starts selling rather than holding, the market they sell in is the one that counts.
- If promos matter more than the gap costs, a second source for them wants its own decision, not a
  quiet fallback.
