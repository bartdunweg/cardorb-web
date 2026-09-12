"use client";

import { useEffect, useId, useState } from "react";
import { ArrowLeft, Check, ChevronDown, ChevronRight, FilterLines } from "@untitledui/icons";
import { Button as AriaButton, Dialog as AriaDialog, DialogTrigger as AriaDialogTrigger, Heading as AriaHeading } from "react-aria-components";
import { FilterChoices, type FilterOption } from "@/components/app/filter-chip";
import { RowButton } from "@/components/app/row-button";
import { SlideoutMenu } from "@/components/application/slideout-menus/slideout-menu";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { Dropdown } from "@/components/base/dropdown/dropdown";
import { Tag, TagGroup, TagList } from "@/components/base/tags/tags";
import { cx } from "@/utils/cx";

export type { FilterOption } from "@/components/app/filter-chip";

/**
 * One filter in the sheet. `multiple`: several at once, a card that is any of them (sets,
 * rarities, types). Without it one is always chosen, `all` first, which is the filter off (a
 * state, a catalogue's language).
 */
export type FilterGroup = {
    id: string;
    label: string;
    options: FilterOption[];
    multiple?: boolean;
    /** One-choice groups: the first option, the one that means no filter. Its value is never written. */
    all?: FilterOption;
};

/** What is chosen, per group id. An empty list is the filter off. */
export type FilterValues = Record<string, string[]>;

/** Up to this many a group is tags to tap; past it, a row that opens the list with a field to narrow it (sets). */
const TAGS_UP_TO = 12;

/** The key a one-choice group's "all" tag has: react-aria keys a tag, and an empty string is no key. */
const ALL = "__all";

const countOf = (values: FilterValues) => Object.values(values).reduce((n, v) => n + v.length, 0);

/**
 * The filters behind one button: a sheet from the bottom on a phone, a panel from the right from sm.
 * Mobbin's filter sheets (Etsy, Best Buy, Airwallex, Alan) agree on the shape, and this follows it:
 * every filter a section of tags you tap, a long one (sets) a row that opens its own list with a
 * field over it, and the action pinned to the bottom saying what it will show ("Show 42 cards").
 * The choices are a draft until then, so tapping four rarities is not four reloads of the page
 * behind the sheet; closing the sheet any other way leaves the list as it was.
 *
 * `inline`: from lg the filters stand in the row as menus instead and the button goes. For a page
 * whose filters fit beside the search (Browse's two, a set's three); a binder's five do not, so it
 * keeps the panel. In the row a choice applies at once, as a menu does, with no draft to confirm.
 *
 * `count`: how many the draft would show, for the button. Null, or no `count`: the button says
 * "Show results".
 */
