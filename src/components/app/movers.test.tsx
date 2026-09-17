import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Card } from "@/lib/cards";
import type { Mover } from "@/lib/movers";

const { listRows, moversFor, failed } = vi.hoisted(() => ({ listRows: vi.fn(), moversFor: vi.fn(), failed: vi.fn() }));
vi.mock("@/lib/reads", () => ({ listRows, moversFor }));
vi.mock("@/components/app/toast", () => ({ notify: { failed, done: vi.fn() } }));
// The sheet stands in as the name of the card it is open on, with its arrows.
vi.mock("next/dynamic", () => ({
    default: () =>
        function Sheet({ card, onNext }: { card: Card | null; onNext?: (() => void) | null }) {
            return card ? (
                <div>
                    <p data-testid="sheet">{card.name}</p>
                    {onNext ? <button onClick={onNext}>Next</button> : null}
                </div>
            ) : null;
        },
}));

const { Movers } = await import("./movers");

const mover = (name: string): Mover =>
    ({ tcgId: name, name, number: "1", set: "Base", image: null, copies: 1, was: 1, now: 2, change: 1, pct: 100, total: 1, from: "", to: "" }) as Mover;
const row = (name: string) => ({ id: name, name, owned: true }) as unknown as Card;

function deferred<T>() {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>((r) => {
        resolve = r;
    });
    return { promise, resolve };
}

/** Home's movers open a card's sheet from a read: only the last tap's answer may open. */
describe("Movers", () => {
    beforeEach(() => {
        listRows.mockReset();
        failed.mockReset();
        moversFor.mockReset().mockResolvedValue({ up: [mover("Alakazam"), mover("Blastoise"), mover("Charizard")], down: [] });
    });

    it("opens the card tapped last, whichever read answers last", async () => {
        const first = deferred<Card[]>();
        const second = deferred<Card[]>();
        listRows.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
        render(<Movers />);
        const a = await screen.findByRole("button", { name: /Alakazam/ });
        fireEvent.click(a);
        fireEvent.click(screen.getByRole("button", { name: /Blastoise/ }));
        await act(async () => second.resolve([row("Blastoise")]));
        await act(async () => first.resolve([row("Alakazam")]));
        expect(screen.getByTestId("sheet").textContent).toBe("Blastoise");
    });

    it("steps on from the card asked for, not the one still shown", async () => {
        listRows.mockResolvedValueOnce([row("Alakazam")]);
        render(<Movers />);
        fireEvent.click(await screen.findByRole("button", { name: /Alakazam/ }));
        await screen.findByText("Next");
        const toB = deferred<Card[]>();
        listRows.mockReturnValueOnce(toB.promise).mockResolvedValueOnce([row("Charizard")]);
        fireEvent.click(screen.getByText("Next"));
        fireEvent.click(screen.getByText("Next"));
        await act(async () => toB.resolve([row("Blastoise")]));
        expect(screen.getByTestId("sheet").textContent).toBe("Charizard");
        expect(listRows).toHaveBeenLastCalledWith(expect.objectContaining({ name: "Charizard" }));
    });

    it("says so when no row comes back", async () => {
        listRows.mockResolvedValueOnce([]);
        render(<Movers />);
        const a = await screen.findByRole("button", { name: /Alakazam/ });
        await act(async () => fireEvent.click(a));
        expect(failed).toHaveBeenCalledOnce();
        expect(screen.queryByTestId("sheet")).toBeNull();
    });
});
