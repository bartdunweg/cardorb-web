"use client";

import { useRef, useState, useTransition } from "react";
import { holdPage } from "@/lib/unsent-writes";

/** What the store holds: a value and the row it sits on, where there is one. */
export type Held<V> = { value: V; id: string | undefined };

/** What one write came to: what the store holds now, or why it did not land. */
export type Landed<V> = Held<V> | { failure: string };

export type Failure<V> = {
    /** Why the run stopped. */
    error: string;
    /** Whether the write threw rather than answered (no signal, a deploy in between). */
    threw: boolean;
    /** The value last pressed, before the press is put back. */
    wanted: V;
    /** What the store holds, which the screen goes back to. */
    stored: Held<V>;
};

/**
 * A button that answers under the finger and a store that follows: the latest press wins.
 *
 * The screen shows the last value pressed at once. One write is in the air at a time, always toward
 * the last value pressed, and the run goes on until the store holds it; the presses in between are
 * never sent. Once the writes have landed `settle` runs (a re-read, a dropped cache), and a press
 * made during it goes round again rather than racing it. The page is held (`holdPage`) while a
 * press is unsent.
 *
 * The screen believes its own press until the page it sits on has changed. An action answers before
 * the page it streams, so a press in between read the page from before the write and wrote again
 * (every add is a new row). So `stored` is what this hook last wrote, and the page is taken over it
 * only when nothing flies and the page is a different one from the last press.
 *
 * A refused or thrown write stops the run: what was still to send is dropped, the screen goes back
 * to what the store holds, and `onFailed` says so, returning the error to show or null.
 *
 * `useCopySteps` (a count) and `useWishStep` (on or off) are this with their own writes and toasts.
 */
export function useLatestPress<V extends string | number | boolean>({
    value: valueOnPage,
    id: idOnPage,
    write,
    settle,
    onStored,
    onFailed,
}: {
    /** What the page says the store holds. */
    value: V;
    /** The row the page has it on. */
    id: string | undefined;
    /** One write from what the store holds toward the value wanted. */
    write: (from: Held<V>, to: V) => Promise<Landed<V>>;
    /** Once every write of a run has landed, before the page is let go. */
    settle: () => Promise<unknown>;
    /** After every write that lands. */
    onStored?: (held: Held<V>) => void;
    onFailed: (failure: Failure<V>) => string | null;
}) {
    const [pending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const page = `${valueOnPage}:${idOnPage ?? ""}`;
    // The last value pressed, the row it has so far, and the page it was pressed on.
    const [pressed, setPressed] = useState<(Held<V> & { on: string }) | null>(null);
    const shown: Held<V> = pressed && (pending || pressed.on === page) ? pressed : { value: valueOnPage, id: idOnPage };
    const want = useRef(valueOnPage);
    const flying = useRef(false);
    const stored = useRef<Held<V>>({ value: valueOnPage, id: idOnPage });
    const seen = useRef<string | null>(null);

    /** The screen and the next write go to `value`, without sending: what `press` does first. */
    const aim = (value: V) => {
        setError(null);
        const wanted = want.current;
        want.current = value;
        // The row only belongs to the value the store holds.
        setPressed({ value, id: value === stored.current.value ? stored.current.id : undefined, on: page });
        return { wanted, flying: flying.current };
    };

    /** What the store holds, set by hand for a write made outside a run (an Undo). */
    const keep = (held: Held<V>) => {
        stored.current = held;
        onStored?.(held);
    };

    /** One run: writes toward the value last pressed until the store holds it, then the settle. */
    const run = () => {
        flying.current = true;
        // A press waiting on the write before it lives only in this page: a reload now would drop it.
        const release = holdPage();
        startTransition(async () => {
            let failure: string | null = null;
            let threw = false;
            try {
                do {
                    while (want.current !== stored.current.value) {
                        const landed = await write(stored.current, want.current);
                        if ("failure" in landed) {
                            failure = landed.failure;
                            break;
                        }
                        stored.current = landed;
                        onStored?.(landed);
                        if (want.current === landed.value) setPressed({ ...landed, on: page });
                    }
                    // Once, with nothing in the air to race it; a press during it goes round again.
                    await settle();
                } while (!failure && want.current !== stored.current.value);
            } catch {
                threw = true;
                failure = "Something went wrong. Try again.";
            } finally {
                flying.current = false;
                release();
            }
            if (failure) {
                const wanted = want.current;
                want.current = stored.current.value;
                setPressed({ ...stored.current, on: page });
                setError(onFailed({ error: failure, threw, wanted, stored: stored.current }));
            }
        });
    };

    /** What the store holds, the value last pressed, and whether a write is in the air, as of now rather than as of a render. */
    const current = () => ({ stored: stored.current, wanted: want.current, flying: flying.current });

    /**
     * A write made outside a run (an Undo), counted as the one in the air: a press while it flies
     * moves the screen but sends nothing, and once `task` is done (having kept or put back what the
     * store holds) the run goes on toward that press.
     */
    const aside = async (task: () => Promise<void>) => {
        flying.current = true;
        const release = holdPage();
        try {
            await task();
        } finally {
            flying.current = false;
            release();
            if (want.current !== stored.current.value) run();
        }
    };

    const press = (value: V) => {
        // A page drawn again since the last press, and not by this hook's own writes, is the truth to start from.
        if (!flying.current && !pending && seen.current !== page) {
            seen.current = page;
            if (!pressed || pressed.on !== page) stored.current = { value: valueOnPage, id: idOnPage };
        }
        if (aim(value).flying) return;
        run();
    };

    return { value: shown.value, id: shown.id, error, press, aim, keep, current, aside };
}
