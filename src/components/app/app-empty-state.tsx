"use client";

import type { ReactNode } from "react";
import { BookOpen01, Folder, Heart, Plus, SearchLg, Star01 } from "@untitledui/icons";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icon";
import { Circle } from "@/components/shared-assets/background-patterns/circle";

// The kit's EmptyState in the "lg" size, drawn here without the kit. The kit's module imports
// every file-type icon for its FileTypeIcon variant, which put 60 KB (gzip) of SVG on every page
// that can be empty; this page needs a featured icon, two lines and a button.
//
// Client component: a Server Component cannot hand an icon function across the boundary, so the
// icon is chosen here by name.
const ICONS = { book: BookOpen01, folder: Folder, heart: Heart, plus: Plus, search: SearchLg, star: Star01 } as const;

export function AppEmptyState({ icon, title, description, children }: { icon: keyof typeof ICONS; title: string; description: string; children?: ReactNode }) {
    const Icon = ICONS[icon];

    return (
        <div className="flex flex-1 items-start justify-center pt-6 lg:items-center lg:pt-0">
            <div className="mx-auto flex w-full max-w-lg flex-col items-center justify-center">
                <div className="relative mb-5">
                    <Circle size="md" className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                    <FeaturedIcon icon={Icon} color="gray" theme="modern" size="xl" className="relative z-10" />
                </div>
                <div className="z-10 mb-8 flex w-full max-w-88 flex-col items-center justify-center gap-2">
                    {/* h2: the page keeps its own h1, and an empty list is a section of it. */}
                    <h2 className="text-center text-xl font-semibold text-primary">{title}</h2>
                    <p className="text-center text-md text-tertiary">{description}</p>
                </div>
                {children ? <div className="z-10 flex gap-3">{children}</div> : null}
            </div>
        </div>
    );
}
