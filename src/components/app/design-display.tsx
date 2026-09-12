"use client";

import { useState } from "react";
import { AlertCircle, BookOpen01, Check, Folder, Heart, Home01, Star01, Trash01, User01, Zap } from "@untitledui/icons";
import type { SortDescriptor } from "react-aria-components";
import { NavItemBase } from "@/components/application/app-navigation/base-components/nav-item";
import { LoadingIndicator } from "@/components/application/loading-indicator/loading-indicator";
import { Progress } from "@/components/application/progress-steps/progress-steps";
import { Table, TableCard, TableRowActionsDropdown } from "@/components/application/table/table";
import { Tab, TabList, TabPanel, Tabs } from "@/components/application/tabs/tabs";
import { Avatar } from "@/components/base/avatar/avatar";
import { AvatarLabelGroup } from "@/components/base/avatar/avatar-label-group";
import type { BadgeColors } from "@/components/base/badges/badge-types";
import { Badge, BadgeIcon, BadgeWithButton, BadgeWithDot, BadgeWithIcon } from "@/components/base/badges/badges";
import { ProgressBar, ProgressBarBase } from "@/components/base/progress-indicators/progress-indicators";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icon";
import { Cell, Group, Panel, type SectionSpec } from "./design-section";

const badgeColors: BadgeColors[] = ["gray", "brand", "error", "warning", "success", "slate", "sky", "blue", "indigo", "purple", "pink", "orange"];
const featuredColors = ["brand", "gray", "success", "warning", "error"] as const;

const rows = [
    { id: "1", name: "Charizard", set: "Base Set", rarity: "Rare Holo", price: "€ 412.00" },
    { id: "2", name: "Fomantis", set: "Pitch Black", rarity: "Common", price: "€ 0.28" },
    { id: "3", name: "Mimikyu ex", set: "Paldean Fates", rarity: "Double Rare", price: "€ 14.90" },
];

