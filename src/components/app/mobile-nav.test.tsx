import type { ReactNode } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MobileTabBar } from "./mobile-nav";
import { RoutePendingProvider } from "./route-pending";

/*
 * The tab bar's pill answers the tap, not the page: it moves to the tapped tab the moment the link
 * is followed, stays there until the address arrives, and goes back to where the app is when the
 * navigation never lands (a timeout) or the history takes over (back or forward).
 */

let pathname = "/dashboard";
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));
vi.mock("@/hooks/use-list-memory", () => ({ useListMemory: () => ({}), withListQuery: (href: string) => href }));
vi.mock("next/link", () => ({
    // The real link needs the app router; this one only says where it goes when followed.
    default: (props: { href: string; onNavigate?: () => void; children: ReactNode; className?: string; "aria-current"?: "page" }) => (
        <a
            href={props.href}
            className={props.className}
            aria-current={props["aria-current"]}
            onClick={(event) => {
                event.preventDefault();
                props.onNavigate?.();
            }}
        >
            {props.children}
        </a>
    ),
}));

const pill = (container: HTMLElement) => container.querySelector<HTMLElement>("nav > div[aria-hidden]")!;
const bar = () => render(<RoutePendingProvider>{<MobileTabBar />}</RoutePendingProvider>);

describe("MobileTabBar pill", () => {
    beforeEach(() => {
        pathname = "/dashboard";
        vi.useFakeTimers();
    });
    afterEach(() => vi.useRealTimers());

    it("moves to the tapped tab before the page arrives", () => {
        const { container } = bar();
        expect(pill(container).style.transform).toBe("translateX(0%)");
        fireEvent.click(screen.getByRole("link", { name: /Wishlist/ }));
        expect(pill(container).style.transform).toBe("translateX(200%)");
        expect(screen.getByRole("link", { name: /Wishlist/ })).toHaveAttribute("aria-current", "page");
    });

    it("stays on the tab once the address matches", () => {
        const { container, rerender } = bar();
        fireEvent.click(screen.getByRole("link", { name: /Collection/ }));
        pathname = "/dashboard/cards";
        rerender(<RoutePendingProvider>{<MobileTabBar />}</RoutePendingProvider>);
        expect(pill(container).style.transform).toBe("translateX(300%)");
    });

    it("follows Back after a tap has arrived, with no line running", () => {
        const { container, rerender } = bar();
        fireEvent.click(screen.getByRole("link", { name: /Wishlist/ }));
        pathname = "/dashboard/wishlist";
        rerender(<RoutePendingProvider>{<MobileTabBar />}</RoutePendingProvider>);
        expect(pill(container).style.transform).toBe("translateX(200%)");
        pathname = "/dashboard";
        rerender(<RoutePendingProvider>{<MobileTabBar />}</RoutePendingProvider>);
        expect(pill(container).style.transform).toBe("translateX(0%)");
        expect(screen.getByRole("link", { name: /Home/ })).toHaveAttribute("aria-current", "page");
    });

    it("drops the tapped tab when the address lands somewhere else (a redirect)", () => {
        const { container, rerender } = bar();
        fireEvent.click(screen.getByRole("link", { name: /Browse/ }));
        pathname = "/dashboard/cards";
        rerender(<RoutePendingProvider>{<MobileTabBar />}</RoutePendingProvider>);
        expect(pill(container).style.transform).toBe("translateX(300%)");
    });

    it("goes back to the current tab when the navigation never lands", () => {
        const { container } = bar();
        fireEvent.click(screen.getByRole("link", { name: /Browse/ }));
        expect(pill(container).style.transform).toBe("translateX(100%)");
        act(() => vi.advanceTimersByTime(10_000));
        expect(pill(container).style.transform).toBe("translateX(0%)");
    });

    it("drops the tapped tab on back or forward", () => {
        const { container } = bar();
        fireEvent.click(screen.getByRole("link", { name: /Browse/ }));
        act(() => {
            window.dispatchEvent(new PopStateEvent("popstate"));
        });
        expect(pill(container).style.transform).toBe("translateX(0%)");
    });
});
