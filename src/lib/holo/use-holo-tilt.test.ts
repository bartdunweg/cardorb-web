import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useHoloTilt } from "./use-holo-tilt";

let reduced = false;
const frames: FrameRequestCallback[] = [];
let now = 0;

const flushFrame = () => {
    const due = frames.splice(0);
    now += 1000 / 60;
    due.forEach((cb) => cb(now));
};

const mount = () => {
    const card = document.createElement("div");
    const surface = document.createElement("div");
    card.appendChild(surface);
    document.body.appendChild(card);
    surface.getBoundingClientRect = () => ({ left: 0, top: 0, width: 200, height: 280, right: 200, bottom: 280, x: 0, y: 0, toJSON: () => ({}) });
    const hook = renderHook(() => useHoloTilt({ current: card }, { current: surface }, { orientation: "off" }));
    return { card, surface, hook };
};

beforeEach(() => {
    reduced = false;
    frames.length = 0;
    now = 0;
    vi.useFakeTimers();
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => frames.push(cb));
    vi.stubGlobal("cancelAnimationFrame", () => {
        frames.length = 0;
    });
    vi.stubGlobal("matchMedia", (q: string) => ({ matches: q.includes("reduce") && reduced, addEventListener() {}, removeEventListener() {} }));
});
afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    document.body.innerHTML = "";
});

describe("useHoloTilt", () => {
    it("tilts the card after a frame under a pointer", () => {
        const { card, surface } = mount();
        act(() => {
            surface.dispatchEvent(new PointerEvent("pointermove", { clientX: 0, clientY: 0, bubbles: true }));
        });
        expect(frames).toHaveLength(1);
        act(flushFrame);
        expect(parseFloat(card.style.getPropertyValue("--rotate-x"))).toBeGreaterThan(0);
        expect(card.style.getPropertyValue("--card-opacity")).not.toBe("0");
    });

    it("lets go a beat after the pointer leaves and settles flat", () => {
        const { card, surface } = mount();
        act(() => {
            surface.dispatchEvent(new PointerEvent("pointermove", { clientX: 0, clientY: 0, bubbles: true }));
        });
        for (let i = 0; i < 120; i++) act(flushFrame);
        const tilted = parseFloat(card.style.getPropertyValue("--rotate-x"));
        act(() => {
            surface.dispatchEvent(new PointerEvent("pointerleave", { bubbles: true }));
        });
        act(() => {
            vi.advanceTimersByTime(149);
        });
        expect(frames).toHaveLength(0);
        act(() => {
            vi.advanceTimersByTime(1);
        });
        for (let i = 0; i < 600 && frames.length; i++) act(flushFrame);
        expect(frames).toHaveLength(0);
        expect(tilted).not.toBe(0);
        expect(card.style.getPropertyValue("--rotate-x")).toBe("0deg");
        expect(card.style.getPropertyValue("--card-opacity")).toBe("0");
    });

    it("draws the card once, lit and flat, when motion is not wanted", () => {
        reduced = true;
        const { card, surface } = mount();
        expect(card.style.getPropertyValue("--rotate-x")).toBe("0deg");
        expect(card.style.getPropertyValue("--card-opacity")).toBe("1");
        act(() => {
            surface.dispatchEvent(new PointerEvent("pointermove", { clientX: 0, clientY: 0, bubbles: true }));
        });
        expect(frames).toHaveLength(0);
    });

    it("lies flat again when the tab is hidden", () => {
        const { card, surface } = mount();
        act(() => {
            surface.dispatchEvent(new PointerEvent("pointermove", { clientX: 0, clientY: 0, bubbles: true }));
        });
        act(flushFrame);
        Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
        act(() => {
            document.dispatchEvent(new Event("visibilitychange"));
        });
        expect(card.style.getPropertyValue("--rotate-x")).toBe("0deg");
        expect(frames).toHaveLength(0);
    });

    it("stops listening when unmounted", () => {
        const { card, surface, hook } = mount();
        hook.unmount();
        act(() => {
            surface.dispatchEvent(new PointerEvent("pointermove", { clientX: 0, clientY: 0, bubbles: true }));
        });
        expect(frames).toHaveLength(0);
        expect(card.style.getPropertyValue("--rotate-x")).toBe("");
    });
});
