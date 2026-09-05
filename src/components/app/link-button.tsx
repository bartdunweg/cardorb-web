import type { ReactNode } from "react";
import Link from "next/link";
import { styles } from "@/components/base/buttons/button-styles";
import { cx } from "@/utils/cx";

/**
 * The kit's Button as a plain link, for the pages that prerender: the landing, the legal pages,
 * the API reference. The kit's Button is a react-aria Link, and with it every static page shipped
 * the whole of react-aria (about 80 KB gzipped) to draw two buttons and a footer. Same classes,
 * same look; only the sizes and colours those pages use. Anything interactive keeps the kit's Button.
 */
export function LinkButton({
    href,
    size = "md",
    color = "primary",
    className,
    children,
    "aria-current": ariaCurrent,
}: {
    href: string;
    size?: "sm" | "md" | "xl";
    color?: "primary" | "secondary" | "tertiary" | "link-gray";
    className?: string;
    children: ReactNode;
    /** The one of a set of links that is the page in view, for a chip row. */
    "aria-current"?: "page";
}) {
    const isLinkType = color === "link-gray";
    return (
        <Link
            href={href}
            aria-current={ariaCurrent}
            className={cx(
                styles.common.root,
                styles.sizes[size].root,
                styles.colors[color].root,
                isLinkType ? styles.sizes[size].linkRoot : "rounded-full before:rounded-full",
                className,
            )}
        >
            <span data-text className={cx("transition-inherit-all", !isLinkType && "px-0.5")}>
                {children}
            </span>
        </Link>
    );
}
