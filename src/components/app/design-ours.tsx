"use client";

import { useState } from "react";
import { Download01, FilterLines, Grid01, Plus, SearchLg, SwitchVertical01 } from "@untitledui/icons";
import type { FolderChoice } from "@/app/(app)/dashboard/collections/actions";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import type { Card } from "@/lib/api-shapes";
import { AcquiredDatePicker } from "./acquired-date-picker";
import { AppEmptyState } from "./app-empty-state";
import { AuthEmailField, AuthShell } from "./auth-shell";
import { CardBack } from "./card-back";
import { CardImage } from "./card-image";
import { CardTile } from "./card-tile";
import { CopyCard } from "./copy-card";
import { Cell, Group, Panel, type SectionSpec } from "./design-section";
import { FilterChip, FilterChipRow } from "./filter-chip";
import { type FilterGroup, type FilterValues, FiltersSheet } from "./filters-sheet";
import { FlagIcon } from "./flag-icon";
import { FormError } from "./form-error";
import { LinkButton } from "./link-button";
import { RowButton } from "./row-button";
import { LIST_ROW, RowSearch } from "./row-search";
import { SearchTrigger } from "./search-trigger";
import { SetWash } from "./set-hero";
import { notify } from "./toast";

/** A picture the catalogue serves, so CardImage is drawn by the path it actually uses. */
const CHARIZARD = "https://assets.tcgdex.net/en/base/base1/4/high.png";
const CHARIZARD_LOW = "https://assets.tcgdex.net/en/base/base1/4/low.png";
const BASE_SET_LOGO = "https://assets.tcgdex.net/en/base/base1/logo.png";

const sets = [
    { value: "base1", label: "Base Set", hint: "1999" },
    { value: "swsh3", label: "Darkness Ablaze", hint: "2020" },
    { value: "sv4", label: "Paradox Rift", hint: "2023" },
];

/** Ours, because the kit has nothing that fits; each one says what it does instead. */
function AcquiredDatePickerSample() {
    const [date, setDate] = useState("2026-07-09");
    return <AcquiredDatePicker value={date} onChange={setDate} />;
}

/* A held row for the gallery's CopyCard: the Fomantis the sheet was measured on, Holo · Near Mint. */
const SAMPLE_COPY = {
    id: "sample-copy",
    name: "Fomantis",
    set: "Pitch Black",
    number: "085",
    language: "en",
    finish: "holo",
    foil_pattern: null,
    condition: "Near Mint",
    grade: null,
    collection_id: "kanto",
    quantity: 4,
    purchase_price: 2.5,
    acquired_at: "2026-07-09",
} as unknown as Card;

