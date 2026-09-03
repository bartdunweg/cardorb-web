import { headers } from "next/headers";
import { nonceFrom } from "@/lib/csp";
import { Theme } from "@/providers/theme";

// Auth pages render their own full-screen layout; this one only brings the theme, signed with
// the nonce the middleware minted for this request.
export default async function AuthLayout({ children }: { children: React.ReactNode }) {
    return <Theme nonce={nonceFrom(await headers())}>{children}</Theme>;
}
