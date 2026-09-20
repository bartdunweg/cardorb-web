import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { deleteBinder } from "@/app/(app)/dashboard/collections/actions";
import { notify } from "@/components/app/toast";
import { BinderMenu } from "./binder-menu";

/*
 * Deleting a binder whose action throws: the confirm button used to spin for good. It stops, the
 * dialog stays, and the toast says the binder was not deleted.
 */

const push = vi.fn();
vi.mock("@/app/(app)/dashboard/collections/actions", () => ({ deleteBinder: vi.fn() }));
vi.mock("@/components/app/binder-dialog", () => ({ BinderModal: () => null }));
vi.mock("@/components/app/toast", () => ({ notify: { failed: vi.fn(), writeFailed: vi.fn() } }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

describe("BinderMenu delete", () => {
    it("stops spinning and says so when the delete throws", async () => {
        vi.mocked(deleteBinder).mockRejectedValueOnce(new Error("offline"));
        render(<BinderMenu binder={{ id: "b1", name: "Fire", kind: "manual", rule: null, pokedex: null, isPublic: false }} compact={false} />);

        await act(async () => fireEvent.click(screen.getByRole("button")));
        await act(async () => fireEvent.click(await screen.findByRole("menuitem", { name: /Delete binder/ })));
        const confirm = await screen.findByRole("button", { name: "Delete" });
        await act(async () => fireEvent.click(confirm));

        expect(notify.writeFailed).toHaveBeenCalledWith("Fire was not deleted", { ok: false, error: "Something went wrong. Try again." });
        expect(push).not.toHaveBeenCalled();
        expect(screen.getByRole("button", { name: "Delete" })).not.toHaveAttribute("data-loading");
    });
});
