import { redirect } from "next/navigation";
import { signOut } from "@/app/(auth)/actions";
import { ThemeToggle } from "@/components/app/theme-toggle";
import { Button } from "@/components/base/buttons/button";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    return (
        <div className="min-h-dvh bg-primary">
            <header className="flex items-center justify-between border-b border-secondary px-6 py-3">
                <span className="text-lg font-semibold text-primary">Cardorb</span>
                <div className="flex items-center gap-2">
                    <ThemeToggle />
                    <form action={signOut}>
                        <Button type="submit" color="secondary" size="sm">
                            Sign out
                        </Button>
                    </form>
                </div>
            </header>
            <main className="mx-auto w-full max-w-container px-6 py-8">{children}</main>
        </div>
    );
}
