import { ListSkeleton } from "@/components/app/skeletons";

/**
 * The frame while the profile is read.
 *
 * This page awaits five API reads together before it renders anything, and it is the one page in
 * the app a stranger arrives at cold — no warmed router, no session, nothing already on screen.
 * Without this it was a blank tab for as long as an API in another region took to answer, which
 * reads as a dead link rather than as a page loading.
 *
 * No title: whose collection it is, is one of the things being fetched, and a heading that says
 * the wrong name for a moment is worse than a heading that arrives.
 */
export default function Loading() {
    return <ListSkeleton tiles={12} />;
}
