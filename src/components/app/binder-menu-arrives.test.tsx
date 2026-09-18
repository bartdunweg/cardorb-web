import { Suspense, use } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Facets } from "@/lib/facets";
import { NO_FACETS } from "@/lib/facets";
import { BinderMenu } from "./binder-menu";

vi.mock("@/app/(app)/dashboard/collections/actions", () => ({ deleteBinder: vi.fn() }));
vi.mock("@/components/app/binder-dialog", () => ({ BinderModal: () => null }));
vi.mock("@/components/app/toast", () => ({ notify: { failed: vi.fn() } }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

const binder = { id: "b1", name: "Fire", kind: "manual" as const, rule: null, pokedex: null, isPublic: false };

function deferred() {
    let resolve: (f: Facets) => void = () => {};
    const promise = new Promise<Facets>((r) => {
        resolve = r;
    });
    return { promise, resolve };
}

function Arrived({ facets }: { facets: Promise<Facets> }) {
    return <BinderMenu binder={binder} facets={use(facets)} compact={false} />;
}

describe("a binder's menu while its facets are on the way", () => {
    it("stays open when they arrive", async () => {
        const { promise, resolve } = deferred();
        render(<BinderMenu binder={binder} facets={promise} compact={false} />);
        await act(async () => fireEvent.click(screen.getByRole("button", { name: "Open menu" })));
        expect(await screen.findByRole("menuitem", { name: /Delete binder/ })).toBeInTheDocument();

        await act(async () => resolve(NO_FACETS));
        expect(screen.getByRole("menuitem", { name: /Delete binder/ })).toBeInTheDocument();
    });

    // What the page did before: the menu without facets as a Suspense fallback. The one opened in
    // between is a different menu from the one drawn when they arrive, and it closes.
    it("closed when the menu was a Suspense fallback", async () => {
        const { promise, resolve } = deferred();
        render(
            <Suspense fallback={<BinderMenu binder={binder} compact={false} />}>
                <Arrived facets={promise} />
            </Suspense>,
        );
        await act(async () => fireEvent.click(screen.getByRole("button", { name: "Open menu" })));
        expect(await screen.findByRole("menuitem", { name: /Delete binder/ })).toBeInTheDocument();

        await act(async () => resolve(NO_FACETS));
        expect(screen.queryByRole("menuitem", { name: /Delete binder/ })).not.toBeInTheDocument();
    });
});
