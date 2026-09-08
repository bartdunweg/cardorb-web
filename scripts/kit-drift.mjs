#!/usr/bin/env node
/**
 * Where our own code builds a control by hand that the Untitled UI kit already has.
 *
 * This is a measurement, not a rule: a bare `<button>` is sometimes right, and the answer to
 * every hit here is not "convert it". It exists because the drift is otherwise invisible —
 * you can only find it by reading 77 files — and because the design system page renders this
 * list, so what it says stays true rather than being a claim someone typed once.
 *
 * Ours is `src/app` and `src/components/app`. Everything else under `src/components` is the
 * vendored kit, and a bare element in there is the kit doing its job.
 *
 * `node scripts/kit-drift.mjs` prints it; `--json` writes the shape the page reads.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
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
const usesKit = [];
for (const path of files) {
    const source = readFileSync(path, "utf8");
    const rel = relative(ROOT, path);
    if (/from "@\/components\/(base|application|foundations)\//.test(source)) usesKit.push(rel);

    source.split("\n").forEach((line, i) => {
        for (const { element, instead } of HAND_ROLLED) {
            // An opening tag whose name ends there, so `<input` matches and `<InputField` does
            // not. `$` matters: most of these are written with the props on the next line, and
            // matching only a space or `>` found four of the sixteen.
            if (new RegExp(`<${element}(\\s|>|$)`).test(line)) {
                drift.push({ file: rel, line: i + 1, element, instead, source: line.trim().slice(0, 80) });
            }
        }
    });
}

const report = {
    measuredAt: new Date().toISOString().slice(0, 10),
    files: files.length,
    usingKit: usesKit.length,
    drift,
};

if (process.argv.includes("--json")) {
    console.log(JSON.stringify(report, null, 2));
} else {
    console.log(`${report.usingKit} of ${report.files} of our components import the kit.`);
    console.log(`${drift.length} hand-rolled controls the kit already has:\n`);
    for (const d of drift) console.log(`  ${d.file}:${d.line}  <${d.element}>  → ${d.instead}`);
    console.log(`\n${drift.length} in total.`);
}
