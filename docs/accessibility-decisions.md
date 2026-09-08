# Accessibility decisions

Findings from an accessibility review that were looked at and accepted as they are.
The next review reads this file first and does not raise them again — that silence is
the point. What matters in an entry is the reason, because a reason can be reread and
overturned; a bare list of suppressions is just a blind spot.

File and line, the finding in one clause, why it is accepted, and the date.

- `src/components/application/file-upload/file-upload-base.tsx:196` — the drop zone's
  boundary is `ring-secondary`, 1.26:1 against the card in light and 1.17:1 in dark,
  under the 3:1 WCAG 1.4.11 asks of a control's outline. Accepted: it is the same token
  every card, section and input in the app draws, so raising it here alone would make
  the drop zone the one framed thing that looks different, and raising it everywhere is
  a decision about the design system rather than about this screen. The control is not
  identified by that line — a cloud icon, "Click to upload or drag and drop" and a hint
  sit inside it — so nothing is carried by the border alone. 2026-09-07.

- `src/components/app/toast.tsx:104` — the toast's close button is last in the page's tab
  order (measured: 66 of 67 focusable elements), and while the card sheet is open its
  react-aria focus trap puts the toast out of reach entirely. Accepted: the toast is
  announced by its `aria-live="polite"` region either way, so nothing is missed, only
  slow to dismiss; Escape closes the sheet and the toast is reachable straight after.
  Moving the toaster inside every modal — or giving it a working skip-to hotkey, sonner's
  own ⌥+T did not fire here — is a change to how overlays are built rather than to this
  screen. Revisit when the first modal needs a toast of its own. 2026-09-08.
