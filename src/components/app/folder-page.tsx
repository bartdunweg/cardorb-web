import { type ReactNode, Suspense } from "react";
import { FolderBody, type FolderBodyProps } from "@/components/app/folder-body";
import { PageHeader } from "@/components/app/page-header";
import { type Datapoints, datapointsLine } from "@/lib/folder-datapoints";

// Every folder page, top to bottom: the title, what it holds (count and value), the folder's
// actions where it has any, then the row and the list. One shape, so All cards, a folder of
// yours, the favorites and the wishlist read the same.
//
// The title, the actions and the row are drawn at once. The count and the value are a promise
// the page did not wait for: they come from the same read as the first batch of cards, and
// take their place under the title when it lands.
export function FolderPage({
    title,
    subtitle,
    back,
    datapoints,
    actions,
    barActions,
    children,
    ...body
}: FolderBodyProps & {
    title: string;
    /** A sentence under the title, above the count, where the title alone does not say what the list is. */
    subtitle?: string;
    back?: { href: string; label: string };
    datapoints: Datapoints | Promise<Datapoints>;
    actions?: ReactNode;
    /** A phone's settings button, in the bar across from Back; see PageHeader. */
    barActions?: ReactNode;
    /** Under the data points: a rule's chips, a progress bar. */
    children?: ReactNode;
}) {
    return (
        <div className="flex flex-1 flex-col gap-6">
            <PageHeader
                title={title}
                subtitle={
                    <>
                        {subtitle ? <span className="block">{subtitle}</span> : null}
                        <Suspense fallback={null}>
                            <DatapointsText datapoints={datapoints} />
                        </Suspense>
                    </>
                }
                back={back}
                actions={actions}
                barActions={barActions}
            >
                {children}
            </PageHeader>
            <FolderBody {...body} />
        </div>
    );
}

async function DatapointsText({ datapoints }: { datapoints: Datapoints | Promise<Datapoints> }) {
    return <span className="inline-block arrive">{datapointsLine(await datapoints)}</span>;
}
