"use client";

import { Copy01, DotsHorizontal, Heart, Star01, Trash01 } from "@untitledui/icons";
import { notify } from "@/components/app/toast";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { CloseButton } from "@/components/base/buttons/close-button";
import { Input } from "@/components/base/input/input";
import { Tooltip } from "@/components/base/tooltip/tooltip";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icon";

/**
 * The live half of the design system page: the things you have to press to judge.
 *
 * Everything in here is drawn by the component the app actually uses, never by a copy made for
 * the page — a gallery of look-alikes is worse than no gallery, because it agrees with you.
 */

export function KitGallery() {
    return (
        <div className="flex flex-col gap-10">
            <Row title="Button" from="components/base/buttons/button">
                <Button size="md">Primary</Button>
                <Button size="md" color="secondary">
                    Secondary
                </Button>
                <Button size="md" color="tertiary">
                    Tertiary
                </Button>
                <Button size="md" color="primary-destructive">
                    Destructive
                </Button>
                <Button size="md" color="link-color">
                    Link
                </Button>
                <Button size="md" iconLeading={Star01}>
                    With an icon
                </Button>
                <Button size="md" isLoading>
                    Working
                </Button>
                <Button size="md" isDisabled>
                    Disabled
                </Button>
            </Row>

            <Row title="Button, the sizes" from="components/base/buttons/button">
                <Button size="sm">sm</Button>
                <Button size="md">md</Button>
                <Button size="lg">lg</Button>
                <Button size="xl">xl</Button>
            </Row>

            <Row
                title="ButtonUtility"
                from="components/base/buttons/button-utility"
                note="An icon-only button that takes its tooltip and its accessible name from one string. This is the component the app should reach for and mostly does not: sixteen icon buttons are a Button with a hand-written aria-label instead."
            >
                <ButtonUtility icon={Star01} tooltip="Add to Favorites" size="sm" />
                <ButtonUtility icon={Heart} tooltip="Add to wishlist" size="sm" color="tertiary" />
                <ButtonUtility icon={DotsHorizontal} tooltip="More actions" size="xs" />
                <ButtonUtility icon={Copy01} tooltip="One copy more" size="xs" color="tertiary" />
            </Row>

            <Row title="Tooltip" from="components/base/tooltip" note="Hover or tab to it. Wraps any focusable thing; ButtonUtility does it for you.">
                <Tooltip title="Previous card (←)">
                    <Button size="md" color="secondary">
                        Hover me
                    </Button>
                </Tooltip>
                <Tooltip title="Near Mint price" description="The market price through a measured band, not the market price itself." arrow>
                    <Button size="md" color="secondary">
                        With a description
                    </Button>
                </Tooltip>
            </Row>

            <Row title="FeaturedIcon" from="components/foundations/featured-icon">
                <FeaturedIcon icon={Star01} color="brand" theme="outline" size="md" />
                <FeaturedIcon icon={Trash01} color="error" theme="outline" size="md" />
                <FeaturedIcon icon={Heart} color="success" theme="outline" size="md" />
                <FeaturedIcon icon={Star01} color="gray" theme="modern" size="md" />
            </Row>

            <Row title="CloseButton" from="components/base/buttons/close-button">
                <CloseButton size="sm" label="Close" />
                <CloseButton size="md" label="Close" />
            </Row>

            <Row title="Input" from="components/base/input/input">
                <div className="w-full max-w-80">
                    <Input label="Display name" placeholder="Your name" hint="Shown on your public profile." />
                </div>
                <div className="w-full max-w-80">
                    <Input label="Acquired" type="date" size="sm" />
                </div>
            </Row>

            <Row
                title="Toast"
                from="components/app/toast"
                ours
                note="Ours, because Untitled UI ships no snackbar — the nearest thing in the catalogue is application/alerts, which puts a Dismiss text button beside the close cross. The box is made of that alert's parts: FeaturedIcon, Button, CloseButton."
            >
                <Button size="md" color="secondary" onClick={() => notify.done("Filed in Kanto", { description: "Fomantis · Pitch Black #085" })}>
                    Show a success
                </Button>
                <Button
                    size="md"
                    color="secondary"
                    onClick={() => notify.failed("That card was not added to your collection", { description: "The catalogue is not answering." })}
                >
                    Show a failure
                </Button>
                <Button
                    size="md"
                    color="secondary"
                    onClick={() =>
                        notify.done("Removed from your collection", {
                            description: "Fomantis · Pitch Black #085",
                            undo: { onUndo: () => notify.done("Put back") },
                        })
                    }
                >
                    Show an undo
                </Button>
            </Row>
        </div>
    );
}

function Row({ title, from, note, ours = false, children }: { title: string; from: string; note?: string; ours?: boolean; children: React.ReactNode }) {
    return (
        <section className="flex flex-col gap-3">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h3 className="text-md font-semibold text-primary">{title}</h3>
                {/* The label is the point of the page: at a glance, whose component is this. */}
                <span
                    className={
                        ours
                            ? "rounded-full bg-warning-secondary px-2 py-0.5 text-xs font-medium text-warning-primary"
                            : "rounded-full bg-success-secondary px-2 py-0.5 text-xs font-medium text-success-primary"
                    }
                >
                    {ours ? "Ours" : "Untitled UI"}
                </span>
                <code className="text-xs text-tertiary">{from}</code>
            </div>
            {note ? <p className="max-w-2xl text-sm text-tertiary">{note}</p> : null}
            <div className="flex flex-wrap items-center gap-3 rounded-xl bg-primary p-5 ring-1 ring-secondary">{children}</div>
        </section>
    );
}
