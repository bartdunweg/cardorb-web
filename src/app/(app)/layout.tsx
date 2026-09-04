import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/app/app-sidebar";
import { CommandSearchProvider } from "@/components/app/command-search";
import { MobileTabBar } from "@/components/app/mobile-nav";
import { ApiError } from "@/lib/api";
import { getMyCollections } from "@/lib/collections";
import { nonceFrom } from "@/lib/csp";
import { accountFrom, getMyProfile } from "@/lib/profile";
import { timed } from "@/lib/timing";
import { Theme } from "@/providers/theme";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
    const nonce = nonceFrom(await headers());
    // The middleware already sent a signed-out visitor to /login; this is the API saying the
    // session it was handed is not good enough, which comes to the same door.
    let me;
    try {
        me = await timed("layout profile", getMyProfile);
    } catch (err) {
        if (err instanceof ApiError && err.status === 401) redirect("/login");
        throw err;
    }

    const account = accountFrom(me);

    // Collections feed the sidebar's expandable Collections item.
    const { collections } = await timed("layout folders and stats", getMyCollections);

    return (
        <Theme nonce={nonce}>
            <CommandSearchProvider>
                <div className="flex min-h-dvh flex-col bg-primary">
                    <div className="flex flex-1 flex-col lg:flex-row">
                        <AppSidebar account={account} collections={collections.map((c) => ({ id: c.id, name: c.name }))} />
                        <main className="flex min-w-0 flex-1 flex-col">
                            <div className="mx-auto flex w-full max-w-container flex-1 flex-col px-4 py-6 pb-24 sm:px-6 sm:py-8 lg:pb-8">{children}</div>
                        </main>
                    </div>
                    <MobileTabBar account={account} />
                </div>
            </CommandSearchProvider>
        </Theme>
    );
}
