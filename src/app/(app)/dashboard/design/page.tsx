import type { Metadata } from "next";
import { KitGallery } from "@/components/app/design-gallery";
import { PageHeader } from "@/components/app/page-header";
import baseline from "../../../../../scripts/kit-drift-baseline.json";

export const metadata: Metadata = { title: "Design system" };

/**
 * What the app is built out of, and where it is not.
 *
 * Not documentation — a check. The rule (R-UI-001) is that every control belongs to the design
 * system: the kit's where the kit has one, and where it does not, our own named component,
 * marked as ours. The only way to see whether that is true was to read seventy-seven files, so
 * nobody did.
 *
 * The list at the bottom is `scripts/kit-drift-baseline.json`, which `verify.sh` keeps honest:
 * the build fails on drift the baseline does not already allow, and the baseline only ever
 * shrinks. So this page cannot quietly become a lie — the number here is the number the gate
 * enforces.
 */
export default function DesignSystemPage() {
    const files = Object.entries(baseline.files).sort(([a], [b]) => a.localeCompare(b));
    const total = files.reduce((n, [, count]) => n + count, 0);

    return (
        <>
            <PageHeader title="Design system" />

            <div className="flex flex-col gap-12 pt-2">
                <p className="max-w-2xl text-sm text-tertiary">
                    Every control belongs here. Where Untitled UI has one, we use theirs; where it does not, the markup still becomes a named component of ours,
                    marked as ours — never written inline in a page. Green is the kit, amber is ours.
                </p>

                <KitGallery />

                <section className="flex flex-col gap-3">
                    <div className="flex flex-wrap items-baseline gap-x-3">
                        <h3 className="text-md font-semibold text-primary">Still built by hand</h3>
                        <span className="rounded-full bg-error-secondary px-2 py-0.5 text-xs font-medium text-error-primary">{total} left</span>
                    </div>
                    <p className="max-w-2xl text-sm text-tertiary">
                        A bare <code className="text-xs">&lt;button&gt;</code> or <code className="text-xs">&lt;input&gt;</code> where the kit has a component.
                        Some are whole clickable card tiles, which the kit has no answer for — those want a named component of ours rather than the kit&rsquo;s
                        button. A site with a reason written above it is a decision, not drift, and is not counted here.
                    </p>
                    <ul className="flex flex-col divide-y divide-secondary rounded-xl bg-primary ring-1 ring-secondary">
                        {files.map(([file, count]) => (
                            <li key={file} className="flex items-center justify-between gap-4 px-5 py-3">
                                <code className="min-w-0 truncate text-sm text-secondary">{file.replace("src/components/app/", "")}</code>
                                <span className="shrink-0 text-sm text-tertiary tabular-nums">{count}</span>
                            </li>
                        ))}
                    </ul>
                </section>
            </div>
        </>
    );
}
