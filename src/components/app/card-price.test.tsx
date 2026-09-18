import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CardPrice } from "./card-price";

/* cardorb-api#561: a card listed and never sold shows its lowest listing, said as one. */
describe("CardPrice", () => {
    it("shows the market figure as the market price", () => {
        const { container } = render(<CardPrice price={12.5} listing={null} />);
        expect(container.textContent).toBe("Market price €12.50");
    });

    it("shows a lowest listing as “From”, and names it for a screen reader and on hover", () => {
        const { container } = render(<CardPrice price={null} listing={5771.49} />);
        const shown = container.firstElementChild as HTMLElement;
        expect(shown.title).toBe("Lowest listing on TCGplayer, no sales yet");
        expect(shown.querySelector("[aria-hidden='true']")?.textContent).toBe("From ");
        expect(shown.querySelector(".sr-only")?.textContent).toBe("Lowest listing on TCGplayer, no sales yet: ");
        expect(shown.textContent).toContain("€5,771.49");
    });

    it("prefers the market figure and shows nothing where neither is known", () => {
        expect(render(<CardPrice price={3} listing={9} />).container.textContent).toBe("Market price €3.00");
        expect(render(<CardPrice price={null} />).container.textContent).toBe("");
    });
});
