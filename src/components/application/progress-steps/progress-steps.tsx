"use client";

/**
 * Untitled UI's progress steps, trimmed to the numbered row.
 *
 * Vendored through the CLI as `progress-steps` and cut down rather than kept
 * whole, which R-STRUCT-001 asks for: only what is imported stays. The kit
 * ships four layouts (icons with text, minimal dots, connected dots, text with
 * a line) in three files; the import dialog uses one, the horizontal numbered
 * steps, so that is the one here. `Progress.IconsWithText` keeps the kit's
 * name and props, so the rest can come back from the same source when a
 * second screen needs it.
 *
 * One change: `description` is optional, and the paragraph is not drawn
 * without one. The kit always drew it, and an empty <p> under every step is
 * a line of nothing for a screen reader to stop on.
 */
import { cx } from "@/utils/cx";

export type Step = {
    title: string;
    description?: string;
    status: "incomplete" | "current" | "complete";
};

const statuses = {
    incomplete: "bg-primary ring-1 ring-inset ring-secondary text-quaternary",
    current: "bg-primary ring-1 ring-inset ring-secondary text-secondary",
    complete: "bg-success-solid text-fg-white",
};

const IconTopNumber = ({ status, title, description, step, connector, size }: Step & { step: number; connector: boolean; size: "sm" | "md" }) => (
    <div className={cx("flex w-full flex-col items-center justify-center gap-4", size === "sm" && "gap-3")}>
        <div className="relative flex w-full flex-col items-center self-stretch">
            <span
                className={cx(
                    "z-10 flex items-center justify-center rounded-full",
                    statuses[status],
                    status === "incomplete" && "opacity-60",
                    size === "sm" ? "size-6" : "size-8",
                )}
            >
                {status === "complete" ? (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={cx(size === "sm" ? "size-3" : "size-4")} aria-hidden="true">
                        <path d="M10 3L4.5 8.5L2 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                ) : (
                    <span className={cx("font-semibold", size === "sm" ? "text-xs" : "text-sm")}>{step}</span>
                )}
            </span>

            {connector && (
                <svg className="absolute top-1/2 left-[53%] z-0 h-[2.5px] w-full flex-1 -translate-y-1/2 max-md:hidden" aria-hidden="true">
                    <line
                        x1="1.2"
                        y1="1.2"
                        x2="100%"
                        y2="1.2"
                        className="stroke-border-primary"
                        stroke="black"
                        strokeWidth="2.4"
                        strokeDasharray="0,6"
                        strokeLinecap="round"
                    />
                </svg>
            )}
        </div>
        <div className={cx("flex w-full flex-col items-start gap-0.5 self-stretch", status === "incomplete" && "opacity-60", size === "sm" && "gap-0")}>
            <p className={cx("w-full text-center text-secondary", size === "sm" ? "text-sm font-semibold" : "text-md font-semibold")}>{title}</p>
            {description ? <p className={cx("w-full text-center text-tertiary", size === "sm" ? "text-sm" : "text-md")}>{description}</p> : null}
        </div>
    </div>
);

interface ProgressIconsWithTextProps {
    items: Step[];
    size?: "sm" | "md";
    className?: string;
}

const IconsWithText = ({ items, size = "sm", className }: ProgressIconsWithTextProps) => (
    <div style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }} className={cx("grid w-full items-start justify-start gap-4", className)}>
        {items.map((item, index) => (
            <IconTopNumber key={item.title} {...item} size={size} connector={index !== items.length - 1} step={index + 1} />
        ))}
    </div>
);

export const Progress = {
    IconsWithText,
};