export const ourSections: SectionSpec[] = [
    {
        id: "acquired-date-picker",
        title: "AcquiredDatePicker",
        from: "components/app/acquired-date-picker",
        ours: true,
        note: "The kit's DatePicker with the app's two rules on it: the day is the YYYY-MM-DD string the API speaks, and the calendar ends at today, since a card you hold was got in the past. The day is handed on when Apply is pressed, so the copy card can save from it directly. On a phone the calendar is a sheet from the bottom instead of the kit's popover, which had nowhere to hang inside a form inside a sheet.",
        render: (
            <Panel>
                <Group title="States" cols="wide">
                    <Cell label="a day">
                        <AcquiredDatePickerSample />
                    </Cell>
                    <Cell label="none yet">
                        <AcquiredDatePicker value="" onChange={() => {}} />
                    </Cell>
                    <Cell label="isDisabled">
                        <AcquiredDatePicker value="2026-07-09" isDisabled onChange={() => {}} />
                    </Cell>
                </Group>
            </Panel>
        ),
    },
    {
        id: "app-empty-state",
        title: "AppEmptyState",
        from: "components/app/app-empty-state",
        ours: true,
        note: "The kit's EmptyState in its lg size, drawn without the kit module, because that module imports every file-type icon and puts 60 KB of SVG on every page that can be empty. Shown on the page rather than in a panel: R-UI-002 says an empty state is never wrapped in a bordered box, and a gallery is not an exception.",
        render: (
            <div className="flex flex-col gap-8">
                <AppEmptyState icon="search" title="Nothing by that name" description="No card in the catalogue matches what you typed. Try fewer words.">
                    <Button color="secondary" size="md">
                        Clear the search
                    </Button>
                </AppEmptyState>
                <AppEmptyState
                    icon="folder"
                    title="No binders yet"
                    description="A binder is a place you put cards: by hand, or by a rule that files them for you."
                >
                    <Button size="md" iconLeading={Plus}>
                        New binder
                    </Button>
                </AppEmptyState>
            </div>
        ),
    },
    {
        id: "auth-shell",
        title: "AuthShell",
        from: "components/app/auth-shell",
        ours: true,
        note: "The frame the four signed-out pages share: the wordmark, a heading, a line under it, then the form, then the one link to the other page. Ours because the kit's sign-in screens are page templates, not a component; the four pages were the same thirteen lines of markup four times. The window's own height and background come from the route's layout, so here it stands on a surface of its own.",
        render: (
            <div className="flex min-h-140 flex-col rounded-xl bg-primary ring-1 ring-secondary">
                <AuthShell
                    title="Sign in"
                    subtitle="Welcome back. Enter your details."
                    footer={{ question: "Don't have an account?", href: "#auth-shell", label: "Sign up" }}
                >
                    <div className="flex flex-col gap-6">
                        <AuthEmailField />
                        <Button size="lg">Sign in</Button>
                    </div>
                </AuthShell>
            </div>
        ),
    },
    {
        id: "card-back",
        title: "CardBack",
        from: "components/app/card-back",
        ours: true,
        note: "A card the catalogue knows and cannot show, face down. The official back from tcg.pokemon.com, shipped as a static file at a card's exact 63 × 88; decorative, because the caption under every tile names the card. CardImage draws it itself once both of its sources have failed.",
        render: (
            <Panel>
                <Group title="On its own, and where a picture will not load" cols="tight">
                    <Cell label="width={128}">
                        <div className="relative aspect-card w-32 overflow-hidden rounded-card">
                            <CardBack width={128} />
                        </div>
                    </Cell>
                    <Cell label="width={96}">
                        <div className="relative aspect-card w-24 overflow-hidden rounded-card">
                            <CardBack width={96} />
                        </div>
                    </Cell>
                    <Cell label="CardImage, src that will not load">
                        <div className="relative aspect-card w-24 overflow-hidden rounded-card">
                            <CardImage src="https://assets.tcgdex.net/en/base/base1/none/high.png" alt="" width={96} className="object-cover" />
                        </div>
                    </Cell>
                </Group>
            </Panel>
        ),
    },
    {
        id: "card-image",
        title: "CardImage",
        from: "components/app/card-image",
        ours: true,
        note: "A card picture through Vercel's image optimizer rather than straight from the catalogue, which is one server in France with no CDN. Its parent sets the box (aspect-card and rounded-card are the app's own utilities) and the component fills it.",
        render: (
            <Panel>
                <Group title="Sizes and ratios" cols="tight">
                    <Cell label="width={128}">
                        <div className="relative aspect-card w-32 overflow-hidden rounded-card">
                            <CardImage src={CHARIZARD} fallbackSrc={CHARIZARD_LOW} alt="Charizard, Base Set" width={128} className="object-cover" />
                        </div>
                    </Cell>
                    <Cell label="width={96}">
                        <div className="relative aspect-card w-24 overflow-hidden rounded-card">
                            <CardImage src={CHARIZARD} fallbackSrc={CHARIZARD_LOW} alt="Charizard, Base Set" width={96} className="object-cover" />
                        </div>
                    </Cell>
                    <Cell label='ratio="square"'>
                        <div className="relative aspect-square w-24 overflow-hidden rounded-lg">
                            <CardImage
                                src={CHARIZARD}
                                fallbackSrc={CHARIZARD_LOW}
                                alt="Charizard, Base Set"
                                width={96}
                                ratio="square"
                                className="object-cover"
                            />
                        </div>
                    </Cell>
                    <Cell label="src that will not load">
                        <div className="relative aspect-card w-24 overflow-hidden rounded-card bg-quaternary">
                            <CardImage src="https://assets.tcgdex.net/en/nothing/here.png" alt="" width={96} className="object-cover" />
                        </div>
                    </Cell>
                </Group>
            </Panel>
        ),
    },
    {
        id: "set-hero",
        title: "SetHero",
        from: "components/app/set-hero",
        ours: true,
        note: "The top of a set's page: the logo centred on a soft wash of its own two or three colours, read once from the file on the server. The wash (SetWash, shown here in a box) runs across the whole window on the page, behind the sidebar. Grey where no colour can be read; the name's first word where there is no logo. Decoration, the h1 under it says which set.",
        render: (
            <Panel>
                <Group title="Washes" hint="the colours are the logo's own" cols="wide">
                    <Cell label="Base Set's yellow and blue">
                        <div className="relative isolate flex h-40 items-center justify-center overflow-hidden rounded-lg bg-page">
                            <SetWash colors={["#f2bc2b", "#2a5db0"]} className="inset-0" />
                            <div className="relative h-24 w-56 drop-shadow-xl">
                                <CardImage src={BASE_SET_LOGO} alt="" width={224} ratio="square" className="object-contain" />
                            </div>
                        </div>
                    </Cell>
                    <Cell label="Three colours">
                        <div className="relative isolate h-40 overflow-hidden rounded-lg bg-page">
                            <SetWash colors={["#1b4182", "#7a3fa8", "#e0742a"]} className="inset-0" />
                        </div>
                    </Cell>
                    <Cell label="No colour read">
                        <div className="relative isolate h-40 overflow-hidden rounded-lg bg-page">
                            <SetWash colors={[]} className="inset-0" />
                        </div>
                    </Cell>
                </Group>
            </Panel>
        ),
    },
    {
        id: "card-tile",
        title: "CardTile",
        from: "components/app/card-tile",
        ours: true,
        note: "A card's picture with its words under it, as one thing you press. The kit has no clickable tile (its cards are containers, not controls), and this shape is drawn in the collection's grid, in a Pokédex slot and in the row of dearest cards on Home. One component, so the press, the focus ring and the radius cannot drift apart between them. Without onSelect it is the same tile with nothing to press, which is what a public Pokédex needs.",
        render: (
            <Panel>
                <Group title="States" hint="press them" cols="tight">
                    <Cell label="onSelect">
                        <div className="w-28">
                            <CardTile
                                onSelect={() => notify.done("Charizard, Base Set")}
                                picture={
                                    <div className="relative aspect-card w-full overflow-hidden rounded-card">
                                        <CardImage src={CHARIZARD} fallbackSrc={CHARIZARD_LOW} alt="" width={128} className="object-cover" />
                                    </div>
                                }
                                words={
                                    <div className="flex flex-col">
                                        <span className="truncate text-sm font-medium text-primary">Charizard</span>
                                        <span className="truncate text-xs text-tertiary">Base Set · #4</span>
                                    </div>
                                }
                            />
                        </div>
                    </Cell>
                    <Cell label="no onSelect">
                        <div className="w-28">
                            <CardTile
                                picture={
                                    <div className="flex aspect-card w-full items-center justify-center rounded-card bg-tertiary">
                                        <span className="text-sm font-medium text-quaternary tabular-nums">#004</span>
                                    </div>
                                }
                                words={
                                    <div className="flex flex-col">
                                        <span className="truncate text-sm font-medium text-tertiary">Charmander</span>
                                        <span className="truncate text-xs text-tertiary">#004 · Missing</span>
                                    </div>
                                }
                            />
                        </div>
                    </Cell>
                    <Cell label='className="gap-1.5 rounded-card"'>
                        <div className="w-28">
                            <CardTile
                                onSelect={() => notify.done("Charizard, Base Set")}
                                className="gap-1.5 rounded-card"
                                picture={
                                    <div className="relative aspect-card w-full overflow-hidden rounded-card bg-quaternary">
                                        <CardImage src={CHARIZARD} fallbackSrc={CHARIZARD_LOW} alt="" width={128} className="object-cover" />
                                    </div>
                                }
                                words={
                                    <>
                                        <span className="w-full truncate text-xs font-medium text-primary">Charizard</span>
                                        <span className="text-xs text-tertiary tabular-nums">€ 249,00</span>
                                    </>
                                }
                            />
                        </div>
                    </Cell>
                </Group>
            </Panel>
        ),
    },
    {
        id: "copy-card",
        title: "CopyCard",
        from: "components/app/copy-card",
        ours: true,
        note: "One kind of copy you hold of a card, as a card of its own in the sheet's Copies tab: how many of it there are and every field the add form asks, in the add form's order and shape. Each field saves as it changes, to every row behind the kind. The count and the removal are the sheet's, since taking one away may remove a row and the sheet owns the undo.",
        render: (
            <Panel>
                <Group title="States" cols="single">
                    <Cell label="four of a kind" span="full">
                        <div className="w-full max-w-md">
                            <CopyCard
                                group={{ key: "holo-nm", shown: SAMPLE_COPY, rows: [SAMPLE_COPY], quantity: 4 }}
                                folders={[{ id: "kanto", name: "Kanto", rule: null } satisfies FolderChoice]}
                                busy={false}
                                onMore={() => {}}
                                onFewer={() => {}}
                                onRemove={() => {}}
                                onSaved={() => {}}
                                refreshFolders={async () => []}
                            />
                        </div>
                    </Cell>
                    <Cell label="graded, arriving" span="full">
                        <div className="w-full max-w-md">
                            <CopyCard
                                group={{
                                    key: "psa9",
                                    shown: { ...SAMPLE_COPY, id: "sample-copy-2", language: "ja", finish: "reverse-holo", condition: null, grade: "PSA 9" },
                                    rows: [],
                                    quantity: 1,
                                }}
                                folders={[]}
                                busy={false}
                                arrive
                                onMore={() => {}}
                                onFewer={() => {}}
                                onRemove={() => {}}
                                onSaved={() => {}}
                                refreshFolders={async () => []}
                            />
                        </div>
                    </Cell>
                </Group>
            </Panel>
        ),
    },
    {
        id: "filter-chip",
        title: "FilterChip",
        from: "components/app/filter-chip",
        ours: true,
        note: "One filter as a chip: its name while unset, its choice once set, filled so a narrowed list says why. A tap opens the choices as a sheet from the bottom on a phone and as a menu under the chip from sm. Ours because the kit's chips do not open anything.",
        render: <FilterChipSample />,
    },
    {
        id: "filters-sheet",
        title: "FiltersSheet",
        from: "components/app/filters-sheet",
        ours: true,
        note: "A list's filters behind one button: a sheet from the bottom on a phone, a panel from the right from sm. A short filter is the kit's Tags to tap (several, or one with its state as a dot), a long one a row that opens its own list with a field. The choices are a draft until the pinned button, which says how many it will show. With `inline`, from lg each filter is a menu in the row instead. Ours because the kit has the parts and no filter panel.",
        render: <FiltersSheetSample />,
    },
    {
        id: "flag-icon",
        title: "FlagIcon",
        from: "components/app/flag-icon",
        ours: true,
        note: "A language as its flag, from flag-icons' SVGs: the ten the API knows, imported one by one so only those ten files ship. The kit's BadgeWithFlag fetches its flags from untitledui.com at runtime, which this app does not do.",
        render: (
            <Panel>
                <Group title="Sizes" cols="tight">
                    <Cell label='size="sm"'>
                        <FlagIcon language="en" size="sm" />
                    </Cell>
                    <Cell label='size="md"'>
                        <FlagIcon language="en" size="md" />
                    </Cell>
                </Group>
                <Group title="Languages" cols="tight">
                    {["en", "ja", "de", "fr", "it", "es", "pt", "nl", "ko", "zh-tw", "zh-cn"].map((language) => (
                        <Cell key={language} label={language}>
                            <FlagIcon language={language} size="md" />
                        </Cell>
                    ))}
                </Group>
            </Panel>
        ),
    },
    {
        id: "form-error",
        title: "FormError",
        from: "components/app/form-error",
        ours: true,
        note: "Why a save or a sign-in did not go through, under the fields and above the button. Ours because the kit's HintText belongs to a field: a form can fail with every field in it valid, and the sentence then has nowhere to hang. It announces itself as an alert, and draws nothing when there is no error.",
        render: (
            <Panel>
                <Group title="States" cols="wide">
                    <Cell label="error" span="full">
                        <FormError error="That email and password do not match an account." />
                    </Cell>
                    <Cell label="arrive" span="full">
                        <FormError error="The catalogue is not answering. Your collection is unchanged." arrive />
                    </Cell>
                    <Cell label="error={null}" span="full">
                        <FormError error={null} />
                    </Cell>
                </Group>
            </Panel>
        ),
    },
    {
        id: "link-button",
        title: "LinkButton",
        from: "components/app/link-button",
        ours: true,
        note: "The kit's Button as a plain next/link, for the pages that prerender. The kit's Button is a react-aria Link, and with it every static page shipped about 80 KB of react-aria to draw two buttons and a footer. Same classes, same look, fewer colours and sizes.",
        render: (
            <Panel>
                <Group title="Colours">
                    <Cell label="primary">
                        <LinkButton href="#link-button">Start collecting</LinkButton>
                    </Cell>
                    <Cell label="secondary">
                        <LinkButton href="#link-button" color="secondary">
                            Start collecting
                        </LinkButton>
                    </Cell>
                    <Cell label="tertiary">
                        <LinkButton href="#link-button" color="tertiary">
                            Start collecting
                        </LinkButton>
                    </Cell>
                    <Cell label="link-gray">
                        <LinkButton href="#link-button" color="link-gray">
                            Read the terms
                        </LinkButton>
                    </Cell>
                </Group>
                <Group title="Sizes">
                    <Cell label="sm">
                        <LinkButton href="#link-button" size="sm">
                            Start collecting
                        </LinkButton>
                    </Cell>
                    <Cell label="md">
                        <LinkButton href="#link-button" size="md">
                            Start collecting
                        </LinkButton>
                    </Cell>
                    <Cell label="xl">
                        <LinkButton href="#link-button" size="xl">
                            Start collecting
                        </LinkButton>
                    </Cell>
                </Group>
            </Panel>
        ),
    },
    {
        id: "row-button",
        title: "RowButton",
        from: "components/app/row-button",
        ours: true,
        note: "Filters, Sort and View above a list. From sm it is icon, word and, for a menu, a chevron; on a phone the word is read out only and the button is a 36 px circle, as the search beside it is (RowSearch). Narrow the window to see it change.",
        render: (
            <Panel>
                <Group title="Variants" cols="tight">
                    <Cell label="icon + label">
                        <RowButton icon={FilterLines} label="Filters" />
                    </Cell>
                    <Cell label="menu">
                        <RowButton icon={Grid01} label="View" menu />
                    </Cell>
                    <Cell label="with a badge">
                        <RowButton icon={FilterLines} label="Filters" menu>
                            <Badge type="pill-color" size="sm" color="gray">
                                2
                            </Badge>
                        </RowButton>
                    </Cell>
                    <Cell label="isDisabled">
                        <RowButton icon={Download01} label="Export" isDisabled />
                    </Cell>
                </Group>
            </Panel>
        ),
    },
    {
        id: "row-search",
        title: "RowSearch",
        from: "components/app/row-search",
        ours: true,
        note: "The search in a list row, and LIST_ROW, the row itself. From sm a field of 208 px at most; on a phone a round search button that opens the field across the row, hides the row's other buttons and puts them back with the close button beside it. A field with a term stays open. Narrow the window to a phone to try it.",
        render: (
            <Panel>
                <Group title="In a row" cols="tight">
                    <Cell label="search, Filters, Sort, View">
                        <RowSearchDemo />
                    </Cell>
                </Group>
            </Panel>
        ),
    },
    {
        id: "search-trigger",
        title: "SearchTrigger",
        from: "components/app/search-trigger",
        ours: true,
        note: "A button dressed as the search field, for the two places that open a search instead of taking one: the palette's trigger in the desktop sidebar and the bar at the top of Home on a phone. The kit's Input is a field, and a field that answers a tap by opening a dialog is a lie to anything that reads it. The md size is that Input at its lg size, which is why it carries the placeholder's grey.",
        render: (
            <Panel>
                <Group title="Sizes" cols="wide">
                    <Cell label='size="sm", the sidebar' span="full">
                        <div className="w-full max-w-72">
                            <SearchTrigger label="Search" onPress={() => notify.done("The palette would open")} />
                        </div>
                    </Cell>
                    <Cell label='size="md", the phone bar' span="full">
                        <div className="w-full max-w-72">
                            <SearchTrigger size="md" label="Search a card or a set" onPress={() => notify.done("The sheet would open")} />
                        </div>
                    </Cell>
                </Group>
            </Panel>
        ),
    },
    {
        id: "toast",
        title: "Toast",
        from: "components/app/toast",
        ours: true,
        note: "Ours, in the parts of the kit's application/notifications (FeaturedIcon, Button, CloseButton on Sonner) rather than that component, which puts a Dismiss text button beside the close cross and its actions under the text. Three tones with their own icon: a tick, a bin, an alert. The undo sits beside the sentence, and the title is medium where the kit has semibold: the brand colour is the same grey as the title, so weight is what marks the undo as the button.",
        render: (
            <Panel>
                <Group title="Live" cols="wide">
                    <Cell label="notify.done">
                        <Button size="md" color="secondary" onClick={() => notify.done("Filed in Kanto", { description: "Fomantis · Pitch Black #085" })}>
                            Show a success
                        </Button>
                    </Cell>
                    <Cell label="notify.failed">
                        <Button
                            size="md"
                            color="secondary"
                            onClick={() => notify.failed("That card was not added to your collection", { description: "The catalogue is not answering." })}
                        >
                            Show a failure
                        </Button>
                    </Cell>
                    <Cell label="notify.removed with undo">
                        <Button
                            size="md"
                            color="secondary"
                            onClick={() =>
                                notify.removed("Removed from your collection", {
                                    description: "Fomantis · Pitch Black #085",
                                    undo: { label: "Put back", onUndo: () => notify.done("It is back") },
                                })
                            }
                        >
                            Show a removal
                        </Button>
                    </Cell>
                </Group>
            </Panel>
        ),
    },
];

