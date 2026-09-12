"use client";

import { ArrowRight, Copy01, DotsHorizontal, Download01, Edit01, Grid01, Heart, Rows01, Settings01, Share04, Star01, Trash01 } from "@untitledui/icons";
import { ButtonGroup, ButtonGroupItem } from "@/components/base/button-group/button-group";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { CloseButton } from "@/components/base/buttons/close-button";
import { Dropdown } from "@/components/base/dropdown/dropdown";
import { Tooltip } from "@/components/base/tooltip/tooltip";
import { Cell, Group, Panel, type SectionSpec } from "./design-section";

/** Everything you press. */
export const actionSections: SectionSpec[] = [
    {
        id: "button",
        title: "Button",
        from: "components/base/buttons/button",
        note: 'Nine colours in three weights (solid, outlined, quiet), each with a destructive twin, plus three link colours that carry no box. Changed from the kit: every button is a pill unless it says shape="rect".',
        render: (
            <Panel>
                <Group title="Colours" hint='size="md"'>
                    <Cell label="primary">
                        <Button size="md">Add card</Button>
                    </Cell>
                    <Cell label="secondary">
                        <Button size="md" color="secondary">
                            Add card
                        </Button>
                    </Cell>
                    <Cell label="tertiary">
                        <Button size="md" color="tertiary">
                            Add card
                        </Button>
                    </Cell>
                    <Cell label="primary-destructive">
                        <Button size="md" color="primary-destructive">
                            Delete
                        </Button>
                    </Cell>
                    <Cell label="secondary-destructive">
                        <Button size="md" color="secondary-destructive">
                            Delete
                        </Button>
                    </Cell>
                    <Cell label="tertiary-destructive">
                        <Button size="md" color="tertiary-destructive">
                            Delete
                        </Button>
                    </Cell>
                    <Cell label="link-color">
                        <Button size="md" color="link-color">
                            View collection
                        </Button>
                    </Cell>
                    <Cell label="link-gray">
                        <Button size="md" color="link-gray">
                            View collection
                        </Button>
                    </Cell>
                    <Cell label="link-destructive">
                        <Button size="md" color="link-destructive">
                            Remove
                        </Button>
                    </Cell>
                </Group>

                <Group title="Sizes" hint="the same button, five heights">
                    <Cell label="xs">
                        <Button size="xs">Add card</Button>
                    </Cell>
                    <Cell label="sm">
                        <Button size="sm">Add card</Button>
                    </Cell>
                    <Cell label="md">
                        <Button size="md">Add card</Button>
                    </Cell>
                    <Cell label="lg">
                        <Button size="lg">Add card</Button>
                    </Cell>
                    <Cell label="xl">
                        <Button size="xl">Add card</Button>
                    </Cell>
                </Group>

                <Group title="States">
                    <Cell label="default">
                        <Button size="md" color="secondary">
                            Save
                        </Button>
                    </Cell>
                    <Cell label="isDisabled">
                        <Button size="md" color="secondary" isDisabled>
                            Save
                        </Button>
                    </Cell>
                    <Cell label="isLoading">
                        <Button size="md" color="secondary" isLoading>
                            Save
                        </Button>
                    </Cell>
                    <Cell label="isLoading + showTextWhileLoading">
                        <Button size="md" color="secondary" isLoading showTextWhileLoading>
                            Saving
                        </Button>
                    </Cell>
                    <Cell label="isDisabled (primary)">
                        <Button size="md" isDisabled>
                            Save
                        </Button>
                    </Cell>
                    <Cell label="isLoading (primary)">
                        <Button size="md" isLoading>
                            Save
                        </Button>
                    </Cell>
                </Group>

                <Group title="Icons">
                    <Cell label="iconLeading">
                        <Button size="md" color="secondary" iconLeading={Star01}>
                            Favorite
                        </Button>
                    </Cell>
                    <Cell label="iconTrailing">
                        <Button size="md" color="secondary" iconTrailing={ArrowRight}>
                            Continue
                        </Button>
                    </Cell>
                    <Cell label="icon only">
                        <Button size="md" color="secondary" iconLeading={Settings01} aria-label="Settings" />
                    </Cell>
                    <Cell label="iconLeading (link-color)">
                        <Button size="md" color="link-color" iconLeading={Download01}>
                            Export
                        </Button>
                    </Cell>
                </Group>

                <Group title="Shape" hint="ours: pill is the default, rect keeps the kit's radius">
                    <Cell label='shape="pill"'>
                        <Button size="md" color="secondary">
                            Pill
                        </Button>
                    </Cell>
                    <Cell label='shape="rect"'>
                        <Button size="md" color="secondary" shape="rect">
                            Rect
                        </Button>
                    </Cell>
                </Group>
            </Panel>
        ),
    },
    {
        id: "button-utility",
        title: "ButtonUtility",
        from: "components/base/buttons/button-utility",
        note: "An icon-only button that takes its tooltip and its accessible name from one string. This is the component the app should reach for and mostly does not: sixteen icon buttons are a Button with a hand-written aria-label instead.",
        render: (
            <Panel>
                <Group title="Colours and sizes" cols="tight">
                    <Cell label='size="sm" secondary'>
                        <ButtonUtility icon={Star01} tooltip="Add to Favorites" size="sm" />
                    </Cell>
                    <Cell label='size="sm" tertiary'>
                        <ButtonUtility icon={Heart} tooltip="Add to wishlist" size="sm" color="tertiary" />
                    </Cell>
                    <Cell label='size="xs" secondary'>
                        <ButtonUtility icon={DotsHorizontal} tooltip="More actions" size="xs" />
                    </Cell>
                    <Cell label='size="xs" tertiary'>
                        <ButtonUtility icon={Copy01} tooltip="One copy more" size="xs" color="tertiary" />
                    </Cell>
                    <Cell label="isDisabled">
                        <ButtonUtility icon={Trash01} tooltip="Delete" size="sm" isDisabled />
                    </Cell>
                </Group>
            </Panel>
        ),
    },
    {
        id: "close-button",
        title: "CloseButton",
        from: "components/base/buttons/close-button",
        note: "The cross in the corner of a dialog. The dark theme is for a cross laid over a picture or a solid header, so it is shown on the solid surface it is meant for.",
        render: (
            <Panel>
                <Group title="Sizes" cols="tight">
                    <Cell label="xs">
                        <CloseButton size="xs" label="Close" />
                    </Cell>
                    <Cell label="sm">
                        <CloseButton size="sm" label="Close" />
                    </Cell>
                    <Cell label="md">
                        <CloseButton size="md" label="Close" />
                    </Cell>
                    <Cell label="lg">
                        <CloseButton size="lg" label="Close" />
                    </Cell>
                </Group>
                <Group title="Themes" cols="tight">
                    <Cell label='theme="light"'>
                        <CloseButton size="md" label="Close" />
                    </Cell>
                    <Cell label='theme="dark"' dark>
                        <CloseButton size="md" label="Close" theme="dark" />
                    </Cell>
                </Group>
            </Panel>
        ),
    },
    {
        id: "button-group",
        title: "ButtonGroup",
        from: "components/base/button-group/button-group",
        note: "One choice out of a few, joined into a single control: Collection or Wishlist, grid or list. Selection is uncontrolled here, so the samples answer to a click.",
        render: (
            <Panel>
                <Group title="Sizes" cols="wide">
                    <Cell label='size="sm"'>
                        <ButtonGroup size="sm" defaultSelectedKeys={["collection"]} disallowEmptySelection>
                            <ButtonGroupItem id="collection">Collection</ButtonGroupItem>
                            <ButtonGroupItem id="wishlist">Wishlist</ButtonGroupItem>
                        </ButtonGroup>
                    </Cell>
                    <Cell label='size="md"'>
                        <ButtonGroup size="md" defaultSelectedKeys={["collection"]} disallowEmptySelection>
                            <ButtonGroupItem id="collection">Collection</ButtonGroupItem>
                            <ButtonGroupItem id="wishlist">Wishlist</ButtonGroupItem>
                        </ButtonGroup>
                    </Cell>
                    <Cell label='size="lg"'>
                        <ButtonGroup size="lg" defaultSelectedKeys={["collection"]} disallowEmptySelection>
                            <ButtonGroupItem id="collection">Collection</ButtonGroupItem>
                            <ButtonGroupItem id="wishlist">Wishlist</ButtonGroupItem>
                        </ButtonGroup>
                    </Cell>
                </Group>
                <Group title="Contents" cols="wide">
                    <Cell label="iconLeading">
                        <ButtonGroup defaultSelectedKeys={["grid"]} disallowEmptySelection>
                            <ButtonGroupItem id="grid" iconLeading={Grid01}>
                                Grid
                            </ButtonGroupItem>
                            <ButtonGroupItem id="list" iconLeading={Rows01}>
                                List
                            </ButtonGroupItem>
                        </ButtonGroup>
                    </Cell>
                    <Cell label="icon only">
                        <ButtonGroup defaultSelectedKeys={["grid"]} disallowEmptySelection>
                            <ButtonGroupItem id="grid" aria-label="Grid" iconLeading={Grid01} />
                            <ButtonGroupItem id="list" aria-label="List" iconLeading={Rows01} />
                        </ButtonGroup>
                    </Cell>
                    <Cell label="isDisabled on one item">
                        <ButtonGroup defaultSelectedKeys={["all"]} disallowEmptySelection>
                            <ButtonGroupItem id="all">All</ButtonGroupItem>
                            <ButtonGroupItem id="graded" isDisabled>
                                Graded
                            </ButtonGroupItem>
                            <ButtonGroupItem id="raw">Raw</ButtonGroupItem>
                        </ButtonGroup>
                    </Cell>
                </Group>
            </Panel>
        ),
    },
    {
        id: "dropdown",
        title: "Dropdown",
        from: "components/base/dropdown/dropdown",
        note: "A menu under a trigger. Its item takes an icon, a keyboard hint on the right, and one of four selection indicators: the same checkbox, radio and toggle bases the form controls use, so a menu that toggles something looks like the thing it toggles.",
        render: (
            <Panel>
                <Group title="Contents" cols="wide">
                    <Cell label="icons and addons">
                        <Dropdown.Root>
                            <Button color="secondary" size="sm" iconTrailing={DotsHorizontal}>
                                Actions
                            </Button>
                            <Dropdown.Popover>
                                <Dropdown.Menu>
                                    <Dropdown.Item icon={Edit01} addon="⌘E" label="Edit" />
                                    <Dropdown.Item icon={Copy01} addon="⌘D" label="Duplicate" />
                                    <Dropdown.Item icon={Share04} label="Share" />
                                    <Dropdown.Separator />
                                    <Dropdown.Item icon={Trash01} label="Delete" />
                                </Dropdown.Menu>
                            </Dropdown.Popover>
                        </Dropdown.Root>
                    </Cell>
                    <Cell label="DotsButton">
                        <Dropdown.Root>
                            <Dropdown.DotsButton />
                            <Dropdown.Popover className="w-48">
                                <Dropdown.Menu>
                                    <Dropdown.Item icon={Edit01} label="Rename" />
                                    <Dropdown.Item icon={Trash01} label="Delete" />
                                </Dropdown.Menu>
                            </Dropdown.Popover>
                        </Dropdown.Root>
                    </Cell>
                    <Cell label="isDisabled item">
                        <Dropdown.Root>
                            <Button color="secondary" size="sm" iconTrailing={DotsHorizontal}>
                                Card
                            </Button>
                            <Dropdown.Popover className="w-48">
                                <Dropdown.Menu>
                                    <Dropdown.Item label="Move to binder" />
                                    <Dropdown.Item label="Split copy" isDisabled />
                                    <Dropdown.Item label="Remove" />
                                </Dropdown.Menu>
                            </Dropdown.Popover>
                        </Dropdown.Root>
                    </Cell>
                </Group>
                <Group title="Selection indicators" hint="selectionMode has to be set for one to show" cols="wide">
                    <Cell label='selectionIndicator="checkmark"'>
                        <Dropdown.Root>
                            <Button color="secondary" size="sm" iconTrailing={DotsHorizontal}>
                                Sort
                            </Button>
                            <Dropdown.Popover className="w-48">
                                <Dropdown.Menu selectionMode="single" defaultSelectedKeys={["newest"]}>
                                    <Dropdown.Item id="newest" label="Newest first" />
                                    <Dropdown.Item id="oldest" label="Oldest first" />
                                    <Dropdown.Item id="value" label="Highest value" />
                                </Dropdown.Menu>
                            </Dropdown.Popover>
                        </Dropdown.Root>
                    </Cell>
                    <Cell label='selectionIndicator="checkbox"'>
                        <Dropdown.Root>
                            <Button color="secondary" size="sm" iconTrailing={DotsHorizontal}>
                                Columns
                            </Button>
                            <Dropdown.Popover className="w-48">
                                <Dropdown.Menu selectionMode="multiple" defaultSelectedKeys={["set", "rarity"]}>
                                    <Dropdown.Item id="set" label="Set" selectionIndicator="checkbox" />
                                    <Dropdown.Item id="rarity" label="Rarity" selectionIndicator="checkbox" />
                                    <Dropdown.Item id="price" label="Price" selectionIndicator="checkbox" />
                                </Dropdown.Menu>
                            </Dropdown.Popover>
                        </Dropdown.Root>
                    </Cell>
                    <Cell label='selectionIndicator="radio" / "toggle"'>
                        <Dropdown.Root>
                            <Button color="secondary" size="sm" iconTrailing={DotsHorizontal}>
                                View
                            </Button>
                            <Dropdown.Popover className="w-52">
                                <Dropdown.Menu selectionMode="single" defaultSelectedKeys={["grid"]}>
                                    <Dropdown.Item id="grid" label="Grid" selectionIndicator="radio" />
                                    <Dropdown.Item id="list" label="List" selectionIndicator="radio" />
                                    <Dropdown.Item id="prices" label="Show prices" selectionIndicator="toggle" />
                                </Dropdown.Menu>
                            </Dropdown.Popover>
                        </Dropdown.Root>
                    </Cell>
                </Group>
            </Panel>
        ),
    },
    {
        id: "tooltip",
        title: "Tooltip",
        from: "components/base/tooltip/tooltip",
        note: "Hover or tab to one. It wraps any focusable thing; ButtonUtility does it for you.",
        render: (
            <Panel>
                <Group title="Contents" cols="wide">
                    <Cell label="title">
                        <Tooltip title="Previous card (←)">
                            <Button size="md" color="secondary">
                                Hover me
                            </Button>
                        </Tooltip>
                    </Cell>
                    <Cell label="title + description">
                        <Tooltip title="Market price" description="TCGplayer's figure for this printing, converted to euros.">
                            <Button size="md" color="secondary">
                                With a description
                            </Button>
                        </Tooltip>
                    </Cell>
                    <Cell label="arrow">
                        <Tooltip title="Filed in Kanto" arrow>
                            <Button size="md" color="secondary">
                                With an arrow
                            </Button>
                        </Tooltip>
                    </Cell>
                </Group>
                <Group title="Placement" cols="tight">
                    <Cell label='placement="top"'>
                        <Tooltip title="Above" placement="top" arrow>
                            <Button size="sm" color="secondary">
                                top
                            </Button>
                        </Tooltip>
                    </Cell>
                    <Cell label='placement="right"'>
                        <Tooltip title="To the right" placement="right" arrow>
                            <Button size="sm" color="secondary">
                                right
                            </Button>
                        </Tooltip>
                    </Cell>
                    <Cell label='placement="bottom"'>
                        <Tooltip title="Below" placement="bottom" arrow>
                            <Button size="sm" color="secondary">
                                bottom
                            </Button>
                        </Tooltip>
                    </Cell>
                    <Cell label='placement="left"'>
                        <Tooltip title="To the left" placement="left" arrow>
                            <Button size="sm" color="secondary">
                                left
                            </Button>
                        </Tooltip>
                    </Cell>
                </Group>
            </Panel>
        ),
    },
];
