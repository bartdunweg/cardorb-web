/**
 * Writes the page has taken but not yet sent, and the browser's own "Leave site?" while there are any.
 *
 * A tile's plus shows the new count at once and writes one step at a time (`useCopySteps`): a second
 * press waits in the page until the first write has answered. A reload or a closed tab in that
 * moment dropped the waiting press with the page, and the count came back one short. Only a real
 * unload asks: a move inside the app keeps the page's script running, so the writes go on.
 */
let held = 0;

const ask = (event: BeforeUnloadEvent) => {
    event.preventDefault();
    // Older browsers ask only when a value is set; its text is never shown.
    event.returnValue = "";
};

/** Holds the page until the returned function is called; calling it again does nothing. */
export function holdPage(): () => void {
    if (typeof window === "undefined") return () => undefined;
    if (held === 0) window.addEventListener("beforeunload", ask);
    held += 1;
    let released = false;
    return () => {
        if (released) return;
        released = true;
        held -= 1;
        if (held === 0) window.removeEventListener("beforeunload", ask);
    };
}
