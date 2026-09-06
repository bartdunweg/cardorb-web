# pokemon-cards-css (vendored)

The holographic card effect on the card in the detail sheet.

- Source: https://github.com/simeydotme/pokemon-cards-css, commit `acb1197633e749a1fba4412231db2f6581586d00`
- Author: Simon Goellner (@simeydotme). Licence: GPL-3.0, in `LICENSE` beside this file.
- Textures under `public/holo/` come from the source's `public/img/`; the source credits
  aschefield101 (galaxy holo, not used here) and Vecteezy (backgrounds).

Only the CSS is taken. The interaction (pointer, gyroscope, springs) is Cardorb's own hook in
`src/lib/holo/`. The per-card foil and mask images the source loads from its CDN are not used:
every family renders through its `.card:not(.masked)` path, foil over the whole card.

## Every edit to the source

Files are `public/css/cards.css` and `public/css/cards/*.css` as of the commit above, with:

- `url("/img/…")` → `url("/holo/…")` in every file.
- `base.css`: removed the `z-index` on `.card` and `.card.interacting`; the `.card:not(.interactive)`
  transitions and `:hover` variable block (those values live in `STATIC_POSE` in `src/lib/holo/pose.ts`);
  `.card.active … { touch-action: none }`; the translate/scale transform on `.card__translater`;
  `button.card__rotator`; the `.card__rotator` box-shadows and `:focus` glow; `.card__back`;
  `.loading …`; the opacity transition on `.card__front`; `.card__rotator img:not(.card__back)` is
  now `.card__rotator img`. Nothing to flip, pop over or load: the sheet shows one card, already large.
- `defaults.css` is new: the `:root` rest values from `Card.svelte`'s `<style>`, scoped to `.card`.
- `index.css` is new: the import order of the source's `index.html`. `basic.css` (empty) and
  `swsh-pikachu.css` (keyed on `data-set`/`data-number`, never set here) are left out.
- Known source quirk kept: `reverse-holo.css` reads `--clip-trainer-invert`, which nothing defines.

Swapping this folder for an own implementation means: keep the class names, the data attributes and
the driver variables listed in `defaults.css`, and delete the rest.