export function FiltersSheet({
    groups,
    values,
    onApply,
    count,
    noun = ["result", "results"],
    inline = false,
}: {
    groups: FilterGroup[];
    values: FilterValues;
    onApply: (next: FilterValues) => void;
    count?: (draft: FilterValues) => number | null | Promise<number | null>;
    /** What the list holds, one and several, for the button's words. */
    noun?: [string, string];
    inline?: boolean;
}) {
    const [open, setOpen] = useState(false);
    const [draft, setDraft] = useState<FilterValues>(values);
    /** The group whose long list is open inside the sheet; null, the sheet's own page. */
    const [drill, setDrill] = useState<string | null>(null);
    const active = countOf(values);
    const shown = groups.filter((g) => g.options.length > 0);

    const openSheet = () => {
        setDraft(values);
        setDrill(null);
        setOpen(true);
    };
    const set = (id: string, next: string[]) => setDraft((d) => ({ ...d, [id]: next }));
    const clearAll = () => setDraft(Object.fromEntries(groups.map((g) => [g.id, []])));

    const drilled = shown.find((g) => g.id === drill);

    return (
        <>
            {inline ? (
                <div className="contents max-lg:hidden">
                    {shown.map((g) => (
                        <FilterMenu key={g.id} group={g} value={values[g.id] ?? []} onChange={(next) => onApply({ ...values, [g.id]: next })} />
                    ))}
                    {active > 0 ? (
                        <Button color="link-gray" size="sm" onClick={() => onApply(Object.fromEntries(groups.map((g) => [g.id, []])))}>
                            Clear filters
                        </Button>
                    ) : null}
                </div>
            ) : null}
            <div className={inline ? "lg:hidden" : undefined}>
                <RowButton icon={FilterLines} label="Filters" aria-haspopup="dialog" aria-expanded={open} onClick={openSheet}>
                    {active > 0 ? (
                        <Badge size="sm" color="gray" type="pill-color">
                            {active}
                            <span className="sr-only"> on</span>
                        </Badge>
                    ) : null}
                </RowButton>
                <SlideoutMenu isDismissable isOpen={open} onOpenChange={setOpen}>
                    {({ close }) => (
                        <>
                            <SlideoutMenu.Header onClose={close} className="pt-4 md:pt-5">
                                {drilled ? (
                                    <div className="flex items-center gap-1 pr-10">
                                        <Button
                                            color="tertiary"
                                            size="sm"
                                            iconLeading={ArrowLeft}
                                            aria-label="Back to filters"
                                            onClick={() => setDrill(null)}
                                        />
                                        <AriaHeading slot="title" className="text-lg font-semibold text-primary">
                                            {drilled.label}
                                        </AriaHeading>
                                    </div>
                                ) : (
                                    <AriaHeading slot="title" className="text-lg font-semibold text-primary">
                                        Filters
                                    </AriaHeading>
                                )}
                            </SlideoutMenu.Header>
                            {/* role="presentation", not the kit's default "main": the page already has a
                                <main>, and a second unlabelled one is a landmark that leads nowhere.
                                role={undefined} would not do it; the kit defaults the parameter. */}
                            {/* eslint-disable-next-line jsx-a11y/prefer-tag-over-role -- the rule offers <img alt="">, which this is not: the role is here only to stop the kit's default role="main". */}
                            <SlideoutMenu.Content role="presentation" className={cx("pb-4", drilled ? "min-h-0 gap-2" : "gap-6")}>
                                {drilled ? (
                                    <FilterChoices
                                        label={drilled.label}
                                        multiple={drilled.multiple}
                                        any={drilled.multiple ? undefined : drilled.all?.label}
                                        anyIcon={drilled.all?.icon}
                                        focusField={false}
                                        value={draft[drilled.id] ?? []}
                                        options={drilled.options}
                                        onChange={(next) => set(drilled.id, next)}
                                    />
                                ) : (
                                    shown.map((g) => (
                                        <FilterSection
                                            key={g.id}
                                            group={g}
                                            value={draft[g.id] ?? []}
                                            onChange={(next) => set(g.id, next)}
                                            onDrill={() => setDrill(g.id)}
                                        />
                                    ))
                                )}
                            </SlideoutMenu.Content>
                            <SlideoutMenu.Footer className="flex items-center gap-3">
                                {drilled ? (
                                    <Button color="secondary" size="md" className="flex-1" onClick={() => setDrill(null)}>
                                        Done
                                    </Button>
                                ) : (
                                    <>
                                        <Button color="link-gray" size="md" isDisabled={countOf(draft) === 0} onClick={clearAll}>
                                            Clear all
                                        </Button>
                                        <ShowButton
                                            draft={draft}
                                            open={open}
                                            count={count}
                                            noun={noun}
                                            onPress={() => {
                                                onApply(draft);
                                                close();
                                            }}
                                        />
                                    </>
                                )}
                            </SlideoutMenu.Footer>
                        </>
                    )}
                </SlideoutMenu>
            </div>
        </>
    );
}

// One filter in the sheet: its name over its tags, or over a row that opens the long list.
function FilterSection({ group, value, onChange, onDrill }: { group: FilterGroup; value: string[]; onChange: (next: string[]) => void; onDrill: () => void }) {
    const headingId = useId();
    const long = group.options.length > TAGS_UP_TO;
    const chosen = group.options.filter((o) => value.includes(o.value));

    return (
        <section aria-labelledby={headingId} className="flex w-full flex-col gap-3">
            <div className="flex min-h-5 items-center justify-between gap-3">
                <h3 id={headingId} className="text-sm font-semibold text-primary">
                    {group.label}
                </h3>
                {group.multiple && value.length > 0 ? (
                    <Button color="link-gray" size="sm" onClick={() => onChange([])} aria-label={`Clear ${group.label.toLowerCase()}`}>
                        Clear
                    </Button>
                ) : null}
            </div>
            {long ? (
                <AriaButton
                    onPress={onDrill}
                    aria-label={`${group.label}: ${chosen.length ? chosen.map((o) => o.label).join(", ") : "any"}`}
                    className="flex w-full pressable cursor-pointer items-center gap-3 rounded-xl bg-primary px-3.5 py-3 text-left ring-1 ring-primary outline-focus-ring transition-colors ring-inset hover:bg-primary_hover focus-visible:outline-2"
                >
                    <span className={cx("min-w-0 flex-1 truncate text-sm font-medium", chosen.length ? "text-primary" : "text-tertiary")}>
                        {chosen.length ? chosen.map((o) => o.label).join(", ") : `Any ${group.label.toLowerCase()}`}
                    </span>
                    {chosen.length > 1 ? (
                        <Badge size="sm" color="gray" type="pill-color">
                            {chosen.length}
                        </Badge>
                    ) : null}
                    <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-fg-quaternary" />
                </AriaButton>
            ) : (
                <FilterTags group={group} value={value} onChange={onChange} />
            )}
        </section>
    );
}

