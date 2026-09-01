import { CardsStats } from "@/components/app/cards-stats";
import { getCardStats } from "@/lib/cards";

export default async function DashboardPage() {
    const stats = await getCardStats();

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-1">
                <h1 className="text-display-xs font-semibold text-primary">Home</h1>
                <p className="text-md text-tertiary">An overview of your collection.</p>
            </div>
            <CardsStats stats={stats} />
        </div>
    );
}
