"use client";

import { AlertCircle, RefreshCcw01 } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icon";
import { Circle } from "@/components/shared-assets/background-patterns/circle";

// What a signed-in screen shows when its reads threw: the same shape as AppEmptyState, so a
// failed page and an empty one sit in the same place, with the one thing an empty page has no
// use for — a way to try the same page again.
//
// Nearly every throw here is the Card Orb API answering 503 because a catalogue behind it did
// not answer (2026-09-04: TCGdex down, every page a bare Next error). That is a passing fault,
// so the copy says to try again and the first button does exactly that. `reset` re-renders the
// route segment, which repeats the reads; the second button is the way out when it keeps failing.
export function AppErrorState({ reset, home }: { reset: () => void; home: { href: string; label: string } }) {
    return (
        <div className="flex flex-1 items-center justify-center">
            <div className="mx-auto flex w-full max-w-lg flex-col items-center justify-center">
                <div className="relative mb-5">
                    <Circle size="md" className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                    <FeaturedIcon icon={AlertCircle} color="gray" theme="modern" size="xl" className="relative z-10" />
                </div>
                <div className="z-10 mb-8 flex w-full max-w-88 flex-col items-center justify-center gap-2">
                    {/* h1: this replaces the page, header included, so it is the page's title now. */}
                    <h1 className="text-center text-xl font-semibold text-primary">This page couldn&apos;t load</h1>
                    <p className="text-center text-md text-tertiary">The card service didn&apos;t answer. Try again in a moment.</p>
                </div>
                <div className="z-10 flex gap-3">
                    <Button color="secondary" size="lg" href={home.href}>
                        {home.label}
                    </Button>
                    <Button size="lg" iconLeading={RefreshCcw01} onClick={reset}>
                        Try again
                    </Button>
                </div>
            </div>
        </div>
    );
}
