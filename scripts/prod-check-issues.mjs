/**
 * Files what scripts/prod-check.ts found as GitHub issues, one per failing check: opened the first
 * run it fails, commented on every run it still fails, closed on the first run it passes. Never a
 * second issue for the same check: an open issue is found by the marker in its body, not its title,
 * so a renamed check or an edited title still finds its own.
 *
 * Reads prod-check.json from the working directory; needs GH_TOKEN and GITHUB_REPOSITORY (the
 * workflow sets both). DRY_RUN=true prints what it would do instead. Modelled on cardorb-api's
 * data-health workflow, which keeps one issue open while its report fails.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const LABEL = "prod-check";
const repo = process.env.GITHUB_REPOSITORY;
if (!repo) throw new Error("GITHUB_REPOSITORY is not set");
const dry = process.env.DRY_RUN === "true";
const runUrl = process.env.GITHUB_RUN_ID ? `${process.env.GITHUB_SERVER_URL}/${repo}/actions/runs/${process.env.GITHUB_RUN_ID}` : "a run by hand";
const ref = process.env.GITHUB_REF_NAME ?? "local";

const { started, results } = JSON.parse(readFileSync("prod-check.json", "utf8"));
const marker = (id) => `<!-- prod-check:${id} -->`;

const gh = (...args) => execFileSync("gh", [...args, "-R", repo], { encoding: "utf8" });
const act = (what, ...args) => {
    console.log(`${dry ? "Would " : ""}${what}`);
    if (!dry) gh(...args);
};
/** The body goes through a file: evidence carries quotes, pipes and backticks a shell would eat. */
const bodyFile = (text) => {
    writeFileSync("prod-check-issue.md", text);
    return "prod-check-issue.md";
};

function evidence(r) {
    const lines = [`**${r.name}** fails${r.retried ? ", read twice 20 s apart" : ""}.`, "", ...r.failures.map((f) => `- ${f}`), ""];
    for (const e of r.evidence) {
        const parts = [e.url && `URL: ${e.url}`, e.status !== undefined && `status ${e.status}`, e.ms !== undefined && `${e.ms} ms`, e.note].filter(Boolean);
        if (parts.length) lines.push(`- ${parts.join(", ")}`);
    }
    lines.push("", `Run: ${runUrl} (ref ${ref}), started ${started}.`);
    return lines.join("\n");
}

const open = JSON.parse(gh("issue", "list", "--label", LABEL, "--state", "open", "--limit", "100", "--json", "number,body"));
const issueFor = (id) => open.find((i) => i.body.includes(marker(id)));

for (const r of results.filter((x) => !x.ok)) {
    const existing = issueFor(r.id);
    if (existing)
        act(`comment on #${existing.number} (${r.id} still fails)`, "issue", "comment", String(existing.number), "--body-file", bodyFile(evidence(r)));
    else {
        const body = [
            marker(r.id),
            evidence(r),
            "",
            "Filed by the hourly production check (`scripts/prod-check.ts`, `.github/workflows/prod-check.yml`). It comments here while the check fails and closes this issue on the first run it passes.",
        ].join("\n");
        act(`open an issue for ${r.id}`, "issue", "create", "--title", `Production check: ${r.name}`, "--label", LABEL, "--body-file", bodyFile(body));
    }
}

// Closed only by a check that ran and passed: one skipped (a private profile) says nothing either way.
const passed = new Set(results.filter((x) => x.ok && !x.skipped).map((x) => x.id));
for (const issue of open) {
    const id = issue.body.match(/<!-- prod-check:([\w-]+) -->/)?.[1];
    if (!id || !passed.has(id)) continue;
    act(`close #${issue.number} (${id} passes again)`, "issue", "close", String(issue.number), "--comment", `Passes again in ${runUrl} (ref ${ref}).`);
}
