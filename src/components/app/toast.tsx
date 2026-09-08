"use client";

import { AlertCircle, CheckCircle } from "@untitledui/icons";
import { Toaster as SonnerToaster, toast as sonner } from "sonner";
import { Button } from "@/components/base/buttons/button";
import { CloseButton } from "@/components/base/buttons/close-button";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icon";

/**
 * What the app says back when something happened somewhere you are not looking.
 *
 * The rule for using it, so this does not become wallpaper: a toast is for a change you cannot
 * see. A star that fills, a tile that appears in the list under your thumb, a sheet that closes —
 * those answer for themselves and get no toast. A card filed into a Binder on another page, a
 * write whose only proof is that nothing broke, and every failure: those get one.
 *
 * The box is the kit's, built from the same parts as `application/alerts` — FeaturedIcon, Button,
 * CloseButton — rather than that component itself, which puts a "Dismiss" text button beside the
 * close cross. Two ways to do nothing, and with an undo beside them, three. Sonner is only the
 * shelf: the positioning, the stacking, the swipe and the live region are its work.
 */

type Tone = "done" | "failed";

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
const DURATION = { done: 4000, failed: Number.POSITIVE_INFINITY, undo: 10000 };

function show(tone: Tone, title: string, options: Options = {}) {
    return sonner.custom((toastId) => <ToastCard tone={tone} toastId={toastId} title={title} {...options} />, {
        id: options.id,
        duration: options.undo ? DURATION.undo : DURATION[tone],
    });
}

export const notify = {
    /** Something worked, and the proof of it is off screen. */
    done: (title: string, options?: Options) => show("done", title, options),
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
        <div className="relative flex w-full gap-4 rounded-xl border border-primary bg-primary_alt p-4 shadow-lg">
            <FeaturedIcon icon={tone === "done" ? CheckCircle : AlertCircle} color={tone === "done" ? "success" : "error"} theme="outline" size="md" />

            <div className="flex flex-1 flex-col gap-3 pr-6">
                <div className="flex flex-col gap-1">
                    {/* No truncation: a toast that cuts off the sentence it exists to say is worse
                        than a toast two lines tall. */}
                    <p className="text-sm font-semibold text-secondary">{title}</p>
                    {description ? <p className="text-sm text-tertiary">{description}</p> : null}
                </div>

                {undo ? (
                    <div className="flex">
                        <Button
                            size="sm"
                            color="link-color"
                            onClick={() => {
                                undo.onUndo();
                                dismiss();
                            }}
                        >
                            {undo.label ?? "Undo"}
                        </Button>
                    </div>
                ) : null}
            </div>

            {/* It leaves on its own and can be swiped away, but neither of those is something you
                can do with a keyboard. */}
            <CloseButton onClick={dismiss} size="sm" label="Close" className="absolute top-2 right-2" />
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
            position="bottom-right"
            // The phone's tab bar is a floating pill at the bottom edge; a toast under it would be
            // half a toast. This clears it.
            // Only the bottom is ours: the phone's tab bar is a floating pill at the bottom edge and
            // a toast under it would be half a toast. Naming left and right as well made the box
            // 375px wide *and* pushed it 16px right, so it hung off the screen; the sides are
            // sonner's own, which shrink the box instead of moving it.
            mobileOffset={{ bottom: "5.5rem" }}
            toastOptions={{ unstyled: true, classNames: { toast: "w-full" } }}
        />
    );
}
