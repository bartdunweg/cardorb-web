import type { ReactNode } from "react";
import { FolderBody, type FolderBodyProps } from "@/components/app/folder-body";
import { PageHeader } from "@/components/app/page-header";
import { type Datapoints, datapointsLine, unpricedLine } from "@/lib/folder-datapoints";

// Every folder page, top to bottom: the title, what it holds (count and value), the folder's
// actions where it has any, then the row and the list. One shape, so All cards, a folder of
// yours, the favorites and the wishlist read the same.
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
    datapoints: Datapoints;
    actions?: ReactNode;
    /** Under the data points: a rule's chips, a progress bar. */
    children?: ReactNode;
}) {
    const unpriced = unpricedLine(datapoints);
    return (
        <div className="flex flex-1 flex-col gap-6">
            <PageHeader title={title} subtitle={datapointsLine(datapoints)} back={back} actions={actions}>
                {unpriced ? <p className="text-sm text-quaternary">{unpriced}</p> : null}
                {children}
            </PageHeader>
            <FolderBody {...body} />
        </div>
    );
}
