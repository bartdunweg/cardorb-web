"use client";

import { type ReactNode, useDeferredValue, useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown, SearchLg } from "@untitledui/icons";
import { Button as AriaButton, Dialog as AriaDialog, DialogTrigger as AriaDialogTrigger, Heading as AriaHeading } from "react-aria-components";
import { SlideoutMenu } from "@/components/application/slideout-menus/slideout-menu";
import { CheckboxBase } from "@/components/base/checkbox/checkbox";
import { Dropdown } from "@/components/base/dropdown/dropdown";
import { useBreakpoint } from "@/hooks/use-breakpoint";
import { cx } from "@/utils/cx";

/** One choice. `icon` goes before the word: a language's flag, a type's disc, a state's dot. */
export type FilterOption = { value: string; label: string; hint?: string; icon?: ReactNode };

/** Past this many choices the list gets a field to narrow it: a person knows the set's name, not its place in the list. */
const SEARCHABLE_FROM = 12;

// The row of chips under a search field: one line, scrolling sideways where it does not fit, with
// "Clear" at its end while one is set.
export function FilterChipRow({ onClear, className, children }: { onClear?: () => void; className?: string; children: ReactNode }) {
    return (
        <div className={cx("scrollbar-hide flex w-full max-w-full min-w-0 flex-nowrap items-center gap-1.5 overflow-x-auto", className)}>
            {children}
            {onClear ? (
                <AriaButton
                    onPress={onClear}
                    className="shrink-0 pressable cursor-pointer rounded-full px-2 py-1.5 text-xs font-semibold whitespace-nowrap text-tertiary outline-focus-ring transition-colors duration-150 hover:text-secondary focus-visible:outline-2"
                >
                    Clear
                </AriaButton>
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
            {chosen?.icon ? <span className="flex shrink-0 items-center">{chosen.icon}</span> : null}
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
                        <FilterChoices label={label} any={any} value={value ? [value] : []} options={options} onChange={(next) => pick(next[0])} />
                    </AriaDialog>
                </Dropdown.Popover>
            </AriaDialogTrigger>
        );
    }

    return (
        <>
            {/* The same button the sm branch above opens its menu with; here it opens the sheet, so it
                says so itself rather than through a DialogTrigger. */}
            <AriaButton aria-haspopup="dialog" aria-expanded={open} aria-label={name} onPress={() => setOpen(true)} className={chipClass}>
                {chipContent}
            </AriaButton>
            <SlideoutMenu isDismissable isOpen={open} onOpenChange={setOpen} dialogClassName="max-h-[70dvh]">
                {({ close }) => (
                    <>
                        <SlideoutMenu.Header onClose={close}>
                            <AriaHeading slot="title" className="text-lg font-semibold text-primary">
                                {label}
                            </AriaHeading>
                        </SlideoutMenu.Header>
                        {/* role="presentation", not the kit's default "main": the page already has a <main>. */}
                        {/* eslint-disable-next-line jsx-a11y/prefer-tag-over-role -- the rule offers <img alt="">, which this is not: the role is here only to stop the kit's default role="main". */}
                        <SlideoutMenu.Content role="presentation" className="pb-4">
                            <FilterChoices label={label} any={any} value={value ? [value] : []} options={options} onChange={(next) => pick(next[0])} />
                        </SlideoutMenu.Content>
                    </>
                )}
            </SlideoutMenu>
        </>
    );
}

// The choices: "Any" on top where there is one, then each option. One to pick: the chosen one has a
// check and a press replaces it. `multiple`: each has a box and a press adds or takes it away, so a
// list can be several sets at once. A long list has a field over it.
export function FilterChoices({
    label,
    any,
    anyIcon,
    value,
    options,
    multiple = false,
    focusField = true,
    counts,
    onChange,
}: {
    label: string;
    /** The first row's word, the one that takes the filter off; none, no such row. */
    any?: string;
    /** Beside that word: English's flag, where the others wear theirs. */
    anyIcon?: ReactNode;
    /** Per option, how many choosing it would leave; zero greys it out unless it is chosen. */
    counts?: Record<string, number>;
    /** The caret in the field on open. Off in a sheet on a phone, where it raises the keyboard over the list it narrows. */
    focusField?: boolean;
    value: string[];
    options: FilterOption[];
    multiple?: boolean;
    onChange: (next: string[]) => void;
}) {
    const press = (option: string) => onChange(multiple ? (value.includes(option) ? value.filter((v) => v !== option) : [...value, option]) : [option]);
    const [term, setTerm] = useState("");
    const needle = useDeferredValue(term.trim().toLowerCase());
    const searchable = options.length >= SEARCHABLE_FROM;
    const found = needle ? options.filter((o) => `${o.label} ${o.hint ?? ""}`.toLowerCase().includes(needle)) : options;
    // With numbers, what would leave nothing sinks under what would, each part in its own order: in
    // two hundred sets the nine that answer were scattered between zeros.
    const empty = (o: FilterOption) => counts !== undefined && (counts[o.value] ?? 0) === 0 && !value.includes(o.value);
    const shown = counts ? [...found.filter((o) => !empty(o)), ...found.filter(empty)] : found;
    const listId = useId();
    // The list opens to be narrowed: the caret lands in the field, so typing goes on from the chip.
    const field = useRef<HTMLInputElement>(null);
    useEffect(() => {
        if (focusField) field.current?.focus();
    }, [focusField]);

    // What the field did, for a screen reader: a 200-set list narrowing to three, or to none, was
    // silent: the count was nowhere and "Nothing by that name." was plain text nobody announced.
    // Always mounted, the way the search sheet's own region is: one that appears with its text in
    // it is never read out.
    const narrowedTo = !needle ? "" : shown.length === 0 ? "Nothing by that name." : `${shown.length} of ${options.length} shown`;

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
                        /* 14 px text that Safari does not zoom the page in for, padding included:
                           .field-text-sm and .field-pill-sm in globals.css. */
                        className="field-text-sm field-pill-sm w-full rounded-full bg-primary text-primary ring-1 ring-primary outline-focus-ring ring-inset placeholder:text-placeholder focus-visible:outline-2"
                    />
                </div>
            ) : null}
            {/* Under the field it was typed into, so it is the message and the announcement both, rather
                than a second copy of one of them. */}
            <output aria-live="polite" className={cx("shrink-0 text-center text-sm text-tertiary", shown.length === 0 && narrowedTo ? "px-2 py-4" : "sr-only")}>
                {narrowedTo}
            </output>
            <fieldset id={listId} className="flex min-h-0 flex-col overflow-y-auto sm:p-1">
                <legend className="sr-only">{label}</legend>
                {any ? <Choice label={any} icon={anyIcon} pressed={value.length === 0} onClick={() => onChange([])} /> : null}
                {shown.map((o) => (
                    <Choice
                        key={o.value}
                        label={o.label}
                        hint={o.hint}
                        icon={o.icon}
                        multiple={multiple}
                        // Named only where found: an option missing from a counted group is zero.
                        count={counts ? (counts[o.value] ?? 0) : undefined}
                        pressed={value.includes(o.value)}
                        onClick={() => press(o.value)}
                    />
                ))}
            </fieldset>
        </div>
    );
}

