import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { accessToken } = vi.hoisted(() => ({ accessToken: vi.fn() }));
vi.mock("@/lib/api", () => ({ accessToken, API_URL: "https://api.test/v1", API_TIMEOUT_MS: 1000 }));

const { GET } = await import("./route");

/** The collection as a file: an API that does not answer at all says what a refusal says, not a bare 500. */
describe("GET /dashboard/settings/export", () => {
    beforeEach(() => {
        accessToken.mockReset().mockResolvedValue("t");
    });
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("hands the file on as it came", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("a,b\n", { headers: { "content-type": "text/csv" } })));
        const res = await GET();
        expect(res.status).toBe(200);
        expect(await res.text()).toBe("a,b\n");
    });

    it("answers 503 with its words when the fetch throws", async () => {
        vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));
        const res = await GET();
        expect(res.status).toBe(503);
        expect(await res.text()).toBe("Your collection could not be read. Try again in a moment.");
    });

    it("answers 503 for a refusal and 401 for an expired session", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 500 })));
        expect((await GET()).status).toBe(503);
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 401 })));
        expect((await GET()).status).toBe(401);
    });

    it("refuses without a session", async () => {
        accessToken.mockResolvedValue(null);
        expect((await GET()).status).toBe(401);
    });
});
