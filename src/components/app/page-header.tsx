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
    /** Anything else that belongs with the title, like a progress bar. */
    children?: ReactNode;
    /** Off on a page whose title says nothing on a phone (Browse): the h1 stays for a screen reader. */
    titleOnPhone?: boolean;
}) {
    const sentinel = useRef<HTMLHeadingElement>(null);
    const [collapsed, setCollapsed] = useState(false);

    // The bar takes the title over exactly when the large one has left the screen. IntersectionObserver
    // rather than a scroll listener: it costs nothing between changes and needs no layout reads.
    useEffect(() => {
        const el = sentinel.current;
        if (!el || typeof IntersectionObserver === "undefined") return;
        const observer = new IntersectionObserver(([entry]) => setCollapsed(!entry.isIntersecting), { threshold: 0 });
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    return (
        // One element, so the page's own gap applies once, under it: the distances inside are the bar's
        // own margins and the 16 px column, whatever the page puts between its sections.
        <div className="flex flex-col">
            <div
                className={cx(
                    "sticky top-0 z-30 -mx-4 -mt-4 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center px-4 sm:-mx-6 sm:-mt-8 lg:hidden",
                    // With Back the bar is the button with the page's 16 px above it and 16 under it. Without
                    // one it is the 48 px the title collapses into, and the page's first content starts 24 px
                    // from the top (the search on Home 16, by its own -mt-2).
                    back ? "mb-4 pt-4" : "-mb-6 h-12",
                    // The glass comes with the collapse (or with Back); over the uncollapsed title it would only blur it.
                    (collapsed || back) && "glass",
                    // Without Back the bar has nothing to show until the title collapses into it, so it lies over
                    // the first 48 px and lets taps through: the page's first content starts 16 px from the top.
                    !back && !collapsed && "pointer-events-none",
                    // Where content meets the bar: a fade from the page surface to nothing under the bar's edge,
                    // not a rule. It appears with the collapse and goes when the title is back.
                    "after:pointer-events-none after:absolute after:inset-x-0 after:top-full after:h-4 after:bg-linear-to-b after:from-bg-page after:to-transparent after:transition-opacity after:duration-150 after:ease-out",
                    collapsed ? "after:opacity-100" : "after:opacity-0",
                )}
            >
                <div className="flex justify-start">
                    {back ? <Button href={back.href} color="secondary" size="sm" iconLeading={ChevronLeft} aria-label={`Back to ${back.label}`} /> : null}
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
                <div />
            </div>

            {/* Above the title, 8 px from the top: the search on Home sits higher than a page's first content,
                and the title 16 px under it whatever the page's own gap, as under Back. */}
            <div className="flex flex-col gap-4">
                {above ? <div className="-mt-2">{above}</div> : null}

                {/* Actions sit beside the title when they fit (a plus on a phone) and wrap under it when they do not. */}
                <div className={cx("flex flex-row flex-wrap items-start justify-between gap-3", !titleOnPhone && "max-lg:sr-only")}>
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
