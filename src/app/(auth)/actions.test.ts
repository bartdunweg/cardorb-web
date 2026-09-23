import { beforeEach, describe, expect, it, vi } from "vitest";

/*
 * Signing in is where a visitor's kept press is carried through, so these are about the order of
 * things and about what may never happen: a press that fails standing between somebody and being
 * signed in.
 */
const signInWithPassword = vi.fn();
const signOutOf = vi.fn(async () => ({ error: null }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { signInWithPassword, signOut: signOutOf } }) }));
const applyKeptPress = vi.fn();
vi.mock("@/lib/kept-press-apply", () => ({ applyKeptPress: (...a: unknown[]) => applyKeptPress(...a) }));
const deleted: string[] = [];
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined, set: vi.fn(), delete: (n: string) => deleted.push(n) }) }));
const redirect = vi.fn((to: string) => {
    throw new Error(`redirect:${to}`);
});
vi.mock("next/navigation", () => ({ redirect: (to: string) => redirect(to) }));

const { signIn, signOut } = await import("./actions");
const { KEPT_PRESS_COOKIE } = await import("@/lib/kept-press");

const form = (fields: Record<string, string>) => {
    const f = new FormData();
    for (const [k, v] of Object.entries(fields)) f.set(k, v);
    return f;
};
const SESSION = { access_token: "fresh-token", user: { id: "u1" } };

beforeEach(() => {
    signInWithPassword.mockReset();
    applyKeptPress.mockReset();
    redirect.mockClear();
    signInWithPassword.mockResolvedValue({ data: { session: SESSION }, error: null });
    applyKeptPress.mockResolvedValue(null);
});

describe("signIn and a kept press", () => {
    it("carries it through with the token just given, before sending them back where they were", async () => {
        await expect(signIn(undefined, form({ email: "a@example.com", password: "long-enough-1", next: "/sets/base1" }))).rejects.toThrow(
            "redirect:/sets/base1",
        );
        expect(applyKeptPress).toHaveBeenCalledWith({ token: "fresh-token", userId: "u1", forget: true, continuing: "/sets/base1" });
        expect(applyKeptPress.mock.invocationCallOrder[0]).toBeLessThan(redirect.mock.invocationCallOrder[0]!);
    });

    it("still signs them in when carrying the press throws", async () => {
        applyKeptPress.mockRejectedValue(new Error("the API fell over"));
        vi.spyOn(console, "error").mockImplementation(() => {});
        await expect(signIn(undefined, form({ email: "a@example.com", password: "long-enough-1" }))).rejects.toThrow("redirect:/dashboard");
        vi.restoreAllMocks();
    });

    it("carries nothing when signing in fails", async () => {
        signInWithPassword.mockResolvedValue({ data: { session: null }, error: { message: "Invalid login credentials" } });
        expect(await signIn(undefined, form({ email: "a@example.com", password: "long-enough-1" }))).toEqual({ error: "Invalid login credentials" });
        expect(applyKeptPress).not.toHaveBeenCalled();
    });
});

describe("signOut and a kept press", () => {
    it("takes any parked press with it, so the next person to sign in here inherits nothing", async () => {
        deleted.length = 0;
        await expect(signOut()).rejects.toThrow("redirect:/");
        expect(deleted).toContain(KEPT_PRESS_COOKIE);
    });
});
