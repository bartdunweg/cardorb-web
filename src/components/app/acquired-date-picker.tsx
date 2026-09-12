"use client";

import { useState } from "react";
import { type CalendarDate, getLocalTimeZone, parseDate, today } from "@internationalized/date";
import { useDateFormatter } from "react-aria";
import { DatePicker as AriaDatePicker } from "react-aria-components";
import { Calendar } from "@/components/application/date-picker/calendar";
import { DatePicker, DatePickerTrigger } from "@/components/application/date-picker/date-picker";
import { Dialog, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { Button } from "@/components/base/buttons/button";
import { useBreakpoint } from "@/hooks/use-breakpoint";
import { cx } from "@/utils/cx";

/**
 * The day a card was got, picked from the kit's calendar. Ours for the seam: the app keeps a
 * date as the `YYYY-MM-DD` string the API reads and writes, the kit keeps a CalendarDate, and
 * this is where one becomes the other.
 *
 * No future days: a card you hold was got in the past, so the calendar ends at today. A day is
 * only handed on when Apply is pressed; Cancel drops what was picked and the field says what it
 * said before. That is the kit picker's own model, and it is why the sheet's copy card can save
 * straight from here without saving every day the user hovers past.
 *
 * Always the kit picker's `field` variant: an acquired date sits in a form under a label, beside
 * inputs and selects, so it takes their shape and the width it is given, not a pill's hug.
 *
 * On a phone the calendar is a sheet from the bottom, not the kit's popover. The popover hangs
 * off the button, and the button sits inside a form inside a sheet: a month grid anchored there
 * either lands half off the screen or gets clipped by the form scrolling under it. Every other
 * choice the app asks for on a phone rises from the bottom (`SheetDialog`, `FilterChip`), so
 * this one does too. From `sm` the kit's picker is used unchanged. Two trees rather than one
 * with `max-sm:` on it, like `FilterChip`, because a popover and a modal are different
 * components; the trigger is the same element in both, so nothing about it flashes at the
 * breakpoint.
 */
export function AcquiredDatePicker({
    value,
    onChange,
    isDisabled,
    className,
    "aria-label": ariaLabel = "Acquired",
}: {
    /** `YYYY-MM-DD`, or empty for none. */
    value: string;
    /** Called with `YYYY-MM-DD` once Apply is pressed on a day that differs from `value`. */
    onChange: (date: string) => void;
    isDisabled?: boolean;
    className?: string;
    "aria-label"?: string;
}) {
    const [draft, setDraft] = useState<CalendarDate | null>(null);
    const stored = toCalendarDate(value);
    const sm = useBreakpoint("sm");

    const shown = draft ?? stored;
    const pick = (next: { toString(): string } | null) => setDraft(next ? parseDate(next.toString()) : null);
    const apply = () => {
        const picked = draft?.toString();
        setDraft(null);
        if (picked && picked !== value) onChange(picked);
    };
    const cancel = () => setDraft(null);

    if (sm) {
        return (
            <DatePicker
                aria-label={ariaLabel}
                className={className}
                isDisabled={isDisabled}
                maxValue={today(getLocalTimeZone())}
                value={shown}
                variant="field"
                onChange={pick}
                onApply={apply}
                onCancel={cancel}
            />
        );
    }

    return (
        <AcquiredDateSheet
            aria-label={ariaLabel}
            className={className}
            isDisabled={isDisabled}
            value={shown}
            onChange={pick}
            onApply={apply}
            onCancel={cancel}
        />
    );
}

/**
 * The phone shape: the kit picker's trigger and its calendar-then-Cancel-and-Apply body, with
 * the kit's `Modal` in place of its popover. The date picker's own open state drives the modal,
 * so Escape, the backdrop and the Apply and Cancel buttons all close the same thing.
 */
function AcquiredDateSheet({
    value,
    onChange,
    onApply,
    onCancel,
    isDisabled,
    className,
    "aria-label": ariaLabel,
}: {
    value: CalendarDate | null;
    onChange: (next: CalendarDate | null) => void;
    onApply: () => void;
    onCancel: () => void;
    isDisabled?: boolean;
    className?: string;
    "aria-label": string;
}) {
    // The same words as the kit's picker, so the button reads the same at every width.
    const formatter = useDateFormatter({ month: "short", day: "numeric", year: "numeric" });
    const formattedDate = value ? formatter.format(value.toDate(getLocalTimeZone())) : "Select date";

    return (
        <AriaDatePicker
            aria-label={ariaLabel}
            className={className}
            isDisabled={isDisabled}
            maxValue={today(getLocalTimeZone())}
            shouldCloseOnSelect={false}
            value={value}
            onChange={(next) => onChange(next ? parseDate(next.toString()) : null)}
        >
            <DatePickerTrigger variant="field" isPlaceholder={!value}>
                {formattedDate}
            </DatePickerTrigger>
            {/* The sheet's shape is `SheetDialog`'s: bottom-aligned and flush, rising rather than zooming. */}
            <ModalOverlay className="items-end p-0">
                <Modal
                    className={(state) =>
                        cx(
                            "max-h-[85dvh]",
                            state.isEntering && "slide-in-from-bottom zoom-in-100 motion-reduce:slide-in-from-bottom-0",
                            state.isExiting && "slide-out-to-bottom zoom-out-100 motion-reduce:slide-out-to-bottom-0",
                        )
                    }
                >
                    <Dialog aria-label={ariaLabel}>
                        {({ close }) => (
                            <div className="flex max-h-[85dvh] w-full flex-col overflow-y-auto rounded-2xl rounded-b-none glass-thick pb-safe shadow-xl">
                                <div className="flex justify-center px-6 py-5">
                                    <Calendar highlightedDates={[today(getLocalTimeZone())]} />
                                </div>
                                <div className="grid grid-cols-2 gap-3 border-t border-secondary p-4">
                                    <Button
                                        size="md"
                                        color="secondary"
                                        onClick={() => {
                                            onCancel();
                                            close();
                                        }}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        size="md"
                                        color="primary"
                                        onClick={() => {
                                            onApply();
                                            close();
                                        }}
                                    >
                                        Apply
                                    </Button>
                                </div>
                            </div>
                        )}
                    </Dialog>
                </Modal>
            </ModalOverlay>
        </AriaDatePicker>
    );
}

function toCalendarDate(value: string): CalendarDate | null {
    try {
        return value ? parseDate(value.slice(0, 10)) : null;
    } catch {
        return null;
    }
}
