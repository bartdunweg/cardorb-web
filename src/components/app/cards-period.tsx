"use client";

import { useState } from "react";
import { Calendar } from "@untitledui/icons";
import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import { Heading as AriaHeading } from "react-aria-components";
import { RowButton } from "@/components/app/row-button";
import { Dialog, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { Button } from "@/components/base/buttons/button";
import { Dropdown } from "@/components/base/dropdown/dropdown";
import { formatDate } from "@/lib/format";
import { CHANGE_PERIODS, type ChangePeriod, type ListQuery, type SortKey, listHref } from "@/lib/list-query";

/*
 * The day picker, and @internationalized/date under it, load when Custom dates is chosen: every list
 * sorted by price change draws this row, and few ask for two days of their own. Until it is in, a
 * disabled button of the picker's own size and shape stands in its place, so nothing moves.
 */
const AcquiredDatePicker = dynamic(() => import("@/components/app/acquired-date-picker").then((m) => m.AcquiredDatePicker), {
    ssr: false,
    loading: () => (
        <Button
            size="sm"
            color="secondary"
            shape="rect"
            iconLeading={Calendar}
            isDisabled
            className="w-full justify-start font-medium text-placeholder shadow-xs"
        >
            Select date
        </Button>
    ),
});

/**
 * Ours: the period a list sorted by price change reads over, beside Sort while that sort is on.
 *
 * The value chart's periods, and Custom dates for two days of your own. A choice goes into the URL
 * like the sort, so the list is a link and the server page asks the API over those days. Custom opens
 * a small dialog with the app's own day field twice (From and To), because the kit has no range
 * picker and both days are needed before anything is asked.
 */
export function CardsPeriod({ query, defaultSortKey = "set" }: { query: ListQuery; defaultSortKey?: SortKey }) {
    const router = useRouter();
    const pathname = usePathname();
    const [open, setOpen] = useState(false);
    const [from, setFrom] = useState(query.from ?? "");
    const [to, setTo] = useState(query.to ?? "");
    const go = (patch: { period: ChangePeriod; from?: string; to?: string }) =>
        router.replace(listHref(pathname, query, { ...patch, page: 1 }, defaultSortKey), { scroll: false });

    const label =
        query.period === "custom" && query.from
            ? `${formatDate(query.from)} to ${query.to ? formatDate(query.to) : "today"}`
            : (CHANGE_PERIODS.find((p) => p.key === query.period)?.label ?? "1M");
    const valid = Boolean(from) && (!to || to >= from);

    return (
        <>
            <Dropdown.Root>
                <RowButton icon={Calendar} label={label} menu />
                <Dropdown.Popover placement="bottom start" className="w-48">
                    <Dropdown.Menu
                        selectionMode="single"
                        // Custom is never the selected key: it opens the dialog, and a key already selected
                        // does not fire again, so with custom on, Custom dates could not be reopened.
                        selectedKeys={new Set(query.period === "custom" ? [] : [query.period])}
                        onSelectionChange={(keys) => {
                            const key = keys === "all" ? undefined : [...keys][0];
                            if (key === "custom") {
                                setFrom(query.from ?? "");
                                setTo(query.to ?? "");
                                setOpen(true);
                                return;
                            }
                            const period = CHANGE_PERIODS.find((p) => p.key === key)?.key;
                            if (period) go({ period, from: undefined, to: undefined });
                        }}
                    >
                        {[
                            ...CHANGE_PERIODS.map((p) => (
                                <Dropdown.Item key={p.key} id={p.key}>
                                    {p.said}
                                </Dropdown.Item>
                            )),
                            <Dropdown.Item key="custom" id="custom">
                                Custom dates…
                            </Dropdown.Item>,
                        ]}
                    </Dropdown.Menu>
                </Dropdown.Popover>
            </Dropdown.Root>
            <ModalOverlay isOpen={open} onOpenChange={setOpen} isDismissable>
                <Modal className="max-w-sm">
                    <Dialog>
                        {({ close }) => (
                            <form
                                className="flex w-full flex-col gap-5 rounded-2xl glass-thick p-5 shadow-xl"
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    if (!valid) return;
                                    go({ period: "custom", from, to: to || undefined });
                                    close();
                                }}
                            >
                                <div className="flex flex-col gap-1">
                                    <AriaHeading slot="title" className="text-lg font-semibold text-primary">
                                        Custom dates
                                    </AriaHeading>
                                    <p className="text-sm text-tertiary">Price changes between two days. Leave To empty for today.</p>
                                </div>
                                <div className="flex flex-col gap-1.5 text-sm font-medium text-secondary">
                                    From
                                    <AcquiredDatePicker aria-label="From" value={from} onChange={setFrom} />
                                </div>
                                <div className="flex flex-col gap-1.5 text-sm font-medium text-secondary">
                                    To
                                    <AcquiredDatePicker aria-label="To" value={to} onChange={setTo} />
                                </div>
                                {from && to && to < from ? <p className="text-sm text-error-primary">To is before From.</p> : null}
                                <div className="flex justify-end gap-3">
                                    <Button color="secondary" size="md" onClick={close}>
                                        Cancel
                                    </Button>
                                    <Button type="submit" color="primary" size="md" isDisabled={!valid}>
                                        Show
                                    </Button>
                                </div>
                            </form>
                        )}
                    </Dialog>
                </Modal>
            </ModalOverlay>
        </>
    );
}
