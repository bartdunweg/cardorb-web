import { flushSync } from "react-dom";

/**
 * A change of how a list is drawn (its size, grid or list), crossfaded rather than reflowed in one
 * frame: the page's content (`main`) as one layer for the change, the old drawing out and the new in
 * on the page crossfade's curves (globals.css, `cards-view`). Opacity only, so nothing to reduce.
 * Where the browser has no view transitions the change is simply made.
 */
export function changeView(update: () => void) {
    const main = document.querySelector("main");
    if (!main || typeof document.startViewTransition !== "function") {
        update();
        return;
    }
    main.style.viewTransitionName = "cards-view";
    const change = document.startViewTransition(() => flushSync(update));
    // Skipped (a hidden tab, another transition running) the change is still made; only the fade is not.
    change.ready.catch(() => undefined);
    change.updateCallbackDone.catch(() => undefined);
    change.finished
        .catch(() => undefined)
        .finally(() => {
            main.style.viewTransitionName = "";
        });
}
