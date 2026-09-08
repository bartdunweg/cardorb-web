import { AppEmptyState } from "@/components/app/app-empty-state";
import { LinkButton } from "@/components/app/link-button";

// A set or a binder that is not there. Without this the nearest boundary was the root not-found,
// which replaces the whole frame: sidebar gone, tab bar gone, and the only way on was the browser's
// back button. Here the 404 is a state of the page inside the app, like an empty list is
// (R-UI-002: AppEmptyState, centered in the content area, no box around it).
export default function AppNotFound() {
    return (
        <AppEmptyState
            icon="search"
            title="We can’t find that page"
            description="The set or binder you were looking for doesn’t exist, or it isn’t there any more."
        >
            <LinkButton href="/dashboard/sets" color="secondary" size="md">
                Browse sets
            </LinkButton>
            <LinkButton href="/dashboard" size="md">
                Go to Home
            </LinkButton>
        </AppEmptyState>
    );
}
