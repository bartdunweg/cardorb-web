import { describe, expect, it } from "vitest";
import { holdPage } from "./unsent-writes";

const leave = () => {
    const event = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(event);
    return event.defaultPrevented;
};

describe("holdPage", () => {
    it("asks before leaving while a write is still to be sent, and not after", () => {
        expect(leave()).toBe(false);
        const release = holdPage();
        expect(leave()).toBe(true);
        release();
        expect(leave()).toBe(false);
    });

    it("marks the document while anything is held, for a test to wait on", () => {
        const marked = () => document.documentElement.hasAttribute("data-unsent-writes");
        expect(marked()).toBe(false);
        const a = holdPage();
        const b = holdPage();
        expect(marked()).toBe(true);
        a();
        expect(marked()).toBe(true);
        b();
        expect(marked()).toBe(false);
    });

    it("keeps asking until every hold is released, and a second release changes nothing", () => {
        const a = holdPage();
        const b = holdPage();
        a();
        a();
        expect(leave()).toBe(true);
        b();
        expect(leave()).toBe(false);
    });
});