// A short filter as tags: tap to take one in or out, or, for a one-choice group, to move the choice.
// The kit's TagGroup, so it is one stop in the tab order with the arrow keys between the tags, and a
// reader hears each as selected or not. Chosen has a heavy outline, and a check says it too, so the state is
// not carried by the colour alone.
function FilterTags({ group, value, onChange }: { group: FilterGroup; value: string[]; onChange: (next: string[]) => void }) {
    const options = group.multiple ? group.options : [...(group.all ? [{ ...group.all, value: ALL }] : []), ...group.options];
    const selected = group.multiple ? value : [value[0] ?? ALL];

    return (
        <TagGroup
            label={group.label}
            size="lg"
            selectionMode={group.multiple ? "multiple" : "single"}
            checkboxes={false}
            selectedKeys={new Set(selected)}
            onSelectionChange={(keys) => {
                const next = keys === "all" ? options.map((o) => o.value) : [...keys].map(String);
                onChange(next.filter((k) => k !== ALL));
            }}
        >
            <TagList className="flex flex-wrap gap-2">
                {options.map((o) => (
                    <Tag
                        key={o.value}
                        id={o.value}
                        textValue={o.label}
                        className="group min-h-9 cursor-pointer rounded-full px-3 hover:bg-primary_hover data-selected:bg-secondary data-selected:text-primary data-selected:ring-2 data-selected:ring-fg-primary"
                    >
                        <Check aria-hidden="true" className="-ml-0.5 hidden size-3.5 shrink-0 group-data-selected:block" />
                        {o.icon ? <span className="flex shrink-0 items-center">{o.icon}</span> : null}
                        <span className="whitespace-nowrap">{o.label}</span>
                    </Tag>
                ))}
            </TagList>
        </TagGroup>
    );
}

// The sheet's action: what applying the draft will show. The count is asked for as the draft
// changes, a moment after the last tap so four taps are one question, and an answer to an older
// draft never overwrites a newer one.
function ShowButton({
    draft,
    open,
    count,
    noun,
    onPress,
}: {
    draft: FilterValues;
    open: boolean;
    count?: (draft: FilterValues) => number | null | Promise<number | null>;
    noun: [string, string];
    onPress: () => void;
}) {
    const [n, setN] = useState<number | null>(null);
    const [asking, setAsking] = useState(false);

    useEffect(() => {
        if (!open || !count) return;
        let current = true;
        const timer = setTimeout(() => {
            setAsking(true);
            Promise.resolve(count(draft))
                .then((value) => current && setN(value))
                .catch(() => current && setN(null))
                .finally(() => current && setAsking(false));
        }, 200);
        return () => {
            current = false;
            clearTimeout(timer);
        };
    }, [draft, open, count]);

    const label = n === null ? "Show results" : n === 0 ? `No ${noun[1]}` : `Show ${n.toLocaleString("en")} ${n === 1 ? noun[0] : noun[1]}`;

    return (
        <Button color="primary" size="md" className="flex-1" onClick={onPress} isLoading={asking && n === null} showTextWhileLoading>
            {label}
        </Button>
    );
}

// A filter as a menu in the row, from lg on a page with room for them: the name, what is chosen,
// and the choices under it. Several: each press applies and the menu stays, to take the next one.
// One: a press applies and closes it.
function FilterMenu({ group, value, onChange }: { group: FilterGroup; value: string[]; onChange: (next: string[]) => void }) {
    const [open, setOpen] = useState(false);
    const chosen = group.options.filter((o) => value.includes(o.value));
    const single = !group.multiple ? chosen[0] : undefined;
    const name = chosen.length ? `${group.label}: ${chosen.map((o) => o.label).join(", ")}` : group.label;

    return (
        <AriaDialogTrigger isOpen={open} onOpenChange={setOpen}>
            <Button color="secondary" size="sm" iconTrailing={ChevronDown} aria-label={name}>
                {/* One box: the kit wraps the children in an inline span, where a dot and a word broke onto two lines. */}
                <span className="inline-flex items-center gap-1.5">
                    {single?.icon ? <span className="flex shrink-0 items-center">{single.icon}</span> : null}
                    <span aria-hidden="true">{single ? single.label : group.label}</span>
                    {group.multiple && chosen.length > 0 ? (
                        <Badge size="sm" color="gray" type="pill-color">
                            {chosen.length}
                        </Badge>
                    ) : null}
                </span>
            </Button>
            <Dropdown.Popover placement="bottom start" className="w-72">
                <AriaDialog aria-label={group.label} className="flex max-h-96 flex-col outline-hidden">
                    <FilterChoices
                        label={group.label}
                        multiple={group.multiple}
                        any={group.multiple ? undefined : group.all?.label}
                        anyIcon={group.all?.icon}
                        value={value}
                        options={group.options}
                        onChange={(next) => {
                            onChange(next);
                            if (!group.multiple) setOpen(false);
                        }}
                    />
                    {group.multiple && value.length > 0 ? (
                        <div className="shrink-0 border-t border-secondary p-1.5">
                            <Button color="link-gray" size="sm" className="w-full" onClick={() => onChange([])}>
                                Clear {group.label.toLowerCase()}
                            </Button>
                        </div>
                    ) : null}
                </AriaDialog>
            </Dropdown.Popover>
        </AriaDialogTrigger>
    );
}
