"use client";

import { useEffect } from "react";
import { notify } from "@/components/app/toast";
import { KEPT_PRESS_DONE_COOKIE, keptPressDone, keptPressSentence } from "@/lib/kept-press";

/**
 * Says what happened to a visitor's kept press, once, on the page signing in lands on.
 *
 * Signing in carries the press through (kept-press-apply.ts) and leaves a short cookie saying how
 * it went. The write happened somewhere the person could not see, so it is told by name: a toast,
 * which the toast system announces. The cookie is removed before anything is said, so it is said
 * once, and a value that is not one (not JSON, not the shape) is removed and says nothing.
 *
 * Mounted once in the app's frame, which Home and every set page sit in. Draws nothing.
 */
export function KeptPressNotice() {
    useEffect(() => {
        const raw = readCookie(KEPT_PRESS_DONE_COOKIE);
        if (raw === null) return;
        document.cookie = `${KEPT_PRESS_DONE_COOKIE}=; path=/; max-age=0; samesite=lax`;

        let value: unknown;
        try {
            value = JSON.parse(raw);
        } catch {
            return;
        }
        const parsed = keptPressDone.safeParse(value);
        if (!parsed.success) return;
        const sentence = keptPressSentence(parsed.data);
        // One id, so a second mount in the same moment updates the toast rather than stacking one.
        if (parsed.data.ok) notify.done(sentence, { id: KEPT_PRESS_DONE_COOKIE });
        else notify.failed(sentence, { id: KEPT_PRESS_DONE_COOKIE });
    }, []);
    return null;
}

/** One cookie's value, decoded as the server encoded it; null when there is none. */
function readCookie(name: string): string | null {
    for (const part of document.cookie.split(";")) {
        const at = part.indexOf("=");
        if (at < 0 || part.slice(0, at).trim() !== name) continue;
        const value = part.slice(at + 1).trim();
        try {
            return decodeURIComponent(value);
        } catch {
            // Not what the server writes: still this cookie, so still removed, and then silent.
            return value;
        }
    }
    return null;
}
