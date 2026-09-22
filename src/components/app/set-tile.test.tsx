import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { SetSummary } from "@/lib/sets";
import { SetTile } from "./set-tile";

/*
 * The tile is a picture with the words under it. What matters is that the box is never blank
 * (the logo, else the name's first word) and that the words say what the old row
 * said: the name and the count once, no bar. A set the catalogue has no cards for says so
 * instead of "0 of 60".
 */

const base: SetSummary = {
    id: "sv08",
    name: "Surging Sparks",
    localName: null,
    series: "Scarlet & Violet",
    releaseDate: "2024/11/08",
    logoUrl: "https://assets.tcgdex.net/en/sv/sv08/logo.png",
    colors: ["#1b4182", "#7a3fa8"],
    symbolUrl: "https://assets.tcgdex.net/en/sv/sv08/symbol.png",
    owned: 12,
    total: 207,
    complete: false,
    cardsRecorded: true,
};

describe("SetTile", () => {
    it("is one link to the set, with the logo, the name and the count, and no bar", () => {
        render(<SetTile set={base} language="en" />);
        const link = screen.getByRole("link");
        expect(link).toHaveAttribute("href", "/dashboard/sets/sv08");
        expect(link.querySelector("img")).toHaveAttribute("alt", "");
        expect(link.querySelectorAll("img")).toHaveLength(1);
        expect(screen.getByText("Surging Sparks")).toBeInTheDocument();
        expect(screen.getByText("12 of 207")).toBeInTheDocument();
        expect(screen.queryByRole("progressbar")).toBeNull();
    });

    it("writes the release date under the name, and not the set's own Japanese name", () => {
        render(<SetTile set={{ ...base, localName: "超電ブレイカー" }} language="ja" />);
        expect(screen.getByText("Nov 8, 2024")).toBeInTheDocument();
        expect(screen.queryByText(/超電ブレイカー/)).toBeNull();
    });

    it("draws the name's first word where there is no logo, and not the symbol", () => {
        render(<SetTile set={{ ...base, logoUrl: null }} language="en" />);
        expect(screen.getByRole("link").querySelector("img")).toBeNull();
        const word = screen.getByText("Surging", { selector: "[aria-hidden]" });
        expect(word).toBeInTheDocument();
    });

    it("says the catalogue has no cards yet instead of a count, and is dimmed when nothing is owned", () => {
        render(<SetTile set={{ ...base, owned: 0, cardsRecorded: false }} language="ja" />);
        const link = screen.getByRole("link");
        expect(link).toHaveAttribute("href", "/dashboard/sets/sv08?language=ja");
        expect(link.className).toContain("opacity-70");
        expect(screen.getByText("No cards in the catalogue yet")).toBeInTheDocument();
        expect(screen.queryByText(/ of /)).toBeNull();
        expect(screen.queryByRole("progressbar")).toBeNull();
    });

    // Nobody was asked what is held (a shelf read without a session): the set's size, which is the
    // catalogue's own fact, and never "0 of 207", which would say the visitor owns none of it.
    it("says the set's size alone where nothing is marked, and is not dimmed", () => {
        render(<SetTile set={{ ...base, owned: null, complete: null }} language="en" />);
        expect(screen.getByText("207 cards")).toBeInTheDocument();
        expect(screen.queryByText(/ of /)).toBeNull();
        expect(screen.queryByText("0 of 207")).toBeNull();
        expect(screen.queryByRole("progressbar")).toBeNull();
        expect(screen.getByRole("link").className).not.toContain("opacity-70");
    });
});
