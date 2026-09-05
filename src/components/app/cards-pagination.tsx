import { Button } from "@/components/base/buttons/button";

// Previous/Next for a list that pages on `?page=`. Server-renderable: the buttons are links, so a
// page is a URL that can be shared and returned to. Renders nothing for a single page.
export function CardsPagination({ page, totalPages, hrefFor }: { page: number; totalPages: number; hrefFor: (page: number) => string }) {
    if (totalPages <= 1) return null;
    return (
        <nav aria-label="Pages" className="flex items-center justify-between gap-3">
            <p className="text-sm text-tertiary tabular-nums">
                Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
                <Button color="secondary" size="sm" {...(page > 1 ? { href: hrefFor(page - 1) } : { isDisabled: true })}>
                    Previous
                </Button>
                <Button color="secondary" size="sm" {...(page < totalPages ? { href: hrefFor(page + 1) } : { isDisabled: true })}>
                    Next
                </Button>
            </div>
        </nav>
    );
}