/** The sheet holds its choices, so it is a component; the count is worked out from a made-up list of 120. */
function FiltersSheetSample() {
    const [values, setValues] = useState<FilterValues>({ rarity: ["holo"] });
    const groups: FilterGroup[] = [
        {
            id: "set",
            label: "Set",
            multiple: true,
            options: [...sets, ...sets.map((o) => ({ ...o, value: `${o.value}-2`, label: `${o.label} 2` }))].slice(0, 14),
        },
        {
            id: "rarity",
            label: "Rarity",
            multiple: true,
            options: [
                { value: "common", label: "Common" },
                { value: "holo", label: "Rare Holo" },
                { value: "ultra", label: "Ultra Rare" },
            ],
        },
        {
            id: "language",
            label: "Language",
            all: { value: "en", label: "English", icon: <FlagIcon language="en" labelled /> },
            options: [
                { value: "ja", label: "Japanese", icon: <FlagIcon language="ja" labelled /> },
                { value: "ko", label: "Korean", icon: <FlagIcon language="ko" labelled /> },
            ],
        },
    ];

    return (
        <Panel>
            <Group title="Behind the button" hint="a phone's sheet, a panel from sm" cols="single">
                <Cell label="FiltersSheet" span="full">
                    <FiltersSheet
                        groups={groups}
                        values={values}
                        onApply={setValues}
                        count={(d) => 120 >> Object.values(d).flat().length}
                        noun={["card", "cards"]}
                    />
                </Cell>
            </Group>
        </Panel>
    );
}

