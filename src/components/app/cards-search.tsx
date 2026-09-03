"use client";

import { useEffect, useState } from "react";
import { SearchLg } from "@untitledui/icons";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/base/input/input";

// Filters the collection by pushing a debounced `?q=` to the URL; the server page re-queries.
export function CardsSearch({ initialValue = "" }: { initialValue?: string }) {
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
            aria-label="Search your cards"
            icon={SearchLg}
            placeholder="Search your collection"
            value={value}
            onChange={setValue}
            className="w-full max-w-80"
        />
    );
}
