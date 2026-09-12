import { AppEmptyState } from "@/components/app/app-empty-state";
import { LinkButton } from "@/components/app/link-button";

/**
 * The API answers 404 to a name that is not in use and to one whose owner keeps the collection
 * private, and tells the two apart to nobody, which is the point of private. So this page says
 * both, and is not the site's "We can't find that page": the address is well formed and the
 * person who typed it was told it by the owner, or by Home.
 */
export default function PublicProfileNotFound() {
    return (
        <main className="flex min-h-screen flex-col bg-primary">
            <AppEmptyState icon="folder" title="No collection to show" description="This name is not in use, or its owner keeps the collection private">
                <LinkButton href="/" color="secondary">
                    Go to Home
                </LinkButton>
            </AppEmptyState>
        </main>
    );
}
