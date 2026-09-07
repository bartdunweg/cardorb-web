import { ImportCsv } from "@/components/app/import-csv";
import { PageHeader } from "@/components/app/page-header";
import { api } from "@/lib/api";

/**
 * Bringing a collection in from somewhere else.
 *
 * Reached from Settings rather than from the navigation: importing is something
 * you do once, and the phone's tab bar has four places in it — the moving pill
 * is sized on a quarter of the row.
 */

export type ImportRecord = {
    id: string;
    kind: string;
    status: string;
    rows_seen: number | null;
    rows_added: number | null;
    rows_skipped: number | null;
    error: string | null;
    started_at: string;
    finished_at: string | null;
};

/**
 * What happened, each time somebody pressed the button.
 *
 * Failing soft, the way the dialogs' read-only helpers do: the history is
 * context, and a page that refuses to load because a list of past runs could
 * not be fetched would be refusing the thing somebody came here to do.
 */
async function history(): Promise<ImportRecord[]> {
    try {
        const { imports } = await api<{ imports: ImportRecord[] }>("/imports");
        return imports;
    } catch {
        return [];
    }
}

export default async function ImportPage() {
    return (
        <div className="flex flex-col gap-6">
            <PageHeader
                title="Import"
                subtitle="Bring a collection in from Dex, Notion or a spreadsheet."
                back={{ href: "/dashboard/settings", label: "Settings" }}
            />
            <ImportCsv history={await history()} />
        </div>
    );
}
