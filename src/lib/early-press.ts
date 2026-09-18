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
 * React's own listener on the document. Until the page says React is in (EarlyPressReplay, in the
 * root layout, calls `__replayPresses` from an effect, which runs once the page has committed), a
 * click on a button is held: stopped, remembered, and the page's cursor says it is on its way
 * (`html[data-press-waiting]`, globals.css) without the button looking disabled. Once React is in,
 * each held button is pressed again with `element.click()`. That is a virtual click, which
 * react-aria takes as a whole press (the same path a screen reader's press takes), and React
 * hydrates a boundary that is still the server's on the spot for it. A button pressed several
 * times while waiting is pressed once: a second tap on something that seemed dead is impatience,
 * not a request to open and close it again.
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
    '(function(){var w=window,d=document,r=false,q=[],downs=[],S="button:not([type=submit]):not([type=reset]),[role=button],[role=menuitem],[role=tab],[role=switch]";' +
    'function pick(e){var t=e.target,el=t&&t.closest?t.closest(S):null;if(!el||el.disabled||el.getAttribute("aria-disabled")==="true")return null;if(el.tagName!=="BUTTON"&&el.closest("a[href]"))return null;return el}' +
    'function key(el){return[el.tagName,el.getAttribute("aria-label")||"",(el.textContent||"").trim()]}' +
    "function same(a,b){var x=key(a);return x[0]===b[0]&&x[1]===b[1]&&x[2]===b[2]}" +
    "function place(el){var k=key(el),n=0,all=d.getElementsByTagName(el.tagName);for(var i=0;i<all.length;i++){if(all[i]===el)return n;if(same(all[i],k))n++}return 0}" +
    "function find(p){var n=0,all=d.getElementsByTagName(p.k[0]);for(var i=0;i<all.length;i++){if(same(all[i],p.k)){if(n===p.n)return all[i];n++}}return null}" +
    'function flush(){var list=q;q=[];d.documentElement.removeAttribute("data-press-waiting");for(var i=0;i<list.length;i++){var el=list[i].el.isConnected?list[i].el:find(list[i]);if(el)el.click()}}' +
    'w.addEventListener("pointerdown",function(e){if(r)return;var el=pick(e);if(el&&downs.indexOf(el)<0)downs.push(el)},true);' +
    'w.addEventListener("click",function(e){var el=pick(e);if(!el)return;if(r){var i=downs.indexOf(el);if(i<0||!e.isTrusted)return;downs.splice(i,1)}' +
    "e.preventDefault();e.stopImmediatePropagation();for(var j=0;j<q.length;j++){if(q[j].el===el)return}" +
    'q.push({el:el,k:key(el),n:place(el)});if(r)flush();else d.documentElement.setAttribute("data-press-waiting","")},true);' +
    "w.__replayPresses=function(){if(r)return;r=true;flush();setTimeout(function(){downs=[]},2000)}})()";

/** `sha256-` + base64 of EARLY_PRESS_SCRIPT, what the CSP names. Recompute when the script changes; the test tells you. */
export const EARLY_PRESS_SCRIPT_HASH = "c1pj560iWpEYFy2V5avFw/QOgyXVXBZgTI1EMXlgtQg=";
