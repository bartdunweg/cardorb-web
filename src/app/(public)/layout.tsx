import { Theme } from "@/providers/theme";

// The public pages: prerendered where they can be, so no per-request nonce here. Their scripts
// run under the headers next.config.mjs sets for every path; the strict script policy is for
// the signed-in and auth pages, which are dynamic anyway. See src/proxy.ts.
export default function PublicLayout({ children }: { children: React.ReactNode }) {
    return <Theme>{children}</Theme>;
}
