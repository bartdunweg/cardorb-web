"use client";

import { useState } from "react";
import { Download01, FilterLines, Grid01, Plus } from "@untitledui/icons";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { AppEmptyState } from "./app-empty-state";
import { CardImage } from "./card-image";
import { Cell, Group, Panel, type SectionSpec } from "./design-section";
import { FilterChip, FilterChipRow } from "./filter-chip";
import { FlagIcon } from "./flag-icon";
import { LinkButton } from "./link-button";
import { RowButton } from "./row-button";
import { notify } from "./toast";

/** A picture the catalogue serves, so CardImage is drawn by the path it actually uses. */
const CHARIZARD = "https://assets.tcgdex.net/en/base/base1/4/high.png";
const CHARIZARD_LOW = "https://assets.tcgdex.net/en/base/base1/4/low.png";

const sets = [
    { value: "base1", label: "Base Set", hint: "1999" },
    { value: "swsh3", label: "Darkness Ablaze", hint: "2020" },
    { value: "sv4", label: "Paradox Rift", hint: "2023" },
];

/** Ours, because the kit has nothing that fits — each one says what it does instead. */
export const ourSections: SectionSpec[] = [
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
                    description="A binder is a place you put cards — by hand, or by a rule that files them for you."
                >
                    <Button size="md" iconLeading={Plus}>
                        New binder
                    </Button>
                </AppEmptyState>
            </div>
        ),
    },
    {
        id: "card-image",
        title: "CardImage",
        from: "components/app/card-image",
        ours: true,
        note: "A card picture through Vercel's image optimizer rather than straight from the catalogue, which is one server in France with no CDN. Its parent sets the box — aspect-card and rounded-card are the app's own utilities — and the component fills it.",
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
        id: "filter-chip",
        title: "FilterChip",
        from: "components/app/filter-chip",
        ours: true,
        note: "One filter as a chip: its name while unset, its choice once set, filled so a narrowed list says why. A tap opens the choices as a sheet from the bottom on a phone and as a menu under the chip from sm. Ours because the kit's chips do not open anything.",
        render: <FilterChipSample />,
    },
    {
        id: "flag-icon",
        title: "FlagIcon",
        from: "components/app/flag-icon",
        ours: true,
        note: "A language as its flag, from flag-icons' SVGs — the ten the API knows, imported one by one so only those ten files ship. The kit's BadgeWithFlag fetches its flags from untitledui.com at runtime, which this app does not do.",
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
        note: "Filters, Sort and View above a list. From sm it is icon, word and — for a menu — a chevron; on a phone the word is read out only and the button is a circle the height of the search pill beside it. Narrow the window to see it change.",
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
        id: "toast",
        title: "Toast",
        from: "components/app/toast",
        ours: true,
        note: "Ours, because Untitled UI ships no snackbar — the nearest thing in the catalogue is application/alerts, which puts a Dismiss text button beside the close cross. The box is made of that alert's parts: FeaturedIcon, Button, CloseButton.",
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
                    <Cell label="notify.done with undo">
                        <Button
                            size="md"
                            color="secondary"
                            onClick={() =>
                                notify.done("Removed from your collection", {
                                    description: "Fomantis · Pitch Black #085",
                                    undo: { onUndo: () => notify.done("Put back") },
                                })
                            }
                        >
                            Show an undo
                        </Button>
                    </Cell>
                </Group>
            </Panel>
        ),
    },
];

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
