#!/usr/bin/env node
/**
 * Where an em dash still sits in what we write.
 *
 * The owner reads them as a tic, in interface copy and in comments alike (R-COPY-001). There
 * were 483 of them across 131 files on the day the rule was written, so the gate is the same
 * shape as kit-drift: a baseline per file that only ever shrinks. It fails on a file that got
 * worse, or a new file with any, and says so when a file improved so the floor can come down.
 *
 * Ours is src/app, src/components/app, src/lib, src/emails, scripts, docs and the Markdown at
 * the root. The vendored kit under src/components is not ours to rewrite. CONVENTIONS.md is
 * left out on purpose: its enforcement column reads `enforced — <what>` and the checker in
 * verify.sh asks for exactly that, so the dash there is the format, not prose.
 *
 * A quoted lone dash, `"—"`, is the empty-cell marker the tables use, a glyph and not a
 * sentence, and is not counted.
 *
 * `node scripts/em-dash.mjs` lists them, `--check` is the gate, `--save` lowers the baseline.
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const DIRS = ["src/app", "src/components/app", "src/lib", "src/emails", "scripts", "docs"];
const ROOT_FILES = ["README.md", "STATE.md", "CLAUDE.md", "AGENTS.md"];
const EXT = /\.(ts|tsx|mjs|md|css)$/;
const PLACEHOLDER = /"—"|'—'|`—`/g;

function walk(dir, out = []) {
    let names;
    try {
        names = readdirSync(dir);
    } catch {
        return out;
    }
    for (const name of names) {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) walk(path, out);
        else if (EXT.test(name)) out.push(path);
    }
    return out;
}

const files = [...DIRS.flatMap((d) => walk(join(ROOT, d))), ...ROOT_FILES.map((f) => join(ROOT, f))].filter((p) => {
    try {
        return statSync(p).isFile();
    } catch {
        return false;
    }
});

const hits = [];
for (const path of files) {
    const rel = relative(ROOT, path);
    if (rel === "scripts/em-dash.mjs") continue;
    readFileSync(path, "utf8")
        .split("\n")
        .forEach((line, i) => {
            const count = (line.replace(PLACEHOLDER, "").match(/—/g) ?? []).length;
            for (let n = 0; n < count; n++) hits.push({ file: rel, line: i + 1 });
        });
}

const BASELINE = new URL("./em-dash-baseline.json", import.meta.url);
const perFile = () => {
    const out = {};
    for (const h of hits.sort((a, b) => a.file.localeCompare(b.file))) out[h.file] = (out[h.file] ?? 0) + 1;
    return out;
};

if (process.argv.includes("--check")) {
    const now = perFile();
    const was = JSON.parse(readFileSync(BASELINE, "utf8")).files;
    const worse = Object.entries(now).filter(([file, count]) => count > (was[file] ?? 0));
    const better = Object.entries(was).filter(([file, count]) => (now[file] ?? 0) < count);

    for (const [file, count] of worse) {
        console.error(`${file}: ${count} em dash${count === 1 ? "" : "es"}, baseline allows ${was[file] ?? 0}.`);
    }
    if (worse.length) {
        console.error(`\nTwo sentences, a comma, a colon or parentheses instead. See R-COPY-001.`);
        process.exit(1);
    }
    if (better.length) {
        console.log(`${better.length} file${better.length === 1 ? "" : "s"} improved: run \`node scripts/em-dash.mjs --save\` to lower the baseline.`);
    }
    console.log(`ok   em-dash (${hits.length} known)`);
} else if (process.argv.includes("--save")) {
    const files = perFile();
    writeFileSync(BASELINE, JSON.stringify({ files }, null, 4) + "\n");
    console.log(`Baseline saved: ${hits.length} across ${Object.keys(files).length} files.`);
} else {
    console.log(`${hits.length} em dashes in ${Object.keys(perFile()).length} files:\n`);
    for (const h of hits) console.log(`  ${h.file}:${h.line}`);
}
