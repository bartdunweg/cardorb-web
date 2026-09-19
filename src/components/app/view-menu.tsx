"use client";

import { Grid01, Rows01 } from "@untitledui/icons";
import { usePathname } from "next/navigation";
import { Header as AriaHeader } from "react-aria-components";
import { RowButton } from "@/components/app/row-button";
import { Dropdown } from "@/components/base/dropdown/dropdown";
import { setCardsGroup, setCardsSize, setCardsView } from "@/hooks/use-cards-view";
import type { CardsGroup, CardsSize, CardsViewMode } from "@/lib/cards-view";
import { memoryKey } from "@/lib/list-memory";
import { cx } from "@/utils/cx";

const first = (keys: "all" | Set<React.Key>) => (keys === "all" ? undefined : [...keys][0]);

// One View menu for every list: the layout (grid or list) and the tile size. `layouts` off
// leaves the size alone, for a list that has no table (the public profile). A choice goes to
// `use-cards-view` as this page's own, which every list reads. `group` is given only
// where the list is sorted by set: a heading over each set, or one list in set order.
export function ViewMenu({
    view,
    size,
    layouts = true,
    group,
    className,
}: {
    view: CardsViewMode;
    size: CardsSize;
    layouts?: boolean;
    group?: CardsGroup;
    /** Where it shows: a page with a bar puts it there on a phone and keeps it off the row (`BarViewMenu`). */
    className?: string;
}) {
    const page = memoryKey(usePathname());
    return (
        <Dropdown.Root>
            <RowButton icon={view === "grid" ? Grid01 : Rows01} label="View" className={cx("ml-auto shrink-0", className)} />
            <Dropdown.Popover placement="bottom end" className="w-48">
                <Dropdown.Menu>
                    {layouts ? (
                        <>
                            <Dropdown.Section
                                selectionMode="single"
                                disallowEmptySelection
                                selectedKeys={new Set([view])}
                                onSelectionChange={(keys) => {
                                    const key = first(keys);
                                    if (key === "grid" || key === "table") {
                                        setCardsView(page, key);
                                    }
                                }}
                            >
                                <AriaHeader className="px-3 pt-2 pb-1 text-xs font-semibold text-quaternary">Layout</AriaHeader>
                                <Dropdown.Item id="grid" icon={Grid01}>
                                    Grid
                                </Dropdown.Item>
                                <Dropdown.Item id="table" icon={Rows01}>
                                    List
                                </Dropdown.Item>
                            </Dropdown.Section>
                            <Dropdown.Separator />
                        </>
                    ) : null}
                    <Dropdown.Section
                        selectionMode="single"
                        disallowEmptySelection
                        selectedKeys={new Set([size])}
                        onSelectionChange={(keys) => {
                            const key = first(keys);
                            if (key === "sm" || key === "md" || key === "lg") {
                                setCardsSize(page, key);
                            }
                        }}
                    >
                        <AriaHeader className="px-3 pt-2 pb-1 text-xs font-semibold text-quaternary">Size</AriaHeader>
                        <Dropdown.Item id="sm">Small</Dropdown.Item>
                        <Dropdown.Item id="md">Medium</Dropdown.Item>
                        <Dropdown.Item id="lg">Large</Dropdown.Item>
                    </Dropdown.Section>
                    {group ? (
                        <>
                            <Dropdown.Separator />
                            <Dropdown.Section
                                selectionMode="single"
                                disallowEmptySelection
                                selectedKeys={new Set([group])}
                                onSelectionChange={(keys) => {
                                    const key = first(keys);
                                    if (key === "sets" || key === "none") {
                                        setCardsGroup(page, key);
                                    }
                                }}
                            >
                                <AriaHeader className="px-3 pt-2 pb-1 text-xs font-semibold text-quaternary">Sets</AriaHeader>
                                <Dropdown.Item id="sets">Group by set</Dropdown.Item>
                                <Dropdown.Item id="none">One list</Dropdown.Item>
                            </Dropdown.Section>
                        </>
                    ) : null}
                </Dropdown.Menu>
            </Dropdown.Popover>
        </Dropdown.Root>
    );
}
