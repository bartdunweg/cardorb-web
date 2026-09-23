import { beforeEach, describe, expect, it, vi } from "vitest";

const session = vi.fn();
vi.mock("@/lib/api", () => ({ session: () => session() }));

const { POST } = await import("./route");
const { KEPT_PRESS_COOKIE, readKeptPress } = await import("@/lib/kept-press");

/*
 * The one door a kept press comes in by. The attacker it stands against is another site parking a
 * press in a visitor's browser, to be applied when they sign in: so most of this is refusals.
 */
const ORIGIN = "https://cardorb.test";
const PRESS = {
    target: "wishlist",
    card: { name: "Charizard", set: "Base Set", number: "4", rarity: "Holo Rare", types: ["Fire"], tcgId: "base1-4", language: null },
    from: "/sets/base1",
};

function post(body: unknown, headers: Record<string, string> = {}) {
    return POST(
        new Request(`${ORIGIN}/api/keep-press`, {
            method: "POST",
            headers: { origin: ORIGIN, "content-type": "application/json", ...headers },
            body: typeof body === "string" ? body : JSON.stringify(body),
        }),
    );
}

const keptFrom = (res: Response) => {
    const set = res.headers.get("set-cookie") ?? "";
    const value = set.match(new RegExp(`${KEPT_PRESS_COOKIE}=([^;]*)`))?.[1];
    return value ? decodeURIComponent(value) : undefined;
};

beforeEach(() => {
    session.mockReset();
    session.mockResolvedValue(null);
});

describe("POST /api/keep-press", () => {
    it("keeps a visitor's press, dated by the server, httpOnly and for thirty minutes", async () => {
        const res = await post(PRESS);
        expect(res.status).toBe(204);
        const press = readKeptPress(keptFrom(res));
        expect(press?.target).toBe("wishlist");
        expect(press?.card.tcgId).toBe("base1-4");
        const cookie = res.headers.get("set-cookie") ?? "";
        expect(cookie).toMatch(/HttpOnly/i);
        expect(cookie).toMatch(/Max-Age=1800/);
        expect(cookie).toMatch(/SameSite=Lax/i);
    });

    it("refuses another site, which is the whole reason this is a POST", async () => {
        const res = await post(PRESS, { origin: "https://evil.example" });
        expect(res.status).toBe(403);
        expect(keptFrom(res)).toBeUndefined();
    });

    it("refuses a request with no Origin, and a sandboxed frame's null one", async () => {
        expect((await post(PRESS, { origin: "" })).status).toBe(403);
        expect((await post(PRESS, { origin: "null" })).status).toBe(403);
    });

    it("refuses a body that is not JSON, the kind a cross-site form can send without asking", async () => {
        expect((await post("target=wishlist", { "content-type": "application/x-www-form-urlencoded" })).status).toBe(415);
    });

    it("refuses a press that is not one of the two", async () => {
        expect((await post({ ...PRESS, target: "remove" })).status).toBe(400);
        expect((await post({ target: "wishlist" })).status).toBe(400);
        expect((await post("{not json", {})).status).toBe(400);
    });

    it("keeps nothing for somebody already signed in, whose press writes at once", async () => {
        session.mockResolvedValue({ userId: "u1", token: "t" });
        const res = await post(PRESS);
        expect(res.status).toBe(204);
        expect(keptFrom(res)).toBeUndefined();
    });

    it("refuses a press whose page is not one of ours, read as a return address", async () => {
        expect((await post({ ...PRESS, from: "https://evil.example/" })).status).toBe(400);
        expect((await post({ ...PRESS, from: "/\t/evil.com" })).status).toBe(400);
        expect((await post({ ...PRESS, from: "/login" })).status).toBe(400);
    });
});
