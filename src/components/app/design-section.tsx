"use client";

import type { ReactNode } from "react";
import { Badge } from "@/components/base/badges/badges";
import { cx } from "@/utils/cx";

/**
 * The furniture of the design system page: one section per component, and inside it a labelled
 * grid rather than a paragraph of chips.
 *
 * The rule the layout follows is that two variants must be comparable by eye. So every sample
 * carries the name of the prop value that made it, directly above it, and samples of one kind
 * sit in one grid at one size: colours beside colours, sizes beside sizes, states beside
 * states. A row of unlabelled chips shows that a component exists; it does not show what its
 * `color="tertiary"` looks like next to `color="secondary"`, which is the question a designer
 * actually arrives with.
 */

export type SectionSpec = {
    /** The anchor, and the key of the entry in the index. */
    id: string;
    /** What the component is called in code. */
    title: string;
    /** Where it lives, under `src/`. */
    from: string;
    /** Ours rather than the kit's; the label is the reason this page exists. */
    ours?: boolean;
    /** One or two sentences, where the component needs them. */
    note?: string;
    /** The samples. Wrap them in `Panel` unless the component paints its own surface. */
    render: ReactNode;
};

export function Section({ spec }: { spec: SectionSpec }) {
    return (
        // scroll-mt: on a phone the page header's bar is fixed over the top of the page, so an
        // anchor that lands flush at the top lands underneath it.
        <section id={spec.id} className="flex scroll-mt-24 flex-col gap-4 lg:scroll-mt-6">
            <div className="flex flex-col gap-1.5">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                    <h3 className="text-lg font-semibold text-primary">{spec.title}</h3>
                    {/* The kit's Badge, after the hand-rolled chip that was here measured 2.7:1 and
                        2.9:1 against its own background, under AA, on the one word the page exists
                        to say, on a page about not building what the kit already has. */}
                    <Badge type="pill-color" size="sm" color={spec.ours ? "warning" : "success"}>
                        {spec.ours ? "Ours" : "Untitled UI"}
                    </Badge>
                    <code className="text-xs text-tertiary">{spec.from}</code>
                </div>
                {spec.note ? <p className="max-w-2xl text-sm text-tertiary">{spec.note}</p> : null}
            </div>
            {spec.render}
        </section>
    );
}

/**
 * The surface the samples lie on, divided into groups.
 *
 * A container, not a breakpoint: this column is the window minus the sidebar minus the index,
 * so at one viewport width it can be 340 px or 700 px wide. Sized off the viewport, the grid put
 * four buttons in a 470 px column on a 1440 px screen. Every grid below counts this box instead.
 */
export function Panel({ children }: { children: ReactNode }) {
    return <div className="@container flex flex-col divide-y divide-secondary rounded-xl bg-primary ring-1 ring-secondary">{children}</div>;
}

const columns = {
    /** Chips, badges, icons, switches: many small things. */
    tight: "grid-cols-2 @sm:grid-cols-3 @lg:grid-cols-4 @2xl:grid-cols-5",
    /** Buttons and anything with a word in it. */
    normal: "grid-cols-1 @xs:grid-cols-2 @lg:grid-cols-3 @3xl:grid-cols-4",
    /** Fields, which need their full width to be judged. */
    wide: "grid-cols-1 @lg:grid-cols-2 @4xl:grid-cols-3",
    /** One thing across the panel. */
    single: "grid-cols-1",
};

/** One question inside a section: the colours, the sizes, the states. */
export function Group({ title, hint, cols = "normal", children }: { title: string; hint?: string; cols?: keyof typeof columns; children: ReactNode }) {
    return (
        <div className="flex flex-col gap-4 p-5">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <h4 className="text-xs font-semibold tracking-wider text-secondary uppercase">{title}</h4>
                {hint ? <span className="text-xs text-tertiary">{hint}</span> : null}
            </div>
            <div className={cx("grid gap-x-6 gap-y-5", columns[cols])}>{children}</div>
        </div>
    );
}

/** One sample, under the name of what made it. */
export function Cell({
    label,
    span = 1,
    dark = false,
    children,
}: {
    /** The prop value, written the way it is written in code. */
    label: string;
    /** Two columns, or the whole width, for something that will not fit in one. */
    span?: 1 | 2 | "full";
    /** On the solid surface, for a variant meant for a dark background. */
    dark?: boolean;
    children: ReactNode;
}) {
    return (
        <div className={cx("flex min-w-0 flex-col gap-2", span === 2 && "@lg:col-span-2", span === "full" && "col-span-full")}>
            <span className="text-xs font-medium break-words text-tertiary">{label}</span>
            <div className={cx("flex min-h-10 flex-wrap items-center gap-2", dark && "rounded-lg bg-primary-solid px-3 py-2")}>{children}</div>
        </div>
    );
}
