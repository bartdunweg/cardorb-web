"use client";

import { useEffect, useState } from "react";
import { SearchLg } from "@untitledui/icons";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/base/input/input";

// Filters a card list by pushing a debounced `?q=` to the URL; the server page re-queries. The
// same box serves the owner's Cards page and a public profile; only the words differ.
export function CardsSearch({
    initialValue = "",
    label = "Search your cards",
    placeholder = "Search your collection",
    className = "w-full max-w-80",
    size = "md",
}: {
    initialValue?: string;
    label?: string;
    placeholder?: string;
    className?: string;
    /** sm beside the sm menu buttons of a folder page's row. */
    size?: "sm" | "md";
}) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [value, setValue] = useState(initialValue);

    useEffect(() => {
        const id = setTimeout(() => {
            const params = new URLSearchParams(searchParams.toString());
            if (value.trim()) params.set("q", value.trim());
            else params.delete("q");
            // A new term is a new result set; page 3 of the old one is nowhere in it.
            params.delete("page");
            const qs = params.toString();
            router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
        }, 250);
        return () => clearTimeout(id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

    return (
        <Input
            aria-label={label}
            icon={SearchLg}
            placeholder={placeholder}
            value={value}
            onChange={setValue}
            className={className}
            size={size}
            wrapperClassName="rounded-full"
        />
    );
}
