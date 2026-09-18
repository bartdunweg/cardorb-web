// Split from button.tsx (a change from the kit): the classes without the "use client" file, so a
// Server Component can draw the same button as a plain link. See src/components/app/link-button.tsx.
import { sortCx } from "@/utils/cx";

export const styles = sortCx({
    // An icon in a button takes the label's colour: one colour per button, no second grey for the glyph.
    common: {
        root: [
            "group relative inline-flex h-max pressable cursor-pointer items-center justify-center whitespace-nowrap outline-brand before:absolute focus-visible:outline-2 focus-visible:outline-offset-2",
            // When button is used within `InputGroup`
            "in-data-input-wrapper:shadow-xs in-data-input-wrapper:focus:!z-50 in-data-input-wrapper:in-data-leading:-mr-px in-data-input-wrapper:in-data-leading:rounded-r-none in-data-input-wrapper:in-data-leading:before:rounded-r-none in-data-input-wrapper:in-data-trailing:-ml-px in-data-input-wrapper:in-data-trailing:rounded-l-none in-data-input-wrapper:in-data-trailing:before:rounded-l-none",
            // Disabled styles
            "disabled:cursor-not-allowed disabled:opacity-50 in-data-input-wrapper:disabled:opacity-100",
            // Same as `icon` but for SSR icons that cannot be passed to the client as functions.
            "*:data-icon:pointer-events-none *:data-icon:size-5 *:data-icon:shrink-0 *:data-icon:transition-inherit-all",
        ].join(" "),
        icon: "pointer-events-none size-5 shrink-0 transition-inherit-all",
    },
    sizes: {
        xs: {
            root: [
                "gap-1 rounded-lg px-2.5 py-1.5 text-sm font-semibold before:rounded-[7px] data-icon-only:p-2",
                "in-data-input-wrapper:px-3.5 in-data-input-wrapper:py-2.5 in-data-input-wrapper:data-icon-only:p-2.5",
                "*:data-icon:size-4 *:data-icon:stroke-[2.25px]",
            ].join(" "),
            linkRoot: "gap-1 *:data-text:underline-offset-3",
        },
        sm: {
            root: [
                "gap-1 rounded-lg px-3 py-2 text-sm font-semibold before:rounded-[7px] data-icon-only:p-2",
                "in-data-input-wrapper:px-3.5 in-data-input-wrapper:py-2.5 in-data-input-wrapper:data-icon-only:p-2.5",
            ].join(" "),
            linkRoot: "gap-1 *:data-text:underline-offset-3",
        },
        md: {
            root: [
                "gap-1 rounded-lg px-3.5 py-2.5 text-sm font-semibold before:rounded-[7px] data-icon-only:p-2.5",
                "in-data-input-wrapper:gap-1.5 in-data-input-wrapper:px-4 in-data-input-wrapper:text-md in-data-input-wrapper:data-icon-only:p-3",
            ].join(" "),
            linkRoot: "gap-1 *:data-text:underline-offset-4",
        },
        lg: {
            root: "gap-1.5 rounded-lg px-4 py-2.5 text-md font-semibold before:rounded-[7px] data-icon-only:p-3",
            linkRoot: "gap-1.5 *:data-text:underline-offset-4",
        },
        xl: {
            root: "gap-1.5 rounded-lg px-4.5 py-3 text-md font-semibold before:rounded-[7px] data-icon-only:p-3.5",
            linkRoot: "gap-1.5 *:data-text:underline-offset-4",
        },
    },

    // The solid buttons are flat (a change from the kit): its inner rim, a 12 % border fading down,
    // read as an inner shadow on the black button and on the white one in dark mode.
    colors: {
        primary: {
            root: [
                // Brand solid is near-black in light / near-white in dark, so the label flips to black in dark mode.
                "bg-brand-solid text-white ring-1 ring-transparent ring-inset hover:bg-brand-solid_hover data-loading:bg-brand-solid_hover dark:text-black",
                // Icon styles
            ].join(" "),
        },
        secondary: {
            root: [
                // Light grey with its border, where a field is white with its border: the two had the same
                // fill and ring, and a row of round buttons read as more search fields (Bart, 2026-09-19). Tertiary,
                // not secondary: neutral-50 on white measured 1.04:1, no grey at all. In dark the ring
                // and the fill are both neutral-700, so there the fill is the edge against the page.
                "bg-tertiary text-secondary ring-1 ring-primary ring-inset hover:bg-quaternary hover:text-secondary_hover data-loading:bg-quaternary",
                // Icon styles
            ].join(" "),
        },
        tertiary: {
            root: [
                "text-tertiary hover:bg-primary_hover hover:text-tertiary_hover data-loading:bg-primary_hover",
                // Icon styles
            ].join(" "),
        },
        "link-color": {
            root: [
                "justify-normal rounded p-0! text-brand-secondary hover:text-brand-secondary_hover",
                // Inner text underline
                "*:data-text:underline *:data-text:decoration-transparent hover:*:data-text:decoration-fg-brand-secondary_alt",
                // Icon styles
            ].join(" "),
        },
        "link-gray": {
            root: [
                "justify-normal rounded p-0! text-tertiary hover:text-tertiary_hover",
                // Inner text underline
                "*:data-text:underline *:data-text:decoration-transparent hover:*:data-text:decoration-fg-quaternary",
                // Icon styles
            ].join(" "),
        },
        "primary-destructive": {
            root: [
                "bg-error-solid text-white ring-1 ring-transparent outline-error ring-inset hover:bg-error-solid_hover data-loading:bg-error-solid_hover",
                // Icon styles
            ].join(" "),
        },
        "secondary-destructive": {
            root: [
                // The same grey edge as `secondary`, not a red one. A bordered button in this app is
                // a shape you recognise before you read it, and a second border colour made the
                // shape itself carry the warning — so a delete button shouted from across the page
                // while the word on it was doing that job already. The red is the label's.
                // White, not `secondary`'s grey: the red label measured 4.38:1 on neutral-100 and
                // 3.59:1 on dark neutral-700, under 4.5; on white it is 4.77 (2026-09-19).
                "bg-primary text-error-primary ring-1 ring-primary outline-error ring-inset hover:bg-error-primary hover:text-error-primary_hover data-loading:bg-error-primary",
                // Icon styles
            ].join(" "),
        },
        "tertiary-destructive": {
            root: [
                "text-error-primary outline-error hover:bg-error-primary hover:text-error-primary_hover data-loading:bg-error-primary",
                // Icon styles
            ].join(" "),
        },
        "link-destructive": {
            root: [
                "justify-normal rounded p-0! text-error-primary outline-error hover:text-error-primary_hover",
                // Inner text underline
                "*:data-text:underline *:data-text:decoration-transparent *:data-text:underline-offset-2 hover:*:data-text:decoration-current",
                // Icon styles
            ].join(" "),
        },
    },
});
