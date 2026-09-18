/**
 * A press made before the page has hydrated is kept and handed to React once React is in.
 *
 * Every button is in the server's drawing, on screen and pressable, before the page's JavaScript
 * has run. The kit's buttons are react-aria's: their press handlers are React props, so until
 * React has taken the page over a press on one reached nothing at all. Nothing on screen said so;
 * the press was simply lost. On a phone that is the first second or two of every page, which is
 * how "New binder does nothing" reached the owner. A press that lands halfway (the finger down
 * before hydration, up after) was lost too: react-aria answers a click only after it has seen the
 * pointer go down, or when the click is a virtual one.
 *
 * So this script, the first thing in <head>, listens on the window in the capture phase, ahead of
 * React's own listener on the document. A click on a button React does not own yet is held:
 * stopped, remembered, and the page's cursor says it is on its way (`html[data-press-waiting]`,
 * globals.css) without the button looking disabled. React owns a button once the page has
 * committed (EarlyPressReplay, in the root layout, calls `__replayPresses` from an effect) and the
 * button carries React's `__reactFiber$` mark: a part the server streamed later, whose code is
 * still loading, is not React's yet even after the rest of the page is, and React drops a press on
 * it when it cannot hydrate it on the spot. Held presses are tried again every 50 ms, for up to
 * 20 seconds, and each goes to its button once React owns it, with `element.click()`. That is a
 * virtual click, which react-aria takes as a whole press (the same path a screen reader's press
 * takes). A button pressed several times while waiting is pressed once: a second tap on something
 * that seemed dead is impatience, not a request to open and close it again. A finger that went
 * down before React owned the button and comes up after is held the same way.
 *
 * Only buttons: a link works without JavaScript, and a submit button belongs to its form. Keyboard
 * presses arrive as the same click (Enter and Space on a native button click it), so they are held
 * alike. A button React drew again instead of hydrating (a hydration mismatch) is found again by
 * its tag, its name and its place among its namesakes.
 *
 * A string literal, not a stringified function, for the same reason as the theme's boot script:
 * the CSP names these exact bytes by hash (`src/lib/csp.ts`), and early-press.test.ts checks it.
 */

/** The attribute on <html> while a press waits; globals.css gives it the progress cursor. */
export const WAITING_ATTRIBUTE = "data-press-waiting";

/** What EarlyPressReplay calls on the window once React is in. */
export const REPLAY_FUNCTION = "__replayPresses";

export const EARLY_PRESS_SCRIPT =
    '(function(){var w=window,d=document,r=false,q=[],downs=[],timer=0,A="data-press-waiting",S="button:not([type=submit]):not([type=reset]),[role=button],[role=menuitem],[role=tab],[role=switch]";' +
    'function pick(e){var t=e.target,el=t&&t.closest?t.closest(S):null;if(!el||el.disabled||el.getAttribute("aria-disabled")==="true")return null;if(el.tagName!=="BUTTON"&&el.closest("a[href]"))return null;return el}' +
    'function live(el){if(!r)return false;var k=Object.keys(el);for(var i=0;i<k.length;i++){if(k[i].indexOf("__reactFiber$")===0)return true}return false}' +
    'function key(el){return[el.tagName,el.getAttribute("aria-label")||"",(el.textContent||"").trim()]}' +
    "function same(a,k){var x=key(a);return x[0]===k[0]&&x[1]===k[1]&&x[2]===k[2]}" +
    "function place(el){var k=key(el),n=0,all=d.getElementsByTagName(el.tagName);for(var i=0;i<all.length;i++){if(all[i]===el)return n;if(same(all[i],k))n++}return 0}" +
    "function find(p){var n=0,all=d.getElementsByTagName(p.k[0]);for(var i=0;i<all.length;i++){if(same(all[i],p.k)){if(n===p.n)return all[i];n++}}return null}" +
    'function flush(){timer=0;var keep=[],now=Date.now();for(var i=0;i<q.length;i++){var p=q[i];if(!p.el.isConnected)p.el=find(p)||p.el;if(p.el.isConnected&&live(p.el))p.el.click();else if(now-p.t<20000)keep.push(p)}q=keep;if(q.length){d.documentElement.setAttribute(A,"");timer=setTimeout(flush,50)}else d.documentElement.removeAttribute(A)}' +
    'w.addEventListener("pointerdown",function(e){var el=pick(e);if(el&&!live(el))downs.push({el:el,t:Date.now()})},true);' +
    'w.addEventListener("click",function(e){if(!e.isTrusted)return;var el=pick(e);if(!el)return;var down=false,now=Date.now();for(var i=downs.length-1;i>=0;i--){if(downs[i].el===el&&now-downs[i].t<10000)down=true;if(downs[i].el===el||now-downs[i].t>=10000)downs.splice(i,1)}if(!down&&live(el))return;' +
    "e.preventDefault();e.stopImmediatePropagation();for(var j=0;j<q.length;j++){if(q[j].el===el)return}q.push({el:el,k:key(el),n:place(el),t:now});if(timer)clearTimeout(timer);flush()},true);" +
    "w.__replayPresses=function(){r=true;if(timer)clearTimeout(timer);flush()}})()";

/** `sha256-` + base64 of EARLY_PRESS_SCRIPT, what the CSP names. Recompute when the script changes; the test tells you. */
export const EARLY_PRESS_SCRIPT_HASH = "ZVBlImYMf1y1SeyqOClVWrS/kvrrCYQaMLv1V2YWUds=";
