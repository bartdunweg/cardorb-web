"use client";

import { type ReactNode, useState } from "react";
import { FilterLines } from "@untitledui/icons";
import { Heading as AriaHeading } from "react-aria-components";
import { RowButton } from "@/components/app/row-button";
import { SlideoutMenu } from "@/components/application/slideout-menus/slideout-menu";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";

// The filters behind one button: a sheet from the bottom on a phone, a drawer from the right from
// sm up. Search stays in the row: it is the thing you type. `active` is how many filters are set,
// shown on the button so a narrowed list says why. The controls apply as they change; Done only
// closes the sheet.
// `inline`: from lg the controls stand in the row themselves and the button goes. For a page whose
// filters always fit beside the search there (Browse's one menu, a set's two chips); a binder's four
// menus do not, so it keeps the button. A fixed rule per page rather than a measured one, so the row
// never flips between the two while a choice changes its width.
export function FiltersSheet({ active = 0, inline = false, children }: { active?: number; inline?: boolean; children: ReactNode }) {
    const [open, setOpen] = useState(false);

    return (
        <>
            {inline ? <div className="contents max-lg:hidden">{children}</div> : null}
            <div className={inline ? "lg:hidden" : undefined}>
                <RowButton icon={FilterLines} label="Filters" onClick={() => setOpen(true)}>
                    {active > 0 ? (
                        <Badge size="sm" color="gray" type="pill-color">
                            {active}
                            <span className="sr-only"> on</span>
                        </Badge>
                    ) : null}
                </RowButton>
                <SlideoutMenu isDismissable isOpen={open} onOpenChange={setOpen}>
                    {({ close }) => (
                        <>
                            <SlideoutMenu.Header onClose={close}>
                                <AriaHeading slot="title" className="text-lg font-semibold text-primary">
                                    Filters
                                </AriaHeading>
                            </SlideoutMenu.Header>
                            {/* role="presentation", not the kit's default "main": the page already has a
                                <main>, and a second unlabelled one is a landmark that leads nowhere.
                                role={undefined} would not do it; the kit defaults the parameter. */}
                            {/* eslint-disable-next-line jsx-a11y/prefer-tag-over-role -- the rule offers <img alt="">, which this is not: the role is here only to stop the kit's default role="main". */}
                            <SlideoutMenu.Content role="presentation" className="gap-3 pb-4 *:w-full [&_select]:w-full">
                                {children}
                            </SlideoutMenu.Content>
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
