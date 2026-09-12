import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Button } from "@/components/base/buttons/button";
import { ImportDialog } from "./import-dialog";

/*
 * What the dialog does when the action itself throws: not when it answers
 * `{ ok: false }`, which every branch already handles, but when the call never
 * comes back with an answer at all. That happened in production: a 1.4 MB
 * file hit Next's server-action body limit, the promise rejected, and the
 * screen sat on "reading…" with the drop zone disabled and no button. Somebody
 * reported it as "nothing happens", which was exactly right.
 */

const previewImport = vi.fn();
const commitImport = vi.fn();
vi.mock("@/app/(app)/dashboard/settings/import-actions", () => ({
    previewImport: (...args: unknown[]) => previewImport(...args),
    commitImport: (...args: unknown[]) => commitImport(...args),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

/** jsdom has no DataTransfer; the kit's drop zone builds its FileList through one. */
class FakeDataTransfer {
    files: File[] = [];
    items = { add: (f: File) => void this.files.push(f) };
}
vi.stubGlobal("DataTransfer", FakeDataTransfer);

const dropFile = async () => {
    render(
        <ImportDialog>
            <Button>Import</Button>
        </ImportDialog>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Import" }));
    const input = (await screen.findByRole("dialog")).querySelector("input[type=file]")!;
    fireEvent.change(input, { target: { files: [new File(["Name,Set\nPikachu,Base"], "cards.csv", { type: "text/csv" })] } });
};

const row = (line: number, name: string) => ({
    line,
    name,
    number: String(line),
    setName: "Base Set",
    rarity: null,
    owned: true,
    quantity: 1,
    finish: null,
    foilPattern: null,
    edition: null,
});

describe("ImportDialog when the action throws", () => {
    beforeEach(() => {
        previewImport.mockReset();
        commitImport.mockReset();
    });

    it("says so instead of reading forever", async () => {
        previewImport.mockRejectedValue(new Error("Body exceeded 1 MB limit."));
        await dropFile();

        await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Something went wrong"));
        expect(screen.queryByText(/Reading /)).toBeNull();
        expect(screen.getByRole("dialog").querySelector("input[type=file]")).not.toBeDisabled();
    });

    it("keeps the preview and says so when the write throws", async () => {
        previewImport.mockResolvedValue({
            ok: true,
            preview: { seen: 1, skipped: 0, notOwned: 0, existing: 0, sample: [], source: "generic", header: ["Name", "Set"], skippedRows: [] },
        });
        commitImport.mockRejectedValue(new Error("network"));
        await dropFile();

        const add = await screen.findByRole("button", { name: "Add 1 card" });
        fireEvent.click(add);

        await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("may or may not have finished"));
        expect(screen.getByRole("button", { name: "Add 1 card" })).not.toBeDisabled();
    });
});

describe("ImportDialog when the write is done", () => {
    beforeEach(() => {
        previewImport.mockReset();
        commitImport.mockReset();
    });

    it("counts what the write did, once it is done", async () => {
        previewImport.mockResolvedValue({
            ok: true,
            preview: {
                seen: 5,
                skipped: 3,
                notOwned: 2,
                existing: 1,
                sample: [],
                source: "generic",
                header: ["Name", "Set"],
                skippedRows: [{ line: 4, why: "no card name" }],
            },
        });
        commitImport.mockResolvedValue({ ok: true, result: { seen: 5, added: 2, skipped: 3, notOwned: 2, existing: 1 } });
        await dropFile();

        fireEvent.click(await screen.findByRole("button", { name: "Add 2 cards" }));

        // The figures on Done, each under its own word: the sentence above them
        // says how many were added, the columns say where the rest went.
        expect(await screen.findByText("2 cards added to your collection.")).toBeVisible();
        for (const [label, value] of [
            ["Rows read", "5"],
            ["Added", "2"],
            ["Already had", "1"],
            ["Not owned", "2"],
            ["Could not be read", "1"],
        ]) {
            expect(screen.getByText(label).parentElement).toHaveTextContent(value);
        }
        // And the line numbers survive the write, so a file that went half wrong
        // can still be opened up and looked at. Folded shut, because most files
        // have nothing in here worth a paragraph.
        const rows = screen.getByText("Rows that could not be read (1)");
        expect(rows.closest("details")).not.toHaveAttribute("open");
        fireEvent.click(rows);
        expect(screen.getByText("Line 4: no card name")).toBeVisible();
        // Nothing of Review is left: no table, and no button that writes again.
        expect(screen.queryByRole("button", { name: /^Add / })).toBeNull();
    });
});

describe("ImportDialog when rows are ticked off", () => {
    beforeEach(() => {
        previewImport.mockReset();
        commitImport.mockReset();
    });

    const threeRows = {
        ok: true,
        preview: {
            seen: 3,
            skipped: 0,
            notOwned: 0,
            existing: 0,
            sample: [],
            source: "generic",
            header: ["Name", "Set"],
            skippedRows: [],
            rows: [row(2, "Pikachu"), row(3, "Charizard"), row(4, "Bulbasaur")],
        },
    };

    it("starts with every row in, and writes the lines that are still ticked", async () => {
        previewImport.mockResolvedValue(threeRows);
        commitImport.mockResolvedValue({ ok: true, result: { seen: 3, added: 2, skipped: 0, notOwned: 0, existing: 0, excluded: 1, total: 1_600 } });
        await dropFile();

        // A file somebody chose to import starts as a file they mean to import.
        expect(await screen.findByRole("button", { name: "Add 3 cards" })).toBeVisible();

        fireEvent.click(screen.getByRole("checkbox", { name: "Import Charizard, Base Set" }));

        expect(screen.getByRole("button", { name: "Add 2 cards" })).toBeVisible();
        fireEvent.click(screen.getByRole("button", { name: "Add 2 cards" }));

        await waitFor(() => expect(commitImport).toHaveBeenCalled());
        // The line, not the position: line 3 is what the file calls Charizard.
        expect(commitImport.mock.calls[0]![0]).toMatchObject({ exclude: [3] });

        // And the write says how many were left out, and what the collection holds.
        expect(await screen.findByText("Left out by you")).toBeVisible();
        expect(screen.getByText("Your collection holds 1,600 cards now.")).toBeVisible();
    });

    it("takes every row out at once, and puts them back", async () => {
        previewImport.mockResolvedValue(threeRows);
        await dropFile();

        const all = await screen.findByRole("checkbox", { name: "Import every row" });
        fireEvent.click(all);

        expect(screen.getByRole("button", { name: "Nothing to add" })).toBeDisabled();
        fireEvent.click(screen.getByRole("checkbox", { name: "Import every row" }));
        expect(screen.getByRole("button", { name: "Add 3 cards" })).toBeVisible();
    });
});
