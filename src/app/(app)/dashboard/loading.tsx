import { LoadingIndicator } from "@/components/application/loading-indicator/loading-indicator";

/**
 * What a screen under /dashboard shows while its data is on the way. The layout — sidebar,
 * account, folders — is already on screen by then, so a person sees where they are and that
 * the cards are coming, rather than a blank page or the previous screen holding still.
 */
export default function DashboardLoading() {
    return (
        <output className="flex flex-1 items-center justify-center py-24" aria-live="polite">
            <LoadingIndicator size="md" label="Loading…" />
        </output>
    );
}
