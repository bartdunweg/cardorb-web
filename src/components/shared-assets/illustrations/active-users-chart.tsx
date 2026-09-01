import type { HTMLAttributes } from "react";
import { cx } from "@/utils/cx";
import { CircleChart } from "./circle-chart";

export const ActiveUsersChart = (props: HTMLAttributes<HTMLDivElement>) => {
    return (
        <div {...props} className={cx("relative flex items-center justify-center rounded-xl bg-alpha-white/90 backdrop-blur", props.className)}>
            <CircleChart className="h-full max-h-full w-full max-w-full" />

            <div className="absolute flex flex-col items-center text-center md:gap-0.5">
                <p className="text-xs font-medium text-tertiary">Active users</p>
                <p className="text-xl font-semibold text-primary">1,000</p>
            </div>
        </div>
    );
};
