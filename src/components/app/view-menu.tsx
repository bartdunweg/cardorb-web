"use client";

import { Grid01, Rows01 } from "@untitledui/icons";
import { Header as AriaHeader } from "react-aria-components";
import { RowButton } from "@/components/app/row-button";
import { Dropdown } from "@/components/base/dropdown/dropdown";
import { setCardsSize, setCardsView } from "@/hooks/use-cards-view";
import type { CardsSize, CardsViewMode } from "@/lib/cards-view";

const first = (keys: "all" | Set<React.Key>) => (keys === "all" ? undefined : [...keys][0]);

// One View menu for every list: the layout (grid or list) and the tile size. `layouts` off
// leaves the size alone, for a list that has no table (the public profile). A choice goes to
// `use-cards-view`, which every list reads, so the next page shows it too.
export function ViewMenu({ view, size, layouts = true }: { view: CardsViewMode; size: CardsSize; layouts?: boolean }) {
    return (
        <Dropdown.Root>
            <RowButton icon={view === "grid" ? Grid01 : Rows01} label="View" menu className="ml-auto" />
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
                                        setCardsView(key);
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
                                setCardsSize(key);
                            }
                        }}
                    >
                        <AriaHeader className="px-3 pt-2 pb-1 text-xs font-semibold text-quaternary">Size</AriaHeader>
                        <Dropdown.Item id="sm">Small</Dropdown.Item>
                        <Dropdown.Item id="md">Medium</Dropdown.Item>
                        <Dropdown.Item id="lg">Large</Dropdown.Item>
                    </Dropdown.Section>
                </Dropdown.Menu>
            </Dropdown.Popover>
        </Dropdown.Root>
    );
}
