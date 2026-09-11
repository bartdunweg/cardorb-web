import { describe, expect, it } from "vitest";
import { cx } from "@/utils/cx";

// The kit's dialog carries rounded-t-2xl on a phone and squares itself at sm. The sheet passes
// rounded-none: twMerge has to drop the kit's, or the corners stay and the full-screen sheet
// still reads as a bottom sheet.
describe("the sheet's corners", () => {
    const kit =
        "relative flex size-full max-h-[85dvh] flex-col items-start gap-6 overflow-y-auto rounded-t-2xl glass-thick outline-hidden sm:max-h-full sm:rounded-none sm:pb-0";
    const ours = "scrollbar-hide gap-0 h-dvh max-h-dvh rounded-none bg-page backdrop-blur-none sm:h-full sm:max-h-full";

    it("squares the phone's corners", () => {
        const out = cx(kit, ours);
        expect(out).toContain("rounded-none");
        expect(out).not.toContain("rounded-t-2xl");
    });

    it("keeps our height over the kit's", () => {
        const out = cx(kit, ours);
        expect(out).toContain("h-dvh");
        expect(out).not.toContain("max-h-[85dvh]");
    });
});
