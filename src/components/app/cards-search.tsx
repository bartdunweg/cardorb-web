"use client";

import type { KeyboardEvent } from "react";
import { useEffect, useId, useRef, useState } from "react";
import { SearchLg } from "@untitledui/icons";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { type TitleScope, suggestCardTitles } from "@/app/(app)/dashboard/cards/actions";
import { InputBase } from "@/components/base/input/input";
import type { CardTitle } from "@/lib/card-titles";
import { cx } from "@/utils/cx";

// Filters a card list by pushing a debounced `?q=` to the URL; the server page re-queries. The
// same box serves the owner's Cards page and a public profile; only the words differ.
//
// With a `scope`, it also offers the titles it knows: the names of cards in that very list that
// match what is typed. You search a binder by the title of a card ("Charizard", "Professor's
// Research"), so the field names them rather than letting you type into the dark (Bart's call,
// 2026-09-12). It stays free text: a set name, a number, half a word all still filter, and the
// list is a shortcut to the usual answer, not a gate in front of it.
export function CardsSearch({
    initialValue = "",
    label = "Search your cards",
    placeholder = "Search",
    className = "w-full max-w-80",
    size = "md",
    scope,
}: {
    initialValue?: string;
    label?: string;
    placeholder?: string;
    className?: string;
    /** sm beside the sm menu buttons of a folder page's row. */
    size?: "sm" | "md";
    /** The list this field filters. Absent (Browse, a public profile) there are no suggestions. */
    scope?: TitleScope;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [value, setValue] = useState(initialValue);
    /* The field used to keep up with the URL by being rebuilt: its whole view carried the URL as a
       key. That rebuild is gone (it took the caret out of the box on every committed keystroke),
       so the field follows the URL itself. Without this, the browser's Back button moved the list
       and left the old term sitting in the box.
       Reset during render rather than in an effect, the shape React asks for and the one
       `cards-list.tsx` already uses. */
    const [fromUrl, setFromUrl] = useState(initialValue);
    if (fromUrl !== initialValue) {
        setFromUrl(initialValue);
        setValue(initialValue);
    }

    useEffect(() => {
        // Only what was typed: on mount the URL already says what the field shows, and a shared page 2 must stay page 2.
        if (value === initialValue) return;
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

    const listId = useId();
    const [titles, setTitles] = useState<CardTitle[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    /** Which option the keyboard is on; -1 is the typed text itself, which is what Enter submits. */
    const [active, setActive] = useState(-1);
    /** The term already answered by a press on a suggestion: it must not open the list again. */
    const taken = useRef<string | null>(null);
    const scopeKey = JSON.stringify(scope ?? null);

    useEffect(() => {
        if (!scope) return;
        const term = value.trim();
        if (term.length < 2 || taken.current === term) {
            setTitles([]);
            setIsOpen(false);
            return;
        }
        let live = true;
        // Behind the URL's own 250 ms: what is on screen matters more than what is offered.
        const id = setTimeout(async () => {
            try {
                const found = await suggestCardTitles(term, scope);
                if (!live) return;
                setTitles(found);
                setActive(-1);
                setIsOpen(found.length > 0);
            } catch {
                // The field is free text with or without this; an API that will not answer leaves it that.
                if (live) setIsOpen(false);
            }
        }, 200);
        return () => {
            live = false;
            clearTimeout(id);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value, scopeKey]);

    const choose = (title: CardTitle) => {
        taken.current = title.name;
        setValue(title.name);
        setIsOpen(false);
        setActive(-1);
    };

    const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === "Escape" && isOpen) {
            event.preventDefault();
            setIsOpen(false);
            setActive(-1);
            return;
        }
        if (!isOpen || titles.length === 0) return;
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            const step = event.key === "ArrowDown" ? 1 : -1;
            // Past the last option is the typed text again (-1), so nothing is ever out of reach.
            const next = active + step < -1 ? titles.length - 1 : active + step >= titles.length ? -1 : active + step;
            setActive(next);
            if (next >= 0) document.getElementById(`${listId}-${next}`)?.scrollIntoView({ block: "nearest" });
            return;
        }
        if (event.key === "Enter" && active >= 0) {
            event.preventDefault();
            choose(titles[active]);
            return;
        }
        if (event.key === "Tab") setIsOpen(false);
    };

    return (
        <div className={cx("relative", className)}>
            {/* The ARIA combobox: a text field that offers a list, which is exactly what this is
                (WAI-ARIA APG). The rule wants a native datalist or a dropdown instead, and a
                datalist draws neither the count beside a title nor a hit area a thumb can reach. */}
            {/* eslint-disable-next-line jsx-a11y/prefer-tag-over-role -- see above: a native datalist cannot render these options. */}
            <InputBase
                aria-label={label}
                icon={SearchLg}
                placeholder={placeholder}
                value={value}
                onChange={(event) => {
                    taken.current = null;
                    setValue(event.target.value);
                }}
                onKeyDown={onKeyDown}
                onBlur={() => setIsOpen(false)}
                size={size}
                wrapperClassName="rounded-full"
                role={scope ? "combobox" : undefined}
                aria-expanded={scope ? isOpen : undefined}
                aria-controls={scope && isOpen ? listId : undefined}
                aria-autocomplete={scope ? "list" : undefined}
                aria-activedescendant={isOpen && active >= 0 ? `${listId}-${active}` : undefined}
            />

            {isOpen && (
                /* eslint-disable-next-line jsx-a11y/prefer-tag-over-role -- the listbox half of the combobox above; a dropdown control is not a combobox's popup. */
                <ul
                    id={listId}
                    role="listbox"
                    aria-label="Card titles"
                    className="absolute top-full right-0 left-0 z-50 mt-1 max-h-72 overflow-y-auto rounded-lg bg-primary py-1 shadow-lg ring-1 ring-secondary_alt"
                >
                    {titles.map((title, at) => (
                        /* eslint-disable-next-line jsx-a11y/prefer-tag-over-role -- the native option element only exists inside a dropdown, which this listbox is not. */
                        <li
                            key={title.name}
                            id={`${listId}-${at}`}
                            role="option"
                            aria-selected={at === active}
                            // The press lands before the blur that would close the list under it.
                            onMouseDown={(event) => {
                                event.preventDefault();
                                choose(title);
                            }}
                            onMouseMove={() => setActive(at)}
                            className={cx(
                                "flex cursor-pointer items-center justify-between gap-2 px-3 py-2 text-sm",
                                // Where the keyboard stands, in more than a tint: the tint alone is
                                // 1.04:1 against the list (measured), which is meaning by colour
                                // and not even a colour you can see. The app's own focus ring says it.
                                at === active && "bg-active outline-2 -outline-offset-2 outline-focus-ring",
                            )}
                        >
                            {/* The title first: a long set name beside it ("SVP Black Star Promos") took a
                                phone's whole row and left the name as "Pe...". */}
                            <span className="min-w-0 flex-1 truncate font-medium text-primary">{title.name}</span>
                            <span className="max-w-2/5 shrink-0 truncate text-xs text-tertiary">{title.hint}</span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
