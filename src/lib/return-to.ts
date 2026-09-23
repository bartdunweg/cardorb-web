/**
 * Where signing in sends somebody back to.
 *
 * One rule, read twice. `withReturn` writes the address an invitation points at; `safeReturn`
 * reads it back on the server after the form is posted. Both have to check, because the second
 * one is reading a value that travelled through the browser: a `next` a stranger can set is an
 * open redirect, and this app would be the thing lending its name to it.
 *
 * What survives: a path of this app, and nothing else. Not an absolute URL, not a protocol
 * relative `//evil.example` (which a browser reads as a host, and `startsWith("/")` alone lets
 * through), and not a back slash, which some parsers fold to a forward one.
 *
 * Not the doors themselves either. A `next` of /login would send somebody back to where they
 * started, which reads as a sign-in that silently failed.
 */
const DOORS = ["/login", "/signup", "/forgot-password", "/reset-password"];

export function safeReturn(from: unknown): string | null {
    if (typeof from !== "string" || from.length === 0 || from.length > 512) return null;
    // Any control character at all. URL parsing strips tabs and line breaks, so "/\t/evil.com"
    // reads as "//evil.com", a host: it passed every check below until review caught it.
    if (/[\u0000-\u001F\u007F]/.test(from)) return null;
    if (!from.startsWith("/") || from.startsWith("//") || from.includes("\\")) return null;
    /*
     * Then the check that does not depend on having thought of every trick: resolve it the way a
     * browser will, against a host of our own, and keep it only if it lands there. What comes back
     * is the resolved path rather than the string that came in, so what is redirected to is what
     * was checked.
     */
    const base = "https://return.invalid";
    let resolved: URL;
    try {
        resolved = new URL(from, base);
    } catch {
        return null;
    }
    if (resolved.origin !== base) return null;
    const path = resolved.pathname;
    if (path.startsWith("//")) return null;
    if (DOORS.some((door) => path === door || path.startsWith(`${door}/`))) return null;
    return `${path}${resolved.search}${resolved.hash}`;
}

/** The address an invitation points at, carrying the page the visitor is on. */
export function withReturn(to: string, from: string): string {
    const safe = safeReturn(from);
    return safe ? `${to}?next=${encodeURIComponent(safe)}` : to;
}
