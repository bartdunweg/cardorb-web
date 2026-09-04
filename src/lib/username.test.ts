import { describe, expect, it } from "vitest";
import { usernameFromEmail } from "./username";

describe("usernameFromEmail", () => {
    it("takes the local part, in the database's shape, with the suffix after it", () => {
        expect(usernameFromEmail("bart@example.com", "k4f9")).toBe("bart-k4f9");
        expect(usernameFromEmail("Bart.Dunweg+cards@example.com", "k4f9")).toBe("bart-dunweg-cards-k4f9");
    });

    it("never answers an empty or a too-long name", () => {
        expect(usernameFromEmail("@example.com", "k4f9")).toBe("collector-k4f9");
        expect(usernameFromEmail("...@example.com", "k4f9")).toBe("collector-k4f9");
        const long = usernameFromEmail("abcdefghijklmnopqrstuvwxyz0123456789@example.com", "k4f9");
        expect(long).toBe("abcdefghijklmnopqrstuvwx-k4f9");
        expect(long.length).toBeLessThanOrEqual(30);
        expect(long).toMatch(/^[a-z0-9][a-z0-9-]{1,29}$/);
    });

    it("draws a four-character suffix when none is given", () => {
        expect(usernameFromEmail("bart@example.com")).toMatch(/^bart-[a-z0-9]{4}$/);
    });
});
