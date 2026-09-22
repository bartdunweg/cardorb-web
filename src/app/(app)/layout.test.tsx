import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

/*
 * The frame is the reason no page under it could ever be open.
 *
 * It reads the profile, the binders and the favourites count on every screen, and SessionGuard
 * sends a 401 to /login. For a visitor that is three refusals and a redirect before the page they
 * asked for has begun to render, whatever the API answers. So the test that matters here is not
 * what the frame draws without a session, it is what it does not ask.
 */

const session = vi.fn<() => Promise<{ userId: string; token: string } | null>>();
const profile = vi.fn(async () => ({ profile: { username: "bart", is_public: true }, email: "b@example.com" }));
const binders = vi.fn(async () => []);
const favorites = vi.fn(async () => 3);
const redirect = vi.fn();

vi.mock("@/lib/api", () => ({ session: () => session(), ApiError: class extends Error {} }));
vi.mock("@/lib/profile", () => ({ getMyProfile: () => profile(), accountFrom: () => ({ name: "Bart", email: "", avatarUrl: null, publicUrl: null }) }));
vi.mock("@/lib/binders", () => ({ getMyBinders: () => binders(), getFavoritesCount: () => favorites() }));
vi.mock("next/navigation", () => ({
    redirect: (to: string) => redirect(to),
    /* The frame's own transition and progress bar read the address. */
    usePathname: () => "/sets",
    useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
    useSearchParams: () => new URLSearchParams(),
}));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));

/* The frame's own children are not under test and several open sockets to the API if rendered. */
vi.mock("@/components/app/app-sidebar", () => ({ AppSidebar: () => <nav aria-label="Primary" /> }));
vi.mock("@/components/app/mobile-nav", () => ({ MobileTabBar: () => <nav aria-label="Tabs" /> }));
vi.mock("@/components/app/warm-lists", () => ({ WarmLists: () => null }));
vi.mock("@/hooks/use-list-memory", () => ({ RememberListQuery: () => null }));
vi.mock("@/components/app/toast", () => ({ Toasts: () => null }));
vi.mock("@/components/app/route-progress", () => ({ RouteProgress: () => null }));
/* React's view transition is not in the test environment, and the frame's job here is what it
   asks for, not how the page fades in. */
vi.mock("@/components/app/page-transition", () => ({ PageTransition: ({ children }: { children: React.ReactNode }) => <>{children}</> }));

const AppLayout = (await import("./layout")).default;

describe("the frame for a reader with no account", () => {
    beforeEach(() => {
        for (const m of [profile, binders, favorites, redirect]) m.mockClear();
    });

    it("draws the page it was given", async () => {
        session.mockResolvedValue(null);
        render(await AppLayout({ children: <h1>a set</h1> }));
        expect(screen.getByRole("heading", { name: "a set" })).toBeInTheDocument();
    });

    it("asks for no profile, no binders and no favourites", async () => {
        session.mockResolvedValue(null);
        await AppLayout({ children: <h1>a set</h1> });
        expect(profile).not.toHaveBeenCalled();
        expect(binders).not.toHaveBeenCalled();
        expect(favorites).not.toHaveBeenCalled();
    });

    it("still reads all three for somebody who is signed in", async () => {
        session.mockResolvedValue({ userId: "u1", token: "t" });
        await AppLayout({ children: <h1>a set</h1> });
        expect(profile).toHaveBeenCalled();
        expect(binders).toHaveBeenCalled();
        expect(favorites).toHaveBeenCalled();
    });
});
