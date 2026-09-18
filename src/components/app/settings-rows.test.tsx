import { render, screen } from "@testing-library/react";
import { Download01, File02, UploadCloud01 } from "@untitledui/icons";
import { describe, expect, it, vi } from "vitest";
import { SettingsGroup, SettingsLinkRow, SettingsRow, SettingsTriggerRow } from "./settings-rows";

vi.mock("next/link", () => ({ default: ({ children, ...props }: { children: React.ReactNode }) => <a {...props}>{children}</a> }));

/*
 * The settings form drew the Import row by hand, every class of a row copied except the divider,
 * so Import and Export touched with no line between them while every other group's rows had one
 * (Settings at 1024 px, light: Import's border-bottom 0px, API reference's 1px). A row that opens
 * a dialog of its own now takes the same row as every other, and a group's rows divide alike.
 */
describe("a settings group's rows", () => {
    it("draw every kind of row with one class, the divider included", () => {
        render(
            <SettingsGroup title="Collection">
                <SettingsTriggerRow icon={UploadCloud01} label="Import a CSV file" />
                <SettingsRow icon={File02} label="Terms" content={() => null} />
                <SettingsLinkRow icon={Download01} label="Export a CSV file" href="/export" download />
            </SettingsGroup>,
        );
        const trigger = screen.getByRole("button", { name: /Import a CSV file/ });
        const sheet = screen.getByRole("button", { name: /Terms/ });
        const link = screen.getByRole("link", { name: /Export a CSV file/ });

        // The divider between a row and the next, on the row that opens a dialog as on the others.
        expect(trigger.className).toContain("not-last:border-b");
        expect(new Set(trigger.className.split(" "))).toEqual(new Set(sheet.className.split(" ")));
        // A link has no pointer class to add: the browser gives it one.
        expect(new Set(`${link.className} cursor-pointer`.split(" "))).toEqual(new Set(trigger.className.split(" ")));
    });
});
