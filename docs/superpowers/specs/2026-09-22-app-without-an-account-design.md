# The app without an account

2026-09-22. The app is open; the wall stands around what is yours.

Today everything under `/dashboard` is behind a login, and the landing page is all a visitor
sees. A collector who has never heard of Card Orb cannot look at a single card before making an
account. This design opens the catalogue and keeps the collection closed.

## The rule

**A catalogue card is open. A card you own is not.**

One sentence, checkable, and it decides every case that comes up later without a second
conversation.

| Open, no account | Behind a login |
|---|---|
| Browse, every set | Home (your value, your chart) |
| A set page, every card in it | Collection |
| The card sheet: picture, price, printings | Binders, Favorites |
| Search | Wishlist |
| The landing page, privacy, terms, API docs | Pokedex (it is a binder) |
| A public profile (already open) | Settings, your profile |

## Addresses

Browse moves out of `/dashboard`, because it is now a page for strangers and "dashboard" has no
business in the URL of the page that has to earn the click.

| Address | Signed out | Signed in |
|---|---|---|
| `/` | The landing page, with a way through to Browse | Redirect to `/dashboard` (it already does this) |
| `/sets` | Browse | Browse, with your progress on the tiles |
| `/sets/[id]` | The set, every card | The set, with what you hold marked |
| `/dashboard` and the rest | Redirect to `/login` | Home, Collection, Binders, Wishlist, Pokedex, Settings |

The old `/dashboard/sets` and `/dashboard/sets/[id]` keep working as permanent redirects: they
are in the sitemap, in browser history and in the iOS app's share links.

`/` does not remember whether a visitor has been before. A front door that differs per person is
not prerenderable and a report of "I land on the wrong page" has nothing to reproduce. One
address, one answer.

## One shell, not two

The open pages render inside the same `(app)` layout the signed-in app uses: the same sidebar,
tab bar, tiles, filters and card sheet. In Next a route group is a folder and not a segment, so
`(app)/sets/page.tsx` serves `/sets` with the app's own frame around it. Moving Browse out of
`/dashboard` costs a folder move, not a second skin.

What the frame drops without a session:

| Part | Signed out |
|---|---|
| The account card at the foot of the sidebar | Sign in / Create account |
| The binder list | One row inviting an account |
| Collection, Wishlist, Pokedex in the navigation | Still there, leading to a page that says what is behind them, not to a bare login form |
| Browse, the set page, search, the card sheet | Exactly as they are |
| The star, the heart, add a copy | Still there. One press leads to sign in, with the intent kept |

The write controls stay visible on purpose. Hiding them empties the app and hides the argument
for making an account, which is the whole point of the page.

The landing page is the one exception and keeps its own marketing look: it is the only page that
is not the app.

## The door, and the way back

The landing page has one button today and it goes to `/signup`. There is no way into the app at
all, so the door has to be built with the rest of this.

| From | To | How |
|---|---|---|
| The landing | The app | A second button in the hero beside "Get started": "Browse the sets", secondary. The same link in `PublicTopBar` |
| Legal, the API reference, a public profile | The app | That same `PublicTopBar` link, so the door stands wherever a stranger arrives |
| The app, signed out | The landing | The logo at the top of the sidebar |

One rule holds the last row: **the logo goes to your home.** Signed in that is Home; signed out it
is the landing page. No "what is this" item inside the app's navigation and no marketing bar
inside the shell.

The landing's second button is secondary on purpose. A visitor who already trusts us presses Get
started and needs to see nothing first. The other button is for the visitor who does not, which is
the person this whole design is for. Both have to be there; equal weight would make neither read
as the answer.

**The rough edge:** there are two chromes now, `PublicTopBar` on the landing, the legal pages, the
API reference and the public profile, and the app shell on Browse and the set pages. Crossing from
one to the other changes the furniture under the visitor. That is defensible while the crossing is
one deliberate door, taken once. The public profile is the case that does not fit: it shows cards
and still wears the marketing bar. It should move into the app shell eventually. Not in this work,
written down so it is not lost.

## Where the wall really is

Not in the middleware. In the API. `/catalog/sets`, `/catalog/sets/{id}` and `/catalog/search`
all require a bearer token today, and they fold the reader's own holdings into the answer
(`ownedCount` per set, what you hold per card). Without a token there is nothing to read.

**The API answers these three without a token.** Not a second `/public/catalog/*` family beside
them: two sets of routes over one catalogue drift apart, and the shapes are the contract the iOS
app reads. Without a token the answer carries the catalogue and leaves the holding fields out
(absent, not zero, so "none" and "not asked" stay different things). With a token nothing
changes, so the iOS app does not notice this release.

Prices are catalogue facts and stay in the open answer. They are also the best argument for an
account. The progress bar on a set tile is yours and goes.

## Reads without a person

`api()` throws 401 before it calls when `auth` is true and there is no token. It grows a third
state: the call is made either way, with the header when there is a session and without it when
there is not.

`perUser()` keys every catalogue read on the person. A visitor has no key and should not be
given one: every signed-out visitor may share one cached copy of the catalogue. Signed out those
reads go to the shared Data Cache under a public key and a public tag, the way `/public/species`
already does, which makes the open pages faster than the signed-in ones rather than slower.

