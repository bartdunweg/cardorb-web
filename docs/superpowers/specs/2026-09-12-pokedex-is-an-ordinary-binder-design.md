# The Pokédex is a binder you make yourself

2026-09-12. Bart: only Favorites is always there. The Pokédex should be a binder like any other,
one you make, edit and delete, with its rules under Edit binder where every other binder's are.

Today it is a fixture: its own route, its own row in the sidebar, its own card in the Binders
grid, its own settings dialog, and two columns on the profile (`pokedex`, `pokedex_public`) that
exist for nothing else.

## The rule this change is held to

Bart, the same day: what a user already has is migrated onto the new thing or thrown away, and no
legacy may sit on an account for something the app no longer has. So this ships as one change:
the data moved, the old columns dropped, and the code that read them deleted. Not "the column can
go later".

## What a person sees

Nothing is lost. The Pokédex you have becomes a binder called "Pokédex", carrying the range, the
rarities and the "show the ones I'm missing" setting it had, and its public flag. It keeps its
place in the sidebar and in the Binders grid, because that is where your binders are. Its dots
menu is a binder's: Edit binder, which is where the Pokédex settings now live, and Delete binder.

Make another one and it behaves the same, which it already does today: any binder can be shown as
a Pokédex (`collections.pokedex`), and that is the machinery this change stands on.

Delete it and it is gone, the way deleting a binder is. The cards stay; a binder is a view.

`/dashboard/pokedex` sends you to that binder. My call, not Bart's: a redirect is one line and one
lookup, a dead bookmark is a worse afternoon, and a redirect leaves nothing on an account. If the
route should simply 404, say so and it is a smaller change.

## The migration

One pass, run once:

1. For every profile with a `pokedex` setting, create a collection named "Pokédex" carrying that
   setting, `is_public` from `pokedex_public`, no rule.
2. Drop `profiles.pokedex` and `profiles.pokedex_public`.

A profile with no setting (nobody has touched the Pokédex) gets a binder with the default: every
Pokémon, missing ones shown. That is what they see today, so that is what they keep.

Today there is one account, which makes this cheap to get right and cheap to check: the rows can
be counted before and after.

## What is deleted, not left behind

**API**

- `profiles.pokedex`, `profiles.pokedex_public`: columns dropped after the pass above.
- `PATCH /v1/profile` stops accepting `pokedex` and `pokedexPublic`, and the profile answer stops
  carrying them.
- `GET /v1/pokedex`: gone. Nothing calls it. The web builds its slots from `GET /v1/cards`
  (`groupByDex`) and the iOS app has no Pokédex at all, which was checked rather than assumed.
  `getPokedex` and `summariseDex` go with it unless the folder path uses them.
- `"pokedex"` leaves `PUBLIC_LISTS`, and the public cards route stops answering `list=pokedex`.
  A public Pokédex is a public binder now, which that route already serves.

**Web**

- `src/app/(app)/dashboard/pokedex/page.tsx`: a redirect to the binder, nothing else.
- `pokedex-settings-dialog.tsx`: gone. `folder-dialog.tsx` already carries these fields.
- `updatePokedexSetting` in `settings/actions.ts`: gone.
- `getPokedexCount` and the `pokedexCount` plumbing through `collections.ts`, `app-sidebar.tsx`
  and `collections-grid.tsx`: gone. The binder counts itself, like the others.
- The Pokédex's own row in the sidebar and its own card in the Binders grid: gone. It appears in
  both as one of your binders.
- `profile.pokedex` and `profile.pokedex_public` in `api-shapes.ts`, `public-profile.ts` and
  `user/[username]/page.tsx`.
- `DEFAULT_POKEDEX` stays: the migration and the folder dialog both want a default.

## The one thing that has to be built, not deleted

A public profile shows a public binder, but it draws it as a list of cards. A binder shown as a
Pokédex has to draw as a Pokédex there too, or the public profile quietly loses the view this
change is about. That is `user/[username]/page.tsx` reading the folder's `pokedex` setting and
handing `FolderBody` its slots, the way `/dashboard/collections/[id]` already does.

## Home, and the count

The "Pokémon collected" card on Home reads the profile's setting today (`dex-stat.tsx`). It reads
the Pokédex binder's instead, and links to it. Where a person has no binder shown as a Pokédex,
the card is not drawn: a number about a view you deleted is the legacy this change is against.

## Words

`CLAUDE.md` says two binders are always there, Favorites and the Pokédex. It becomes one:
Favorites. The Domain section's Binder entry changes with it.

## Testing

- The migration: a profile with a setting gets a binder carrying it; one without gets the default;
  `pokedex_public` becomes the binder's `is_public`. Counted before and after on the one account.
- The API refuses `pokedex` in a profile PATCH once the column is gone, rather than accepting it
  into nothing.
- `/dashboard/pokedex` lands on the binder; with no such binder it lands on Binders.
- A public profile draws a public Pokédex binder as slots, not as a list.
- Home draws no "Pokémon collected" card when no binder is shown as a Pokédex.

## Not in this

- Changing what a Pokédex binder looks like. It is the same page.
- Making Favorites a binder you can delete. Bart named it as the one that stays.
