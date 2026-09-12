"use client";

import type { KeyboardEvent, ReactNode } from "react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { SearchLg } from "@untitledui/icons";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { type TitleScope, collectionIndex, suggestCardTitles } from "@/app/(app)/dashboard/cards/actions";
import { InputBase } from "@/components/base/input/input";
import { type CardTitle, type TitleSet, matchSets, matchTitles } from "@/lib/card-titles";
import { cx } from "@/utils/cx";

/** What one binder's field knows about that binder, kept for as long as the tab lives. */
type Index = { titles: CardTitle[]; sets: TitleSet[]; complete: boolean };

/* Every title in a binder, read once per binder and kept here rather than in the component: a
   field remounted by a filter or a view change asks again for what the tab already has. Keyed by
   the scope, so the wishlist and a binder do not answer for each other. */
const indexes = new Map<string, Index | Promise<Index>>();

/** What is offered under the field: a title to search for, or a set to narrow the list to. */
type Suggestion = { kind: "title"; title: CardTitle } | { kind: "set"; set: TitleSet };

// Filters a card list by pushing a debounced `?q=` to the URL; the server page re-queries. The
// same box serves the owner's Cards page and a public profile; only the words differ.
//
// With a `scope`, it also offers what it holds: the titles of cards in the very list it filters,
// and the sets those cards are in. You search a binder by the title of a card ("Charizard",
// "Professor's Research"), so the field names them rather than letting you type into the dark
// (Bart's call, 2026-09-12). It stays free text: a number, half a word, anything the API matches
// still filters, so the list is a shortcut to the usual answer and not a gate in front of it.
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
    /** Set where a press on a suggestion has already written the URL, so the field does not. */
    const wrote = useRef(false);
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
        /* A set was just chosen: that press wrote the URL itself, and this effect would write over
           it with the params it read before the navigation, dropping the very set it was given. */
        if (wrote.current) {
            wrote.current = false;
            return;
        }
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
    const term = value.trim();
    /** What the API answered, and for which term: an answer to an older term is not this list. */
    const [remote, setRemote] = useState<{ term: string; hits: Suggestion[] }>({ term: "", hits: [] });
    /** Which option the keyboard is on; -1 is the typed text itself, which is what Enter submits. */
    const [active, setActive] = useState(-1);
    /** The term a press on a suggestion already answered: it must not open the list again. */
    const [taken, setTaken] = useState<string | null>(null);
    const [index, setIndex] = useState<Index | null>(null);
    const scopeKey = JSON.stringify(scope ?? null);

    // The binder's own titles, once. Asked for on the first keystroke rather than on mount: a page
    // nobody searches never asks, and the read is small enough that the first term waits on it.
    useEffect(() => {
        if (!scope || !value.trim() || index) return;
        let live = true;
        const known = indexes.get(scopeKey) ?? collectionIndex(scope).catch(() => ({ titles: [], sets: [], complete: false }));
        indexes.set(scopeKey, known);
        Promise.resolve(known).then((ready) => {
            indexes.set(scopeKey, ready);
            if (live) setIndex(ready);
        });
        return () => {
            live = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value, scopeKey, index]);

    /* In hand: the answer is here, so it comes with the keystroke and nothing is asked. Worked out
       while the field renders rather than in an effect, because it is a view of what is typed. */
    const local = useMemo(() => {
        if (!scope || !index?.complete || term.length < 2) return null;
        return matchTitles(index.titles, term).map((title) => ({ kind: "title" as const, title }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [term, index, scopeKey]);

    /* The sets are the index's other half, and they come whole however large the binder is: the
       API counts them itself, so a collection too big to hold still knows every set it holds. */
    const setHits = useMemo(() => {
        if (!scope || !index || term.length < 2) return [];
        return matchSets(index.sets, term).map((set) => ({ kind: "set" as const, set }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [term, index, scopeKey]);

    // A binder too large to hold, or one still on its way: the API answers per term, behind the
    // URL's own 250 ms, because what is on screen matters more than what is offered beside it.
    useEffect(() => {
        if (!scope || local || term.length < 2) return;
        let live = true;
        const id = setTimeout(async () => {
            try {
                const titles = await suggestCardTitles(term, scope);
                if (live) setRemote({ term, hits: titles.map((title) => ({ kind: "title" as const, title })) });
            } catch {
                // The field is free text with or without this; an API that will not answer leaves it that.
                if (live) setRemote({ term, hits: [] });
            }
        }, 200);
        return () => {
            live = false;
            clearTimeout(id);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [term, local, scopeKey]);

    const found = [...(local ?? (remote.term === term ? remote.hits : [])), ...setHits];
    /* The term the list was put away for, by Escape, a press or a blur: it stays away until the
       next keystroke. And a term a suggestion just answered opens nothing, or choosing a title
       would offer that same title back. */
    const [dismissed, setDismissed] = useState<string | null>(null);
    const isOpen = Boolean(scope) && found.length > 0 && dismissed !== term && taken !== term;

    /* The keyboard starts on the typed text again whenever the text changes. Reset during render,
       the shape React asks for, as the URL above does. */
    const [activeFor, setActiveFor] = useState(term);
    if (activeFor !== term) {
        setActiveFor(term);
        setActive(-1);
    }

    const close = () => {
        setDismissed(term);
        setActive(-1);
    };

    const choose = (hit: Suggestion) => {
        if (hit.kind === "title") {
            setTaken(hit.title.name);
            setValue(hit.title.name);
            close();
            return;
        }
        // A set is not a term but a filter: the list narrows to it, the Filters button says so,
        // and the term that led here goes, because the set is the whole of what was meant.
        wrote.current = true;
        setTaken("");
        setValue("");
        close();
        const params = new URLSearchParams(searchParams.toString());
        params.delete("q");
        params.delete("page");
        params.set("set", hit.set.name);
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    };

    const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === "Escape") {
            // Once to put the list away, again to empty the field: what a search field does everywhere.
            event.preventDefault();
            if (isOpen) close();
            else if (value) setValue("");
            return;
        }
        if (!isOpen || found.length === 0) return;
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            const step = event.key === "ArrowDown" ? 1 : -1;
            // Past the last option is the typed text again (-1), so nothing is ever out of reach.
            const next = active + step < -1 ? found.length - 1 : active + step >= found.length ? -1 : active + step;
            setActive(next);
            if (next >= 0) document.getElementById(`${listId}-${next}`)?.scrollIntoView({ block: "nearest" });
            return;
        }
        if (event.key === "Enter" && active >= 0) {
            event.preventDefault();
            choose(found[active]);
            return;
        }
        if (event.key === "Tab") close();
    };

    const titles = isOpen ? found.filter((hit) => hit.kind === "title") : [];
    const sets = isOpen ? found.filter((hit) => hit.kind === "set") : [];
    // What the field did, for a screen reader: a list that appears in silence is a list a screen
    // reader user never learns about. Always mounted, as the filter sheet's own region is: one
    // that appears with its text in it is never read out. Only what is there is counted, because
    // "0 titles and 1 set" is a sentence about what the reader did not ask for.
    const counted = [
        titles.length && `${titles.length} title${titles.length === 1 ? "" : "s"}`,
        sets.length && `${sets.length} set${sets.length === 1 ? "" : "s"}`,
    ].filter(Boolean);
    const offered = isOpen ? `${counted.join(" and ")}, use the arrow keys` : "";

    const option = (hit: Suggestion, at: number) => (
        /* eslint-disable-next-line jsx-a11y/prefer-tag-over-role -- the native option element only exists inside a dropdown, which this listbox is not. */
        <li
            key={hit.kind === "title" ? hit.title.name : `set:${hit.set.name}`}
            id={`${listId}-${at}`}
            role="option"
            aria-selected={at === active}
            // The press lands before the blur that would close the list under it.
            onMouseDown={(event) => {
                event.preventDefault();
                choose(hit);
            }}
            onMouseMove={() => setActive(at)}
            className={cx(
                "flex cursor-pointer items-center justify-between gap-2 px-3 py-2 text-sm",
                // Where the keyboard stands, in more than a tint: the tint alone is 1.04:1 against
                // the list (measured), which is meaning by colour and not even a colour you can
                // see. The app's own focus ring says it.
                at === active && "bg-active outline-2 -outline-offset-2 outline-focus-ring",
            )}
        >
            {/* The title first: a long set name beside it ("SVP Black Star Promos") took a phone's
                whole row and left the name as "Pe...". */}
            <span className="min-w-0 flex-1 truncate text-secondary">{marked(hit.kind === "title" ? hit.title.name : hit.set.title, value.trim())}</span>
            <span className="max-w-2/5 shrink-0 truncate text-xs text-tertiary">{hit.kind === "title" ? hit.title.hint : "Set"}</span>
        </li>
    );

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
                    wrote.current = false;
                    setTaken(null);
                    setValue(event.target.value);
                }}
                onKeyDown={onKeyDown}
                onBlur={close}
                size={size}
                wrapperClassName="rounded-full"
                role={scope ? "combobox" : undefined}
                aria-expanded={scope ? isOpen : undefined}
                aria-controls={scope && isOpen ? listId : undefined}
                aria-autocomplete={scope ? "list" : undefined}
                aria-activedescendant={isOpen && active >= 0 ? `${listId}-${active}` : undefined}
            />

            <output aria-live="polite" className="sr-only">
                {offered}
            </output>

            {isOpen && (
                /* eslint-disable-next-line jsx-a11y/prefer-tag-over-role -- the listbox half of the combobox above; a dropdown control is not a combobox's popup. */
                <ul
                    id={listId}
                    role="listbox"
                    aria-label="Titles and sets"
                    className="absolute top-full right-0 left-0 z-50 mt-1 max-h-72 overflow-y-auto rounded-lg bg-primary py-1 shadow-lg ring-1 ring-secondary_alt"
                >
                    {/* Titles first, then the sets under a heading of their own, rather than ten
                        rows where a set looks like a card you own. Each set option says "Set"
                        beside it, which is what a screen reader reads out with the name: the
                        heading is the same thing said to the eye. */}
                    {titles.map((hit) => option(hit, found.indexOf(hit)))}
                    {sets.length > 0 && (
                        // Hidden from a screen reader on purpose: each option below says "Set" beside its name, so the heading would be a second saying of the same thing.
                        <li aria-hidden="true" className="px-3 pt-2 pb-1 text-xs font-semibold text-tertiary">
                            Sets
                        </li>
                    )}
                    {sets.map((hit) => option(hit, found.indexOf(hit)))}
                </ul>
            )}
        </div>
    );
}

/** The letters that were typed, marked in the name they matched, so a long list can be scanned. */
function marked(name: string, term: string): ReactNode {
    const at = term ? name.toLowerCase().indexOf(term.toLowerCase()) : -1;
    if (at < 0) return name;
    return (
        <>
            {name.slice(0, at)}
            <mark className="bg-transparent font-semibold text-primary">{name.slice(at, at + term.length)}</mark>
            {name.slice(at + term.length)}
        </>
    );
}
