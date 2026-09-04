import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/app/app-sidebar";
import { CommandSearchProvider } from "@/components/app/command-search";
import { MobileTabBar } from "@/components/app/mobile-nav";
import { ApiError } from "@/lib/api";
import { getMyCollections } from "@/lib/collections";
import { accountFrom, getMyProfile } from "@/lib/profile";
import { RouteProvider } from "@/providers/router-provider";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
    // The profile and the folders are independent reads of an API in another region, and after
    // every write both miss the cache: asked together, the layout waits for the slower one rather
    // than the sum. Each read logs its own timing line (perUser, then the API call on a miss).
    //
    // The middleware already sent a signed-out visitor to /login; a 401 here is the API saying the
    // session it was handed is not good enough, which comes to the same door.
    let me;
    let collections;
    try {
        [me, { collections }] = await Promise.all([getMyProfile(), getMyCollections()]);
    } catch (err) {
        if (err instanceof ApiError && err.status === 401) redirect("/login");
        throw err;
    }

    const account = accountFrom(me);

    return (
        <RouteProvider>
            <CommandSearchProvider>
                {/* overflow-x-clip: a decoration wider than a phone (the empty state's rings) must not widen the page, or the fixed tab bar drifts off the screen. */}
                <div className="flex min-h-dvh flex-col overflow-x-clip bg-primary">
                    <div className="flex flex-1 flex-col lg:flex-row">
                        <AppSidebar account={account} collections={collections.map((c) => ({ id: c.id, name: c.name }))} />
                        <main className="flex min-w-0 flex-1 flex-col">
                            <div className="mx-auto flex w-full max-w-container flex-1 flex-col px-4 pt-4 pb-24 sm:px-6 sm:py-8 lg:pb-8">{children}</div>
                        </main>
                    </div>
                    <MobileTabBar account={account} />
                </div>
            </CommandSearchProvider>
        </RouteProvider>
    );
}
