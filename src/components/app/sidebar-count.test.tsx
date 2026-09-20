import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Count } from "./app-sidebar";

/*
 * A new account's sidebar read "Favorites 0", and every binder it made read its own zero until the
 * first card went in. A zero beside a name is a badge that says less than the name alone
 * (error-path audit). A count that is really a count keeps its number, including the thousands
 * grouping every other count on screen has.
 */
describe("a binder's count in the sidebar", () => {
    it("draws nothing at all for an empty one", () => {
        const { container } = render(<Count count={0} />);
        expect(container.textContent).toBe("");
    });

    it("draws the number, grouped, as soon as there is one", () => {
        expect(render(<Count count={1} />).container.textContent).toMatch(/^1 card$/);
        expect(render(<Count count={1784} />).container.textContent).toMatch(/^1,784 cards$/);
    });
});
