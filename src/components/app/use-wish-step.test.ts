import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { removeCard } from "@/app/(app)/dashboard/cards/actions";
import { notify } from "@/components/app/toast";
import { useWishStep } from "./use-wish-step";

/*
 * The heart under a set tile, when its write throws instead of answering. The loop had no catch:
 * `flying` stayed true, so every later press only changed the picture and never wrote again.
 */

vi.mock("@/app/(app)/dashboard/cards/actions", () => ({ removeCard: vi.fn() }));
vi.mock("@/components/app/toast", () => ({ notify: { removed: vi.fn(), failed: vi.fn(), done: vi.fn() } }));
vi.mock("@/lib/forget-mine", () => ({ forgetMineQuietly: vi.fn(async () => undefined) }));

const beforeUnload = () => {
    const event = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(event);
    return event.defaultPrevented;
};

describe("useWishStep", () => {
    beforeEach(() => vi.clearAllMocks());

    it("takes the heart back, says so and writes again on the next press after an add that throws", async () => {
        const add = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce({ ok: true, id: "row-1" });
        const onShown = vi.fn();
        const { result } = renderHook(() => useWishStep({ name: "Pikachu", wished: false, rowId: undefined, add, onShown }));

        await act(async () => result.current.press(true));

        expect(add).toHaveBeenCalledTimes(1);
        expect(result.current.wished).toBe(false);
        expect(onShown).toHaveBeenLastCalledWith(false);
        expect(notify.failed).toHaveBeenCalledWith("Pikachu was not added to your wishlist");
        expect(beforeUnload()).toBe(false);

        await act(async () => result.current.press(true));

        expect(add).toHaveBeenCalledTimes(2);
        expect(result.current.wished).toBe(true);
        expect(result.current.id).toBe("row-1");
    });

    it("keeps the wish when a removal throws", async () => {
        vi.mocked(removeCard).mockRejectedValueOnce(new Error("offline"));
        const add = vi.fn();
        const { result } = renderHook(() => useWishStep({ name: "Pikachu", wished: true, rowId: "row-1", add }));

        await act(async () => result.current.press(false));

        expect(removeCard).toHaveBeenCalledWith("row-1", { reread: false });
        expect(result.current.wished).toBe(true);
        expect(notify.failed).toHaveBeenCalledWith("Pikachu is still on your wishlist");
    });

    it("holds the page while a wish is on its way", async () => {
        let answer: (value: { ok: true; id: string }) => void = () => undefined;
        const add = vi.fn(() => new Promise<{ ok: true; id: string }>((resolve) => (answer = resolve)));
        const { result } = renderHook(() => useWishStep({ name: "Pikachu", wished: false, rowId: undefined, add }));

        act(() => result.current.press(true));
        expect(beforeUnload()).toBe(true);

        await act(async () => answer({ ok: true, id: "row-1" }));
        expect(beforeUnload()).toBe(false);
    });
});
