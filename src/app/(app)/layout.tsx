import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/app/app-sidebar";
import { CommandSearchProvider } from "@/components/app/command-search";
import { MobileTabBar } from "@/components/app/mobile-nav";
import { MAIN_ID, SkipToContent } from "@/components/app/skip-to-content";
import { Toasts } from "@/components/app/toast";
import { ApiError } from "@/lib/api";
import { getFavoritesCount, getMyFolders, getPokedexCount } from "@/lib/collections";
import { type Account, accountFrom, getMyProfile } from "@/lib/profile";
import { RouteProvider } from "@/providers/router-provider";

// What the sidebar shows for the account until the profile read answers, or when it fails: the
// menu still opens, Settings and Sign out still work.
const NO_ACCOUNT: Account = { name: "Account", email: "", avatarUrl: null, publicUrl: null };

export default function AppLayout({ children }: { children: React.ReactNode }) {
    // Not awaited. The profile and the folders are reads of an API in another region, and after
    // every write both miss the cache. Awaited here, nothing reached the browser until the slower
    // of the two answered: no frame, no skeleton, a blank tab for as long as the API took. Now the
    // frame streams at once, the page's loading.tsx with it, and the folder rows and the account
    // card fill in when their read lands (each logs its own timing line).
    //
    // The folders' counts ride along in that one answer; the favorites count is a read of the
    // stats, and the Pokédex's a count of every card, both cached like the folders, so every
    // binder in the sidebar has its number (Bart's call).
    const me = getMyProfile();
    const folders = getMyFolders();
    // What the client components get resolves always: a rejection there would reach the root
    // error boundary and take the frame down with it. The failure itself is judged in SessionGuard.
    const account = me.then(accountFrom, () => NO_ACCOUNT);
    const collections = folders.catch(() => []);
    const favoritesCount = getFavoritesCount().catch(() => null);
    const pokedexCount = getPokedexCount().catch(() => null);

    return (
        <RouteProvider>
            <CommandSearchProvider>
                <Suspense fallback={null}>
                    <SessionGuard reads={[me, folders]} />
                </Suspense>
                {/* overflow-x-clip: a decoration wider than a phone (the empty state's rings) must not widen the page, or the fixed tab bar drifts off the screen. */}
                {/* A page a shade off white, so the surfaces on it (tiles, inputs, the chart) read as white
                    things lying on it. In dark the page stays the darkest layer; a lighter page there would
                    turn the surfaces into holes. */}
                <SkipToContent />
                <div className="flex min-h-dvh flex-col overflow-x-clip bg-page">
                    <div className="flex flex-1 flex-col lg:flex-row">
                        <AppSidebar account={account} collections={collections} favoritesCount={favoritesCount} pokedexCount={pokedexCount} />
                        {/* tabIndex -1 so focus can be sent here after a navigation without putting
                            the element itself in the tab order. */}
                        <main id={MAIN_ID} tabIndex={-1} className="flex min-w-0 flex-1 flex-col outline-none">
                            <div className="mx-auto flex w-full max-w-container flex-1 flex-col px-4 pt-4 pb-28 sm:px-6 sm:py-8 lg:pb-8">{children}</div>
                        </main>
                    </div>
                    <MobileTabBar />
                    <Toasts />
                </div>
            </CommandSearchProvider>
        </RouteProvider>
    );
}

// The middleware already sent a signed-out visitor to /login; a 401 here is the API saying the
// session it was handed is not good enough, which comes to the same door. Called while the page
// streams, redirect() sends the browser there from the client. Any other failure is logged and
// the frame stands without a name: the page's own reads say what is wrong, inside its boundary.
async function SessionGuard({ reads }: { reads: Promise<unknown>[] }) {
    try {
        await Promise.all(reads);
    } catch (err) {
        if (err instanceof ApiError && err.status === 401) redirect("/login");
        console.error("Profile unavailable, frame drawn without it:", err instanceof Error ? err.message : err);
    }
    return null;
}
