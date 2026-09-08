"use client";

import { type ReactNode, useDeferredValue, useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown, SearchLg } from "@untitledui/icons";
import { Button as AriaButton, Dialog as AriaDialog, DialogTrigger as AriaDialogTrigger, Heading as AriaHeading } from "react-aria-components";
import { SlideoutMenu } from "@/components/application/slideout-menus/slideout-menu";
import { Dropdown } from "@/components/base/dropdown/dropdown";
import { useBreakpoint } from "@/hooks/use-breakpoint";
import { cx } from "@/utils/cx";

export type FilterOption = { value: string; label: string; hint?: string };

/** Past this many choices the list gets a field to narrow it: a person knows the set's name, not its place in the list. */
const SEARCHABLE_FROM = 12;

// The row of chips under a search field: one line, scrolling sideways where it does not fit, with
// "Clear" at its end while one is set.
export function FilterChipRow({ onClear, className, children }: { onClear?: () => void; className?: string; children: ReactNode }) {
    return (
        <div className={cx("scrollbar-hide flex w-full max-w-full min-w-0 flex-nowrap items-center gap-1.5 overflow-x-auto", className)}>
            {children}
            {onClear ? (
                <button
                    type="button"
                    onClick={onClear}
                    className="shrink-0 pressable cursor-pointer rounded-full px-2 py-1.5 text-xs font-semibold whitespace-nowrap text-tertiary outline-focus-ring transition-colors duration-150 hover:text-secondary focus-visible:outline-2"
                >
                    Clear
                </button>
            ) : null}
        </div>
    );
}

// One filter as a chip: its name while unset, its choice once set, filled so a narrowed list says
// why. A tap opens the choices as a sheet from the bottom on a phone and as a menu under the chip
// from sm; a choice applies at once and closes them. The choices are plain buttons, not a listbox,
// because the desktop palette wraps its children in an autocomplete that claims any listbox it finds.
export function FilterChip({
    label,
    value,
    options,
    onChange,
    any = `Any ${label.toLowerCase()}`,
}: {
    label: string;
    /** The chosen option's value; undefined for none. */
    value: string | undefined;
    options: FilterOption[];
    onChange: (next: string | undefined) => void;
    /** The first row's word, the one that takes the filter off. */
    any?: string;
}) {
    const [open, setOpen] = useState(false);
    const sm = useBreakpoint("sm");
    const chosen = options.find((o) => o.value === value);
    const pick = (next: string | undefined) => {
        onChange(next);
        setOpen(false);
    };
    const chipClass = cx(
        "flex shrink-0 pressable cursor-pointer items-center gap-1 rounded-full py-1.5 pr-2 pl-3 text-xs font-semibold whitespace-nowrap ring-1 outline-focus-ring transition-colors duration-150 ring-inset focus-visible:outline-2",
        chosen ? "bg-alpha-black/8 text-primary ring-transparent" : "bg-primary text-secondary ring-primary hover:bg-secondary",
    );
    const chipContent = (
        <>
            <span aria-hidden="true">{chosen ? chosen.label : label}</span>
            <ChevronDown aria-hidden="true" className="size-3.5 shrink-0 text-fg-quaternary" />
        </>
    );
    const name = chosen ? `${label}: ${chosen.label}` : label;

    if (sm) {
        return (
            <AriaDialogTrigger isOpen={open} onOpenChange={setOpen}>
                <AriaButton aria-label={name} className={chipClass}>
                    {chipContent}
                </AriaButton>
                <Dropdown.Popover placement="bottom start" className="w-72">
                    <AriaDialog aria-label={label} className="flex max-h-80 flex-col outline-hidden">
                        <Choices label={label} any={any} value={value} options={options} onPick={pick} />
                    </AriaDialog>
                </Dropdown.Popover>
            </AriaDialogTrigger>
        );
    }

    return (
        <>
            <button type="button" aria-haspopup="dialog" aria-expanded={open} aria-label={name} onClick={() => setOpen(true)} className={chipClass}>
                {chipContent}
            </button>
            <SlideoutMenu isDismissable isOpen={open} onOpenChange={setOpen} dialogClassName="max-h-[70dvh]">
                {({ close }) => (
                    <>
                        <SlideoutMenu.Header onClose={close}>
                            <AriaHeading slot="title" className="text-lg font-semibold text-primary">
                                {label}
                            </AriaHeading>
                        </SlideoutMenu.Header>
                        <SlideoutMenu.Content className="pb-4">
                            <Choices label={label} any={any} value={value} options={options} onPick={pick} />
                        </SlideoutMenu.Content>
                    </>
                )}
            </SlideoutMenu>
        </>
    );
}

