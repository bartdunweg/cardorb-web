import { describe, expect, it, vi } from "vitest";
import { today } from "@/lib/format";

describe("today", () => {
    it("is the reader's date, not UTC's", () => {
        // 01:30 in Amsterdam on the 8th is still 23:30 UTC on the 7th. The old helper sliced the
        // ISO string and answered the 7th, so a card marked owned after midnight was recorded as
        // got the day before.
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-09-07T23:30:00Z"));
        const utc = new Date().toISOString().slice(0, 10);
        const mine = today();
        vi.useRealTimers();

        expect(utc).toBe("2026-09-07");
        // In a positive-offset zone this is the 8th; the point is that it follows the reader.
        expect(mine).toBe(new Date("2026-09-07T23:30:00Z").toLocaleDateString("en-CA"));
        expect(mine).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
});
