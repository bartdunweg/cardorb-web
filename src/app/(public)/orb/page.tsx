import type { Metadata } from "next";
import Image from "next/image";
import { OrbGlass } from "@/components/app/orb-glass";
import { OrbGlassTile } from "@/components/app/orb-glass-tile";
import { OrbLogo } from "@/components/app/orb-logo";
import { PublicTopBar } from "@/components/app/public-top-bar";
import type { OrbGlassMaterial } from "@/lib/orb-glass";
import { cx } from "@/utils/cx";

export const metadata: Metadata = {
    title: "Orb",
    description: "The Card Orb mark as real glass, drawn live.",
    robots: { index: false },
};

const STUDIES: { material: OrbGlassMaterial; title: string; note: string }[] = [
    {
        material: "soap",
        title: "Soap bubble",
        note: "The study's bubble: a thin film front and back, the studio's pale wall showing through it, so it reads as a milky ball with pastel on it.",
    },
    {
        material: "bubble",
        title: "Iridescent bubble",
        note: "A glass bubble after the reference: blue at the top, magenta low left, a warm light low in it, a double rim, and the film's color laid over it in soft washes that flow.",
    },
    {
        material: "black",
        title: "Black glass",
        note: "Luma's material: a near-black body under a clear coat, an oil-slick film where the surface turns away from you, the softbox mirrored top left.",
    },
    {
        material: "violet",
        title: "Violet glass",
        note: "The original mark as a solid. Light enters, is colored on its way through, and leaves at the bottom rim.",
    },
];

/**
 * The orb as glass: studies for the mark, live, at an address anyone can open. Each row is one
 * material on a light and a dark page, as the app icon, bare at the sizes the app draws it, and
 * beside the wordmark. The lights follow the pointer and a bubble's film flows, so the material
 * can be judged as one, not as a still. Not indexed and linked from nowhere: a workbench, not a page.
 */
export default function OrbStudyPage() {
    return (
        <div className="bg-primary">
            <PublicTopBar />

            <main id="main-content" className="mx-auto flex max-w-container flex-col gap-10 px-4 py-12 md:px-8 md:py-16">
                <div className="flex flex-col gap-2">
                    <h1 className="text-display-sm font-semibold text-primary">Orb</h1>
                    <p className="max-w-2xl text-md text-tertiary">The mark as real glass, drawn by the GPU. Move the pointer: the studio lights follow it.</p>
                </div>

                <section className="flex flex-col gap-3">
                    <div className="flex flex-col gap-1">
                        <h2 className="text-md font-semibold text-primary">Soap bubble, the study&rsquo;s still</h2>
                        <p className="max-w-2xl text-sm text-tertiary">
                            The ray-traced picture from the study, pixel for pixel: the same film and wall, drawn once on the CPU and kept as a file. Not live.
                        </p>
                    </div>
                    <div className="grid gap-3 xl:grid-cols-2">
                        <StillStage />
                        <StillStage dark />
                    </div>
                </section>

                {STUDIES.map((study) => (
                    <section key={study.title} className="flex flex-col gap-3">
                        <div className="flex flex-col gap-1">
                            <h2 className="text-md font-semibold text-primary">{study.title}</h2>
                            <p className="max-w-2xl text-sm text-tertiary">{study.note}</p>
                        </div>
                        <div className="grid gap-3 xl:grid-cols-2">
                            <Stage {...study} />
                            <Stage {...study} dark />
                        </div>
                    </section>
                ))}

                <section className="flex flex-col gap-3">
                    <div className="flex flex-col gap-1">
                        <h2 className="text-md font-semibold text-primary">Beside today&rsquo;s mark</h2>
                        <p className="max-w-2xl text-sm text-tertiary">The dotted orb the app uses now, at the sizes the glass has to hold up at too.</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-6 rounded-2xl bg-primary p-6 text-primary ring-1 ring-secondary ring-inset">
                        <OrbLogo size={64} />
                        <OrbLogo size={32} />
                        <OrbLogo size={16} />
                        <span className="flex items-center gap-2 text-lg font-semibold">
                            <OrbLogo size={24} />
                            Card Orb
                        </span>
                    </div>
                </section>

                <section className="flex flex-col gap-3">
                    <div className="flex flex-col gap-1">
                        <h2 className="text-md font-semibold text-primary">The icon, large</h2>
                        <p className="max-w-2xl text-sm text-tertiary">Each tile at 288 px, the size the App Store draws it.</p>
                    </div>
                    <div className="flex flex-wrap gap-6">
                        <Image
                            src="/orb-study/bubble-tile.png"
                            alt="The study&rsquo;s bubble, as the app icon"
                            width={288}
                            height={288}
                            className="shrink-0"
                            style={{ borderRadius: 64 }}
                            unoptimized
                        />
                        {STUDIES.map((study) => (
                            <OrbGlassTile key={study.title} size={288} material={study.material} label={`${study.title}, as the app icon`} />
                        ))}
                    </div>
                </section>
            </main>
        </div>
    );
}

// The study's render as files, laid out as the live rows are, so the two can be judged side by side.
function StillStage({ dark = false }: { dark?: boolean }) {
    // The dark page's render shows the dark page through the film, as the live bubbles do there.
    const src = dark ? "/orb-study/bubble-dark.png" : "/orb-study/bubble.png";
    const orb = (size: number) => <Image src={src} alt="" width={size} height={size} className="shrink-0" unoptimized />;
    return (
        <div className={cx("flex flex-wrap items-center gap-6 rounded-2xl bg-primary p-6 text-primary ring-1 ring-secondary ring-inset", dark && "dark-mode")}>
            <Image
                src="/orb-study/bubble-tile.png"
                alt="The study's bubble, as the app icon"
                width={120}
                height={120}
                className="shrink-0"
                style={{ borderRadius: 27 }}
                unoptimized
            />
            <div className="flex items-center gap-4">
                {orb(64)}
                {orb(32)}
                {orb(16)}
            </div>
            <span className="flex items-center gap-2 text-lg font-semibold">
                {orb(24)}
                Card Orb
            </span>
        </div>
    );
}

// One material on one page color: the icon, the bare orb at 64, 32 and 16, and the lockup. The
// dark stage carries the theme's own dark-mode class, so it is the app's dark page, not a guess at it.
function Stage({ material, dark = false }: { material: OrbGlassMaterial; dark?: boolean }) {
    const surface = dark ? "dark" : "light";
    return (
        <div className={cx("flex flex-wrap items-center gap-6 rounded-2xl bg-primary p-6 text-primary ring-1 ring-secondary ring-inset", dark && "dark-mode")}>
            <OrbGlassTile size={120} material={material} />
            <div className="flex items-center gap-4">
                <OrbGlass size={64} material={material} surface={surface} />
                <OrbGlass size={32} material={material} surface={surface} />
                <OrbGlass size={16} material={material} surface={surface} />
            </div>
            <span className="flex items-center gap-2 text-lg font-semibold">
                <OrbGlass size={24} material={material} surface={surface} />
                Card Orb
            </span>
        </div>
    );
}
