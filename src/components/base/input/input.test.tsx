import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Input } from "./input";

/*
 * A long password ran under the show/hide button: the field kept the 14 px end padding of a plain
 * one (login at 375 px: text box to 345, the button from 321 to 345). The invalid icon a TextField
 * shows through data-invalid had the same gap, because the kit padded for it only when `isInvalid`
 * reached InputBase as a prop, which Input never passes. e2e/ui-polish.spec.ts reads the rectangle.
 */
describe("an input with a trailing icon", () => {
    it("leaves the password toggle its room", () => {
        const { container } = render(<Input label="Password" type="password" size="md" />);
        expect(container.querySelector("input")!.className.split(" ")).toContain("pr-9");
    });

    it("leaves the room at the small size the login form uses", () => {
        const { container } = render(<Input label="Password" type="password" size="sm" />);
        expect(container.querySelector("input")!.className.split(" ")).toContain("pr-[calc(36em/14)]");
    });

    it("leaves the invalid icon its room when the field turns invalid", () => {
        const { container } = render(<Input label="Email" isInvalid size="md" />);
        expect(container.querySelector("input")!.className.split(" ")).toContain("group-invalid/input:pr-9");
    });

    it("keeps a plain field's padding", () => {
        const { container } = render(<Input label="Name" size="md" />);
        expect(container.querySelector("input")!.className.split(" ")).not.toContain("pr-9");
    });
});
