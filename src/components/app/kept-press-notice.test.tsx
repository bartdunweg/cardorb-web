import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { notify } from "@/components/app/toast";
import { KEPT_PRESS_DONE_COOKIE } from "@/lib/kept-press";
import { KeptPressNotice } from "./kept-press-notice";

/*
 * The page signing in lands on says what the kept press came to, once. The cookie is written by
 * the server (kept-press-apply.ts), URI-encoded as Next writes every cookie, and read here.
 */

vi.mock("@/components/app/toast", () => ({ notify: { done: vi.fn(), failed: vi.fn(), removed: vi.fn(), dismiss: vi.fn() } }));

const setDone = (value: string) => {
    document.cookie = `${KEPT_PRESS_DONE_COOKIE}=${encodeURIComponent(value)}; path=/`;
};
const hasDone = () => document.cookie.split(";").some((part) => part.trim().startsWith(`${KEPT_PRESS_DONE_COOKIE}=`));

describe("KeptPressNotice", () => {
    beforeEach(() => {
        vi.mocked(notify.done).mockClear();
        vi.mocked(notify.failed).mockClear();
        document.cookie = `${KEPT_PRESS_DONE_COOKIE}=; path=/; max-age=0`;
    });

    it("names the card on the wishlist, once, and removes the cookie", () => {
        setDone(JSON.stringify({ target: "wishlist", name: "Charizard", ok: true }));
        expect(hasDone()).toBe(true);
        render(<KeptPressNotice />);
        expect(notify.done).toHaveBeenCalledTimes(1);
        expect(notify.done).toHaveBeenCalledWith("Charizard is on your wishlist.", expect.anything());
        expect(hasDone()).toBe(false);

        // A second page in the same browser has nothing left to say.
        render(<KeptPressNotice />);
        expect(notify.done).toHaveBeenCalledTimes(1);
    });

    it("names the card in the collection", () => {
        setDone(JSON.stringify({ target: "collection", name: "Pikachu", ok: true }));
        render(<KeptPressNotice />);
        expect(notify.done).toHaveBeenCalledWith("Pikachu is in your collection.", expect.anything());
    });

    it("says a press that did not carry through in the failure style", () => {
        setDone(JSON.stringify({ target: "wishlist", name: "Charizard", ok: false }));
        render(<KeptPressNotice />);
        expect(notify.failed).toHaveBeenCalledWith("Charizard could not be added. Press it again to try.", expect.anything());
        expect(notify.done).not.toHaveBeenCalled();
        expect(hasDone()).toBe(false);
    });

    it.each([
        ["not JSON", "{not json"],
        ["the wrong shape", JSON.stringify({ target: "binder", name: "Charizard", ok: true })],
        ["a missing field", JSON.stringify({ target: "wishlist", ok: true })],
    ])("removes a cookie that is %s and says nothing", (_, value) => {
        setDone(value);
        expect(hasDone()).toBe(true);
        render(<KeptPressNotice />);
        expect(hasDone()).toBe(false);
        expect(notify.done).not.toHaveBeenCalled();
        expect(notify.failed).not.toHaveBeenCalled();
    });

    it("removes a value that is not even encoded as the server encodes it, and says nothing", () => {
        document.cookie = `${KEPT_PRESS_DONE_COOKIE}=%E0%A4%A; path=/`;
        render(<KeptPressNotice />);
        expect(hasDone()).toBe(false);
        expect(notify.done).not.toHaveBeenCalled();
        expect(notify.failed).not.toHaveBeenCalled();
    });

    it("does nothing without the cookie", () => {
        document.cookie = "other=1; path=/";
        render(<KeptPressNotice />);
        expect(notify.done).not.toHaveBeenCalled();
        expect(notify.failed).not.toHaveBeenCalled();
        expect(document.cookie).toContain("other=1");
    });
});
