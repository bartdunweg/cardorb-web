import type { HTMLAttributes } from "react";
import { cx } from "@/utils/cx";
import { LineChart } from "./line-chart";

export const UsersChart = (props: HTMLAttributes<HTMLDivElement>) => {
    return (
        <div
            {...props}
            className={cx("flex h-65 w-108 flex-col overflow-hidden rounded-xl bg-primary p-5 shadow-2xl ring-1 ring-secondary_alt", props.className)}
        >
            <div className="text-sm font-semibold text-primary">Users over time</div>
            <div className="relative flex min-h-0 min-w-0 flex-1 items-center">
                <div className="absolute inset-0 flex size-full flex-col justify-between py-3">
                    <span className="h-px w-full bg-border-tertiary" />
                    <span className="h-px w-full bg-border-tertiary" />
                    <span className="h-px w-full bg-border-tertiary" />
                    <span className="h-px w-full bg-border-tertiary" />
                    <span className="h-px w-full bg-border-tertiary" />
                    <span className="h-px w-full bg-border-tertiary" />
                </div>
                <LineChart preserveAspectRatio="none" className="relative max-h-full w-full max-w-full" />
            </div>

            <ul className="flex justify-between px-2">
                <li className="text-xs text-tertiary">Jan</li>
                <li className="text-xs text-tertiary">Mar</li>
                <li className="text-xs text-tertiary">May</li>
                <li className="text-xs text-tertiary">Jul</li>
                <li className="text-xs text-tertiary">Sep</li>
                <li className="text-xs text-tertiary">Nov</li>
                <li className="text-xs text-tertiary">Dec</li>
            </ul>
        </div>
    );
};