The five-minute window in the key (`cacheWindow`) and the price day in it stay as they are.

## The middleware barely changes

`PROTECTED_PREFIXES` is `["/dashboard"]` today and everything else is already open. Moving Browse
to `/sets` is what opens it: everything that needs a person keeps living under `/dashboard`, so
the list neither grows nor shrinks. The address is the rule, which is the cheapest place to keep
it and the one a redirect cannot get wrong.

`NONCE_ROUTES` in `csp.ts` must follow Browse to its new address, or the open pages lose the
policy their inline scripts are signed against. A policy follows the document and not the route,
so this shows up as "works on a refresh only" if it is missed.

## What the layout stops doing

`(app)/layout.tsx` reads the profile, the binders and the favorites count on every screen, and
`SessionGuard` sends a 401 to `/login`. Signed out all three are skipped: no read, no guard, no
redirect. That is also what makes a signed-out `/sets` possible at all, since today those reads
alone would bounce a visitor before the page rendered.

## Being found

The payoff is a set page a search engine can read.

- `/sets` and every `/sets/[id]` join the sitemap, generated from the catalogue.
- Each set page keeps its own title and gets a canonical URL and an Open Graph image.
- The landing page and the set pages answer different searches: "pokemon collection tracker"
  against "Base Set card list". Both are wanted; neither replaces the other.

## Testing

- **Unit:** the rule itself. Which paths are open, what the frame drops without a session, that a
  signed-out catalogue read uses the shared key and a signed-in one does not.
- **e2e:** a second crawl in the existing stack, signed out, over every open address: an `h1`, no
  500, no console error, and the write controls present and leading to `/login`. The signed-in
  crawl stays as it is.
- **prod-check:** `/sets` and one set page join the hourly signed-out read, which is the only
  place this feature can be checked in production, since there is no test account.
- A test that a protected address still redirects. The risk this design carries is not that too
  little opens, it is that too much does.

## Order

Phase 0 to 3 are one stretch and have to land together; 4 and 5 can follow.

| # | What | Where |
|---|---|---|
| 0 | The catalogue answers without a token, holdings left out | cardorb-api |
| 1 | Optional auth in `api()`, a shared key in `perUser()` | `api.ts`, `user-cache.ts`, `sets.ts` |
| 2 | The frame without a session, and the layout's reads skipped | `(app)/layout.tsx`, sidebar, tab bar |
| 3 | Browse moves to `/sets`, redirects, CSP, middleware | routes, `csp.ts`, `proxy.ts` |
| 4 | Every write control becomes an invitation, intent kept | card sheet, tiles, star, heart |
| 5 | Sitemap, canonicals, the signed-out crawl, prod-check | sitemap, e2e, prod-check |

## Not in this design

- A demo collection for signed-out visitors. Home stays closed rather than filled with fiction.
- Remembering a visitor on `/`.
- Any write without an account.

## Sources

Shipped apps that already solve this, and what each one settles.

**The shell stays whole, the account card is the only difference.**
[Suno](https://mobbin.com/screens/e9a65743-b33b-4466-a984-f61c587c0e1c) signed out is the closest
analogue to what we are building: the full sidebar (Home, Explore, Create, Library), the content
browsable, and a single "Sign In" where the account would be. Nothing is greyed out and nothing
is hidden. [ChatGPT](https://mobbin.com/screens/571f4f61-6278-428f-a4ca-f6cf02590b33) does the
same with a line of copy at the foot of the sidebar saying what an account adds, above the Log in
button. That is the shape our sidebar's account card takes.

**A closed section explains itself instead of showing a login form.**
[MagicPath](https://mobbin.com/screens/d0cfcef6-bfd7-4b2f-86e7-fdfc0d9bdb24) keeps the personal
section in the navigation and answers it with the section's own name and one sentence: "Sign in
to manage your personal workspace and team settings", then the button. This is exactly the page
Collection, Binders, Wishlist and Pokedex should answer with signed out, and it is why this
design does not send those routes to a bare `/login`.

**Sign in is asked at the moment of the write, not on arrival.**
[Substack](https://mobbin.com/screens/80885043-0e47-429f-8c7a-ddc7b8da1b26) lets a visitor read
the feed and raises the sign-in sheet when they act on a post.
[Tripadvisor](https://mobbin.com/screens/da45f3bd-6a88-4617-b449-c41dd2df7f1e) is the
counter-example: the modal is on the landing itself, before the visitor has seen anything worth
an account. We do the first and not the second.

**What the signed-in version of the same control looks like**, so the signed-out invitation leads
somewhere recognisable: [Apple](https://mobbin.com/screens/e5568ee4-bfaa-4650-b4d3-1c5b367ab8b3)
and [Unity](https://mobbin.com/screens/7dc7cae5-028e-4206-a684-a393c3a17a0a) both answer a save
with a list picker, which is our "add to a binder".

Product precedents outside Mobbin, in our own category: Discogs, Letterboxd and TCGplayer all
publish the catalogue openly and keep the collection behind an account, and all three take most
of their search traffic on item pages rather than the home page. That is the argument for phase 5
and for moving Browse to `/sets`.
