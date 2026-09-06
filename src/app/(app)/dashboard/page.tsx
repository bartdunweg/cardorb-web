import { CardsStats } from "@/components/app/cards-stats";
import { PageHeader } from "@/components/app/page-header";
import { ValueChart } from "@/components/app/value-chart";
import { YouLink } from "@/components/app/you-link";
import { getCardStats } from "@/lib/cards";
import { getValueHistory } from "@/lib/value-history";

export default async function DashboardPage() {
    const [stats, snapshots] = await Promise.all([getCardStats(), getValueHistory()]);

    return (
        <div className="flex flex-col gap-6">
            <PageHeader title="Home" subtitle="An overview of your collection." barActions={<YouLink />} />
            <CardsStats stats={stats} />

            <section
                className="flex arrive flex-col gap-4 rounded-xl bg-primary px-4 py-5 shadow-lift-xs ring-1 ring-primary ring-inset md:px-5"
                style={{ "--arrive-delay": "120ms" } as React.CSSProperties}
            >
                <div className="flex flex-col gap-1">
                    <h2 className="text-md font-semibold text-primary">Collection value over time</h2>
                    <p className="text-xs text-quaternary">One reading a night, at Cardmarket&apos;s prices of that day.</p>
                </div>
                <ValueChart snapshots={snapshots} />
            </section>
        </div>
    );
}
