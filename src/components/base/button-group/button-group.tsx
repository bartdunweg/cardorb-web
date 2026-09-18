"use client";

// Changed from the kit: the pressed button is marked by a 2 px ring in the text colour on the
// secondary fill. The kit marked it with a fill one step off the others (#FAFAFA on #FFFFFF,
// 1.04:1; #262626 on #171717 in the dark, 1.18:1), which is no state anyone can see; the ring
// carries it at the 3:1 a state indicator needs (WCAG 1.4.11). Every segmented control in the app
// is this one, so it lives here rather than in a class each caller has to remember. A re-fetch
// through the Untitled UI CLI or MCP overwrites it; re-apply it.
import { type FC, type PropsWithChildren, type ReactNode, type RefAttributes, createContext, isValidElement, useContext } from "react";
import {
    ToggleButton as AriaToggleButton,
    ToggleButtonGroup as AriaToggleButtonGroup,
    type ToggleButtonGroupProps,
    type ToggleButtonProps,
} from "react-aria-components";
import { cx, sortCx } from "@/utils/cx";
import { isReactComponent } from "@/utils/is-react-component";

export const styles = sortCx({
    common: {
        root: [
            "group/button-group inline-flex h-max cursor-pointer items-center bg-primary font-semibold whitespace-nowrap text-secondary ring-1 ring-primary outline-brand transition duration-100 ease-linear ring-inset",
            // Hover and focus styles
            "hover:bg-primary_hover hover:text-secondary_hover focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-2",
            // Disabled styles
            "disabled:cursor-not-allowed disabled:text-secondary/50 disabled:*:opacity-50",
            // Selected styles
            "selected:z-10 selected:bg-secondary selected:text-primary selected:ring-2 selected:ring-fg-primary",
        ].join(" "),
        icon: "pointer-events-none transition-[inherit]",
    },

    sizes: {
        sm: {
            root: "gap-1.5 px-3.5 py-2 text-sm not-last:pr-[calc(calc(var(--spacing)*3.5)+1px)] first:rounded-l-lg last:rounded-r-lg data-icon-leading:pl-3 data-icon-only:px-2.5",
            icon: "size-5",
        },
        md: {
            root: "gap-1.5 px-4 py-2.5 text-sm not-last:pr-[calc(calc(var(--spacing)*4)+1px)] first:rounded-l-lg last:rounded-r-lg data-icon-leading:pl-3.5 data-icon-only:px-3",
            icon: "size-5",
        },
        lg: {
            root: "gap-2 px-4.5 py-2.5 text-md not-last:pr-[calc(calc(var(--spacing)*4.5)+1px)] first:rounded-l-lg last:rounded-r-lg data-icon-leading:pl-4 data-icon-only:px-3.5",
            icon: "size-5",
        },
    },
});

type ButtonSize = keyof typeof styles.sizes;

const ButtonGroupContext = createContext<{ size: ButtonSize }>({ size: "md" });

interface ButtonGroupItemProps extends ToggleButtonProps, RefAttributes<HTMLButtonElement> {
    iconLeading?: FC<{ className?: string }> | ReactNode;
    iconTrailing?: FC<{ className?: string }> | ReactNode;
    onClick?: () => void;
    className?: string;
}

export const ButtonGroupItem = ({
    iconLeading: IconLeading,
    iconTrailing: IconTrailing,
    children,
    className,
    ...otherProps
}: PropsWithChildren<ButtonGroupItemProps>) => {
    const context = useContext(ButtonGroupContext);

    if (!context) {
        throw new Error("ButtonGroupItem must be used within a ButtonGroup component");
    }

    const { size } = context;

    const isIcon = (IconLeading || IconTrailing) && !children;

    return (
        <AriaToggleButton
            {...otherProps}
            data-icon-only={isIcon ? true : undefined}
            data-icon-leading={IconLeading ? true : undefined}
            className={cx(styles.common.root, styles.sizes[size].root, className)}
        >
            {isReactComponent(IconLeading) && <IconLeading className={cx(styles.common.icon, styles.sizes[size].icon)} />}
            {isValidElement(IconLeading) && IconLeading}

            {children}

            {isReactComponent(IconTrailing) && <IconTrailing className={cx(styles.common.icon, styles.sizes[size].icon)} />}
            {isValidElement(IconTrailing) && IconTrailing}
        </AriaToggleButton>
    );
};

interface ButtonGroupProps extends Omit<ToggleButtonGroupProps, "orientation">, RefAttributes<HTMLDivElement> {
    size?: ButtonSize;
    className?: string;
}

export const ButtonGroup = ({ children, size = "md", className, ...otherProps }: ButtonGroupProps) => {
    return (
        <ButtonGroupContext.Provider value={{ size }}>
            <AriaToggleButtonGroup
                selectionMode="single"
                className={cx("relative z-0 inline-flex w-max -space-x-px rounded-lg shadow-xs", className)}
                {...otherProps}
            >
                {children}
            </AriaToggleButtonGroup>
        </ButtonGroupContext.Provider>
    );
};
