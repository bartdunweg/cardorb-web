import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { revalidateTag } = vi.hoisted(() => ({ revalidateTag: vi.fn() }));
vi.mock("next/cache", () => ({ revalidateTag, unstable_cache: (fn: () => unknown) => fn, updateTag: vi.fn(), revalidatePath: vi.fn() }));

const { POST } = await import("./route");

const post = (body: unknown, secret?: string) =>
    POST(
        new Request("https://cardorb.com/api/revalidate", {
            method: "POST",
            headers: { "content-type": "application/json", ...(secret === undefined ? {} : { authorization: `Bearer ${secret}` }) },
            body: typeof body === "string" ? body : JSON.stringify(body),
        }),
    );
const who = { username: "Bart", userId: "5b0d3e8e-2d5a-4c2b-9c1e-6f1d2a3b4c5d" };

/** The API's word that a profile changed: behind the shared secret, it drops the two tags; without it, nothing. */
describe("POST /api/revalidate", () => {
    beforeEach(() => vi.stubEnv("REVALIDATE_SECRET", "s3cret"));
    afterEach(() => {
        vi.unstubAllEnvs();
        revalidateTag.mockClear();
    });

    it("drops the public page and the dashboard of the person named", async () => {
        const res = await post(who, "s3cret");
        expect(res.status).toBe(204);
        expect(revalidateTag).toHaveBeenCalledWith("public:bart", "max");
        expect(revalidateTag).toHaveBeenCalledWith(`user:${who.userId}`, "max");
    });

    it("refuses a missing or wrong secret, and drops nothing", async () => {
        expect((await post(who)).status).toBe(401);
        expect((await post(who, "guess")).status).toBe(401);
        expect((await post(who, "s3cre")).status).toBe(401);
        expect(revalidateTag).not.toHaveBeenCalled();
    });

    it("refuses everything while no secret is configured", async () => {
        vi.stubEnv("REVALIDATE_SECRET", "");
        expect((await post(who, "")).status).toBe(503);
        expect(revalidateTag).not.toHaveBeenCalled();
    });

    it("refuses a body that names nobody", async () => {
        expect((await post({ username: "" }, "s3cret")).status).toBe(400);
        expect((await post("not json", "s3cret")).status).toBe(400);
        expect(revalidateTag).not.toHaveBeenCalled();
    });
});
