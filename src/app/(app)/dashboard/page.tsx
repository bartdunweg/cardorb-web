import { CardsStats } from "@/components/app/cards-stats";
import { PageHeader } from "@/components/app/page-header";
import { getCardStats } from "@/lib/cards";

export default async function DashboardPage() {
    const stats = await getCardStats();

    return (
        <div className="flex flex-col gap-6">
            <PageHeader title="Home" subtitle="An overview of your collection." />
            <CardsStats stats={stats} />
        </div>
    );
}
