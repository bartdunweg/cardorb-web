import { beforeEach, describe, expect, it, vi } from "vitest";

// Only what reaches the API and what is forgotten afterwards is under test; the write itself is a
// stand-in. The ApiError carries a status, so an action's answer to a refusal can be read.
const { api, ApiError } = vi.hoisted(() => ({
    api: vi.fn(async () => ({})),
    ApiError: class ApiError extends Error {
        status: number;
        constructor(status: number, message = "") {
            super(message);
            this.status = status;
        }
    },
}));
vi.mock("@/lib/api", () => ({ ApiError, api }));
vi.mock("@/lib/user-cache", () => ({ forgetMine: vi.fn(async () => undefined) }));
vi.mock("@/lib/cards", () => ({ getFacets: vi.fn(async () => ({ sets: [], rarities: [] })) }));

const { createBinder, deleteBinder, updateBinder } = await import("./actions");
const { forgetMine } = await import("@/lib/user-cache");

const ID = "70b334a6-3a53-4ee5-905f-fd13a0d4ed9f";
const made = { folder: { id: ID } };

const call = () => {
    const first = api.mock.calls[0] as unknown as [string, { method?: string; body?: Record<string, unknown> }] | undefined;
    if (!first) throw new Error("nothing was asked of the API");
    return { path: first[0], method: first[1]?.method, body: first[1]?.body };
};

beforeEach(() => {
    api.mockReset().mockResolvedValue(made as never);
    vi.mocked(forgetMine).mockClear();
});

/*
 * The three binder writes. The scope is the point: a binder made, edited or deleted changes the
 * binder list, which cards a binder's list holds and that binder's value line, and nothing else
 * (`binders` in cache-scopes.ts). Forgetting everything instead would drop the profile, the shelf
 * and every set page for a rename.
 */
describe("createBinder", () => {
    it("posts the name alone for a binder filled by hand, and forgets the binders", async () => {
        expect(await createBinder("Kanto")).toEqual({ ok: true, id: ID });
        expect(call()).toEqual({ path: "/folders", method: "POST", body: { name: "Kanto" } });
        expect(forgetMine).toHaveBeenCalledExactlyOnceWith("binders");
    });

    it("posts the rule, the Pokédex setting and the public flag where they were given", async () => {
        await createBinder("Kanto", { dex: { from: 1, to: 151 } }, { missing: true }, true);
        expect(call().body).toEqual({ name: "Kanto", rule: { dex: { from: 1, to: 151 } }, pokedex: { missing: true }, isPublic: true });
    });

    it("leaves a binder that is not public out of the body rather than saying so", async () => {
        await createBinder("Kanto", undefined, undefined, false);
        expect(call().body).not.toHaveProperty("isPublic");
    });

    it("refuses a nameless binder, and a rule that rules nothing, before the API is asked", async () => {
        expect(await createBinder("  ")).toEqual({ ok: false, error: "Enter a name." });
        expect(await createBinder("Kanto", {})).toMatchObject({ ok: false });
        expect(api).not.toHaveBeenCalled();
        expect(forgetMine).not.toHaveBeenCalled();
    });

    it("says what happened when the API refuses, and forgets nothing", async () => {
        api.mockImplementationOnce(async () => {
            throw new ApiError(409, "That name is taken.");
        });
        expect(await createBinder("Kanto")).toEqual({ ok: false, error: "That name is taken." });
        expect(forgetMine).not.toHaveBeenCalled();
    });

    /*
     * `reread: false` writes and nothing more: forgetMine() redraws the page inside this action's
     * answer, and a dialog that waited for that redraw span for seconds on a write that had landed.
     * Such a caller drops the cache itself, once, afterwards.
     */
    it("writes and nothing more when the caller forgets for itself", async () => {
        expect(await createBinder("Kanto", undefined, undefined, undefined, { reread: false })).toEqual({ ok: true, id: ID });
        expect(api).toHaveBeenCalledTimes(1);
        expect(forgetMine).not.toHaveBeenCalled();
    });
});

describe("updateBinder", () => {
    it("patches the binder by its address, with the change alone and never its id in the body", async () => {
        expect(await updateBinder(ID, { name: "Johto" })).toEqual({ ok: true, id: ID });
        expect(call()).toEqual({ path: `/folders/${ID}`, method: "PATCH", body: { name: "Johto" } });
        expect(call().body).not.toHaveProperty("id");
        expect(forgetMine).toHaveBeenCalledExactlyOnceWith("binders");
    });

    it("takes a Pokédex setting away by name, which is not the same as leaving it out", async () => {
        await updateBinder(ID, { pokedex: null });
        expect(call().body).toEqual({ pokedex: null });
    });

    it("refuses a binder that is not one, and a change that changes nothing", async () => {
        expect(await updateBinder("not-a-binder", { name: "Johto" })).toMatchObject({ ok: false });
        expect(await updateBinder(ID, {})).toEqual({ ok: false, error: "Nothing to change." });
        expect(api).not.toHaveBeenCalled();
        expect(forgetMine).not.toHaveBeenCalled();
    });

    it("says what happened when the API refuses, and forgets nothing", async () => {
        api.mockImplementationOnce(async () => {
            throw new ApiError(403);
        });
        expect(await updateBinder(ID, { name: "Johto" })).toEqual({ ok: false, error: "That is not yours to change." });
        expect(forgetMine).not.toHaveBeenCalled();
    });

    it("writes and nothing more when the caller forgets for itself", async () => {
        expect(await updateBinder(ID, { name: "Johto" }, { reread: false })).toEqual({ ok: true, id: ID });
        expect(api).toHaveBeenCalledTimes(1);
        expect(forgetMine).not.toHaveBeenCalled();
    });
});

describe("deleteBinder", () => {
    it("deletes the binder and forgets the binders", async () => {
        expect(await deleteBinder(ID)).toEqual({ ok: true });
        expect(call()).toEqual({ path: `/folders/${ID}`, method: "DELETE", body: undefined });
        expect(forgetMine).toHaveBeenCalledExactlyOnceWith("binders");
    });

    it("refuses a binder that is not one", async () => {
        expect(await deleteBinder("not-a-binder")).toEqual({ ok: false, error: "Invalid binder." });
        expect(api).not.toHaveBeenCalled();
        expect(forgetMine).not.toHaveBeenCalled();
    });

    it("says what happened when the API refuses, and forgets nothing", async () => {
        api.mockImplementationOnce(async () => {
            throw new ApiError(404);
        });
        expect(await deleteBinder(ID)).toEqual({ ok: false, error: "That is not there any more. Reload the page." });
        expect(forgetMine).not.toHaveBeenCalled();
    });
});
