import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RouteProvider } from "@/providers/router-provider";
import { router, stubBrowser } from "@/test/press-harness";
import { AuthModal } from "./auth-modal";
import { LoginForm } from "./login-form";
import { SignupForm } from "./signup-form";

vi.mock("next/navigation", async () => (await import("@/test/press-harness")).navigationMock());
vi.mock("@/app/(auth)/actions", () => ({ signIn: vi.fn(async () => undefined), signUp: vi.fn(async () => undefined) }));

/*
 * Sign in and sign up over the page (auth-modal.tsx): the same forms as /login and /signup, in a
 * dialog named by the form, whose switch keeps the way back and takes this step's place, and whose
 * close goes back to the page it opened over.
 */
const draw = (form: React.ReactNode) =>
    render(
        <RouteProvider>
            <AuthModal>{form}</AuthModal>
        </RouteProvider>,
    );

beforeEach(() => {
    vi.clearAllMocks();
    stubBrowser();
});

describe("AuthModal", () => {
    it("is a dialog named by the form it holds", () => {
        draw(<LoginForm next="/sets/sv08" />);
        expect(screen.getByRole("dialog", { name: "Sign in" })).toBeInTheDocument();
    });

    it("switches to the other form carrying the page, in this step's place", async () => {
        draw(<LoginForm next="/sets/sv08" />);
        const signUp = screen.getByRole("link", { name: "Sign up" });
        expect(signUp).toHaveAttribute("href", "/signup?next=%2Fsets%2Fsv08");
        await act(async () => {
            fireEvent.click(signUp);
        });
        expect(router.replace).toHaveBeenCalledWith("/signup?next=%2Fsets%2Fsv08", expect.anything());
        expect(router.push).not.toHaveBeenCalled();
    });

    it("keeps the page on the sign-up form's way to signing in", () => {
        draw(<SignupForm next="/sets/sv08" />);
        expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/login?next=%2Fsets%2Fsv08");
    });

    it("closes by going back to the page it opened over", async () => {
        draw(<LoginForm next="/sets/sv08" />);
        await act(async () => {
            fireEvent.click(screen.getByRole("button", { name: "Close" }));
        });
        expect(router.back).toHaveBeenCalled();
    });
});
