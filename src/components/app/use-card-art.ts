"use client";

import type { RefObject } from "react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { NO_ART, nextArt } from "@/components/app/card-art";
import { type StepFrom, stepMotion } from "@/components/app/step-motion";
import type { Card, PublicCard } from "@/lib/cards";
import { orientationNeedsPermission, requestOrientation } from "@/lib/holo/orientation";

type Params = { card: Card | PublicCard | null; pressedImage: string | null; stepFromRef: RefObject<StepFrom> };

/**
 * The card sheet's pictures: the scan and the blurred copy behind the head, crossing over when the
 * card or the printing changes, and the phone's tilt the card can follow.
 */
export function useCardArt({ card, pressedImage, stepFromRef }: Params) {
    // On an iPhone the card can follow the phone's tilt once the browser has asked; a Tilt button
    // in the bar is the tap it asks from. The question is the browser's, read as an external store,
    // false on the server, so both renders agree.
    const tiltNeedsAsk = useSyncExternalStore(
        () => () => {},
        () => orientationNeedsPermission(),
        () => false,
    );
    const [tiltGranted, setTiltGranted] = useState(false);
    const askTilt = async () => {
        if (await requestOrientation()) setTiltGranted(true);
    };
    const canTilt = tiltNeedsAsk && !tiltGranted;

    /*
     * Stepping through a list with the arrows swapped the art in one frame: the header's colour
     * jumped and the card teleported. Now the art crosses over. The last card's scan and blurred
     * copy stay underneath while the next card's are fetched, and each fades in over them once
     * its own picture is on screen, not on mount, or the fade would run on an empty box and the
     * picture still pop in after it. The blurred copy is opacity only. The scan also travels:
     * 12 px in from the side its arrow sits on while the last one slides 12 px out the other way,
     * so stepping through a list reads as paging rather than as one card replaced by another.
     * 250 ms on the enter curve: this runs on every arrow press, so it stays small. Reduced
     * motion drops the travel and keeps the fade.
     *
     * The picture underneath is the very element that was showing the last card, not a copy of
     * it. It used to be a copy: a second <img> mounted at the moment of the step, and an <img>
     * that has just been put in the page paints nothing until the browser has decoded it, even
     * from cache, and next/image asks for that decode off the main thread. So for the first
     * frames after a press both layers were empty and the page's ground showed through the head:
     * a white blink on every step on a phone, where the decode takes longest. Now the layers are
     * a keyed list (`artStack`), the key being the scan's address: the last card's element stays
     * where it is and only becomes the one underneath, and the new one is added over it. The
     * scans sit inside the tilting card together, so a card tilted under the pointer cannot show
     * the one underneath peeking out beside it. The layer underneath goes once the fade has
     * ended. Adjusted during render.
     */
    const [art, setArt] = useState(NO_ART);
    const [scanLoaded, setScanLoaded] = useState(false);
    const [blurLoaded, setBlurLoaded] = useState(false);
    const scanFade = useRef<HTMLDivElement>(null);
    const prevScan = useRef<HTMLDivElement>(null);
    const blurFade = useRef<HTMLDivElement>(null);
    const fades = useRef<{ scan?: Animation; blur?: Animation; prev?: Animation }>({});
    const artNow = nextArt(art, pressedImage && card ? { image_url: pressedImage, image_high_url: null } : card);
    if (artNow !== art) {
        setArt(artNow);
        setScanLoaded(false);
    }
    /*
     * The blurred copy behind the head is the card's own picture, not the printing on show: pressing
     * Reverse or Cosmos holo swaps the card and leaves the colour behind it where it was, so nothing
     * but the card has to load again (Bart, 2026-09-15). It changes only with the card.
     */
    const [backdrop, setBackdrop] = useState(NO_ART);
    const backdropNow = nextArt(backdrop, card);
    if (backdropNow !== backdrop) {
        setBackdrop(backdropNow);
        setBlurLoaded(false);
    }
    /*
     * The fade is a Web Animation started the moment the picture reports in, not a class the
     * layer transitions to. A cached picture reports in the same task that made its layer
     * transparent, and a class flipped back within that task is never seen by the browser: it
     * styles the end state once and nothing crosses. An animation started then plays from zero
     * whatever the base style does underneath it. Both pictures are keyed by their address, so a
     * new picture is a fresh <img>: on a reused one Chrome still calls the old request complete
     * for a tick after the address changes, and next/image took that for the new picture being there.
     */
    const landed = (which: "scan" | "blur", layer: React.RefObject<HTMLDivElement | null>, set: (v: boolean) => void, done?: () => void) => () => {
        set(true);
        fades.current[which]?.cancel();
        fades.current.prev?.cancel();
        const el = layer.current;
        if (!el) return;
        const from: StepFrom = which === "scan" ? stepFromRef.current : { dir: 0, key: false, repeat: false };
        const motion = stepMotion(from, window.matchMedia("(prefers-reduced-motion: reduce)").matches);
        // A held arrow key: the picture is simply there, and the one under it goes with it.
        if (!motion) {
            done?.();
            return;
        }
        const tokens = getComputedStyle(el);
        const easing = tokens.getPropertyValue("--ease-enter").trim() || "ease-out";
        const travel = motion.travel;
        const duration = parseFloat(tokens.getPropertyValue(`--duration-${motion.duration}`)) || (motion.duration === "instant" ? 100 : 200);
        const fade = el.animate(
            [
                { opacity: 0, transform: `translateX(${travel}px)` },
                { opacity: 1, transform: "translateX(0)" },
            ],
            { duration, easing },
        );
        fades.current[which] = fade;
        if (done) fade.onfinish = done;
        // The last scan leaves the way the new one came, or it would peek out beside the new
        // one for the length of its travel.
        const under = which === "scan" ? prevScan.current : null;
        if (under && travel) {
            fades.current.prev = under.animate(
                [
                    { opacity: 1, transform: "translateX(0)" },
                    { opacity: 0, transform: `translateX(${-travel}px)` },
                ],
                {
                    duration,
                    easing,
                    fill: "forwards",
                },
            );
        }
    };
    // Stepping on before the last fade finished: its finish would have cleared the scan the
    // next card now needs underneath, so it is cancelled with the card it belonged to.
    useEffect(() => {
        const running = fades.current;
        return () => {
            running.scan?.cancel();
            running.prev?.cancel();
        };
    }, [art.shown?.scan]);
    useEffect(() => {
        const running = fades.current;
        return () => running.blur?.cancel();
    }, [backdrop.shown?.scan]);
    // Stepped back to the card still fading out: its picture never left the screen, so the browser
    // will not report it loaded again. The fade starts here instead, on the element it now is.
    const clearUnder = () => setArt((a) => (a.under ? { ...a, under: null } : a));
    const clearBackdropUnder = () => setBackdrop((a) => (a.under ? { ...a, under: null } : a));
    const swapped = art.swapped ? art.shown?.scan : undefined;
    useEffect(() => {
        if (!swapped) return;
        landed("scan", scanFade, setScanLoaded, clearUnder)();
        // Only on the step: the handlers are rebuilt each render and carry nothing of their own.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [swapped]);
    const backdropSwapped = backdrop.swapped ? backdrop.shown?.scan : undefined;
    useEffect(() => {
        if (!backdropSwapped) return;
        landed("blur", blurFade, setBlurLoaded, clearBackdropUnder)();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [backdropSwapped]);

    return {
        art,
        backdrop,
        scanLoaded,
        blurLoaded,
        scanFade,
        prevScan,
        blurFade,
        onScanLoad: () => landed("scan", scanFade, setScanLoaded, clearUnder)(),
        onBlurLoad: () => landed("blur", blurFade, setBlurLoaded, clearBackdropUnder)(),
        canTilt,
        tiltGranted,
        askTilt,
    };
}
