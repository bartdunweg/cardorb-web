"use client";

import { ChevronDown, Grid01, Rows01 } from "@untitledui/icons";
import { Header as AriaHeader } from "react-aria-components";
import { Button } from "@/components/base/buttons/button";
import { Dropdown } from "@/components/base/dropdown/dropdown";
import { CARDS_SIZE_COOKIE, CARDS_VIEW_COOKIE, type CardsSize, type CardsViewMode } from "@/lib/cards-view";

const ONE_YEAR = 60 * 60 * 24 * 365;

// The whole site, not only /dashboard: the public profile shares the size.
const remember = (name: string, value: string) => {
    document.cookie = `${name}=${value}; path=/; max-age=${ONE_YEAR}; samesite=lax`;
};

const first = (keys: "all" | Set<React.Key>) => (keys === "all" ? undefined : [...keys][0]);

// One View menu for every list: the layout (grid or list) and the tile size. `layouts` off
// leaves the size alone, for a list that has no table (the public profile).
export function ViewMenu({
    view,
    size,
    onView,
    onSize,
    layouts = true,
}: {
    view: CardsViewMode;
    size: CardsSize;
    onView: (view: CardsViewMode) => void;
    onSize: (size: CardsSize) => void;
    layouts?: boolean;
}) {
    return (
        <Dropdown.Root>
            <Button color="secondary" size="sm" iconLeading={view === "grid" ? Grid01 : Rows01} iconTrailing={ChevronDown} className="ml-auto">
                View
            </Button>
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
                                        onView(key);
                                        remember(CARDS_VIEW_COOKIE, key);
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
                                onSize(key);
                                remember(CARDS_SIZE_COOKIE, key);
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
