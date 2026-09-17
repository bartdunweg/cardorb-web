import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { removeCard, restoreCard } from "@/app/(app)/dashboard/cards/actions";
import { notify } from "@/components/app/toast";
import type { RemovedCard } from "@/lib/api-shapes";
import { WishHeartButton } from "./wish-heart-button";

/*
 * "Put back" on a wish taken off the wishlist. The restore used to drop the cache inside its own
 * action, which drew the wishlist again in the action's answer, under the toast. It forgets nothing
 * there now: the cache goes through the quiet route, and the list is read again after.
 */

const removed = { name: "Pikachu", owned: false } as unknown as RemovedCard;
const refresh = vi.fn();

vi.mock("@/app/(app)/dashboard/cards/actions", () => ({
    removeCard: vi.fn(async () => ({ ok: true, card: removed })),
    restoreCard: vi.fn(async () => ({ ok: true })),
}));
vi.mock("@/components/app/toast", () => ({ notify: { removed: vi.fn(), failed: vi.fn(), done: vi.fn() } }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
const fetchMock = vi.fn(async () => new Response(null, { status: 204 }));
vi.stubGlobal("fetch", fetchMock);

describe("WishHeartButton's Put back", () => {
    it("restores without a re-read in the action, forgets quietly, then reads the list again", async () => {
        const onGone = vi.fn();
        render(<WishHeartButton card={{ id: "9b2f4d1e-3c5a-4e7b-8f90-1a2b3c4d5e6f", name: "Pikachu" }} onGone={onGone} />);
        await act(async () => fireEvent.click(screen.getByRole("button", { name: "Remove Pikachu from your wishlist" })));
        expect(onGone).toHaveBeenCalledTimes(1);

        const options = vi.mocked(notify.removed).mock.calls[0]?.[1] as { undo: { onUndo: () => void } };
        fetchMock.mockClear();
        refresh.mockClear();
        await act(async () => options.undo.onUndo());

        expect(restoreCard).toHaveBeenCalledWith(removed, { reread: false });
        expect(fetchMock).toHaveBeenCalledWith("/api/forget-mine?write=cards", { method: "POST" });
        expect(refresh).toHaveBeenCalledTimes(1);
    });
});

describe("WishHeartButton when a write throws", () => {
    it("keeps the tile and says so when the removal throws", async () => {
        vi.mocked(removeCard).mockRejectedValueOnce(new Error("offline"));
        vi.mocked(notify.failed).mockClear();
        const onGone = vi.fn();
        render(<WishHeartButton card={{ id: "1f2e3d4c-5b6a-4978-8a9b-0c1d2e3f4a5b", name: "Eevee" }} onGone={onGone} />);
        await act(async () => fireEvent.click(screen.getByRole("button", { name: "Remove Eevee from your wishlist" })));
        expect(onGone).not.toHaveBeenCalled();
        expect(notify.failed).toHaveBeenCalledWith("Eevee is still on your wishlist", { description: "Something went wrong. Try again." });
        expect(screen.getByRole("button", { name: "Remove Eevee from your wishlist" })).toBeInTheDocument();
    });

    it("says so when Put back throws, and reads nothing again", async () => {
        vi.mocked(notify.removed).mockClear();
        vi.mocked(notify.failed).mockClear();
        render(<WishHeartButton card={{ id: "2a3b4c5d-6e7f-4a8b-9c0d-1e2f3a4b5c6d", name: "Mew" }} onGone={vi.fn()} />);
        await act(async () => fireEvent.click(screen.getByRole("button", { name: "Remove Mew from your wishlist" })));
        const options = vi.mocked(notify.removed).mock.calls[0]?.[1] as { undo: { onUndo: () => void } };
        vi.mocked(restoreCard).mockRejectedValueOnce(new Error("offline"));
        refresh.mockClear();
        await act(async () => options.undo.onUndo());
        expect(notify.failed).toHaveBeenCalledWith("That did not go back", { description: "Something went wrong. Try again." });
        expect(refresh).not.toHaveBeenCalled();
    });
});
