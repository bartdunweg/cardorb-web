# Conventions

The rules that apply **now**, in this repository. This is the only binding source, and it is
the whole memory — there is no archive of decisions and no archive of feedback.

A rule is rewritten or deleted the moment it stops being true. What it used to say is in
`git log -p CONVENTIONS.md`, which is deliberately not in the read path. A request from the
owner outranks any rule here; say which one it departs from, then do it.

- `Enforcement` is `reviewed`, or `enforced — <what enforces it>`. There is no third value:
  a rule nothing checks is dropped or made checkable.
- `Why` is one sentence and may not be empty. Where the reason is genuinely lost, write
  `unknown` — never invent one.
- IDs are stable and never reused, so a rule can be waived by name in a conversation.
- Present tense, imperative, at most two lines. No dates — that is what git is for.
- There is no rule-count ceiling. Freshness is the brake, not size.

last-reviewed: 2026-08-23

| ID | Rule | Enforcement | Why |
|---|---|---|---|
| R-STYLE-001 | All colours come from `src/styles/theme.css` tokens. The brand ramp (`--color-brand-*`) is the single brand source and is grayscale (near-black light / near-white dark). No hardcoded hex in components. | reviewed | A hardcoded colour escapes theming and dark mode and is found by a user, not a test. |
| R-STRUCT-001 | The vendored Untitled UI kit (`src/components/{base,application,marketing,foundations,shared-assets}`, plus the kit's `hooks`/`utils`/`providers`) is owned but not lint-policed; our own shared components live in `src/components/app`. | enforced — eslint.config.mjs ignores the vendored dirs | Keeps the lint signal about our code and a clear line between vendored and our own. |
| R-DATA-001 | Everything arriving from outside (forms, request bodies, params) is validated with zod before use. | reviewed | Unvalidated input fails deep in the code, where the message means nothing. |
| R-SEC-001 | Never commit secrets. Real keys live in `.env.local` (gitignored); `.env.example` documents the names only. | enforced — gitleaks in scripts/verify.sh | A secret that reaches a commit is leaked permanently, not deleted. |

**Where a rule and the code disagree**, the rule is dead or the code is wrong. Do not decide
that alone and do not settle it in conversation — add it to `## Open` in `STATE.md`, which is
the list the owner actually reads.
