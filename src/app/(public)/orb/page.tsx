import type { Metadata } from "next";
import { OrbGlassTile } from "@/components/app/orb-glass-tile";
import { OrbMark } from "@/components/app/orb-mark";
import { PublicTopBar } from "@/components/app/public-top-bar";
import { type OrbGlassMaterial, orbGlassIsScene } from "@/lib/orb-glass";

export const metadata: Metadata = {
    title: "Orb",
    description: "The Card Orb mark as real glass, drawn live, every version.",
    robots: { index: false },
};

type Version = { name: string; material: OrbGlassMaterial; still?: string; stillDark?: string; whole?: { src: string; dark?: boolean }[] };

// Every version of every material, newest first within its family. A version is never edited:
// a change is the next entry above it, so each step stays here to be judged against the others.
const FAMILIES: { name: string; versions: Version[] }[] = [
    {
        // The study's v5 scene, ported to the GPU: the same tile, live. Film flows, lights follow the pointer.
        name: "Soap bubble, live scene",
        versions: [
            { name: "v20", material: "scene20" },
            { name: "v19", material: "scene19" },
            { name: "v18", material: "scene18" },
            { name: "v17", material: "scene17" },
            { name: "v16", material: "scene16" },
            { name: "v15", material: "scene15" },
            { name: "v14", material: "scene14" },
            { name: "v13", material: "scene13" },
            { name: "v12", material: "scene12" },
            { name: "v11", material: "scene11" },
            { name: "v10", material: "scene10" },
            { name: "v9", material: "scene9" },
            { name: "v8", material: "scene8" },
            { name: "v7", material: "scene7" },
            { name: "v6", material: "scene6" },
            { name: "v5", material: "scene5" },
            { name: "v4", material: "scene4" },
            { name: "v3", material: "scene3" },
            { name: "v2", material: "scene2" },
            { name: "v1", material: "scene1" },
        ],
    },
    {
        name: "Soap bubble, still",
        versions: [
            // v5 is v4 without the warm light low in the ball, which read as a white smudge.
            { name: "v5", material: "soap3", whole: [{ src: "/orb-study/tile-v5-white.png" }, { src: "/orb-study/tile-v5-dark.png", dark: true }] },
            // v4 is v3 with a richer film: more colour, broader bands, a wash of it inside, a warm light low in the ball.
            { name: "v4", material: "soap3", whole: [{ src: "/orb-study/tile-irid-white.png" }, { src: "/orb-study/tile-irid-dark.png", dark: true }] },
            // v3 is v0's scene, ray-traced, with a white face for the light icon and a dark face for the dark one.
            { name: "v3", material: "soap3", whole: [{ src: "/orb-study/tile-first-white.png" }, { src: "/orb-study/tile-first-dark.png", dark: true }] },
            { name: "v2", material: "soap3", still: "/orb-study/bubble.png" },
            { name: "v1", material: "soap3", still: "/orb-study/bubble-first.png", stillDark: "/orb-study/bubble-first-dark.png" },
            // The study's own tile, ray-traced, with the grey face it had.
            { name: "v0", material: "soap3", whole: [{ src: "/orb-study/tile-first.png" }] },
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

                {/* The mark as the app draws it: the chosen version, alone on the page, light and dark. */}
                <section className="flex flex-col gap-4">
                    <h2 className="text-md font-semibold text-primary">The mark</h2>
                    <div className="flex flex-wrap items-center gap-6">
                        <div className="flex items-center gap-6 rounded-2xl bg-primary p-8 ring-1 ring-secondary ring-inset">
                            <OrbMark size={160} label="The mark, light" />
                            <OrbMark size={28} />
                        </div>
                        <div className="dark-mode flex items-center gap-6 rounded-2xl bg-primary p-8 ring-1 ring-secondary ring-inset">
                            <OrbMark size={160} label="The mark, dark" />
                            <OrbMark size={28} />
                        </div>
                    </div>
                </section>

                {FAMILIES.map((family) => (
                    <section key={family.name} className="flex flex-col gap-4">
                        <h2 className="text-md font-semibold text-primary">{family.name}</h2>
                        {family.versions.map((v) => (
                            <div key={v.name} className="flex flex-wrap items-center gap-4">
                                <span className="w-8 text-xs text-tertiary">{v.name}</span>
                                {/* The study's own tile is one picture: no dark or shadowless twin exists. */}
                                {orbGlassIsScene(v.material) ? (
                                    <>
                                        <OrbGlassTile size={120} material={v.material} label={`${family.name} ${v.name}, light`} />
                                        <OrbGlassTile size={120} material={v.material} dark label={`${family.name} ${v.name}, dark`} />
                                    </>
                                ) : v.whole ? (
                                    <>
                                        {v.whole.map((tile) => (
                                            <OrbGlassTile
                                                key={tile.src}
                                                size={120}
                                                material={v.material}
                                                whole={tile.src}
                                                dark={tile.dark}
                                                label={`${family.name} ${v.name}, the study's tile${tile.dark ? ", dark" : ""}`}
                                            />
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
