"use client";

import { useState } from "react";
import { type CalendarDate, getLocalTimeZone, parseDate, today } from "@internationalized/date";
import { DatePicker } from "@/components/application/date-picker/date-picker";

/**
 * The day a card was got, picked from the kit's calendar. Ours only for the seam: the app keeps a
 * date as the `YYYY-MM-DD` string the API reads and writes, the kit keeps a CalendarDate, and
 * this is where one becomes the other.
 *
 * No future days: a card you hold was got in the past, so the calendar ends at today. A day is
 * only handed on when Apply is pressed; Cancel drops what was picked and the field says what it
 * said before. That is the kit picker's own model, and it is why the sheet's copy card can save
 * straight from here without saving every day the user hovers past.
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

    return (
        <DatePicker
            aria-label={ariaLabel}
            className={className}
            isDisabled={isDisabled}
            maxValue={today(getLocalTimeZone())}
            value={draft ?? stored}
            onChange={(next) => setDraft(next ? parseDate(next.toString()) : null)}
            onApply={() => {
                const picked = draft?.toString();
                setDraft(null);
                if (picked && picked !== value) onChange(picked);
            }}
            onCancel={() => setDraft(null)}
        />
    );
}

function toCalendarDate(value: string): CalendarDate | null {
    try {
        return value ? parseDate(value.slice(0, 10)) : null;
    } catch {
        return null;
    }
}