/** The chip row holds a choice, so it is a component rather than an element in the list above. */
function FilterChipSample() {
    const [set, setSet] = useState<string | undefined>(undefined);
    const [rarity, setRarity] = useState<string | undefined>("holo");
    const clear = () => {
        setSet(undefined);
        setRarity(undefined);
    };

    return (
        <Panel>
            <Group title="A row of them" hint="one unset, one set" cols="single">
                <Cell label="FilterChipRow with onClear" span="full">
                    <FilterChipRow onClear={set || rarity ? clear : undefined}>
                        <FilterChip label="Set" value={set} options={sets} onChange={setSet} />
                        <FilterChip
                            label="Rarity"
                            value={rarity}
                            options={[
                                { value: "common", label: "Common" },
                                { value: "holo", label: "Rare Holo" },
                                { value: "ultra", label: "Ultra Rare" },
                            ]}
                            onChange={setRarity}
                        />
                    </FilterChipRow>
                </Cell>
            </Group>
        </Panel>
    );
}

/** A list row with a search that works, so the phone's open and close can be tried here. */
function RowSearchDemo() {
    const [q, setQ] = useState("");
    return (
        <div className={`${LIST_ROW} w-full`}>
            <RowSearch label="Search" filled={q !== ""} onClear={() => setQ("")}>
                <Input aria-label="Search" icon={SearchLg} placeholder="Search" size="sm" value={q} onChange={setQ} wrapperClassName="rounded-full" />
            </RowSearch>
            <RowButton icon={FilterLines} label="Filters" />
            <RowButton icon={SwitchVertical01} label="Sort" menu />
            <RowButton icon={Grid01} label="View" menu className="ml-auto" />
        </div>
    );
}
