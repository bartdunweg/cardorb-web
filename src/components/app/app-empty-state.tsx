"use client";

import type { ReactNode } from "react";
import { Folder, Heart, Plus, SearchLg, Star01 } from "@untitledui/icons";
import { EmptyState } from "@/components/application/empty-state/empty-state";

// Client wrapper around the Untitled EmptyState. Server Components can't read its compound
// subcomponents (EmptyState.Header, …) across the RSC boundary — they come back undefined — so the
// whole empty state (and its icon, a function that also can't cross the boundary) lives here.
const ICONS = { folder: Folder, heart: Heart, plus: Plus, search: SearchLg, star: Star01 } as const;

export function AppEmptyState({ icon, title, description, children }: { icon: keyof typeof ICONS; title: string; description: string; children?: ReactNode }) {
    const Icon = ICONS[icon];

    return (
        <div className="flex flex-1 items-center justify-center">
            <EmptyState size="lg">
                <EmptyState.Header>
                    <EmptyState.FeaturedIcon icon={Icon} color="gray" />
                </EmptyState.Header>
                <EmptyState.Content>
                    <EmptyState.Title>{title}</EmptyState.Title>
                    <EmptyState.Description>{description}</EmptyState.Description>
                </EmptyState.Content>
                {children ? <EmptyState.Footer>{children}</EmptyState.Footer> : null}
            </EmptyState>
        </div>
    );
}
