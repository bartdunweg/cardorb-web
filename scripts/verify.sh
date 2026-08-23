#!/usr/bin/env bash
# Generated from dev-standards. Edit the command blocks freely; keep the contract.
#
# CONTRACT: this is the single entry point that answers "is this project healthy?".
# Three exit codes, because "broken" and "could not be checked here" are different answers and a
# caller that cannot tell them apart will treat a missing tool as a defect:
#   0 — every check ran and passed.
#   1 — something really failed. This is the only code that means the project is unhealthy.
#   2 — nothing failed, but at least one check could not run here (a tool or a checkout is
#       missing). Not a pass, not a failure: install it, or accept the gap knowingly.
#
# It exists so an agent never has to know whether this project uses pnpm, gradlew,
# xcodebuild, or dotnet. One command, one exit code. The Definition of Done in CLAUDE.md
# refers to this script.
#
# Deliberately no `set -e`: every check runs and reports, so one run shows every problem
# rather than only the first. Failures are collected and returned at the end.

set -uo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.." || exit 1

status=0
# Counted apart from failures on purpose: a check that could not run here is not a check that
# failed, and collapsing the two is what made a missing tool look like a broken project.
skipped=0

run() {
  local label="$1"
  shift
  printf '\n── %s\n' "$label"
  if "$@"; then
    printf 'ok   %s\n' "$label"
  else
    printf 'FAIL %s\n' "$label"
    status=1
  fi
}

skip() {
  printf '\nskip %s — %s\n' "$1" "$2"
  skipped=$(( skipped + 1 ))
}

# --- Secret scanning ----------------------------------------------------------------------
# First, because it is the least recoverable failure and does not depend on the toolchain.
# A secret that reached a commit is already leaked and must be rotated, not deleted.
#
# `gitleaks dir`, not `gitleaks git`: this runs during development, so the secret that matters
# is the one just typed into the working tree. `gitleaks git` only reads committed history and
# would report a clean run on a file that has never been committed — a false pass, which is
# worse than no check. The pre-push hook scans history; this scans what you are about to add.
if command -v gitleaks >/dev/null 2>&1; then
  run "secrets" gitleaks dir . --no-banner --redact
else
  skip "secrets" "gitleaks is not installed. Fix with: brew install gitleaks"
fi

# --- Project checks -----------------------------------------------------------------------
# Replace these with this project's real commands. Delete what does not apply; do not leave
# a check that silently does nothing, because a green run would then mean nothing.
#
# Web / Node:      run "typecheck" pnpm typecheck
#                  run "lint"      pnpm lint
#                  run "test"      pnpm test
#                  run "build"     pnpm build
#
# iOS / Swift:     run "build" xcodebuild -scheme <Scheme> -destination 'platform=iOS Simulator,name=iPhone 17' build
#                  run "test"  xcodebuild -scheme <Scheme> -destination 'platform=iOS Simulator,name=iPhone 17' test
#                  run "lint"  swiftlint --strict
#
# Android:         run "lint"  ./gradlew lint          # includes real accessibility checks
#                  run "test"  ./gradlew test
#                  run "build" ./gradlew assembleRelease
#
# .NET / Windows:  run "build" dotnet build -warnaserror
#                  run "test"  dotnet test

# Next.js app checked with pnpm. `test` uses --passWithNoTests, so it never blocks until real
# tests exist — quality tooling that does not slow the dev loop.
if command -v pnpm >/dev/null 2>&1; then
  run "typecheck" pnpm typecheck
  run "lint"      pnpm lint
  run "test"      pnpm test
  run "build"     pnpm build
else
  skip "project" "pnpm is not installed. Fix with: corepack enable pnpm"
fi

# --- Memory and standards health ----------------------------------------------------------
# Three checks that watch the memory system rather than the build. Keep them: they cost
# milliseconds and each covers a failure that is silent by nature.

