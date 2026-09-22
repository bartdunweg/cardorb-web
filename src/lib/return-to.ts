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
    if (!from.startsWith("/") || from.startsWith("//") || from.startsWith("/\\")) return null;
    if (from.includes("\\")) return null;
    const path = from.split(/[?#]/)[0] ?? "";
    if (DOORS.some((door) => path === door || path.startsWith(`${door}/`))) return null;
    return from;
}

/** The address an invitation points at, carrying the page the visitor is on. */
export function withReturn(to: string, from: string): string {
    const safe = safeReturn(from);
    return safe ? `${to}?next=${encodeURIComponent(safe)}` : to;
}
