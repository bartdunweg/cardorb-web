"use client";

// Changed from the kit: the target is react-aria's Link, not a bare <a>, so a click goes through
// Next's router (RouteProvider) as every other row of the sidebar does, and without an href it is
// a Button, for the rail's controls that open something (search, the binders, the account) rather
// than lead somewhere. The kit's Pressable wrapper went with the <a>: Link and Button are focusable
// on their own, which is what the tooltip needs. Nothing styled differently.
import type { FC, ReactNode } from "react";
import { Button as AriaButton, Link as AriaLink } from "react-aria-components";
import { Tooltip } from "@/components/base/tooltip/tooltip";
import { cx } from "@/utils/cx";

interface NavButtonProps {
    /** URL to navigate to when the button is clicked. Without one the control is a button. */
    href?: string;
    /** Label text for the button: its accessible name and its tooltip. */
    label?: string;
    /** Icon component to display. */
    icon?: FC<{ className?: string }>;
    /** Whether the button is currently active. */
    current?: boolean;
    /** Handler for a press, when the control is a button. */
    onPress?: () => void;
    /** Additional CSS classes to apply to the button. */
    className?: string;
    /** Placement of the tooltip. */
    tooltipPlacement?: "top" | "right" | "bottom" | "left";
    /** Content to display. */
    children?: ReactNode;
}

const styles = {
    root: "group/item relative flex w-full cursor-pointer items-center justify-center gap-1 rounded-md bg-primary outline-focus-ring transition duration-100 ease-linear select-none hover:bg-primary_hover focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-2",
    current: "bg-secondary hover:bg-secondary_hover",
};

export const NavButton = ({ current, label, href, icon: Icon, className, tooltipPlacement = "right", onPress, children }: NavButtonProps) => {
    const iconOnly = !children;

    const content = (
        <>
            {Icon && (
                <Icon
                    aria-hidden="true"
                    className={cx(
                        "size-5 shrink-0 text-fg-quaternary transition-inherit-all group-hover/item:text-fg-quaternary_hover",
                        current && "text-fg-brand-primary",
                    )}
                />
            )}

            {children && (
                <span
                    className={cx(
                        "px-0.5 text-sm font-semibold transition duration-100 ease-linear group-hover/item:text-secondary_hover",
                        current && "text-secondary_hover",
                    )}
                >
                    {children}
                </span>
            )}
        </>
    );

    const classes = cx(styles.root, current && styles.current, iconOnly ? "size-9" : "px-2 py-1.5", className);

    return (
        <Tooltip isDisabled={!label} title={label} placement={tooltipPlacement}>
            {href ? (
                <AriaLink href={href} aria-label={label} aria-current={current ? "page" : undefined} className={classes}>
                    {content}
                </AriaLink>
            ) : (
                <AriaButton aria-label={label} onPress={onPress} className={classes}>
                    {content}
                </AriaButton>
            )}
        </Tooltip>
    );
};
