import { CardsStats } from "@/components/app/cards-stats";
import { MobileAccountMenu } from "@/components/app/mobile-nav";
import { PageHeader } from "@/components/app/page-header";
import { ValueChart } from "@/components/app/value-chart";
import { getCardStats } from "@/lib/cards";
import { accountFrom, getMyProfile } from "@/lib/profile";
import { getValueHistory } from "@/lib/value-history";

export default async function DashboardPage() {
    // The profile is the same read the layout made: one per name per request, so no second call.
    const [stats, snapshots, me] = await Promise.all([getCardStats(), getValueHistory(), getMyProfile()]);

    return (
        <div className="flex flex-col gap-6">
            <PageHeader title="Home" subtitle="An overview of your collection." trailing={<MobileAccountMenu account={accountFrom(me)} />} />
            <CardsStats stats={stats} />

            <section className="flex flex-col gap-4 rounded-xl bg-primary px-4 py-5 shadow-xs ring-1 ring-secondary ring-inset md:px-5">
                <div className="flex flex-col gap-1">
                    <h2 className="text-sm font-semibold text-tertiary">Collection value over time</h2>
                    <p className="text-xs text-quaternary">One reading a night, at Cardmarket&apos;s prices of that day.</p>
                </div>
                <ValueChart snapshots={snapshots} />
            </section>
        </div>
    );
}
