import { afterEach, describe, expect, it, vi } from "vitest";
import { FORGET_WRITES, type ForgetWrite } from "@/lib/cache-scopes";
import { CARDS_CHANGED, forgetMineQuietly } from "@/lib/forget-mine";

/*
 * The sidebar reads its counts again when a quiet write says so. A write that moves none of them (a
 * Pokédex face chosen, the profile) must not say it, or every swipe through a slot asked again.
 */
describe("forgetMineQuietly", () => {
    afterEach(() => vi.unstubAllGlobals());

    const forgot = () => vi.fn().mockResolvedValue(new Response(null, { status: 204 }));

    const said = async (write: ForgetWrite) => {
        vi.stubGlobal("fetch", forgot());
        const heard = vi.fn();
        window.addEventListener(CARDS_CHANGED, heard);
        await forgetMineQuietly(write);
        window.removeEventListener(CARDS_CHANGED, heard);
        return heard.mock.calls.length;
    };

    it("tells the sidebar after a card, a star, a binder or everything", async () => {
        expect(await said("cards")).toBe(1);
        expect(await said("favorite")).toBe(1);
        expect(await said("binders")).toBe(1);
        expect(await said("all")).toBe(1);
    });

    it("says nothing after a Pokédex face or the profile", async () => {
        expect(await said("dexFace")).toBe(0);
        expect(await said("profile")).toBe(0);
    });

    it("has decided for every write there is", () => {
        // A write added to cache-scopes.ts fails this, so the choice for it is made rather than defaulted.
        expect([...FORGET_WRITES].sort()).toEqual(["all", "binders", "cards", "dexFace", "favorite", "profile"]);
    });

    it("still forgets when it says nothing", async () => {
        const fetchMock = forgot();
        vi.stubGlobal("fetch", fetchMock);
        await forgetMineQuietly("dexFace");
        expect(fetchMock).toHaveBeenCalledWith("/api/forget-mine?write=dexFace", { method: "POST" });
    });

    it("names the set a set page's press was in, and names none where the caller has none", async () => {
        const fetchMock = forgot();
        vi.stubGlobal("fetch", fetchMock);
        await forgetMineQuietly("cards", "sv3pt5");
        expect(fetchMock).toHaveBeenLastCalledWith("/api/forget-mine?write=cards&set=sv3pt5", { method: "POST" });
        await forgetMineQuietly("cards");
        expect(fetchMock).toHaveBeenLastCalledWith("/api/forget-mine?write=cards", { method: "POST" });
    });
});
