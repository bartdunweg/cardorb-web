import type { FolderRule } from "@/lib/folder-rule";

type Folder = { id: string; name: string; rule: FolderRule | null };

const BINDER_PATH = /^\/dashboard\/collections\/([^/]+)\/?$/;

/** Whether a path is a binder's own page, before the binder list has answered. */
export const isBinderPath = (pathname: string): boolean => BINDER_PATH.test(pathname);

/**
 * The binder a card sheet was opened on, from the page's path: `/dashboard/collections/<id>`,
 * and only when that binder is filled by hand. A rule binder fills itself, so a card added
 * from its page goes to the collection as from anywhere, and the rule decides whether it shows.
 * The path is the one fact every mounted sheet shares: the palette's sheet is mounted by the
 * layout beside the page, out of reach of anything the page could provide.
 */
export function binderFromPath(pathname: string, folders: readonly Folder[]): { id: string; name: string } | null {
    const id = BINDER_PATH.exec(pathname)?.[1];
    if (!id) return null;
    const folder = folders.find((f) => f.id === id);
    if (!folder || folder.rule) return null;
    return { id: folder.id, name: folder.name };
}
