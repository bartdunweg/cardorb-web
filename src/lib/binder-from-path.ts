import type { BinderRule } from "@/lib/binder-rule";

type Binder = { id: string; name: string; rule: BinderRule | null };

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
export function binderFromPath(pathname: string, binders: readonly Binder[]): { id: string; name: string } | null {
    const id = BINDER_PATH.exec(pathname)?.[1];
    if (!id) return null;
    const binder = binders.find((f) => f.id === id);
    if (!binder || binder.rule) return null;
    return { id: binder.id, name: binder.name };
}
