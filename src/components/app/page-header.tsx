"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import { ChevronLeft } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { cx } from "@/utils/cx";

/**
 * The top of a dashboard page: its title, a line under it, and whatever acts on the page.
 *
 * On a phone it behaves like a native screen. A bar stays at the top with Back on the left (to the
 * parent page, so a shared link still has somewhere to go) and the title sits large underneath,
 * scrolling with the content. Once the large title has scrolled out of view the bar shows the
 * same words small in its centre, so the reader always knows where they are. The bottom tab bar
 * stays; Back adds a way out, it takes nothing away.
 *
 * From the `lg` breakpoint up there is a sidebar, so the bar is gone and only the large title and
 * the actions remain, laid out as the pages always had them.
 *
 * The one moving part is the small title's opacity, which is state indication seen tens of times a
 * day, so it is near-imperceptible: a 150 ms fade, no movement. Reduced motion keeps the fade. The
 * large title does not animate; it just scrolls, which is what a title on a page does.
 */
export function PageHeader({
    title,
    eyebrow,
    subtitle,
    back,
    backOnDesktop = false,
    actions,
    above,
    hero,
    barActions,
    children,
    titleOnPhone = true,
    phoneTitle,
}: {
    title: string;
    /**
     * The title below `lg`, where it differs: Owned and Wishlist are one tab on a phone, My cards,
     * and its title says so while the switch under it says which half (Bart's call, 2026-09-18).
     */
    phoneTitle?: string;
    /** A short line over the title, in the small size: what the page belongs to (a set's era). */
    eyebrow?: string;
    /** The line under the title: a description or a count. */
    subtitle?: ReactNode;
    /** The parent page, for the bar's Back. Left out on a page the tab bar reaches. */
    back?: { href: string; label: string };
    /** Back from `lg` too, where the bar is gone: on the band's left edge, or over the title without one. */
    backOnDesktop?: boolean;
    /** Whatever acts on this page, beside the title from `sm` up and under it on a narrow screen. */
    actions?: ReactNode;
    /** Above the title, under the sticky bar: Home's search on a phone. */
    above?: ReactNode;
    /**
     * A band at the top of the page: a set's logo on its colours. Under the bar and its Back while
     * there is a bar (below `lg`), at the very top of the page from `lg`. It gets more air under it
     * than a line of text would: the title starts a page of its own under the picture.
     */
    hero?: ReactNode;
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
    // Without Back but with buttons in the bar (All cards, a binder, Collection) the large title starts level
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

    /* Beside the buttons, the buttons stand in the middle of the title and the line under it, not level
       with the title alone. Measured from where both really are, the words on the page and the buttons
       in the bar at rest, because a subtitle is one line on one page, two on another and none on a
       third, and from `sm` the title starts 10 px lower while the bar does not move (Binders on a
       tablet, 2026-09-14). Back at the bar's own place once the bar has taken the title over. */
    const buttons = useRef<HTMLDivElement>(null);
    const head = useRef<HTMLDivElement>(null);
    const [drop, setDrop] = useState(0);
    useEffect(() => {
        const block = head.current;
        const group = buttons.current;
        if (!beside || !block || !group || typeof ResizeObserver === "undefined") return;
        const measure = () => {
            const box = block.getBoundingClientRect();
            const wordsMiddle = box.top + window.scrollY + box.height / 2;
            // offsetTop is the group's place in the fixed bar, which a transform does not move.
            const buttonsMiddle = group.offsetTop + group.offsetHeight / 2;
            setDrop(Math.max(0, Math.round(wordsMiddle - buttonsMiddle)));
        };
        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(block);
        window.addEventListener("resize", measure);
        return () => {
            observer.disconnect();
            window.removeEventListener("resize", measure);
        };
    }, [beside]);
    const barDrop = beside && !collapsed ? drop : 0;

    return (
        // One element, so the page's own gap applies once, under it: the distances inside are the spacer's
        // and the 16 px column, whatever the page puts between its sections.
        <div className="flex flex-col">
            {/* Where the phone's bar is, the band starts under it and its Back, after the spacer below; from
                `lg` it goes up to the page's top, cancelling the layout's padding (sm:pt-8). The wash the
                band draws is positioned by the app frame, so it needs no room here. */}
            {/* The bar is fixed to the top of the screen, like the tab bar to its bottom, so it stays through
                the whole page and not only while the header is in view. Collapsed, it stands on the tab bar's
                glass, running out under its bottom (the same ground as the card sheet's bar), so the buttons
                and the small title stay readable over whatever scrolls under; content runs out under the bar
                the way it runs out under the tab bar. */}
            <div
                className={cx(
                    "fixed inset-x-0 top-0 z-30 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center px-4 pt-4 pb-2 sm:px-6 lg:hidden",
                    // Nothing to tap until Back, a button or the collapsed title is there: taps go through to the page.
                    !back && !barActions && !collapsed && "pointer-events-none",
                    // The fade comes with the collapse: at rest the buttons sit on the page and the large title
                    // sits on its line; once content scrolls under, the page's ground fades in behind the bar.
                    // The ground reaches 28 px past the bar's bottom: the glass thins over its whole height
                    // and runs out there.
                    "before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:-bottom-7 before:-z-10 before:glass-fade before:transition-opacity before:duration-150 before:ease-enter",
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
                        // The same size as the card sheet's bar gives its name: one bar, two places.
                        "truncate px-2 text-md font-semibold text-primary transition-opacity duration-150 ease-enter",
                        collapsed ? "opacity-100" : "opacity-0",
                    )}
                >
                    {phoneTitle ?? title}
                </span>
                <div
                    ref={buttons}
                    className="flex items-center justify-end gap-3 transition-transform duration-150 ease-enter motion-reduce:transition-none"
                    style={barDrop ? { transform: `translateY(${barDrop}px)` } : undefined}
                >
                    {barActions}
                </div>
            </div>
            {/* The room the bar takes in the flow, on top of the page's own 16 px (32 from `sm`). With Back the
                title starts at 76: under the 44 px button with 16 above and under it. Beside the buttons it
                starts at 22, its 32 px line centred on them. With nothing in the bar, at 24. */}
            <div aria-hidden="true" className={cx("lg:hidden", back ? "mb-4 h-11 sm:h-7" : beside ? "h-1.5 sm:h-0" : "h-2 sm:h-0")} />
            {hero ? (
                // A grid of one cell, not `relative`: the wash inside the band is positioned by the app frame, and a positioned box here would cut it to the column.
                <div className="mb-6 grid *:col-start-1 *:row-start-1 lg:-mt-8">
                    {hero}
                    {back && backOnDesktop ? <DesktopBack back={back} className="self-center justify-self-start" /> : null}
                </div>
            ) : back && backOnDesktop ? (
                <DesktopBack back={back} className="mb-4 self-start" />
            ) : null}

            {/* Above the title, 8 px from the top: the search on Home sits higher than a page's first content,
                and the title 16 px under it whatever the page's own gap, as under Back. */}
            <div className="flex flex-col gap-4">
                {above ? <div className="-mt-2">{above}</div> : null}

                {/* Actions sit beside the title when they fit (a plus on a phone) and wrap under it when they do not. */}
                <div
                    className={cx(
                        // Centred on each other, whichever is taller: the buttons (40 px) against a title alone (32 px)
                        // hung 4 px low when the row started at the top (Binders, 2026-09-14).
                        "flex flex-row flex-wrap items-center justify-between gap-3",
                        !titleOnPhone && "max-lg:sr-only",
                        // On the bar's line, the buttons keep its right end.
                        beside && "max-lg:pr-28",
                    )}
                >
                    {/* The words take what the actions leave, so a long subtitle wraps rather than pushing them under the title. */}
                    <div className="flex min-w-0 flex-1 basis-48 flex-col gap-1">
                        {eyebrow ? <p className="text-sm font-semibold text-tertiary">{eyebrow}</p> : null}
                        {/* The title and its line, measured apart from what follows them (a switch): the buttons
                            beside stand level with these, not with the whole block (Bart, 2026-09-18). */}
                        <div ref={head} className="flex flex-col gap-1">
                            {/* A step up from display-xs, 30 px, and bold (Bart's calls, 2026-09-18): the page's name, the largest words on it. */}
                            <h1 ref={sentinel} className="text-display-sm font-bold text-primary">
                                {/* Hidden, not just unseen: a name a screen reader reads is the one on screen. */}
                                {phoneTitle ? (
                                    <>
                                        <span className="lg:hidden">{phoneTitle}</span>
                                        <span className="max-lg:hidden">{title}</span>
                                    </>
                                ) : (
                                    title
                                )}
                            </h1>
                            {subtitle ? <p className="text-md text-tertiary">{subtitle}</p> : null}
                        </div>
                        {children}
                    </div>
                    {actions ? <div className="flex items-center gap-3 self-stretch">{actions}</div> : null}
                </div>
            </div>
        </div>
    );
}

/** Back where the phone's bar is gone: the same button as the bar's, from `lg` only. */
function DesktopBack({ back, className }: { back: { href: string; label: string }; className?: string }) {
    return (
        <Button
            href={back.href}
            color="secondary"
            size="lg"
            iconLeading={ChevronLeft}
            aria-label={`Back to ${back.label}`}
            className={cx("max-lg:hidden", className)}
        />
    );
}
