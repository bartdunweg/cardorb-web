import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PublicProfileRow } from "./public-profile-row";

/*
 * The row says what the sheet used to hide: whether the profile is public, and where it is.
 * Three states, and the flip that saves at once.
 */

const setProfilePublic = vi.fn();
vi.mock("@/app/(app)/dashboard/settings/actions", () => ({
    setProfilePublic: (...args: unknown[]) => setProfilePublic(...args),
}));
const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
const failed = vi.fn();
vi.mock("@/components/app/toast", () => ({ notify: { failed: (...args: unknown[]) => failed(...args) } }));

describe("PublicProfileRow", () => {
    beforeEach(() => {
        setProfilePublic.mockReset();
        refresh.mockReset();
        failed.mockReset();
    });

    it("shows the address as a link when public", () => {
        render(<PublicProfileRow username="ash" isPublic onChange={vi.fn()} />);
        const link = screen.getByRole("link", { name: /cardorb\.com\/user\/ash/ });
        expect(link).toHaveAttribute("href", "/user/ash");
        expect(link).toHaveAttribute("target", "_blank");
        expect(link).toHaveAttribute("rel", "noopener");
        expect(screen.getByRole("switch", { name: "Public profile" })).toBeChecked();
    });

    it("says only you can see it when private", () => {
        render(<PublicProfileRow username="ash" isPublic={false} onChange={vi.fn()} />);
        expect(screen.getByText("Only you can see it")).toBeInTheDocument();
        expect(screen.queryByRole("link")).toBeNull();
        expect(screen.getByRole("switch", { name: "Public profile" })).not.toBeChecked();
    });

    it("asks for a username first and disables the switch without one", () => {
        render(<PublicProfileRow username={null} isPublic={false} onChange={vi.fn()} />);
        expect(screen.getByText("Pick a username first")).toBeInTheDocument();
        expect(screen.getByRole("switch", { name: "Public profile" })).toBeDisabled();
    });

    it("saves a flip at once and refreshes the page", async () => {
        setProfilePublic.mockResolvedValue({ ok: true });
        const onChange = vi.fn();
        render(<PublicProfileRow username="ash" isPublic={false} onChange={onChange} />);
        fireEvent.click(screen.getByRole("switch", { name: "Public profile" }));
        expect(onChange).toHaveBeenCalledWith(true);
        await waitFor(() => expect(setProfilePublic).toHaveBeenCalledWith(true));
        await waitFor(() => expect(refresh).toHaveBeenCalled());
        expect(failed).not.toHaveBeenCalled();
    });

    it("puts the switch back and says so when the save fails", async () => {
        setProfilePublic.mockResolvedValue({ ok: false, error: "The API is away." });
        const onChange = vi.fn();
        render(<PublicProfileRow username="ash" isPublic={false} onChange={onChange} />);
        fireEvent.click(screen.getByRole("switch", { name: "Public profile" }));
        await waitFor(() => expect(failed).toHaveBeenCalledWith("Your profile is still private", { description: "The API is away." }));
        expect(onChange).toHaveBeenLastCalledWith(false);
        expect(refresh).not.toHaveBeenCalled();
    });
});
