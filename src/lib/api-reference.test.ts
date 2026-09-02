import { describe, expect, it } from "vitest";
import { authLabel, parseSpec, sections } from "./api-reference";

const spec = parseSpec(`
openapi: 3.1.0
info: { title: Card Orb API, version: 1.0.0 }
security:
  - bearer: []
  - session: []
tags:
  - { name: Collection, description: What you own. }
  - { name: Empty }
  - { name: Public }
components:
  responses:
    Unauthorised: { description: "No viewer. Sign in, or send a bearer token." }
paths:
  /v1/collection:
    get:
      tags: [Collection]
      summary: The whole thing
      responses:
        "200": { description: The collection. }
        "401": { $ref: "#/components/responses/Unauthorised" }
  /v1/collection/items/{id}:
    parameters:
      - { name: id, in: path, required: true }
    patch:
      tags: [Collection]
      summary: Change a copy
      responses: { "200": { description: Changed. } }
    delete:
      tags: [Collection]
      summary: Remove a copy
      responses: { "200": { description: Removed. } }
  /v1/public/{username}/profile:
    get:
      tags: [Public]
      security: []
      summary: The public face
      parameters: [{ name: username, in: path }]
      responses: { "200": { description: The profile. } }
`);

describe("authLabel", () => {
    it("says 'no key' for an operation that opts out", () => {
        expect(authLabel({ security: [] }, spec)).toBe("no key");
    });
    it("inherits the document's schemes when the operation names none", () => {
        expect(authLabel({}, spec)).toBe("bearer token or session cookie");
    });
    it("names a scheme the page has no word for as it is", () => {
        expect(authLabel({ security: [{ mystery: [] }] }, spec)).toBe("mystery");
    });
});

describe("sections", () => {
    const all = sections(spec);

    it("follow the contract's tag order and drop empty tags", () => {
        expect(all.map((s) => s.tag)).toEqual(["Collection", "Public"]);
        expect(all[0].description).toBe("What you own.");
    });

    it("file every operation exactly once", () => {
        const seen = all.flatMap((s) => s.operations.map((o) => `${o.method} ${o.path}`));
        expect(seen).toEqual([
            "GET /v1/collection",
            "PATCH /v1/collection/items/{id}",
            "DELETE /v1/collection/items/{id}",
            "GET /v1/public/{username}/profile",
        ]);
    });

    it("carry a path parameter as required and a shared one on every method", () => {
        const item = all[0].operations.filter((o) => o.path === "/v1/collection/items/{id}");
        expect(item).toHaveLength(2);
        for (const op of item) expect(op.parameters[0]).toMatchObject({ name: "id", where: "path", required: true });
        expect(all[1].operations[0].parameters[0]).toMatchObject({ name: "username", required: true });
    });

    it("resolve a referenced response to its description", () => {
        const unauthorised = all[0].operations[0].responses.find((r) => r.status === "401");
        expect(unauthorised?.description).toMatch(/sign in/i);
    });
});
