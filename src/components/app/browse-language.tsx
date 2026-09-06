"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { LanguageChips } from "@/components/app/language-chips";
import type { BrowseLanguage } from "@/lib/languages";
import { cx } from "@/utils/cx";

// Browse's language, kept in the URL (`?language=`) so the page can be shared and comes back
// the same; the shelf under it re-reads.
export function BrowseLanguage({ value }: { value: BrowseLanguage }) {
    const router = useRouter();
    const [pending, startTransition] = useTransition();
    return (
        <LanguageChips
            value={value}
            className={cx("transition-opacity", pending && "opacity-60")}
            onChange={(next) =>
                startTransition(() => router.replace(next === "en" ? "/dashboard/sets" : `/dashboard/sets?language=${next}`, { scroll: false }))
            }
        />
    );
}
