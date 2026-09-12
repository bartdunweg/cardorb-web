"use client";

import { type ReactNode, useEffect, useState } from "react";
import { ChevronDown } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { cx } from "@/utils/cx";
import { actionSections } from "./design-actions";
import { displaySections } from "./design-display";
import { formSections } from "./design-forms";
import { ourSections } from "./design-ours";
import { overlaySections } from "./design-overlays";
import { Section, type SectionSpec } from "./design-section";

/**
 * The design system page, shaped like a component library: one section per component, every
 * variant of it side by side, and an index that says where you are.
 *
 * Everything in here is drawn by the component the app actually uses, never by a copy made for
 * the page: a gallery of look-alikes is worse than no gallery, because it agrees with you. Which
 * is also why nothing on this page is a screenshot: a disabled button is disabled, a dropdown
 * opens, a toast appears.
 *
 * The navigation is an in-page index rather than a rail of its own. The app already has a
 * sidebar from `lg`, and a second full-height column beside it reads as a nested app; so on
 * `xl` the index is a sticky column on the *right* of the content, the side nothing else is
 * using, and below `xl` it is a button at the top of the page that opens the same list, not
 * sticky, because on a phone the page header's own bar is already fixed over the top.
 */

const groups: { title: string; sections: SectionSpec[] }[] = [
    { title: "Actions", sections: actionSections },
    { title: "Forms", sections: formSections },
    { title: "Data display", sections: displaySections },
    { title: "Overlays", sections: overlaySections },
    { title: "Ours", sections: ourSections },
];

/** The section the page ends on, rendered by the page itself because it reads the baseline file. */
const drift = { id: "still-by-hand", title: "Still built by hand" };

const ids = [...groups.flatMap((group) => group.sections.map((section) => section.id)), drift.id];

export function KitGallery({ children }: { children?: ReactNode }) {
    const active = useActiveSection();

    return (
        <div className="flex flex-col gap-10 xl:flex-row-reverse xl:items-start xl:gap-12">
            <Index active={active} />

            <div className="flex min-w-0 flex-1 flex-col gap-14">
                {groups.map((group) => (
                    <div key={group.title} className="flex flex-col gap-10">
                        <h2 className="text-sm font-semibold tracking-wider text-tertiary uppercase">{group.title}</h2>
                        {group.sections.map((section) => (
                            <Section key={section.id} spec={section} />
                        ))}
                    </div>
                ))}
                {children}
            </div>
        </div>
    );
}

/**
 * The index, in two shapes.
 *
 * From `xl` it is a rail stuck to the very top of the window and scrollable inside itself, not
 * offset to `top-8`: the list is taller than a laptop screen, and a sticky column taller than the
 * viewport hides its own tail: the last five components were unreachable. The 32 px that used to
 * be the offset is padding inside the scroller instead.
 *
 * Below `xl` it starts closed behind a button. Open, this list is 900 px tall, which on a phone is
 * a whole screen of index before the first component, a table of contents nobody asked to read.
 */
function Index({ active }: { active: string }) {
    const [open, setOpen] = useState(false);

    return (
        <nav aria-label="Components" className="shrink-0 xl:sticky xl:top-0 xl:max-h-dvh xl:w-56 xl:overflow-y-auto xl:py-8">
            <Button
                color="secondary"
                size="sm"
                className="xl:hidden"
                iconTrailing={<ChevronDown data-icon="trailing" className={cx("size-5 shrink-0 transition-transform duration-150", open && "-scale-y-100")} />}
                aria-expanded={open}
                aria-controls="design-index"
                onClick={() => setOpen(!open)}
            >
                {open ? "Hide the index" : "Jump to a component"}
            </Button>

            <div
                id="design-index"
                className={cx(
                    "flex-col gap-4 max-xl:mt-3 max-xl:rounded-xl max-xl:bg-primary max-xl:p-4 max-xl:ring-1 max-xl:ring-secondary",
                    open ? "flex" : "hidden xl:flex",
                )}
            >
                {[...groups, { title: "The gap", sections: [drift] }].map((group) => (
                    <div key={group.title} className="flex min-w-0 flex-col gap-1.5">
                        <p className="text-xs font-semibold tracking-wider text-secondary uppercase">{group.title}</p>
                        <ul className="flex flex-wrap gap-1 xl:flex-col xl:flex-nowrap xl:gap-y-0.5">
                            {group.sections.map((section) => (
                                <li key={section.id} className="min-w-0">
                                    <IndexLink id={section.id} title={section.title} active={active === section.id} onGo={() => setOpen(false)} />
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>
        </nav>
    );
}

function IndexLink({ id, title, active, onGo }: { id: string; title: string; active: boolean; onGo: () => void }) {
    return (
        <a
            href={`#${id}`}
            aria-current={active ? "true" : undefined}
            onClick={onGo}
            className={cx(
                "block truncate rounded-md px-2 py-1 text-sm outline-focus-ring transition-colors duration-100 hover:bg-secondary hover:text-secondary focus-visible:outline-2",
                active ? "bg-secondary font-semibold text-primary" : "text-tertiary",
            )}
        >
            {title}
        </a>
    );
}

/**
 * Which section the page is on. An IntersectionObserver rather than a scroll listener: it costs
 * nothing between changes, and the callback then measures every section once to pick the last
 * one whose top has passed under the header, which is the one a reader would say they are in.
 */
function useActiveSection() {
    const [active, setActive] = useState(ids[0]);

    useEffect(() => {
        const elements = ids.map((id) => document.getElementById(id)).filter((el): el is HTMLElement => el !== null);
        if (elements.length === 0 || typeof IntersectionObserver === "undefined") return;

        const pick = () => {
            let current = elements[0].id;
            for (const element of elements) {
                if (element.getBoundingClientRect().top <= 120) current = element.id;
            }
            setActive(current);
        };

        const observer = new IntersectionObserver(pick, { rootMargin: "-120px 0px 0px 0px", threshold: [0, 1] });
        elements.forEach((element) => observer.observe(element));
        pick();
        return () => observer.disconnect();
    }, []);

    return active;
}
