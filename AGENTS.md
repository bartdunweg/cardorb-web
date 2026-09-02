<!-- DEV-STANDARDS:BEGIN v0.27.0 — generated from dev-standards. Do not edit by hand. -->

# Agent adapter

Before planning, editing, reviewing, or running commands, read the repository-root
`CLAUDE.md`. Treat its standards and product-specific instructions as binding for this
repository. It is the canonical project instruction file, and this file only points at it.

Read `CONVENTIONS.md` too: it holds the rules that apply now, and it is the whole memory of
this repository. There is no archive — a rule is rewritten or deleted in place, and what it
used to say is in `git log -p CONVENTIONS.md`. A request outranks any rule; name the rule it
departs from in one sentence and then carry it out.

`AGENTS.md` is the cross-tool convention: any agent that reads it gets the same rules as
Claude Code, without those rules being written twice and drifting apart. The standard itself
is built and tested against Claude Code.

When a request matches an installed shared workflow, use it: `apply-standards` for onboarding
or refreshing standards, `setup-machine` for preparing a machine, and `record-rule` whenever a
rule of this repository is added, changed, or dropped. Use natural-language requests when a
slash command is unavailable.

After every build or code change, run `./scripts/verify.sh` and then `build-quality` before
declaring the work complete. `build-quality` reads `Platform:` from `CLAUDE.md` and covers the
domains that platform requires. Every domain carries evidence — a command and its exit code, a
measurement, a trace, or a screenshot. A domain with no evidence is reported `not measured`,
never `pass`.

<!-- DEV-STANDARDS:END -->

<!-- PRODUCT:BEGIN — product-specific. Edit freely; never overwritten by /apply-standards. -->

## House style

Rules that hold for this repository only, and that the generated block above does not cover.
Anything written here survives a re-run of `/apply-standards`; anything written above it does not.

<!-- PRODUCT:END -->