/** Everything you read. */
export const displaySections: SectionSpec[] = [
    {
        id: "badge",
        title: "Badge",
        from: "components/base/badges/badges",
        note: "Twelve colours across three shapes, plus five variants that put something beside the word. The modern shape has one colour by design: it is the neutral outlined chip, not a colour scale.",
        render: (
            <Panel>
                <Group title='type="pill-color"' hint="all twelve colours" cols="tight">
                    {badgeColors.map((color) => (
                        <Cell key={color} label={color}>
                            <Badge type="pill-color" color={color}>
                                Label
                            </Badge>
                        </Cell>
                    ))}
                </Group>
                <Group title='type="color"' hint="the same colours, square corners" cols="tight">
                    {badgeColors.map((color) => (
                        <Cell key={color} label={color}>
                            <Badge type="color" color={color}>
                                Label
                            </Badge>
                        </Cell>
                    ))}
                </Group>
                <Group title="Sizes" cols="tight">
                    <Cell label="pill-color sm">
                        <Badge type="pill-color" size="sm" color="success">
                            Label
                        </Badge>
                    </Cell>
                    <Cell label="pill-color md">
                        <Badge type="pill-color" size="md" color="success">
                            Label
                        </Badge>
                    </Cell>
                    <Cell label="pill-color lg">
                        <Badge type="pill-color" size="lg" color="success">
                            Label
                        </Badge>
                    </Cell>
                    <Cell label="modern sm">
                        <Badge type="modern" size="sm" color="gray">
                            Label
                        </Badge>
                    </Cell>
                    <Cell label="modern md">
                        <Badge type="modern" size="md" color="gray">
                            Label
                        </Badge>
                    </Cell>
                    <Cell label="modern lg">
                        <Badge type="modern" size="lg" color="gray">
                            Label
                        </Badge>
                    </Cell>
                </Group>
                <Group title="With something beside the word" cols="tight">
                    <Cell label="BadgeWithDot">
                        <BadgeWithDot color="success">Owned</BadgeWithDot>
                    </Cell>
                    <Cell label="BadgeWithIcon iconLeading">
                        <BadgeWithIcon color="brand" iconLeading={Star01}>
                            Favorite
                        </BadgeWithIcon>
                    </Cell>
                    <Cell label="BadgeWithIcon iconTrailing">
                        <BadgeWithIcon color="warning" iconTrailing={AlertCircle}>
                            Check
                        </BadgeWithIcon>
                    </Cell>
                    <Cell label="BadgeWithButton">
                        <BadgeWithButton color="gray" buttonLabel="Remove this filter">
                            Rare Holo
                        </BadgeWithButton>
                    </Cell>
                    <Cell label="BadgeIcon">
                        <BadgeIcon color="success" icon={Check} />
                    </Cell>
                </Group>
            </Panel>
        ),
    },
    {
        id: "avatar",
        title: "Avatar",
        from: "components/base/avatar/avatar",
        note: "Shown with initials and placeholders rather than photographs: the only pictures this app is allowed to fetch are card scans and avatars from our own storage, and a design system page should not depend on somebody's face being online. Changed from the kit: the picture is a next/image, so an avatar out of Supabase storage is resized and cached.",
        render: (
            <Panel>
                <Group title="Sizes" hint="with initials" cols="tight">
                    <Cell label="xs">
                        <Avatar size="xs" initials="AK" alt="Ash Ketchum" />
                    </Cell>
                    <Cell label="sm">
                        <Avatar size="sm" initials="AK" alt="Ash Ketchum" />
                    </Cell>
                    <Cell label="md">
                        <Avatar size="md" initials="AK" alt="Ash Ketchum" />
                    </Cell>
                    <Cell label="lg">
                        <Avatar size="lg" initials="AK" alt="Ash Ketchum" />
                    </Cell>
                    <Cell label="xl">
                        <Avatar size="xl" initials="AK" alt="Ash Ketchum" />
                    </Cell>
                    <Cell label="2xl">
                        <Avatar size="2xl" initials="AK" alt="Ash Ketchum" />
                    </Cell>
                </Group>
                <Group title="Contents and badges" cols="tight">
                    <Cell label="placeholder icon">
                        <Avatar size="lg" placeholderIcon={User01} />
                    </Cell>
                    <Cell label="border">
                        <Avatar size="lg" initials="AK" border />
                    </Cell>
                    <Cell label="rounded={false}">
                        <Avatar size="lg" initials="AK" rounded={false} />
                    </Cell>
                    <Cell label='status="online"'>
                        <Avatar size="lg" initials="AK" status="online" />
                    </Cell>
                    <Cell label='status="offline"'>
                        <Avatar size="lg" initials="AK" status="offline" />
                    </Cell>
                    <Cell label="verified">
                        <Avatar size="lg" initials="AK" verified />
                    </Cell>
                    <Cell label="count">
                        <Avatar size="lg" initials="AK" count={5} />
                    </Cell>
                </Group>
                <Group title="AvatarLabelGroup" hint="components/base/avatar/avatar-label-group" cols="wide">
                    <Cell label='size="sm"'>
                        <AvatarLabelGroup size="sm" initials="AK" title="Ash Ketchum" subtitle="ash@pallet.town" />
                    </Cell>
                    <Cell label='size="md"'>
                        <AvatarLabelGroup size="md" initials="AK" title="Ash Ketchum" subtitle="ash@pallet.town" />
                    </Cell>
                    <Cell label='size="lg"'>
                        <AvatarLabelGroup size="lg" initials="AK" title="Ash Ketchum" subtitle="ash@pallet.town" />
                    </Cell>
                </Group>
            </Panel>
        ),
    },
    {
        id: "featured-icon",
        title: "FeaturedIcon",
        from: "components/foundations/featured-icon",
        note: "The icon at the top of an empty state or a toast. Six themes; five of them take all five colours, and modern-neue ships gray alone.",
        render: (
            <Panel>
                <Group title='theme="light"' cols="tight">
                    {featuredColors.map((color) => (
                        <Cell key={color} label={color}>
                            <FeaturedIcon icon={Star01} color={color} theme="light" size="md" />
                        </Cell>
                    ))}
                </Group>
                <Group title='theme="gradient"' cols="tight">
                    {featuredColors.map((color) => (
                        <Cell key={color} label={color}>
                            <FeaturedIcon icon={Star01} color={color} theme="gradient" size="md" />
                        </Cell>
                    ))}
                </Group>
                <Group title='theme="dark"' cols="tight">
                    {featuredColors.map((color) => (
                        <Cell key={color} label={color}>
                            <FeaturedIcon icon={Star01} color={color} theme="dark" size="md" />
                        </Cell>
                    ))}
                </Group>
                <Group title='theme="modern"' cols="tight">
                    {featuredColors.map((color) => (
                        <Cell key={color} label={color}>
                            <FeaturedIcon icon={Star01} color={color} theme="modern" size="md" />
                        </Cell>
                    ))}
                </Group>
                <Group title='theme="outline"' cols="tight">
                    {featuredColors.map((color) => (
                        <Cell key={color} label={color}>
                            <FeaturedIcon icon={Star01} color={color} theme="outline" size="md" />
                        </Cell>
                    ))}
                </Group>
                <Group title="Sizes" hint='theme="modern", the one the empty states use' cols="tight">
                    <Cell label="sm">
                        <FeaturedIcon icon={Folder} color="gray" theme="modern" size="sm" />
                    </Cell>
                    <Cell label="md">
                        <FeaturedIcon icon={Folder} color="gray" theme="modern" size="md" />
                    </Cell>
                    <Cell label="lg">
                        <FeaturedIcon icon={Folder} color="gray" theme="modern" size="lg" />
                    </Cell>
                    <Cell label="xl">
                        <FeaturedIcon icon={Folder} color="gray" theme="modern" size="xl" />
                    </Cell>
                    <Cell label="modern-neue">
                        <FeaturedIcon icon={Folder} color="gray" theme="modern-neue" size="md" />
                    </Cell>
                </Group>
            </Panel>
        ),
    },
    {
        id: "loading-indicator",
        title: "LoadingIndicator",
        from: "components/application/loading-indicator",
        note: "Waiting with no known shape to draw an outline of; where the page knows what is coming, the skeletons in components/app/skeletons draw that instead, and a button that is working shows its own. Changed from the kit: it is a status region, so a screen reader hears the label or “Loading…”; the dot-circle’s gradient ids are unique per instance; reduced motion slows the spin rather than freezing it.",
        render: (
            <Panel>
                <Group title="Types" hint='size="md", with a label' cols="tight">
                    <Cell label='type="line-simple"'>
                        <LoadingIndicator type="line-simple" size="md" label="Loading…" />
                    </Cell>
                    <Cell label='type="line-spinner"'>
                        <LoadingIndicator type="line-spinner" size="md" label="Loading…" />
                    </Cell>
                    <Cell label='type="dot-circle"'>
                        <LoadingIndicator type="dot-circle" size="md" label="Loading…" />
                    </Cell>
                </Group>
                <Group title="Sizes" hint="without a label; the screen reader still hears it" cols="tight">
                    <Cell label="sm">
                        <LoadingIndicator size="sm" />
                    </Cell>
                    <Cell label="md">
                        <LoadingIndicator size="md" />
                    </Cell>
                    <Cell label="lg">
                        <LoadingIndicator size="lg" />
                    </Cell>
                    <Cell label="xl">
                        <LoadingIndicator size="xl" />
                    </Cell>
                </Group>
            </Panel>
        ),
    },
    {
        id: "progress-steps",
        title: "Progress steps",
        from: "components/application/progress-steps",
        note: "Where you are in a short flow with a fixed order, as the import dialog's Upload, Review, Done. Trimmed from the kit to the horizontal numbered row; the description under a step is optional, and is not drawn when there is none.",
        render: (
            <Panel>
                <Group title="Three steps" hint="the second one current" cols="single">
                    <Cell label="titles only">
                        <Progress.IconsWithText
                            size="sm"
                            items={[
                                { title: "Upload", status: "complete" },
                                { title: "Review", status: "current" },
                                { title: "Done", status: "incomplete" },
                            ]}
                        />
                    </Cell>
                    <Cell label='size="md", with descriptions'>
                        <Progress.IconsWithText
                            size="md"
                            items={[
                                { title: "Upload", description: "Choose a CSV", status: "complete" },
                                { title: "Review", description: "Check what it adds", status: "current" },
                                { title: "Done", description: "See the result", status: "incomplete" },
                            ]}
                        />
                    </Cell>
                </Group>
            </Panel>
        ),
    },
    {
        id: "progress",
        title: "ProgressBar",
        from: "components/base/progress-indicators",
        note: "How far through a set you are. Changed from the kit: ProgressBarBase takes an aria-label, for a bar with no words beside it.",
        render: (
            <Panel>
                <Group title="Label positions" cols="single">
                    <Cell label="ProgressBarBase (no label)" span="full">
                        <ProgressBarBase value={64} aria-label="Kanto, 64 percent complete" />
                    </Cell>
                    <Cell label='labelPosition="right"' span="full">
                        <div className="w-full">
                            <ProgressBar value={64} labelPosition="right" />
                        </div>
                    </Cell>
                    <Cell label='labelPosition="bottom"' span="full">
                        <div className="w-full">
                            <ProgressBar value={64} labelPosition="bottom" />
                        </div>
                    </Cell>
                    <Cell label='labelPosition="top-floating"' span="full">
                        <div className="w-full pt-12">
                            <ProgressBar value={64} labelPosition="top-floating" />
                        </div>
                    </Cell>
                    <Cell label='labelPosition="bottom-floating"' span="full">
                        <div className="w-full pb-12">
                            <ProgressBar value={64} labelPosition="bottom-floating" />
                        </div>
                    </Cell>
                    <Cell label="valueFormatter + min/max" span="full">
                        <div className="w-full">
                            <ProgressBar value={102} min={0} max={165} labelPosition="right" valueFormatter={(value) => `${value} of 165`} />
                        </div>
                    </Cell>
                </Group>
            </Panel>
        ),
    },
    {
        id: "tabs",
        title: "Tabs",
        from: "components/application/tabs",
        note: "Five shapes horizontally, and a line variant for a vertical list. The card detail sheet uses the underline one.",
        render: (
            <Panel>
                <Group title="Types" cols="wide">
                    <Cell label='type="button-brand"' span="full">
                        <TabsSample type="button-brand" />
                    </Cell>
                    <Cell label='type="button-gray"' span="full">
                        <TabsSample type="button-gray" />
                    </Cell>
                    <Cell label='type="button-border"' span="full">
                        <TabsSample type="button-border" />
                    </Cell>
                    <Cell label='type="button-minimal"' span="full">
                        <TabsSample type="button-minimal" />
                    </Cell>
                    <Cell label='type="underline"' span="full">
                        <TabsSample type="underline" />
                    </Cell>
                </Group>
                <Group title="Sizes, badges and icons" cols="wide">
                    <Cell label='size="sm"' span="full">
                        <TabsSample type="underline" size="sm" />
                    </Cell>
                    <Cell label='size="md"' span="full">
                        <TabsSample type="underline" size="md" />
                    </Cell>
                    <Cell label="badge and icon" span="full">
                        <Tabs defaultSelectedKey="copies">
                            <TabList aria-label="Card, with badges" type="underline" size="sm">
                                <Tab id="copies" label="Your copies" badge={3} icon={Star01} />
                                <Tab id="details" label="Details" icon={BookOpen01} />
                                <Tab id="price" label="Price" icon={Zap} />
                            </TabList>
                        </Tabs>
                    </Cell>
                    <Cell label='orientation="vertical" type="line"' span="full">
                        <Tabs orientation="vertical" defaultSelectedKey="one">
                            <TabList aria-label="Vertical" type="line" size="sm">
                                <Tab id="one" label="Collection" />
                                <Tab id="two" label="Wishlist" />
                                <Tab id="three" label="Pokédex" />
                            </TabList>
                        </Tabs>
                    </Cell>
                    <Cell label="with a panel" span="full">
                        <Tabs defaultSelectedKey="a" className="gap-4">
                            <TabList aria-label="With a panel" type="button-border" size="sm">
                                <Tab id="a" label="Owned" />
                                <Tab id="b" label="Wishlist" />
                            </TabList>
                            <TabPanel id="a" className="text-sm text-tertiary">
                                The cards you hold.
                            </TabPanel>
                            <TabPanel id="b" className="text-sm text-tertiary">
                                The cards you want.
                            </TabPanel>
                        </Tabs>
                    </Cell>
                </Group>
            </Panel>
        ),
    },
    {
        id: "table",
        title: "Table",
        from: "components/application/table",
        note: "Paints its own card, so it is shown on the page rather than inside a panel. Sorting, selection, a tooltip on a column and the row-actions menu are the kit’s; the app’s own card list is built on it. Click a sortable header to sort.",
        render: <TableSample />,
    },
    {
        id: "nav-item",
        title: "NavItemBase",
        from: "components/application/app-navigation/base-components/nav-item",
        note: "One row of the sidebar. The rest of the app-navigation module (the sidebar itself, the mobile header, the account card) needs a live account and a current URL, so only the row that renders on its own is shown here; the real one is the sidebar to the left.",
        render: (
            <Panel>
                <Group title="States" cols="wide">
                    <Cell label='type="link"' span="full">
                        <div className="w-full max-w-64">
                            <NavItemBase type="link" href="#nav-item" icon={Home01}>
                                Home
                            </NavItemBase>
                        </div>
                    </Cell>
                    <Cell label="current" span="full">
                        <div className="w-full max-w-64">
                            <NavItemBase type="link" href="#nav-item" icon={Folder} current>
                                Binders
                            </NavItemBase>
                        </div>
                    </Cell>
                    <Cell label="badge" span="full">
                        <div className="w-full max-w-64">
                            <NavItemBase type="link" href="#nav-item" icon={Heart} badge={12}>
                                Wishlist
                            </NavItemBase>
                        </div>
                    </Cell>
                    <Cell label='type="collapsible-child"' span="full">
                        <div className="w-full max-w-64">
                            <NavItemBase type="collapsible-child" href="#nav-item" icon={Trash01}>
                                Deleted
                            </NavItemBase>
                        </div>
                    </Cell>
                </Group>
            </Panel>
        ),
    },
];

