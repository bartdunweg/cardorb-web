import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PricesPublicRow } from "./prices-public-row";

/*
 * The row under Public profile: whether the public page prices what it shows. Three lines, and
 * the flip that saves at once.
 */

const setPricesPublic = vi.fn();
vi.mock("@/app/(app)/dashboard/settings/actions", () => ({
    setPricesPublic: (...args: unknown[]) => setPricesPublic(...args),
}));
const refresh = vi.fn();
vi.mock("@/lib/forget-mine", () => ({ forgetMineQuietly: () => Promise.resolve() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
const failed = vi.fn();
vi.mock("@/components/app/toast", () => ({ notify: { failed: (...args: unknown[]) => failed(...args) } }));

describe("PricesPublicRow", () => {
    beforeEach(() => {
        setPricesPublic.mockReset();
        refresh.mockReset();
        failed.mockReset();
    });

    it("says prices stay private while off", () => {
        render(<PricesPublicRow isPublic pricesPublic={false} onChange={vi.fn()} />);
        expect(screen.getByText("Prices stay private")).toBeInTheDocument();
        expect(screen.getByRole("switch", { name: "Show prices" })).not.toBeChecked();
    });

    it("says what the public page shows while on, and that it waits for the profile while that is private", () => {
        const { rerender } = render(<PricesPublicRow isPublic pricesPublic onChange={vi.fn()} />);
        expect(screen.getByText("Card prices and your collection's value are on your public page")).toBeInTheDocument();
        expect(screen.getByRole("switch", { name: "Show prices" })).toBeChecked();
        rerender(<PricesPublicRow isPublic={false} pricesPublic onChange={vi.fn()} />);
        expect(screen.getByText("Shown once your profile is public")).toBeInTheDocument();
        expect(screen.getByRole("switch", { name: "Show prices" })).not.toBeDisabled();
    });

    it("saves a flip at once and refreshes the page", async () => {
        setPricesPublic.mockResolvedValue({ ok: true });
        const onChange = vi.fn();
        render(<PricesPublicRow isPublic pricesPublic={false} onChange={onChange} />);
        fireEvent.click(screen.getByRole("switch", { name: "Show prices" }));
        expect(onChange).toHaveBeenCalledWith(true);
        await waitFor(() => expect(setPricesPublic).toHaveBeenCalledWith(true, { reread: false }));
        await waitFor(() => expect(refresh).toHaveBeenCalled());
        expect(failed).not.toHaveBeenCalled();
    });

    it("puts the switch back and says so when the save fails", async () => {
        setPricesPublic.mockResolvedValue({ ok: false, error: "The API is away." });
        const onChange = vi.fn();
        render(<PricesPublicRow isPublic pricesPublic={false} onChange={onChange} />);
        fireEvent.click(screen.getByRole("switch", { name: "Show prices" }));
        await waitFor(() => expect(failed).toHaveBeenCalledWith("Prices are still private", { description: "The API is away." }));
        expect(onChange).toHaveBeenLastCalledWith(false);
        expect(refresh).not.toHaveBeenCalled();
    });
});