// The choices: "Any" on top, then each option, the chosen one with a check. A long list has a field over it.
function Choices({
    label,
    any,
    value,
    options,
    onPick,
}: {
    label: string;
    any: string;
    value: string | undefined;
    options: FilterOption[];
    onPick: (next: string | undefined) => void;
}) {
    const [term, setTerm] = useState("");
    const needle = useDeferredValue(term.trim().toLowerCase());
    const searchable = options.length >= SEARCHABLE_FROM;
    const shown = needle ? options.filter((o) => `${o.label} ${o.hint ?? ""}`.toLowerCase().includes(needle)) : options;
    const listId = useId();
    // The list opens to be narrowed: the caret lands in the field, so typing goes on from the chip.
    const field = useRef<HTMLInputElement>(null);
    useEffect(() => field.current?.focus(), []);

    return (
        <div className="flex min-h-0 flex-col gap-2">
            {searchable ? (
                <div className="relative shrink-0 px-1 pt-1 sm:p-2 sm:pb-0">
                    <SearchLg
                        aria-hidden="true"
                        className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-fg-quaternary sm:left-4.5"
                    />
                    {/* kit-drift: the kit's TextField answers to the command palette's autocomplete, which
                        steals what is typed here. */}
                    <input
                        type="search"
                        aria-label={`Find a ${label.toLowerCase()}`}
                        aria-controls={listId}
                        ref={field}
                        placeholder={`Find a ${label.toLowerCase()}…`}
                        value={term}
                        onChange={(e) => setTerm(e.target.value)}
                        className="w-full rounded-full bg-primary py-1.5 pr-3 pl-8 text-sm text-primary ring-1 ring-primary outline-focus-ring ring-inset placeholder:text-placeholder focus-visible:outline-2"
                    />
                </div>
            ) : null}
            <fieldset id={listId} className="flex min-h-0 flex-col overflow-y-auto sm:p-1">
                <legend className="sr-only">{label}</legend>
                <Choice label={any} pressed={value === undefined} onClick={() => onPick(undefined)} />
                {shown.map((o) => (
                    <Choice key={o.value} label={o.label} hint={o.hint} pressed={o.value === value} onClick={() => onPick(o.value)} />
                ))}
                {needle && shown.length === 0 ? <p className="px-2 py-4 text-center text-sm text-tertiary">Nothing by that name.</p> : null}
            </fieldset>
        </div>
    );
}

// A choice is the kit's button (react-aria), which answers Enter and Space itself, like the chip.
function Choice({ label, hint, pressed, onClick }: { label: string; hint?: string; pressed: boolean; onClick: () => void }) {
    return (
        <AriaButton
            aria-pressed={pressed}
            onPress={onClick}
            className={cx(
                "flex pressable cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-left outline-focus-ring transition-colors hover:bg-secondary focus-visible:outline-2",
                pressed && "bg-alpha-black/4",
            )}
        >
            <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-medium text-primary">{label}</span>
                {hint ? <span className="truncate text-xs text-tertiary">{hint}</span> : null}
            </span>
            <Check aria-hidden="true" className={cx("size-4 shrink-0 text-fg-brand-primary", !pressed && "invisible")} />
        </AriaButton>
    );
}
