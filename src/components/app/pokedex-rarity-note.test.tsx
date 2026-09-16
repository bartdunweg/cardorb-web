import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PokedexRarityNote } from "./pokedex-rarity-note";

/*
 * "Count every rarity" answers on the press: the note goes before the write has landed, the write
 * asks for no redraw of its own, and a refused write brings the note back and says so.
 */

const updateCollection = vi.fn();
vi.mock("@/app/(app)/dashboard/collections/actions", () => ({
    updateCollection: (...args: unknown[]) => updateCollection(...args),
}));
const forget = vi.fn();
vi.mock("@/components/app/use-copy-steps", () => ({ forgetMineQuietly: () => (forget(), Promise.resolve()) }));
const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
const failed = vi.fn();
vi.mock("@/components/app/toast", () => ({ notify: { done: vi.fn(), failed: (...args: unknown[]) => failed(...args) } }));

const setting = { missing: true, rarities: ["Rare Holo"] };

describe("PokedexRarityNote", () => {
    beforeEach(() => {
        updateCollection.mockReset();
        forget.mockReset();
        refresh.mockReset();
        failed.mockReset();
    });

    it("goes on the press, writes without a re-read and refreshes once after the cache is gone", async () => {
        let land: (v: { ok: true }) => void = () => undefined;
        updateCollection.mockReturnValue(new Promise((r) => (land = r)));
        render(<PokedexRarityNote folderId="f1" setting={setting} />);
        fireEvent.click(screen.getByRole("button", { name: "Count every rarity" }));
        expect(screen.queryByRole("button", { name: "Count every rarity" })).toBeNull();
        expect(updateCollection).toHaveBeenCalledWith("f1", { pokedex: { missing: true } }, { reread: false });
        expect(refresh).not.toHaveBeenCalled();
        land({ ok: true });
        await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
        expect(forget).toHaveBeenCalledTimes(1);
    });

    it("comes back and says so when the write fails", async () => {
        updateCollection.mockResolvedValue({ ok: false, error: "The API is away." });
        render(<PokedexRarityNote folderId="f1" setting={setting} />);
        fireEvent.click(screen.getByRole("button", { name: "Count every rarity" }));
        await waitFor(() => expect(failed).toHaveBeenCalledWith("Only these rarities still count", { description: "The API is away." }));
        expect(screen.getByRole("button", { name: "Count every rarity" })).toBeInTheDocument();
        expect(refresh).not.toHaveBeenCalled();
    });
});
