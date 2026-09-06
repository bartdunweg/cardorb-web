"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import { ChevronLeft } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { cx } from "@/utils/cx";

/**
 * The top of a dashboard page: its title, a line under it, and whatever acts on the page.
 *
 * On a phone it behaves like a native screen. A bar stays at the top with Back on the left — to the
 * parent page, so a shared link still has somewhere to go — and the title sits large underneath,
 * scrolling with the content. Once the large title has scrolled out of view the bar shows the
 * same words small in its centre, so the reader always knows where they are. The bottom tab bar
 * stays; Back adds a way out, it takes nothing away.
 *
 * From the `lg` breakpoint up there is a sidebar, so the bar is gone and only the large title and
 * the actions remain, laid out as the pages always had them.
 *
 * The one moving part is the small title's opacity, which is state indication seen tens of times a
 * day, so it is near-imperceptible: a 150 ms fade, no movement. Reduced motion keeps the fade. The
 * large title does not animate — it just scrolls, which is what a title on a page does.
 */
export function PageHeader({
    title,
    subtitle,
    back,
    actions,
    above,
    barActions,
    children,
    titleOnPhone = true,
}: {
    title: string;
    /** The line under the title: a description or a count. */
    subtitle?: ReactNode;
    /** The parent page, for the bar's Back. Left out on a page the tab bar reaches. */
    back?: { href: string; label: string };
    /** Whatever acts on this page, beside the title from `sm` up and under it on a narrow screen. */
    actions?: ReactNode;
    /** Above the title, under the sticky bar: Home's search on a phone. */
    above?: ReactNode;
    /** On a phone, at the bar's right end across from Back: a page's settings as a dots button. */
    barActions?: ReactNode;
    /** Anything else that belongs with the title, like a progress bar. */
    children?: ReactNode;
    /** Off on a page whose title says nothing on a phone (Browse): the h1 stays for a screen reader. */
    titleOnPhone?: boolean;
}) {
    const sentinel = useRef<HTMLHeadingElement>(null);
    const [collapsed, setCollapsed] = useState(false);

    // The bar takes the title over exactly when the large one has left the screen. IntersectionObserver
    // rather than a scroll listener: it costs nothing between changes and needs no layout reads.
    const tall = Boolean(back || barActions);
    // Without Back but with buttons in the bar (All cards, a folder, Collection) the large title starts level
    // with those buttons, on their line, rather than on a line of its own under them.
    const beside = Boolean(!back && barActions && titleOnPhone);
    useEffect(() => {
        const el = sentinel.current;
        // A title hidden on the phone has nothing to collapse into the bar: the bar stays out of the way.
        if (!titleOnPhone || !el || typeof IntersectionObserver === "undefined") return;
        const observer = new IntersectionObserver(([entry]) => setCollapsed(tall && !beside ? entry.intersectionRatio < 1 : !entry.isIntersecting), {
            // The title counts as gone once it is under the bar, not once it has left the screen: with Back
            // the bar is 76 px (a 44 px button, the avatar's and the search's size, with 16 above and under) and
            // the title starts right under it, so any part of it under the bar is enough; without one the
            // bar is 48 px over a title that starts at 24, so all of it must be. A title beside the buttons
            // starts at 22, level with them, and counts as gone once it has scrolled past its own top.
            threshold: tall && !beside ? 1 : 0,
            rootMargin: `${beside ? -22 : tall ? -76 : -48}px 0px 0px 0px`,
        });
        observer.observe(el);
        return () => observer.disconnect();
    }, [tall, beside, titleOnPhone]);

    return (
        // One element, so the page's own gap applies once, under it: the distances inside are the spacer's
        // and the 16 px column, whatever the page puts between its sections.
        <div className="flex flex-col">
            {/* The bar is fixed to the top of the screen, like the tab bar to its bottom, so it stays through
                the whole page and not only while the header is in view. Collapsed, it stands on a fade from
                the page's ground to nothing, so the buttons and the small title stay readable over whatever
                scrolls under; content runs out under the bar the way it runs out under the tab bar. */}
            <div
                className={cx(
                    "fixed inset-x-0 top-0 z-30 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center px-4 pt-4 pb-2 sm:px-6 lg:hidden",
                    // Nothing to tap until Back, a button or the collapsed title is there: taps go through to the page.
                    !back && !barActions && !collapsed && "pointer-events-none",
                    // The fade comes with the collapse: at rest the buttons sit on the page and the large title
                    // sits on its line; once content scrolls under, the page's ground fades in behind the bar.
                    "before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:-z-10 before:h-24 before:bg-linear-to-b before:from-bg-page before:from-40% before:to-transparent before:transition-opacity before:duration-150 before:ease-out",
                    collapsed ? "before:opacity-100" : "before:opacity-0",
                )}
            >
                <div className="flex justify-start">
                    {back ? <Button href={back.href} color="secondary" size="lg" iconLeading={ChevronLeft} aria-label={`Back to ${back.label}`} /> : null}
                </div>
                {/* The same words as the h1 below, so a screen reader hears the title once. */}
                <span
                    aria-hidden="true"
                    className={cx(
                        "truncate px-2 text-sm font-semibold text-primary transition-opacity duration-150 ease-out",
                        collapsed ? "opacity-100" : "opacity-0",
                    )}
                >
                    {title}
                </span>
                <div className="flex items-center justify-end gap-3">{barActions}</div>
            </div>
            {/* The room the bar takes in the flow, on top of the page's own 16 px (32 from `sm`). With Back the
                title starts at 76: under the 44 px button with 16 above and under it. Beside the buttons it
                starts at 22, its 32 px line centred on them. With nothing in the bar, at 24. */}
            <div aria-hidden="true" className={cx("lg:hidden", back ? "mb-4 h-11 sm:h-7" : beside ? "h-1.5 sm:h-0" : "h-2 sm:h-0")} />

            {/* Above the title, 8 px from the top: the search on Home sits higher than a page's first content,
                and the title 16 px under it whatever the page's own gap, as under Back. */}
            <div className="flex flex-col gap-4">
                {above ? <div className="-mt-2">{above}</div> : null}

                {/* Actions sit beside the title when they fit (a plus on a phone) and wrap under it when they do not. */}
                <div
                    className={cx(
                        "flex flex-row flex-wrap items-start justify-between gap-3",
                        !titleOnPhone && "max-lg:sr-only",
                        // On the bar's line, the buttons keep its right end.
                        beside && "max-lg:pr-28",
                    )}
                >
                    {/* The words take what the actions leave, so a long subtitle wraps rather than pushing them under the title. */}
                    <div className="flex min-w-0 flex-1 basis-48 flex-col gap-1">
                        <h1 ref={sentinel} className="text-display-xs font-semibold text-primary">
                            {title}
                        </h1>
                        {subtitle ? <p className="text-md text-tertiary">{subtitle}</p> : null}
                        {children}
                    </div>
                    {actions ? <div className="flex items-center gap-3 self-stretch">{actions}</div> : null}
                </div>
            </div>
        </div>
    );
}
