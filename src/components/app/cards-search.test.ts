import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/reads", () => ({ collectionIndex: vi.fn(), listSetsShelf: vi.fn(), suggestCardTitles: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }), usePathname: () => "/", useSearchParams: () => new URLSearchParams() }));

const { loadIndex } = await import("./cards-search");

const whole = { titles: [{ name: "Pikachu", hint: "Base" }], sets: [], complete: true };

/** A binder's names are kept for the tab, but only an answer: a failed read is asked again by the next field. */
describe("loadIndex", () => {
    it("keeps an answer and does not ask again", async () => {
        const read = vi.fn().mockResolvedValue(whole);
        expect(await loadIndex("kept", read)).toEqual(whole);
        expect(await loadIndex("kept", read)).toEqual(whole);
        expect(read).toHaveBeenCalledTimes(1);
    });

    it("does not keep a read that threw", async () => {
        const read = vi.fn().mockRejectedValueOnce(new Error("503")).mockResolvedValueOnce(whole);
        expect(await loadIndex("threw", read)).toMatchObject({ titles: [], complete: false });
        expect(await loadIndex("threw", read)).toEqual(whole);
        expect(read).toHaveBeenCalledTimes(2);
    });

    it("does not keep an answer marked unavailable", async () => {
        const read = vi.fn().mockResolvedValueOnce({ titles: [], sets: [], complete: false, failed: true }).mockResolvedValueOnce(whole);
        await loadIndex("unavailable", read);
        expect(await loadIndex("unavailable", read)).toEqual(whole);
        expect(read).toHaveBeenCalledTimes(2);
    });

    it("joins a read still on its way", async () => {
        let answer!: (index: typeof whole) => void;
        const read = vi.fn(
            () =>
                new Promise<typeof whole>((resolve) => {
                    answer = resolve;
                }),
        );
        const first = loadIndex("joined", read);
        const second = loadIndex("joined", read);
        answer(whole);
        expect(await first).toEqual(whole);
        expect(await second).toEqual(whole);
        expect(read).toHaveBeenCalledTimes(1);
    });
});
