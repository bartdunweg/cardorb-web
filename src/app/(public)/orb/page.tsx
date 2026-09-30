import type { Metadata } from "next";
import { OrbGlassTile } from "@/components/app/orb-glass-tile";
import { PublicTopBar } from "@/components/app/public-top-bar";
import type { OrbGlassMaterial } from "@/lib/orb-glass";

export const metadata: Metadata = {
    title: "Orb",
    description: "The Card Orb mark as real glass, drawn live, every version.",
    robots: { index: false },
};

type Version = { name: string; material: OrbGlassMaterial; still?: string; stillDark?: string; whole?: string[] };

// Every version of every material, newest first within its family. A version is never edited:
// a change is the next entry above it, so each step stays here to be judged against the others.
const FAMILIES: { name: string; versions: Version[] }[] = [
    {
        name: "Soap bubble, still",
        versions: [
            { name: "v2", material: "soap3", still: "/orb-study/bubble.png" },
            { name: "v1", material: "soap3", still: "/orb-study/bubble-first.png", stillDark: "/orb-study/bubble-first-dark.png" },
            // The study's own tile, ray-traced: the grey face it had, a white face, and a dark face.
            { name: "v0", material: "soap3", whole: ["/orb-study/tile-first.png", "/orb-study/tile-first-white.png", "/orb-study/tile-first-dark.png"] },
        ],
    },
    {
        name: "Soap bubble",
        versions: [
            { name: "v5", material: "soap5" },
            { name: "v4", material: "soap4" },
            { name: "v3", material: "soap3" },
            { name: "v2", material: "soap2" },
            { name: "v1", material: "soap1" },
        ],
    },
    {
        name: "Iridescent bubble",
        versions: [
            { name: "v5", material: "bubble5" },
            { name: "v4", material: "bubble4" },
            { name: "v3", material: "bubble3" },
            { name: "v2", material: "bubble2" },
            { name: "v1", material: "bubble1" },
        ],
    },
    {
        name: "Black glass",
        versions: [
            { name: "v3", material: "black3" },
            { name: "v2", material: "black2" },
            { name: "v1", material: "black1" },
        ],
    },
    {
        name: "Violet glass",
        versions: [
            { name: "v2", material: "violet2" },
            { name: "v1", material: "violet1" },
        ],
    },
];

/**
 * The orb as glass, every version, at an address anyone can open. Per material the versions
 * newest first, each as the light and the dark app icon, with and without a shadow. The glass is
 * live: the lights follow the pointer and a bubble's film flows. Not indexed and linked from
 * nowhere: a workbench, not a page.
 */
export default function OrbStudyPage() {
    return (
        <div className="bg-primary">
            <PublicTopBar />

            <main id="main-content" className="mx-auto flex max-w-container flex-col gap-10 px-4 py-12 md:px-8 md:py-16">
                <div className="flex flex-col gap-2">
                    <h1 className="text-display-sm font-semibold text-primary">Orb</h1>
                    <p className="max-w-2xl text-md text-tertiary">
                        Every version, as the light and the dark icon, with and without a shadow. Move the pointer: the lights follow it.
                    </p>
                </div>

                {FAMILIES.map((family) => (
                    <section key={family.name} className="flex flex-col gap-4">
                        <h2 className="text-md font-semibold text-primary">{family.name}</h2>
                        {family.versions.map((v) => (
                            <div key={v.name} className="flex flex-wrap items-center gap-4">
                                <span className="w-8 text-xs text-tertiary">{v.name}</span>
                                {/* The study's own tile is one picture: no dark or shadowless twin exists. */}
                                {v.whole ? (
                                    <>
                                        {v.whole.map((src) => (
                                            <OrbGlassTile
                                                key={src}
                                                size={120}
                                                material={v.material}
                                                whole={src}
                                                label={`${family.name} ${v.name}, the study's tile`}
                                            />
                                        ))}
                                        {v.whole.map((src) => (
                                            <OrbGlassTile key={`${src}-large`} size={288} material={v.material} whole={src} />
                                        ))}
                                    </>
                                ) : (
                                    <>
                                        <OrbGlassTile size={120} material={v.material} still={v.still} label={`${family.name} ${v.name}, light icon`} />
                                        <OrbGlassTile size={120} material={v.material} still={v.still} shadow={false} />
                                        <OrbGlassTile
                                            size={120}
                                            material={v.material}
                                            still={v.stillDark ?? v.still}
                                            dark
                                            label={`${family.name} ${v.name}, dark icon`}
                                        />
                                        <OrbGlassTile size={120} material={v.material} still={v.stillDark ?? v.still} dark shadow={false} />
                                    </>
                                )}
                            </div>
                        ))}
                    </section>
                ))}
            </main>
        </div>
    );
}