# Are the rules that apply now still small, still shaped, and still looked at?
#
# `CONVENTIONS.md` is the only binding source for what applies in this project. It fails in two
# quiet ways and neither shows up in a build: it grows until it is an archive again, and it goes
# unread until nobody trusts it. So the size and the review date are both checked here, and
# `Enforcement` may only say `reviewed` or `enforced — <what enforces it>`. There is no third
# value: a rule nothing checks is dropped or made checkable.
#
# Skipped, not failed, when the file is absent — a project that has not yet run `apply-standards`
# is behind, and the `standards` check above is what says so.
# A rule row is any table row that is not the header and not the separator. Matching on `^| R-`
# would make a malformed ID invisible to the check that exists to catch it.
# shellcheck disable=SC2329  # invoked indirectly, through `conventions` below.
rule_rows() {
  grep '^| ' CONVENTIONS.md | grep -v '^| ID | Rule |' | grep -v '^|[- |]*$' || true
}

# Strips leading and trailing whitespace without forking. Result lands in $_trimmed.
_trimmed=""
# shellcheck disable=SC2329  # invoked from `conventions` below.
trim() {
  local v="$1"
  v="${v#"${v%%[![:space:]]*}"}"
  _trimmed="${v%"${v##*[![:space:]]}"}"
}

# shellcheck disable=SC2329  # invoked indirectly, through `run` below.
conventions() {
  local ok=0 count id enf line reviewed epoch age
  [[ -f CONVENTIONS.md ]] || return 0
  count="$(rule_rows | wc -l | tr -d ' ')"
  if [[ "$count" -gt 15 ]]; then
    printf 'CONVENTIONS.md has %s rules, ceiling 15. A new rule asks which old one it retires.\n' "$count"
    ok=1
  fi
  while IFS= read -r line; do
    IFS='|' read -r _ id _ enf _ <<< "$line"
    trim "$id";  id="$_trimmed"
    trim "$enf"; enf="$_trimmed"
    [[ "$id" =~ ^R-[A-Z]+-[0-9]{3}$ ]] || { printf 'Malformed rule ID: %s\n' "$id"; ok=1; }
    if [[ "$enf" != "reviewed" && ! "$enf" =~ ^enforced\ —\ .+ ]]; then
      printf '%s: enforcement is "%s" — use "reviewed" or "enforced — <what enforces it>".\n' "$id" "$enf"
      ok=1
    fi
  done < <(rule_rows)
  reviewed="$(sed -n 's/^last-reviewed: *//p' CONVENTIONS.md | head -n 1)"
  epoch="$(date -j -f '%Y-%m-%d' "$reviewed" +%s 2>/dev/null || date -d "$reviewed" +%s 2>/dev/null || true)"
  if [[ -z "$epoch" ]]; then
    printf 'CONVENTIONS.md has no usable "last-reviewed: YYYY-MM-DD" line.\n'
    ok=1
  else
    age=$(( ( $(date +%s) - epoch ) / 86400 ))
    if [[ "$age" -gt 90 ]]; then
      printf 'CONVENTIONS.md was last reviewed %s days ago, ceiling 90.\n' "$age"
      printf 'Walk the list and retire what is dead. Moving only the date is the failure.\n'
      ok=1
    fi
  fi
  return "$ok"
}
if [[ -f CONVENTIONS.md ]]; then
  run "conventions" conventions
else
  skip "conventions" "no CONVENTIONS.md — run apply-standards"
fi

# Is this project still running the current standard?
#
# Nothing else asks. The instruction block in CLAUDE.md is generated, and a project drifts from it
# the moment the standard changes — quietly, because every build check stays green. dev-standards
# itself sat two releases behind its own standard for exactly this reason, with nothing looking.
#
# Skipping when the checkout is absent is deliberate, and it does not set a failure: a CI runner or
# a second machine has no reason to carry the standards repo, and a project is not unhealthy
# because of where it is being built.
standards_root="${DEV_STANDARDS_HOME:-$HOME/.local/share/dev-standards}"
if [[ -x "$standards_root/scripts/check-standards.sh" ]]; then
  run "standards" "$standards_root/scripts/check-standards.sh" .
else
  skip "standards" "no dev-standards checkout at $standards_root, so drift was not checked"
fi

# ------------------------------------------------------------------------------------------
# A failure outranks a skip: if anything is really broken, that is the answer, and the skips are
# noise until it is fixed.
if [[ "$status" -ne 0 ]]; then
  printf '\nChecks failed.\n'
  exit 1
elif [[ "$skipped" -gt 0 ]]; then
  printf '\nAll checks passed, %s skipped — nothing failed, but a tool was missing.\n' "$skipped"
  exit 2
else
  printf '\nAll checks passed.\n'
  exit 0
fi
