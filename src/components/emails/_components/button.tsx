import type { ButtonProps as EmailButtonProps } from "@react-email/components";
import { Button as EmailButton } from "@react-email/components";
import { cx } from "@/utils/cx";

const variants = {
    primary: "bg-brand-solid text-white",
    secondary: "bg-primary text-secondary border border-primary",
};

const sizes = {
    sm: "px-3.5 py-[7px] text-sm font-semibold",
    md: "px-4 py-[9px] text-md font-semibold",
    lg: "px-5 py-[11px] text-md font-semibold",
};

interface ButtonProps extends EmailButtonProps {
    color?: keyof typeof variants;
    size?: keyof typeof sizes;
}

/** The kit's email button, as a pill: every button in the app is one. */
export const Button = ({ color = "primary", size = "md", ...props }: ButtonProps) => {
    return (
        <EmailButton {...props} className={cx("rounded-full", variants[color], sizes[size], props.className)}>
            {props.children}
        </EmailButton>
    );
};
