import { redirect } from "next/navigation";
import { HeroGeometricShapes04 } from "@/components/marketing/header-section/hero-geometric-shapes-04";
import { createClient } from "@/lib/supabase/server";

// Public landing. Logged-in users skip it and go straight to the dashboard.
export default async function LandingPage() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (user) redirect("/dashboard");

    return <HeroGeometricShapes04 />;
}