// A choice is the kit's button (react-aria), which answers Enter and Space itself, like the chip.
function Choice({
    label,
    hint,
    icon,
    multiple = false,
    count,
    pressed,
    onClick,
}: {
    label: string;
    hint?: string;
    icon?: ReactNode;
    multiple?: boolean;
    count?: number;
    pressed: boolean;
    onClick: () => void;
}) {
    return (
        <AriaButton
            aria-pressed={pressed}
            onPress={onClick}
            // Nothing left to show with it: passed over, unless it is chosen and has to come off again.
            isDisabled={count === 0 && !pressed}
            className={cx(
                "flex pressable cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-left outline-focus-ring transition-colors hover:bg-secondary focus-visible:outline-2 disabled:cursor-default disabled:opacity-50 disabled:hover:bg-transparent",
                pressed && "bg-alpha-black/4",
            )}
        >
            {/* The box leads, as in a checklist; one to pick keeps its check at the end. */}
            {multiple ? <CheckboxBase isSelected={pressed} /> : null}
            {icon ? <span className="flex shrink-0 items-center">{icon}</span> : null}
            <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-medium text-primary">{label}</span>
                {/* The comma is read, not seen: the two lines run together into one accessible name
                    otherwise ("Base Set1999", "Full art39 cards"), which is what a screen reader says. */}
                {hint ? (
                    <span className="truncate text-xs text-tertiary">
                        <span className="sr-only">, </span>
                        {hint}
                    </span>
                ) : null}
            </span>
            {count === undefined ? null : (
                <span className="shrink-0 text-sm">
                    <OptionCount n={count} />
                </span>
            )}
            {multiple ? null : <Check aria-hidden="true" className={cx("size-4 shrink-0 text-fg-brand-primary", !pressed && "invisible")} />}
        </AriaButton>
    );
}

/** An option's number: quiet beside its word, and read after a comma ("Rare, 42"). */
export function OptionCount({ n }: { n: number | undefined }) {
    if (n === undefined) return null;
    return (
        <span className="text-tertiary tabular-nums">
            <span className="sr-only">, </span>
            {n.toLocaleString("en")}
        </span>
    );
}
