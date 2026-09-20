import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Card } from "@/lib/cards";
import { CopyCard } from "./copy-card";

/*
 * A field on a copy answers on the change: the new value shows before the write has landed, the
 * write asks for no redraw of its own, the cache is dropped quietly and only then is the sheet told
 * (it re-reads the list once for a run of fields). A refused write puts the old value back and says so.
 */

const editCopies = vi.fn();
vi.mock("@/app/(app)/dashboard/cards/actions", () => ({ editCopies: (...args: unknown[]) => editCopies(...args) }));
vi.mock("@/app/(app)/dashboard/collections/actions", () => ({ createBinder: vi.fn(), updateBinder: vi.fn() }));
vi.mock("@/lib/reads", () => ({ loadFacets: vi.fn().mockResolvedValue({ sets: [], rarities: [] }) }));
const forget = vi.fn();
vi.mock("@/lib/forget-mine", () => ({ forgetMineQuietly: () => (forget(), Promise.resolve()) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
const writeFailed = vi.fn();
vi.mock("@/components/app/toast", () => ({ notify: { done: vi.fn(), writeFailed: (...args: unknown[]) => writeFailed(...args) } }));
vi.stubGlobal("matchMedia", () => ({ matches: true, addEventListener() {}, removeEventListener() {} }));

const row = {
    id: "9b2f4d1e-3c5a-4e7b-8f90-1a2b3c4d5e6f",
    name: "Fomantis",
    set: "Pitch Black",
    number: "085",
    language: "en",
    finish: null,
    foil_pattern: null,
    condition: "Near Mint",
    grade: null,
    collection_id: null,
    quantity: 2,
    purchase_price: null,
    acquired_at: null,
} as unknown as Card;
const other = { ...row, id: "1a2b3c4d-3c5a-4e7b-8f90-9b2f4d1e5e6f" } as Card;

const draw = (onSaved: () => void) =>
    render(
        <CopyCard
            group={{ key: "nm", shown: row, rows: [row, other], quantity: 2 }}
            binders={[]}
            facts={null}
            busy={false}
            onSaved={onSaved}
            refreshBinders={async () => []}
        />,
    );

const condition = () => screen.getByRole("combobox", { name: "Condition" }) as HTMLSelectElement;

describe("CopyCard words", () => {
    /*
     * The row read "Kept as" while its select answered to "Condition", so a screen reader heard a
     * name that is not on screen (WCAG 2.5.3 Label in Name), and the app had two words for one thing:
     * the raw-or-graded switch above it was the one called Condition. The switch says what it picks
     * now, and the condition is called Condition in both places.
     */
    it("names the condition row the same on screen as to a screen reader", () => {
        draw(() => undefined);
        expect(screen.queryByText("Kept as")).not.toBeInTheDocument();
        expect(screen.getByText("Condition")).toBeInTheDocument();
        expect(condition()).toHaveAccessibleName("Condition");
        expect(screen.getByLabelText("Raw or graded")).toBeInTheDocument();
        expect(screen.getByText("Raw or graded")).toBeInTheDocument();
    });
});

describe("CopyCard field saves", () => {
    beforeEach(() => {
        editCopies.mockReset();
        forget.mockReset();
        writeFailed.mockReset();
    });

    it("shows the new value at once, writes every row without a re-read, and tells the sheet after the cache is gone", async () => {
        let land: (v: { ok: true }) => void = () => undefined;
        editCopies.mockReturnValue(new Promise((r) => (land = r)));
        const onSaved = vi.fn();
        draw(onSaved);
        fireEvent.change(condition(), { target: { value: "Played" } });
        expect(condition().value).toBe("Played");
        expect(editCopies).toHaveBeenCalledWith([row.id, other.id], { condition: "Played" }, { reread: false });
        expect(onSaved).not.toHaveBeenCalled();
        land({ ok: true });
        await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
        expect(forget).toHaveBeenCalledTimes(1);
        expect(forget.mock.invocationCallOrder[0]).toBeLessThan(onSaved.mock.invocationCallOrder[0]);
    });

    it("puts the old value back and says so when the write fails", async () => {
        editCopies.mockResolvedValue({ ok: false, error: "The API is away." });
        const onSaved = vi.fn();
        draw(onSaved);
        fireEvent.change(condition(), { target: { value: "Played" } });
        await waitFor(() => expect(writeFailed).toHaveBeenCalledWith("The condition did not change", { ok: false, error: "The API is away." }));
        expect(condition().value).toBe("Near Mint");
        expect(onSaved).not.toHaveBeenCalled();
        expect(forget).not.toHaveBeenCalled();
    });
});
