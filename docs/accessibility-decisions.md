# Accessibility decisions

Findings from the accessibility review that were looked at and accepted. One entry per finding:
file and line, the finding, why it is accepted, the date. A later review does not raise these
again unless the code there changed or the owner asks.

- `src/components/app/mobile-nav.tsx:30` — the tab bar label is 8 px (`text-xxxs`), below what low vision reads without zoom. Accepted: the owner chose it over a taller bar; the icon carries the destination, the label repeats it, and the text scales with browser zoom (WCAG 1.4.4). 2026-09-04.
