"use client";

import { AlertCircle, CheckCircle, Trash01 } from "@untitledui/icons";
import { Toaster as SonnerToaster, toast as sonner } from "sonner";
import { Button } from "@/components/base/buttons/button";
import { CloseButton } from "@/components/base/buttons/close-button";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icon";

/**
 * What the app says back when something happened somewhere you are not looking.
 *
 * The rule for using it, so this does not become wallpaper: a toast is for a change you cannot
 * see. A star that fills, a tile that appears in the list under your thumb, a sheet that closes:
 * those answer for themselves and get no toast. A card filed into a Binder on another page, a
 * write whose only proof is that nothing broke, and every failure: those get one.
 *
 * The box is the kit's `application/notifications` in its parts (FeaturedIcon, Button,
 * CloseButton on Sonner) rather than that component itself, which puts a "Dismiss" text button
 * beside the close cross. Two ways to do nothing, and with an undo beside them, three. Sonner is
 * only the shelf: the positioning, the stacking, the swipe and the live region are its work.
 *
 * Three tones, each with its own icon, so the picture says what happened before the sentence
 * does: a tick for something that worked, a bin for something taken away, an alert for something
 * that did not happen. The kit's notification knows success, error and an info default; the bin
 * is its `icon` prop used, in the grey it gives the default.
 *
 * Two departures from the kit. The undo sits beside the sentence, not under it: one line, the way
 * the toast that says "Removed" with "Undo" at its end reads everywhere else, and a shorter box in
 * the middle of the screen. And the kit sets the title and the link button both semibold and
 * tells them apart by colour. Cardorb's brand colour is the same grey as secondary text, so here
 * the title is medium and the undo is the one bold word in the box.
 */

type Tone = "done" | "removed" | "failed";

type Options = {
    /** A second line, when the title alone leaves the obvious question unanswered. */
    description?: string;
    /** A way back. `label` defaults to "Undo". */
    undo?: { label?: string; onUndo: () => void };
    /** The same id twice updates that toast instead of stacking a second one. */
    id?: string;
};

// Long enough to read the sentence; longer when there is a decision in it, because an undo you
// notice only after it has gone is not a way back. A failure does not leave on its own at all: it
// is the only report that a write did not happen, and if it goes while you are looking elsewhere
// the screen is left saying nothing is wrong. It goes when you say so.
const DURATION = { done: 4000, removed: 4000, failed: Number.POSITIVE_INFINITY, undo: 10000 };

const ICON = {
    done: { icon: CheckCircle, color: "success", theme: "outline" },
    removed: { icon: Trash01, color: "gray", theme: "modern" },
    failed: { icon: AlertCircle, color: "error", theme: "outline" },
} as const;

function show(tone: Tone, title: string, options: Options = {}) {
    return sonner.custom((toastId) => <ToastCard tone={tone} toastId={toastId} title={title} {...options} />, {
        id: options.id,
        duration: options.undo ? DURATION.undo : DURATION[tone],
    });
}

export const notify = {
    /** Something worked, and the proof of it is off screen. */
    done: (title: string, options?: Options) => show("done", title, options),
    /** Something is gone: a card, a copy, a binder. Offer the way back where there is one. */
    removed: (title: string, options?: Options) => show("removed", title, options),
    /** Something did not work. Say what, in the app's own words, not the API's. */
    failed: (title: string, options?: Options) => show("failed", title, options),
    dismiss: (id?: string | number) => sonner.dismiss(id),
};

function ToastCard({
    tone,
    title,
    description,
    undo,
    toastId,
}: Options & {
    tone: Tone;
    title: string;
    toastId: string | number;
}) {
    const dismiss = () => sonner.dismiss(toastId);

    return (
        <div className="flex w-full items-center gap-3 rounded-xl border border-primary bg-primary_alt p-3 pl-4 shadow-lg">
            <FeaturedIcon {...ICON[tone]} size="md" />

            {/* No truncation: a toast that cuts off the sentence it exists to say is worse than a
                toast two lines tall. */}
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <p className="text-sm font-medium text-secondary">{title}</p>
                {description ? <p className="text-sm text-tertiary">{description}</p> : null}
            </div>

            {undo ? (
                <Button
                    size="sm"
                    color="link-color"
                    className="shrink-0"
                    onClick={() => {
                        undo.onUndo();
                        dismiss();
                    }}
                >
                    {undo.label ?? "Undo"}
                </Button>
            ) : null}

            {/* It leaves on its own and can be swiped away, but neither of those is something you
                can do with a keyboard. */}
            <CloseButton onClick={dismiss} size="sm" label="Close" className="shrink-0" />
        </div>
    );
}

/**
 * Mounted once, in the signed-in layout. Not in the root layout: the public pages are static text
 * and nothing there writes anything, so this stays out of their bundle.
 */
export function Toasts() {
    return (
        <SonnerToaster
            // Top and centre, where the eye already is after a press in a sheet or a dialog, and
            // clear of the phone's tab bar, which sits at the bottom. On a phone sonner drops the
            // fixed width and spans the screen between its side offsets, which are the page's own
            // gutter; only the top is ours, so the box clears a notch.
            position="top-center"
            mobileOffset={{ top: "max(1rem, env(safe-area-inset-top))" }}
            // Wider than sonner's default: the sentence, the undo and the cross share one line.
            style={{ "--width": "28rem" } as React.CSSProperties}
            toastOptions={{ unstyled: true, classNames: { toast: "w-full" } }}
        />
    );
}
