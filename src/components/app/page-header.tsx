"use client";

import { type ReactNode, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ChevronLeft } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { barSearchSlot } from "@/hooks/use-row-search";
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
    below,
    titleOnPhone = true,
    shortTitle = false,
    searchField = false,
    sticky = true,
    phoneTitle,
    heading,
}: {
    title: string;
    /**
     * What the h1 holds in place of the title's words: Home's list choice, the list's name with a
     * chevron. `title` stays the words, for the bar's small title once the page scrolls.
     */
    heading?: ReactNode;
    /**
     * The title below `lg`, where it differs: Collection and Wishlist are one tab on a phone, My cards,
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
    /**
     * Under the title's row at the column's full width: a switch between views. Not in `children`,
     * which share the row with the actions and, on a phone, give up the bar's buttons' 112 px: Collection
     * and Wishlist were 342 px wide on one page and 234 on the other (390 px, 2026-09-18).
     */
    below?: ReactNode;
    /** Off on a page whose title says nothing on a phone (Browse): the h1 stays for a screen reader. */
    titleOnPhone?: boolean;
    /** A title of one short word (Home): it takes its own width, so the actions stay on its line on a phone rather than wrapping under it. */
    shortTitle?: boolean;
    /**
     * On a phone the list's search field is the bar's first line, in the title's place, with the bar's
     * buttons beside it (`RowSearch` place "bar"): a page the tab bar reaches (My cards, Browse), where
     * the tab already says the name (Bart's call, 2026-09-19). The h1 stays for a screen reader.
     */
    searchField?: boolean;
    /**
     * Off, the phone's bar scrolls away with the page instead of staying at the top: Browse, whose
     * search and View are a way into the shelf, not controls needed at every set (Bart, 2026-09-19).
     */
    sticky?: boolean;
}) {
    const sentinel = useRef<HTMLHeadingElement>(null);
    const [collapsed, setCollapsed] = useState(false);

    // The bar takes the title over exactly when the large one has left the screen. IntersectionObserver
    // rather than a scroll listener: it costs nothing between changes and needs no layout reads.
    // Without Back but with buttons in the bar (All cards, a binder, Collection) the large title starts level
    // with those buttons, on their line, rather than on a line of its own under them.
    const beside = Boolean(!back && barActions && titleOnPhone);
    useEffect(() => {
        const el = sentinel.current;
        // A title hidden on the phone has nothing to collapse into the bar: the bar stays out of the way.
        // A bar that scrolls away with the page has nothing to collapse into: it is gone before the title is.
        if (!titleOnPhone || !sticky || !el || typeof IntersectionObserver === "undefined") return;
        const observer = new IntersectionObserver(([entry]) => setCollapsed(back ? entry.intersectionRatio < 1 : !entry.isIntersecting), {
            // The title counts as gone once it is under the bar, not once it has left the screen: with Back
            // the bar is 76 px (a 44 px button, the avatar's and the search's size, with 16 above and under) and
            // the title starts right under it, so any part of it under the bar is enough; without one the
            // title's line is the bar's own (16 px down, 44 tall, level with the buttons) and counts as gone
            // once it has scrolled past the bar's top.
            threshold: back ? 1 : 0,
            rootMargin: `${back ? -76 : -16}px 0px 0px 0px`,
        });
        observer.observe(el);
        return () => observer.disconnect();
    }, [back, titleOnPhone, sticky]);

    /* Beside the buttons, the buttons stand level with the title's line, not with the title and the
       line under it: the title keeps one place on every page, whatever is under it (Bart, 2026-09-19).
       Measured from where both really are, because from `sm` the title starts 16 px lower while the
       bar does not move (Binders on a tablet, 2026-09-14). Back at the bar's own place once the bar
       has taken the title over. */
    const buttons = useRef<HTMLDivElement>(null);
    const [drop, setDrop] = useState(0);
    /* Moving only once the first place is set: measured after the first paint, the buttons drew at the
       bar's top and slid down to the title on every page load (Bart, 2026-09-18). Measured before the
       paint (a layout effect) and with the slide switched on a frame later, they are drawn where they
       belong, and slide only when the bar takes the title over or gives it back. */
    const [placed, setPlaced] = useState(false);
    useLayoutEffect(() => {
        const block = sentinel.current;
        const group = buttons.current;
        if (!beside || !block || !group || typeof ResizeObserver === "undefined") return;
        const measure = () => {
            // The title's line box, or its first line where a long name wraps: the buttons stay on that line.
            const box = block.getBoundingClientRect();
            const words = document.createRange();
            words.selectNodeContents(block);
            const first = [...words.getClientRects()].find((r) => r.height > 0);
            const line = box.height > parseFloat(getComputedStyle(block).minHeight) && first ? first : box;
            const wordsMiddle = line.top + window.scrollY + line.height / 2;
            // offsetTop is the group's place in the fixed bar, which a transform does not move.
            const buttonsMiddle = group.offsetTop + group.offsetHeight / 2;
            setDrop(Math.max(0, Math.round(wordsMiddle - buttonsMiddle)));
        };
        measure();
        const frame = requestAnimationFrame(() => setPlaced(true));
        const observer = new ResizeObserver(measure);
        observer.observe(block);
        window.addEventListener("resize", measure);
        return () => {
            cancelAnimationFrame(frame);
            observer.disconnect();
            window.removeEventListener("resize", measure);
        };
    }, [beside]);
    const barDrop = beside && !collapsed ? drop : 0;

    return (
        // One element, so the page's own gap applies once, under it: the distances inside are the spacer's
        // and the 16 px column, whatever the page puts between its sections.
        <div className={cx("flex flex-col", !sticky && "relative")}>
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
                    // Back and the buttons as wide as they are, the title the room between: with search, View and the
                    // dots on the right, equal side columns ran the buttons over a collapsed title at 375 px.
                    "fixed inset-x-0 top-0 z-30 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 px-4 pt-4 pb-2 sm:px-6 lg:hidden",
                    // Not sticky: at the page's top, in the header's place, gone as the page scrolls. The
                    // offsets take back the page's own padding, which `fixed` never had to.
                    !sticky && "absolute -inset-x-4 -top-4 sm:-inset-x-6 sm:-top-8",
                    // Searching, the field is the bar: the title and the buttons step away until Cancel; Back stays.
                    // A page whose field always stands there gives up the title alone.
                    searchField
                        ? "[&:has(>[data-bar-search]:not(:empty))>:nth-child(2)]:hidden"
                        : "[&:has(>[data-bar-search]:not(:empty))>:is(:nth-child(2),:nth-child(3))]:invisible",
                    // Nothing to tap until Back, a button or the collapsed title is there: taps go through to the page.
                    !back && !barActions && !searchField && !collapsed && "pointer-events-none",
                    // The fade comes with the collapse: at rest the buttons sit on the page and the large title
                    // sits on its line; once content scrolls under, the page's ground fades in behind the bar.
                    // The ground reaches 28 px past the bar's bottom: the glass thins over its whole height
                    // and runs out there.
                    "before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:-bottom-7 before:-z-10 before:glass-fade before:transition-opacity before:duration-150 before:ease-enter",
                    collapsed ? "before:opacity-100" : "before:opacity-0",
                    // A bar that is the search field on a phone always has content under it: its ground stays.
                    searchField && sticky && "max-sm:before:opacity-100",
                )}
            >
                {/* Every child in its own cell: the field and the buttons are placed, and a child left to
                    auto-placement went to a second row and widened the first column. */}
                <div className="col-start-1 row-start-1 flex justify-start">
                    {back ? (
                        <Button
                            href={back.href}
                            // Back out a level: the parent comes from the left (page-transition.tsx).
                            routerOptions={{ transitionTypes: ["nav-back"] }}
                            color="secondary"
                            size="lg"
                            iconLeading={ChevronLeft}
                            aria-label={`Back to ${back.label}`}
                        />
                    ) : null}
                </div>
                {/* The same words as the h1 below, so a screen reader hears the title once. */}
                <span
                    aria-hidden="true"
                    className={cx(
                        // The same size as the card sheet's bar gives its name: one bar, two places.
                        "col-start-2 row-start-1 truncate px-2 text-center text-md font-semibold text-primary transition-opacity duration-150 ease-enter",
                        collapsed ? "opacity-100" : "opacity-0",
                    )}
                >
                    {phoneTitle ?? title}
                </span>
                <div
                    ref={buttons}
                    className={cx(
                        // Their own cell, always: with the field over the first two, auto-placement put them on a line of their own.
                        "col-start-3 row-start-1 flex items-center justify-end gap-3",
                        placed && "transition-transform duration-150 ease-enter motion-reduce:transition-none",
                        // Beside the field on a phone, level with it: nothing to line up with a title that is not drawn there.
                        searchField && "max-sm:transform-none!",
                    )}
                    style={barDrop ? { transform: `translateY(${barDrop}px)` } : undefined}
                >
                    {barActions}
                </div>
                {/* Where a list's search field comes when the bar's search is pressed (`RowSearch`), over the
                    whole bar, as Gojek and Keeta turn their bar into the field (Mobbin, 2026-09-19). */}
                <div
                    ref={barSearchSlot}
                    data-bar-search
                    className={cx(
                        "flex items-center gap-3 empty:hidden",
                        "row-start-1",
                        searchField
                            ? // Over Back's place and the title's, the buttons beside it.
                              "col-start-1 col-end-3"
                            : // Over the title and the buttons, which step away; Back stays beside it, as Gojek and Keeta keep it.
                              back
                              ? "col-start-2 col-end-4"
                              : "col-start-1 col-end-4",
                    )}
                />
            </div>
            {/* The room the bar takes in the flow, on top of the page's own 16 px (32 from `sm`). With Back the
                title starts at 76: under the 44 px button with 16 above and under it. Without, the title's line
                is the bar's: 16 px down and 44 tall, the buttons on it, on every page alike (Bart, 2026-09-19). */}
            <div
                aria-hidden="true"
                className={cx(
                    "lg:hidden",
                    back ? "mb-4 h-11 sm:h-7" : "h-0",
                    // The field's 44 px line on a phone, and 16 px from it to what comes next: the page's own
                    // 24 px gap, 8 taken back, the gap the filters keep to the tabs under them (Bart, 2026-09-19).
                    searchField && "max-sm:-mb-2 max-sm:h-11",
                )}
            />
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
                        // From the top: the title's line is as tall as the buttons and centred in it, so the title
                        // stands at one height on every page, with or without buttons or a line under it
                        // (32 or 33 px on desktop, 22 or 27 on a phone, before 2026-09-19).
                        "flex flex-row flex-wrap items-start justify-between gap-3",
                        !titleOnPhone && "max-lg:sr-only",
                        // On the bar's line, the buttons keep its right end.
                        beside && "max-lg:pr-28",
                    )}
                >
                    {/* The words take what the actions leave, so a long subtitle wraps rather than pushing them under the title. */}
                    <div className={cx("flex min-w-0 flex-1 flex-col gap-1", shortTitle ? "basis-auto" : "basis-48")}>
                        {eyebrow ? <p className="text-sm font-semibold text-tertiary">{eyebrow}</p> : null}
                        {/* The title and its line, apart from what follows them (a switch). */}
                        <div className="flex flex-col gap-1">
                            {/* A step up from display-xs, 30 px, and bold (Bart's calls, 2026-09-18): the page's name, the largest words on it.
                                Set a little tighter, as large bold type wants (Bart, 2026-09-18). */}
                            <h1
                                ref={sentinel}
                                className={cx(
                                    // A line as tall as the buttons beside it: 44 px where the bar is, 40 from `lg`.
                                    "flex min-h-11 items-center text-display-sm font-bold tracking-tight text-primary lg:min-h-10",
                                    searchField && "max-sm:sr-only",
                                )}
                            >
                                {/* Hidden, not just unseen: a name a screen reader reads is the one on screen. */}
                                {heading ? (
                                    heading
                                ) : phoneTitle ? (
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
                    {actions ? <div className="flex items-center gap-3">{actions}</div> : null}
                </div>
                {below}
            </div>
        </div>
    );
}

/** Back where the phone's bar is gone: the same button as the bar's, from `lg` only. */
function DesktopBack({ back, className }: { back: { href: string; label: string }; className?: string }) {
    return (
        <Button
            href={back.href}
            routerOptions={{ transitionTypes: ["nav-back"] }}
            color="secondary"
            size="lg"
            iconLeading={ChevronLeft}
            aria-label={`Back to ${back.label}`}
            className={cx("max-lg:hidden", className)}
        />
    );
}
