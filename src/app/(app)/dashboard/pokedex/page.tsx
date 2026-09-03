import Link from "next/link";
import { CardImage } from "@/components/app/card-image";
import { DexSlider } from "@/components/app/dex-slider";
import { PageHeader } from "@/components/app/page-header";
import { ProgressBarBase } from "@/components/base/progress-indicators/progress-indicators";
import { NATIONAL_DEX_MAX, getPokedex } from "@/lib/pokedex";

export default async function PokedexPage() {
    const { slots, caughtNumbers, totalCards } = await getPokedex();

    return (
        <div className="flex flex-col gap-6">
            <PageHeader
                title="Pokédex"
                subtitle={`${caughtNumbers.toLocaleString("en-US")} of ${NATIONAL_DEX_MAX.toLocaleString("en-US")} Pokémon · ${totalCards.toLocaleString("en-US")} cards`}
                back={{ href: "/dashboard", label: "Home" }}
            >
                {/* The count above is the accessible name; the bar makes the same number visible at a glance. */}
                <ProgressBarBase value={caughtNumbers} max={NATIONAL_DEX_MAX} className="mt-2 max-w-md" aria-label="Pokédex completion" />
            </PageHeader>

            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12">
                {slots.map((slot) => {
                    if (slot.cards.length === 0) {
                        return (
                            <div
                                key={slot.number}
                                className="flex aspect-3/4 items-center justify-center rounded-md bg-secondary text-xs font-medium text-quaternary"
                            >
                                {slot.number}
                            </div>
                        );
                    }

                    if (slot.cards.length > 1) {
                        return <DexSlider key={slot.number} number={slot.number} cards={slot.cards} />;
                    }

                    const card = slot.cards[0];
                    return (
                        <div key={slot.number} className="relative aspect-3/4 overflow-hidden rounded-md ring-1 ring-secondary ring-inset">
                            <Link href={`/dashboard/cards?q=${encodeURIComponent(card.name)}`} className="relative block size-full">
                                {card.imageUrl ? (
                                    <CardImage
                                        src={card.imageUrl}
                                        alt={card.name}
                                        sizes="(max-width: 640px) 25vw, (max-width: 768px) 17vw, (max-width: 1024px) 13vw, (max-width: 1280px) 10vw, 107px"
                                        className="object-cover"
                                    />
                                ) : (
                                    <div className="flex size-full items-center justify-center bg-quaternary p-1 text-center text-xxs text-quaternary">
                                        {card.name}
                                    </div>
                                )}
                            </Link>
                            <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-alpha-black/55 px-1 py-0.5 text-center text-xxs font-medium text-alpha-white">
                                {slot.number}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
