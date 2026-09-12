#!/usr/bin/env node
/**
 * Where our own code builds a control by hand that the Untitled UI kit already has.
 *
 * This is a measurement, not a rule: a bare `<button>` is sometimes right, and the answer to
 * every hit here is not "convert it". It exists because the drift is otherwise invisible
 * (you can only find it by reading 77 files) and because the design system page renders this
 * list, so what it says stays true rather than being a claim someone typed once.
 *
 * Ours is `src/app` and `src/components/app`. Everything else under `src/components` is the
 * vendored kit, and a bare element in there is the kit doing its job.
 *
 * A site with a reason written above it, `kit-drift: <why>` in a comment, is a decision, not
 * drift, and is listed apart. Same idea as `docs/accessibility-decisions.md`: an exception someone
 * can reread and overturn is fine, a silent one is a blind spot.
 *
 * `node scripts/kit-drift.mjs` prints it, `--json` writes the shape the design system page reads,
 * and `--check` is the gate: it fails on drift the baseline does not already know about. The
 * baseline only ever shrinks; that is the whole mechanism. It is not a licence for the fifteen
 * sites in it, it is a floor under them.
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const OURS = ["src/app", "src/components/app"];

/** A bare element we have a kit component for, and what to reach for instead. */
const HAND_ROLLED = [
    { element: "button", instead: "Button (components/base/buttons/button) or ButtonUtility for an icon-only one" },
    { element: "input", instead: "Input (components/base/input/input)" },
    { element: "select", instead: "NativeSelect or Select (components/base/select)" },
    { element: "textarea", instead: "TextArea (components/base/textarea)" },
    { element: "dialog", instead: "Modal (components/application/modals/modal)" },
];

function walk(dir, out = []) {
    for (const name of readdirSync(dir)) {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) walk(path, out);
        else if (/\.tsx$/.test(name) && !/\.test\.tsx$/.test(name)) out.push(path);
    }
    return out;
}

const files = OURS.flatMap((d) => walk(join(ROOT, d)));

const drift = [];
const deliberate = [];
const usesKit = [];
for (const path of files) {
    const source = readFileSync(path, "utf8");
    const rel = relative(ROOT, path);
    if (/from "@\/components\/(base|application|foundations)\//.test(source)) usesKit.push(rel);

    const lines = source.split("\n");
    lines.forEach((line, i) => {
        // Prose about a `<button>` is not a button. Counting comments is how this first said
        // settings-rows.tsx had one, in a paragraph explaining why it must not.
        const code = line.trim();
        if (code.startsWith("//") || code.startsWith("*") || code.startsWith("/*")) return;

        // A reason written on the line above takes the site out of the count. Same idea as
        // docs/accessibility-decisions.md: an exception with a reason someone can reread and
        // overturn is a decision; a silent one is a blind spot.
        // A few lines up, not one: the reason is usually a sentence and a sentence wraps.
        const above = lines.slice(Math.max(0, i - 4), i).join(" ");
        const marker = /kit-drift:\s*([^*}]+)/.exec(above);

        for (const { element, instead } of HAND_ROLLED) {
            // An opening tag whose name ends there, so `<input` matches and `<InputField` does
            // not. `$` matters: most of these are written with the props on the next line, and
            // matching only a space or `>` found four of the sixteen.
            if (new RegExp(`<${element}(\\s|>|$)`).test(line)) {
                const at = { file: rel, line: i + 1, element, instead };
                if (marker) deliberate.push({ ...at, reason: marker[1].replace(/\s+/g, " ").trim() });
                else drift.push(at);
            }
        }
    });
}

const report = { files: files.length, usingKit: usesKit.length, drift, deliberate };

const BASELINE = new URL("./kit-drift-baseline.json", import.meta.url);

if (process.argv.includes("--json")) {
    console.log(JSON.stringify(report, null, 2));
} else if (process.argv.includes("--check")) {
    // Counted per file rather than per line, because a line number moves every time somebody
    // edits above it and a gate that fails on that teaches people to ignore it.
    const now = {};
    for (const d of drift) now[d.file] = (now[d.file] ?? 0) + 1;
    const was = JSON.parse(readFileSync(BASELINE, "utf8")).files;

    const worse = Object.entries(now).filter(([file, count]) => count > (was[file] ?? 0));
    const better = Object.entries(was).filter(([file, count]) => (now[file] ?? 0) < count);

    for (const [file, count] of worse) {
        console.error(`${file}: ${count} hand-rolled control${count === 1 ? "" : "s"} the kit has, baseline allows ${was[file] ?? 0}.`);
    }
    if (worse.length) {
        console.error(`\nUse the kit's component, or write \`kit-drift: <why>\` in a comment above it. See R-UI-001.`);
        process.exit(1);
    }
    if (better.length) {
        console.log(`${better.length} file${better.length === 1 ? "" : "s"} improved; run \`node scripts/kit-drift.mjs --save\` to lower the baseline.`);
    }
    console.log(`ok   kit-drift (${drift.length} known, ${deliberate.length} deliberate)`);
} else if (process.argv.includes("--save")) {
    const files = {};
    for (const d of drift.sort((a, b) => a.file.localeCompare(b.file))) files[d.file] = (files[d.file] ?? 0) + 1;
    writeFileSync(BASELINE, JSON.stringify({ files }, null, 4) + "\n");
    console.log(`Baseline saved: ${drift.length} across ${Object.keys(files).length} files.`);
} else {
    console.log(`${report.usingKit} of ${report.files} of our components import the kit.`);
    console.log(`${drift.length} hand-rolled controls with no reason written beside them:\n`);
    for (const d of drift) console.log(`  ${d.file}:${d.line}  <${d.element}>  → ${d.instead}`);
    if (deliberate.length) {
        console.log(`\n${deliberate.length} deliberate, with a reason:\n`);
        for (const d of deliberate) console.log(`  ${d.file}:${d.line}  <${d.element}>  ${d.reason}`);
    }
}
