# Where a price comes from

One market: TCGplayer. A card it does not price has no price, and the app says so.

Bart, 2026-09-12, after two of his own cards read the wrong figure. This is what was measured, what
was decided, and what it costs, because a price nobody can retrace is a price the next person will
change back.

## The sources

| Source                             | What it is                                                        | Where it is used                                                                                                             |
| ---------------------------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| TCGplayer, relayed by TCGdex       | A figure per printing, from sales, with a product id per printing | Every price on a card, converted to euros                                                                                    |
| TCGplayer, published by tcgcsv.com | The same figures, a file per set per day since 2024-02-08         | Browse and search, promos and subsets TCGdex does not relay, the Shadowless and 1st Edition Base Set runs, the price history |
| tcgdex/price-history on GitHub     | TCGplayer sales per card per day, 2022-11 to 2024-09              | The price history before tcgcsv's archive starts                                                                             |
| Frankfurter (the ECB's daily rate) | The dollar rate a bank statement would use                        | Converting all of the above                                                                                                  |

Nothing reads Cardmarket for a price since cardorb-api#362 (2026-09-12): Browse, search, the
collection, the card sheet and the history are all TCGplayer's.

TCGdex relays no TCGplayer figure for the subsets and promo lines TCGplayer files as groups of their
own (the Galarian Gallery, the Trainer Galleries, the Shiny Vaults, the Black Star promos), nor for
Base Set's Shadowless and 1st Edition runs. `scripts/tcgplayer-links.mjs` in the API matches those
cards to tcgcsv's products by set, number and name (968 cards and 101 Shadowless runs,
cardorb-api#358 and #359).

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
- **Some cards have no price.** Before the promo links, 217 of the owner's 1,609 held cards had none;
  after them, 8. Pokémon TCG Pocket cards have none by nature, and Celebrations Classic Collection is
  not linked yet.
- **Shadowless is offered where TCGplayer has it.** 101 of Base Set's 102 cards; Machamp has no
  Shadowless product and no longer offers the run.
- **The price history steps nowhere.** `card_prices` was rebuilt from TCGplayer on 2026-09-12
  (`backfill-card-prices.mjs --only recent`, cardorb-api#355): 135,271 readings written over 63,881
  Cardmarket ones, and 6,970 Cardmarket readings deleted for cards TCGplayer had no figure for.

## Checking a price

The Price tab links to the TCGplayer product the figure came from. Links to eBay's sold listings
(raw and PSA 10) sat beside it on 2026-09-12 and were taken out the same evening, for now. A graded
copy has no price in the app: TCGplayer publishes none.

## When to reopen this

- If Cardmarket ever publishes a product per printing, the granularity argument disappears and their
  market is the owner's, which would put them first again.
- If the owner starts selling rather than holding, the market they sell in is the one that counts.
- If promos matter more than the gap costs, a second source for them wants its own decision, not a
  quiet fallback.
- If graded or played copies start to matter, Scrydex is the candidate below, and the plan for it is
  written down.

## Scrydex, the candidate for graded prices (parked 2026-09-15)

Looked at on 2026-09-15 because a graded copy has no price. Parked by Bart the same day; nothing is
built and no subscription is taken.

**What it offers**, read off scrydex.com's pricing page and API docs that day, not tried with a key:

|                   | Scrydex                                                                                                                               |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Plans             | Starter $29 a month for 5,000 credits, Growth $99 for 50,000, overage $0.006 and $0.002 a credit                                      |
| Cost of a request | 1 credit; up to 100 cards per page with `include=prices`; history 3 a card (pricing page; the credits doc names only Vision as extra) |
| Raw prices        | Per variant and condition (NM, LP, MP, HP, DM), low and market, trends over 1 to 180 days                                             |
| Graded prices     | Per company (PSA, CGC, BGS, TAG, SGC) and grade: low, mid, high, market, plus signed, error and perfect flags                         |
| Currency          | USD for English cards, JPY for Japanese; EUR announced                                                                                |
| History           | Daily, raw and graded, `cards/<id>/price_history`; how far back is not documented                                                     |
| Webhooks          | Per expansion when its raw or graded prices changed                                                                                   |

**Against PriceCharting**, the other source that prices grades: $49 a month (Legendary) for a daily
CSV of every item. It gives grades 1 to 9, 9.5 and four 10s, but grade 9 and below without the
company, only current values, and it matches cards by name and number, the risk the Cardmarket
links showed. Scrydex matches by its own ids, which the Japanese catalogue already uses
(`scrydex-japan-cards.mjs` in the API reads its public pages with Bart's permission). The earlier
candidate, PokemonPriceTracker ($9.99 for 20,000 credits, RAW and PSA), was parked on 2026-09-12.

**What a pass costs.** The copy holds 38,067 cards (21,159 English, 16,908 Japanese, 2026-09-15), so
one pass over every card is about 381 credits: weekly fits Starter, daily is about 11,400 a month.
History for every card would be about 114,000 credits; for a sample of 1,000 about 3,000.

**Unknowns a key answers first:** whether a page of an expansion's cards carries graded prices (if
not, a pass is 38,067 credits, not 381), how far history goes back, and whether the terms allow
storing prices and showing them to other users.

**The plan, when this is picked up:**

1. Bart takes Starter and puts the key in `~/.cardorb-scrydex-key`; Claude does the rest.
2. Build the real nightly Scrydex ingest in the API, not a throwaway, reading into tables of its
   own beside the current copy. Pages keep reading our tables only (own copy first).
3. The first run fetches every set and every card with metadata, raw and graded prices, plus
   history for a sample, and the same script reports: agreement per field (name, number, rarity,
   artist, variants, picture) against our copy, cards either side is missing, Scrydex raw NM
   against TCGplayer per card, how many cards carry a PSA price, and how far history reaches.
4. On that report Bart decides: Scrydex for graded prices only, Scrydex as the one price source
   (Japanese cards would get yen market prices they lack today, at a monthly cost and a history
   that may start later than ours from 2024-02-08), or cancel.
5. Only then a small PR points the pages at it. A switch that loses the id match puts one
   printing's price on another card and nothing on screen shows it, which is why step 3 comes
   before step 5.

Scrydex is not outage-free: a 524 on its side wiped 169 Japanese set logos on 2026-09-15, which
cardorb-api#482 now guards against. An ingest from it needs the same rule, a held value stands.
