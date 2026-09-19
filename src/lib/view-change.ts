import { flushSync } from "react-dom";

/**
 * A change of how a list is drawn (its size, grid or list), crossfaded rather than reflowed in one
 * frame: the page's content (`main`) as one layer for the change, the old drawing out and the new in
 * on the page crossfade's curves (globals.css, `cards-view`). Opacity only, so nothing to reduce.
 *
 * It waits for the menu that asked to finish closing (its 100 ms, --duration-instant): the menu lives
 * outside `main`, in the root's layer, which the change draws under the page, so a menu still fading
 * out looked as if it fell behind the cards. Deep in a list the change is simply made: a shorter
 * drawing pulls the scroll back, and the old picture, placed from the page's top, landed off screen,
 * so the page faded in from empty. Where the browser has no view transitions it is simply made too.
 */
export function changeView(update: () => void) {
    const main = document.querySelector("main");
    if (!main || typeof document.startViewTransition !== "function" || window.scrollY > window.innerHeight) {
        update();
        return;
    }
    const wait = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--duration-instant")) || 100;
    window.setTimeout(() => {
        main.style.viewTransitionName = "cards-view";
        // Read by globals.css: the Collection | Wishlist line keeps no layer of its own inside this one.
        main.dataset.viewChange = "";
        const change = document.startViewTransition(() => flushSync(update));
        // Skipped (a hidden tab, another transition running) the change is still made; only the fade is not.
        change.ready.catch(() => undefined);
        change.updateCallbackDone.catch(() => undefined);
        change.finished
            .catch(() => undefined)
            .finally(() => {
                main.style.viewTransitionName = "";
                delete main.dataset.viewChange;
            });
    }, wait);
}
