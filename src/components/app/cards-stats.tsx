"use client";

import type { FC } from "react";
import { CheckDone01, Heart, Star01 } from "@untitledui/icons";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icon";
import type { CardStats } from "@/lib/cards";
import { cx } from "@/utils/cx";

// Stat card in the style of Untitled UI's informational template Metric: featured icon, label,
// big number. Icons live in this client component so no function crosses the server boundary.
const StatCard = ({ label, value, icon, className }: { label: string; value: number; icon: FC<{ className?: string }>; className?: string }) => (
    <div className={cx("rounded-xl bg-primary shadow-xs ring-1 ring-secondary ring-inset", className)}>
        <div className="flex flex-col gap-4 px-4 py-5 md:gap-5 md:px-5">
            <FeaturedIcon color="gray" theme="modern-neue" icon={icon} size="lg" />
            <div className="flex flex-col gap-2">
                <h3 className="text-sm font-semibold text-tertiary">{label}</h3>
                <p className="text-display-sm font-semibold text-primary">{value.toLocaleString("en-US")}</p>
            </div>
        </div>
    </div>
);

export function CardsStats({ stats }: { stats: CardStats }) {
    return (
        <div className="flex flex-col gap-x-6 gap-y-5 md:flex-row md:flex-wrap">
            <StatCard label="Owned" value={stats.owned} icon={CheckDone01} className="flex-1 md:min-w-[240px]" />
            <StatCard label="Wishlist" value={stats.wishlist} icon={Heart} className="flex-1 md:min-w-[240px]" />
            <StatCard label="Favorites" value={stats.favorites} icon={Star01} className="flex-1 md:min-w-[240px]" />
        </div>
    );
}
