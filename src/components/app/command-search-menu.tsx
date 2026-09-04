"use client";

import type { ReactNode } from "react";
import { Heading as AriaHeading } from "react-aria-components";
import type { PokemonCard } from "@/app/(app)/dashboard/cards/actions";
import { CardImage } from "@/components/app/card-image";
import type { AddStatus } from "@/components/app/command-search";
import { CommandMenu, type CommandMenuGroupType } from "@/components/application/command-menus/command-menu";
import { Button } from "@/components/base/buttons/button";
import { formatDate } from "@/lib/format";
import { cx } from "@/utils/cx";

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
    if (value === null || value === undefined || value === "") return null;
    return (
        <div className="flex items-start justify-between gap-4 py-2">
            <dt className="shrink-0 text-sm text-tertiary">{label}</dt>
            <dd className="text-right text-sm font-medium text-primary">{value}</dd>
        </div>
    );
}

// Right-hand (desktop) / stacked (mobile) preview showing all available card data + an add action.
function CardPreview({ card, status, onAdd }: { card: PokemonCard; status: AddStatus; onAdd: () => void }) {
    return (
        <div className="flex w-full flex-col gap-4 overflow-y-auto border-secondary p-6 max-md:border-t md:max-h-[70vh] md:w-90 md:border-l">
            {card.image ? (
                <div className="relative mx-auto aspect-[63/88] w-40 overflow-hidden rounded-xl">
                    <CardImage src={card.image} alt={card.name} sizes="160px" className="object-contain" priority />
                </div>
            ) : (
                <div className="mx-auto h-56 w-40 rounded-xl bg-quaternary" />
            )}

            <div className="flex flex-col gap-0.5 text-center">
                <p className="text-md font-semibold text-primary">{card.name}</p>
                <p className="text-sm text-tertiary">{card.supertype ?? "Card"}</p>
            </div>

            <dl className="flex flex-col divide-y divide-secondary">
                <DetailRow label="Set" value={card.set || null} />
                <DetailRow label="Series" value={card.series} />
                <DetailRow label="Number" value={card.number ? `${card.number}${card.setPrintedTotal ? ` / ${card.setPrintedTotal}` : ""}` : null} />
                <DetailRow label="Rarity" value={card.rarity} />
                <DetailRow label="Type" value={card.types?.length ? card.types.join(", ") : null} />
                <DetailRow label="Subtypes" value={card.subtypes?.length ? card.subtypes.join(", ") : null} />
                <DetailRow label="HP" value={card.hp} />
                <DetailRow label="Pokédex №" value={card.nationalPokedexNumbers?.length ? card.nationalPokedexNumbers.join(", ") : null} />
                <DetailRow label="Artist" value={card.artist} />
                <DetailRow label="Released" value={formatDate(card.releaseDate)} />
            </dl>

            {card.flavorText ? <p className="text-sm text-tertiary italic">{card.flavorText}</p> : null}

            <Button onClick={onAdd} isDisabled={status !== "idle"} className="w-full">
                {status === "added" ? "Added" : status === "adding" ? "Adding…" : "Add to collection"}
            </Button>
        </div>
    );
}

// The command palette: the search field, the hits and the preview of the selected one. Loaded
// by CommandSearchProvider the first time it is opened; the state lives there.
export function CommandSearchMenu({
    isOpen,
    onOpenChange,
    inputValue,
    onInputChange,
    hits,
    status,
    onAdd,
}: {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    inputValue: string;
    onInputChange: (value: string) => void;
    hits: PokemonCard[];
    status: Record<string, AddStatus>;
    onAdd: (card: PokemonCard) => void;
}) {
    const groups: CommandMenuGroupType[] = hits.length
        ? [
              {
                  id: "cards",
                  title: "Cards",
                  items: hits.map((c) => ({
                      id: c.id,
                      type: "image" as const,
                      src: c.image,
                      alt: c.name,
                      label: c.name,
                      description: [c.set, c.number ? `#${c.number}` : null, c.rarity].filter(Boolean).join(" · "),
                      stacked: true,
                  })),
              },
          ]
        : [];

    return (
        <CommandMenu
            isOpen={isOpen}
            onOpenChange={onOpenChange}
            filter={false}
            inputValue={inputValue}
            onInputChange={onInputChange}
            items={groups}
            placeholder="Search a card"
            shortcut={null}
            emptyState={
                <div className="px-4 py-10 text-center text-sm text-tertiary">
                    {inputValue.trim().length < 2 ? "Type to search for a card." : "No cards found."}
                </div>
            }
            dialogClassName={cx("max-w-[calc(100vw-2rem)]")}
        >
            <AriaHeading slot="title" className="sr-only">
                Search cards
            </AriaHeading>

            <CommandMenu.Group className="flex max-md:flex-col">
                <CommandMenu.List>
                    {(group: CommandMenuGroupType) => (
                        <CommandMenu.Section {...group}>{(item) => <CommandMenu.Item key={item.id} {...item} />}</CommandMenu.Section>
                    )}
                </CommandMenu.List>

                <CommandMenu.Preview asChild>
                    {({ selectedId }) => {
                        const card = hits.find((h) => h.id === selectedId);
                        if (!card) return null;
                        return <CardPreview card={card} status={status[card.id] ?? "idle"} onAdd={() => onAdd(card)} />;
                    }}
                </CommandMenu.Preview>
            </CommandMenu.Group>
        </CommandMenu>
    );
}
