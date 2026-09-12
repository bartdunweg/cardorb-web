"use client";

import { AlertCircle } from "@untitledui/icons";
import { Heading as AriaHeading } from "react-aria-components";
import { Dialog, DialogTrigger, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { SlideoutMenu } from "@/components/application/slideout-menus/slideout-menu";
import { Button } from "@/components/base/buttons/button";
import { CloseButton } from "@/components/base/buttons/close-button";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icon";
import { Cell, Group, Panel, type SectionSpec } from "./design-section";

/**
 * The two overlays. Both are live: an overlay cannot be judged from a still, because what there
 * is to judge is how it arrives, what it dims and where the focus lands.
 */
export const overlaySections: SectionSpec[] = [
    {
        id: "modal",
        title: "Modal",
        from: "components/application/modals",
        note: "Four pieces (DialogTrigger, ModalOverlay, Modal, Dialog) that position and animate a centred dialog. They paint no surface: the content draws its own, which is why our SheetDialog exists to do it once.",
        render: (
            <Panel>
                <Group title="Live" cols="wide">
                    <Cell label="a decision">
                        <DialogTrigger>
                            <Button color="secondary" size="md">
                                Open a dialog
                            </Button>
                            <ModalOverlay isDismissable>
                                <Modal className="sm:max-w-100">
                                    <Dialog>
                                        {({ close }) => (
                                            <div className="flex w-full flex-col gap-5 rounded-2xl glass-thick p-6 shadow-xl">
                                                <div className="flex items-start justify-between gap-4">
                                                    <FeaturedIcon icon={AlertCircle} color="error" theme="modern" size="lg" />
                                                    <CloseButton size="sm" onClick={close} className="-mt-1 -mr-1" />
                                                </div>
                                                <div className="flex flex-col gap-1">
                                                    <AriaHeading slot="title" className="text-lg font-semibold text-primary">
                                                        Remove this card?
                                                    </AriaHeading>
                                                    <p className="text-sm text-tertiary">
                                                        Fomantis · Pitch Black #085 leaves your collection. Nothing else changes.
                                                    </p>
                                                </div>
                                                <div className="flex gap-3">
                                                    <Button color="secondary" size="md" className="flex-1" onClick={close}>
                                                        Cancel
                                                    </Button>
                                                    <Button color="primary-destructive" size="md" className="flex-1" onClick={close}>
                                                        Remove
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                    </Dialog>
                                </Modal>
                            </ModalOverlay>
                        </DialogTrigger>
                    </Cell>
                </Group>
            </Panel>
        ),
    },
    {
        id: "slideout",
        title: "SlideoutMenu",
        from: "components/application/slideout-menus",
        note: "A bottom sheet on a phone and a drawer from the right from sm up: the same component, told apart by CSS rather than by a breakpoint hook. Header, Content and Footer are its parts; the card detail panel is one of these.",
        render: (
            <Panel>
                <Group title="Live" cols="wide">
                    <Cell label="header, content, footer">
                        <SlideoutMenu.Trigger>
                            <Button color="secondary" size="md">
                                Open a slideout
                            </Button>
                            <SlideoutMenu isDismissable>
                                {({ close }) => (
                                    <>
                                        <SlideoutMenu.Header onClose={close}>
                                            <AriaHeading slot="title" className="text-lg font-semibold text-primary">
                                                Fomantis
                                            </AriaHeading>
                                            <p className="text-sm text-tertiary">Pitch Black · #085</p>
                                        </SlideoutMenu.Header>
                                        {/* role="presentation": the page has a <main> already. */}
                                        {/* eslint-disable-next-line jsx-a11y/prefer-tag-over-role -- the rule offers <img alt="">, which this is not: the role is here only to stop the kit's default role="main". */}
                                        <SlideoutMenu.Content role="presentation">
                                            <p className="text-sm text-tertiary">
                                                Content scrolls between a header that stays and a footer that stays. In the app this is where the tabs of a card
                                                live.
                                            </p>
                                        </SlideoutMenu.Content>
                                        <SlideoutMenu.Footer>
                                            <Button color="secondary" size="md" className="w-full" onClick={close}>
                                                Done
                                            </Button>
                                        </SlideoutMenu.Footer>
                                    </>
                                )}
                            </SlideoutMenu>
                        </SlideoutMenu.Trigger>
                    </Cell>
                </Group>
            </Panel>
        ),
    },
];
