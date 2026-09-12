"use client";

// Changed from the kit: a `variant` prop and an exported `DatePickerTrigger`. The kit's trigger
// is a button, and in this app a button is a pill that hugs its label: right for a filter,
// wrong for a form. `field` gives the trigger a field's shape instead: the kit's corners, the
// width of the wrapper it is in, the day at the left in the weight and colour a field reads in,
// and "Select date" in placeholder grey. `filter`, the default, is the kit's button unchanged.
// The trigger is exported so AcquiredDatePicker's phone sheet can open from the same element.
import { getLocalTimeZone, today } from "@internationalized/date";
import { useControlledState } from "@react-stately/utils";
import { Calendar as CalendarIcon } from "@untitledui/icons";
import { useDateFormatter } from "react-aria";
import type { DatePickerProps as AriaDatePickerProps, DateValue } from "react-aria-components";
import { DatePicker as AriaDatePicker, Dialog as AriaDialog, Group as AriaGroup, Popover as AriaPopover } from "react-aria-components";
import { Button, type ButtonProps } from "@/components/base/buttons/button";
import { cx } from "@/utils/cx";
import { Calendar } from "./calendar";

const highlightedDates = [today(getLocalTimeZone())];

interface DatePickerProps extends AriaDatePickerProps<DateValue> {
    /** The function to call when the apply button is clicked. */
    onApply?: () => void;
    /** The function to call when the cancel button is clicked. */
    onCancel?: () => void;
    size?: ButtonProps["size"];
    /** `filter` is a pill that hugs the day; `field` is a rectangle that fills its wrapper, like an input. */
    variant?: DatePickerVariant;
}

export type DatePickerVariant = "filter" | "field";

/**
 * The button the calendar opens from, in the `AriaGroup` the date picker expects. `isPlaceholder`
 * says the label is "Select date" rather than a day, so a field can grey it like an empty input.
 */
export const DatePickerTrigger = ({
    size = "sm",
    variant = "filter",
    isPlaceholder,
    children,
}: {
    size?: ButtonProps["size"];
    variant?: DatePickerVariant;
    isPlaceholder?: boolean;
    children: string;
}) => {
    const field = variant === "field";
    return (
        <AriaGroup className={field ? "w-full" : undefined}>
            <Button
                size={size}
                color="secondary"
                shape={field ? "rect" : "pill"}
                iconLeading={CalendarIcon}
                className={cx(
                    field && "w-full justify-start font-medium shadow-xs hover:bg-primary",
                    field && (isPlaceholder ? "text-placeholder hover:text-placeholder" : "text-primary hover:text-primary"),
                )}
            >
                {children}
            </Button>
        </AriaGroup>
    );
};

export const DatePicker = ({ value: valueProp, defaultValue, onChange, onApply, onCancel, size = "sm", variant = "filter", ...props }: DatePickerProps) => {
    const formatter = useDateFormatter({
        month: "short",
        day: "numeric",
        year: "numeric",
    });
    const [value, setValue] = useControlledState(valueProp, defaultValue || null, onChange);

    const formattedDate = value ? formatter.format(value.toDate(getLocalTimeZone())) : "Select date";

    return (
        <AriaDatePicker aria-label="Date picker" shouldCloseOnSelect={false} {...props} value={value} onChange={setValue}>
            <DatePickerTrigger size={size} variant={variant} isPlaceholder={!value}>
                {formattedDate}
            </DatePickerTrigger>
            <AriaPopover
                offset={8}
                placement="bottom right"
                className={({ isEntering, isExiting }) =>
                    cx(
                        "origin-(--trigger-anchor-point) will-change-transform",
                        isEntering &&
                            "duration-150 ease-out animate-in fade-in placement-right:slide-in-from-left-0.5 placement-top:slide-in-from-bottom-0.5 placement-bottom:slide-in-from-top-0.5",
                        isExiting &&
                            "duration-100 ease-in animate-out fade-out placement-right:slide-out-to-left-0.5 placement-top:slide-out-to-bottom-0.5 placement-bottom:slide-out-to-top-0.5",
                    )
                }
            >
                <AriaDialog aria-label="Date picker" className="rounded-2xl bg-primary shadow-xl ring ring-secondary_alt">
                    {({ close }) => (
                        <>
                            <div className="flex px-6 py-5">
                                <Calendar highlightedDates={highlightedDates} />
                            </div>
                            <div className="grid grid-cols-2 gap-3 border-t border-secondary p-4">
                                <Button
                                    size="md"
                                    color="secondary"
                                    onClick={() => {
                                        onCancel?.();
                                        close();
                                    }}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    size="md"
                                    color="primary"
                                    onClick={() => {
                                        onApply?.();
                                        close();
                                    }}
                                >
                                    Apply
                                </Button>
                            </div>
                        </>
                    )}
                </AriaDialog>
            </AriaPopover>
        </AriaDatePicker>
    );
};
