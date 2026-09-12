"use client";

import type { FC, ReactNode } from "react";
import { ChevronRight } from "@untitledui/icons";
import Link from "next/link";
import { Button as AriaButton, Heading as AriaHeading } from "react-aria-components";
import { SheetDialog } from "@/components/app/sheet-dialog";
import { CloseButton } from "@/components/base/buttons/close-button";
import { cx } from "@/utils/cx";

/**
 * Settings as a list of rows rather than a page of open forms.
 *
 * It was five stacked cards, every field of every one of them on screen at once: the avatar, the
 * username, three password boxes, the theme. Nothing was hidden and nothing was findable, and the
 * page grew by one whole card each time anything was added to it.
 *
 * A row says what it is and what it is currently, and opens the form when you want it. What
 * opens is the sheet from `sheet-dialog` (up from the bottom on a phone, a modal from `sm`)
 * rather than a page of its own: an errand you finish and leave, the same shape the import and
 * the copy forms already use, and no new address for something nobody links to.
 */

/**
 * A titled group of rows, drawn as one card.
 *
 * The heading sits above the card rather than inside it, which is what makes a list of these
 * scannable: the words you read to find something are on the page's ground, and the rows
 * themselves are one uninterrupted surface.
 */
export function SettingsGroup({ title, children }: { title: string; children: ReactNode }) {
    return (
        <section className="flex flex-col gap-2">
            <h2 className="px-1 text-sm font-medium text-tertiary">{title}</h2>
            <div className="flex flex-col overflow-hidden rounded-xl bg-primary shadow-lift-xs ring-1 ring-primary ring-inset">{children}</div>
        </section>
    );
}

const rowClass =
    "flex w-full items-center gap-3 px-4 py-3.5 text-left outline-focus-ring transition duration-100 ease-linear not-last:border-b not-last:border-secondary hover:bg-primary_hover focus-visible:z-10 focus-visible:outline-2 focus-visible:-outline-offset-2";

/** The label, whatever it currently says, and the mark that there is more behind it. */
function RowBody({ icon: Icon, label, value }: { icon: FC<{ className?: string }>; label: string; value?: string | null }) {
    return (
        <>
            <Icon aria-hidden="true" className="size-5 shrink-0 text-fg-quaternary" />
            <span className="flex-1 truncate text-md text-primary">{label}</span>
            {value ? <span className="shrink-0 truncate text-sm text-tertiary">{value}</span> : null}
            <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-fg-quaternary" />
        </>
    );
}

/**
 * A row that opens a sheet.
 *
 * `content` gets `close`, so a form can shut itself once it has saved, the same contract the
 * other dialogs in this app have.
 */
export function SettingsRow({
    icon,
    label,
    value,
    content,
}: {
    icon: FC<{ className?: string }>;
    label: string;
    /** What it says now: "Light", "English". Left out where a row has no state to show. */
    value?: string | null;
    content: (close: () => void) => ReactNode;
}) {
    return (
        <SheetDialog className="sm:max-w-md" content={content}>
            {/*
             * react-aria's Button, not a plain one. DialogTrigger opens on a press it attaches to
             * its child, and a bare <button> never receives it: the row looked right and did
             * nothing. app-sidebar.tsx reaches for AriaButton for its own row for this reason.
             */}
            <AriaButton className={cx(rowClass, "cursor-pointer")}>
                <RowBody icon={icon} label={label} value={value} />
            </AriaButton>
        </SheetDialog>
    );
}

/** The same row, going somewhere instead of opening something. */
export function SettingsLinkRow({
    icon,
    label,
    value,
    href,
    external = false,
    download = false,
}: {
    icon: FC<{ className?: string }>;
    label: string;
    value?: string | null;
    href: string;
    /** A page outside the app opens in its own tab, and says so to a screen reader. */
    external?: boolean;
    /** A file to save rather than a page to go to: a plain anchor, so the router neither prefetches nor navigates. */
    download?: boolean;
}) {
    if (download) {
        return (
            <a href={href} download className={rowClass}>
                <RowBody icon={icon} label={label} value={value} />
            </a>
        );
    }
    return (
        <Link href={href} className={rowClass} {...(external ? { target: "_blank", rel: "noreferrer" } : {})}>
            <RowBody icon={icon} label={label} value={value} />
            {external ? <span className="sr-only">(opens in a new tab)</span> : null}
        </Link>
    );
}

/**
 * A sheet's title, and the way back out of it.
 *
 * Every sheet needs one and the first three did not have one: the forms were moved into sheets
 * with their Save button and nothing else, so a phone (where there is no dimmed page beside the
 * sheet to tap) had no way to leave without saving. Escape worked and nothing said so.
 */
export function SheetHeader({ title, description, close }: { title: string; description?: string; close: () => void }) {
    return (
        <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 flex-col gap-1">
                <AriaHeading slot="title" className="text-lg font-semibold text-primary">
                    {title}
                </AriaHeading>
                {description ? <p className="text-sm text-tertiary">{description}</p> : null}
            </div>
            <CloseButton onClick={close} size="sm" className="-mt-1 -mr-1" />
        </div>
    );
}
