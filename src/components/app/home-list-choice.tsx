"use client";

import { type FC, createElement, useState, useSyncExternalStore, useTransition } from "react";
import { ChevronDown, Folder, Heart, Rows01, Star01 } from "@untitledui/icons";
import { useRouter } from "next/navigation";
import { Header as AriaHeader, Heading as AriaHeading } from "react-aria-components";
import { FilterChoices } from "@/components/app/filter-chip";
import { SlideoutMenu } from "@/components/application/slideout-menus/slideout-menu";
import { Button } from "@/components/base/buttons/button";
import { Dropdown } from "@/components/base/dropdown/dropdown";
import { useBreakpoint } from "@/hooks/use-breakpoint";

/*
 * Which list Home is about, in the page's header beside the avatar (Bart's call, 2026-09-19): the
 * collection, the wishlist, the favorites or a binder. A choice goes into the URL (`?value=`) and the
 * whole of Home follows it: the value and its line, the four counts, the dearest cards. It sat
 * beside the amount before, where it read as a control of the value alone. A menu under the button
 * from sm, a sheet from the bottom on a phone, as the filters open.
 */

export type HomeListOption = { id: string; name: string };

const noSubscribe = () => () => {};

const first = (keys: "all" | Set<React.Key>) => (keys === "all" ? undefined : [...keys][0]);

// Each list wears the sidebar's icon for it: the collection's rows, the star, a binder's folder, the heart.
const iconFor = (id: string): FC<{ className?: string }> => (id === "all" ? Rows01 : id === "favorites" ? Star01 : id === "wishlist" ? Heart : Folder);

// The same mapping drawn as an element, for the button and the sheet; the menu takes `iconFor` itself.
function ListIcon({ id, className }: { id: string; className: string }) {
    return createElement(iconFor(id), { "aria-hidden": true, className } as { className: string });
}

export function HomeListChoice({ lists, selected }: { lists: HomeListOption[]; selected: string }) {
    const router = useRouter();
    const [pending, startTransition] = useTransition();
    const list = lists.find((l) => l.id === selected) ?? lists[0];
    // Two groups, as the sidebar has them: the collection and the wishlist, then the binders under their heading.
    const top = lists.filter((l) => l.id === "all" || l.id === "wishlist");
    const binders = lists.filter((l) => l.id !== "all" && l.id !== "wishlist");
    const asOptions = (group: HomeListOption[]) =>
        group.map((l) => ({ value: l.id, label: l.name, icon: <ListIcon id={l.id} className="size-5 text-fg-quaternary" /> }));
    const sm = useBreakpoint("sm");
    // One menu trigger at every width, so the server and a phone draw the same button: a trigger on one
    // side of the breakpoint only broke hydration. On a phone its press opens the sheet instead.
    const [menuOpen, setMenuOpen] = useState(false);
    const [sheetOpen, setSheetOpen] = useState(false);
    // The breakpoint is `sm` on the server, so the phone's own attributes wait for the browser: before that
    // they would differ from the server's button and break hydration.
    const hydrated = useSyncExternalStore(
        noSubscribe,
        () => true,
        () => false,
    );
    const phone = hydrated && !sm;
    const choose = (key: string) => {
        if (key === selected) return;
        startTransition(() => router.replace(key === "all" ? "/dashboard" : `/dashboard?value=${key}`, { scroll: false }));
    };

    return (
        <>
            <Dropdown.Root
                isOpen={menuOpen}
                onOpenChange={(next) => {
                    // Closing always closes: a menu opened wide and then narrowed past sm must still shut.
                    if (!next) setMenuOpen(false);
                    else if (sm) setMenuOpen(true);
                    else setSheetOpen(true);
                }}
            >
                {/* The list's icon, its name, the chevron; a spinner's worth of dimming while the page answers. */}
                <Button
                    color="secondary"
                    size="sm"
                    iconTrailing={ChevronDown}
                    aria-label={`Home shows ${list.name}; choose a list`}
                    // On a phone the press opens a sheet, a dialog, not the menu the trigger announces.
                    aria-haspopup={phone ? "dialog" : undefined}
                    aria-expanded={phone ? sheetOpen : undefined}
                    className={pending ? "opacity-60" : undefined}
                >
                    {/* One box: the kit wraps the children in an inline span, where an icon and a word break onto two lines. */}
                    <span className="inline-flex items-center gap-1.5">
                        <ListIcon id={list.id} className="size-4 shrink-0 text-fg-quaternary" />
                        <span className="max-w-32 truncate sm:max-w-40">{list.name}</span>
                    </span>
                </Button>
                <Dropdown.Popover placement="bottom end" className="w-56">
                    <Dropdown.Menu
                        selectionMode="single"
                        disallowEmptySelection
                        selectedKeys={new Set([selected])}
                        onSelectionChange={(keys) => {
                            const key = first(keys);
                            if (typeof key === "string") choose(key);
                        }}
                    >
                        <Dropdown.Section>
                            {top.map((l) => (
                                <Dropdown.Item key={l.id} id={l.id} icon={iconFor(l.id)}>
                                    {l.name}
                                </Dropdown.Item>
                            ))}
                        </Dropdown.Section>
                        <Dropdown.Separator />
                        <Dropdown.Section>
                            <AriaHeader className="px-3 pt-2 pb-1 text-xs font-semibold text-quaternary">Binders</AriaHeader>
                            {binders.map((l) => (
                                <Dropdown.Item key={l.id} id={l.id} icon={iconFor(l.id)}>
                                    {l.name}
                                </Dropdown.Item>
                            ))}
                        </Dropdown.Section>
                    </Dropdown.Menu>
                </Dropdown.Popover>
            </Dropdown.Root>
            <SlideoutMenu isDismissable isOpen={sheetOpen} onOpenChange={setSheetOpen} dialogClassName="max-h-[70dvh]">
                {({ close }) => (
                    <>
                        <SlideoutMenu.Header onClose={close}>
                            <AriaHeading slot="title" className="text-lg font-semibold text-primary">
                                Choose a list
                            </AriaHeading>
                        </SlideoutMenu.Header>
                        {/* role="presentation", not the kit's default "main": the page already has a <main>. */}
                        {/* eslint-disable-next-line jsx-a11y/prefer-tag-over-role -- the rule offers <img alt="">, which this is not: the role is here only to stop the kit's default role="main". */}
                        <SlideoutMenu.Content role="presentation" className="gap-0 pb-4">
                            <FilterChoices
                                label="Collection and wishlist"
                                focusField={false}
                                value={[selected]}
                                options={asOptions(top)}
                                onChange={(next) => {
                                    if (next[0]) choose(next[0]);
                                    close();
                                }}
                            />
                            {/* Seen only: the choices' own legend says "Binders" to a screen reader. */}
                            <p aria-hidden="true" className="px-2 pt-3 pb-1 text-xs font-semibold text-quaternary">
                                Binders
                            </p>
                            <FilterChoices
                                label="Binders"
                                focusField={false}
                                value={[selected]}
                                options={asOptions(binders)}
                                onChange={(next) => {
                                    if (next[0]) choose(next[0]);
                                    close();
                                }}
                            />
                        </SlideoutMenu.Content>
                    </>
                )}
            </SlideoutMenu>
        </>
    );
}