function TableSample() {
    // A real sortDescriptor, not a column that only looks sortable: react-aria writes
    // aria-sort="none" on the server and nothing on the client for an uncontrolled sortable
    // column, which is a hydration mismatch in the console on every load of this page.
    const [sort, setSort] = useState<SortDescriptor>({ column: "name", direction: "ascending" });
    const sorted = [...rows].sort((a, b) => {
        const key = sort.column as keyof (typeof rows)[number];
        const order = String(a[key]).localeCompare(String(b[key]));
        return sort.direction === "descending" ? -order : order;
    });

    return (
        <TableCard.Root size="sm">
            <TableCard.Header title="Cards" badge="3 cards" description="A fixed list, so the sample never depends on the API." />
            <Table aria-label="Cards" size="sm" selectionMode="multiple" defaultSelectedKeys={["2"]} sortDescriptor={sort} onSortChange={setSort}>
                <Table.Header>
                    <Table.Head id="name" label="Card" isRowHeader allowsSorting />
                    <Table.Head id="set" label="Set" allowsSorting />
                    <Table.Head id="rarity" label="Rarity" />
                    <Table.Head id="price" label="Price" tooltip="Near Mint, in euros." />
                    <Table.Head id="actions">
                        <span className="sr-only">Actions</span>
                    </Table.Head>
                </Table.Header>
                <Table.Body items={sorted}>
                    {(row) => (
                        <Table.Row id={row.id}>
                            <Table.Cell className="font-medium text-primary">{row.name}</Table.Cell>
                            <Table.Cell>{row.set}</Table.Cell>
                            <Table.Cell>
                                <Badge type="modern" size="sm" color="gray">
                                    {row.rarity}
                                </Badge>
                            </Table.Cell>
                            <Table.Cell className="tabular-nums">{row.price}</Table.Cell>
                            <Table.Cell>
                                <TableRowActionsDropdown />
                            </Table.Cell>
                        </Table.Row>
                    )}
                </Table.Body>
            </Table>
        </TableCard.Root>
    );
}

function TabsSample({ type, size = "sm" }: { type: "button-brand" | "button-gray" | "button-border" | "button-minimal" | "underline"; size?: "sm" | "md" }) {
    return (
        <Tabs defaultSelectedKey="owned">
            <TabList aria-label={`Tabs, ${type}, ${size}`} type={type} size={size}>
                <Tab id="owned" label="Owned" />
                <Tab id="wishlist" label="Wishlist" />
                <Tab id="all" label="All cards" />
            </TabList>
        </Tabs>
    );
}
