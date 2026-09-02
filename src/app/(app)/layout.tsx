import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/app/app-sidebar";
import { CommandSearchProvider } from "@/components/app/command-search";
import { MobileTabBar } from "@/components/app/mobile-nav";
import { getMyCollections } from "@/lib/collections";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    const { data: profile } = await supabase.from("profiles").select("display_name, username, avatar_url").eq("id", user.id).maybeSingle();

    const account = {
        name: profile?.display_name || profile?.username || user.email?.split("@")[0] || "Account",
        email: user.email ?? "",
        avatarUrl: profile?.avatar_url ?? null,
    };

    // Collections feed the sidebar's expandable Collections item.
    const { collections } = await getMyCollections();

    return (
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
    );
}
