import { type ReactNode, Suspense } from "react";
import { FolderBody, type FolderBodyProps } from "@/components/app/folder-body";
import { PageHeader } from "@/components/app/page-header";
import { LineSkeleton } from "@/components/app/skeletons";
import { type Datapoints, datapointsLine, unpricedLine } from "@/lib/folder-datapoints";

// Every folder page, top to bottom: the title, what it holds (count and value), the folder's
// actions where it has any, then the row and the list. One shape, so All cards, a folder of
// yours, the favorites and the wishlist read the same.
//
// The title, the actions and the row are drawn at once. The count and the value are a promise
// the page did not wait for: they come from the same read as the first batch of cards, and
// take their place under the title when it lands.
export function FolderPage({
    title,
    back,
    datapoints,
    actions,
    children,
    ...body
}: FolderBodyProps & {
    title: string;
    back?: { href: string; label: string };
    datapoints: Datapoints | Promise<Datapoints>;
    actions?: ReactNode;
    /** Under the data points: a rule's chips, a progress bar. */
    children?: ReactNode;
}) {
    return (
        <div className="flex flex-1 flex-col gap-6">
            <PageHeader
                title={title}
                subtitle={
                    <Suspense fallback={<LineSkeleton className="h-4 w-40" />}>
                        <DatapointsText datapoints={datapoints} />
                    </Suspense>
                }
                back={back}
                actions={actions}
            >
                <Suspense fallback={null}>
                    <UnpricedText datapoints={datapoints} />
                </Suspense>
                {children}
            </PageHeader>
            <FolderBody {...body} />
        </div>
    );
}

async function DatapointsText({ datapoints }: { datapoints: Datapoints | Promise<Datapoints> }) {
    return <span className="inline-block arrive">{datapointsLine(await datapoints)}</span>;
}

async function UnpricedText({ datapoints }: { datapoints: Datapoints | Promise<Datapoints> }) {
    const unpriced = unpricedLine(await datapoints);
    return unpriced ? <p className="text-sm text-quaternary">{unpriced}</p> : null;
}
