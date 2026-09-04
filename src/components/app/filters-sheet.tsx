"use client";

import { type ReactNode, useState } from "react";
import { FilterLines } from "@untitledui/icons";
import { Heading as AriaHeading } from "react-aria-components";
import { SlideoutMenu } from "@/components/application/slideout-menus/slideout-menu";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";

// A page's filter row: inline from lg up, and on a phone one Filters button that opens a sheet
// with the same controls stacked. `active` is how many filters are set, shown on the button so a
// narrowed list says why. The controls apply as they change; Done only closes the sheet.
export function FiltersSheet({ active = 0, children }: { active?: number; children: ReactNode }) {
    const [open, setOpen] = useState(false);

    return (
        <>
            <div className="hidden lg:contents">{children}</div>
            <div className="lg:hidden">
                <Button color="secondary" size="sm" iconLeading={FilterLines} onClick={() => setOpen(true)}>
                    Filters
                    {active > 0 ? (
                        <Badge size="sm" color="gray" type="pill-color">
                            {active}
                        </Badge>
                    ) : null}
                </Button>
                <SlideoutMenu isDismissable isOpen={open} onOpenChange={setOpen}>
                    {({ close }) => (
                        <>
                            <SlideoutMenu.Header onClose={close}>
                                <AriaHeading slot="title" className="text-lg font-semibold text-primary">
                                    Filters
                                </AriaHeading>
                            </SlideoutMenu.Header>
                            <SlideoutMenu.Content className="gap-3 pb-4 *:w-full [&_select]:w-full">{children}</SlideoutMenu.Content>
                            <SlideoutMenu.Footer className="flex justify-end">
                                <Button color="primary" size="sm" onClick={close}>
                                    Done
                                </Button>
                            </SlideoutMenu.Footer>
                        </>
                    )}
                </SlideoutMenu>
            </div>
        </>
    );
}
