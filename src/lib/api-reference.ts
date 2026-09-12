import { parse } from "yaml";

/**
 * What the API reference page says, decided here rather than while rendering.
 *
 * The contract is `https://api.cardorb.com/openapi.yaml`, the one description of what the API
 * answers; this page draws it in the site's own theme. The decisions (which tag files an
 * operation, what "same-origin" is called, how a referenced response is resolved) live in
 * plain functions so a test can call them. Nothing here talks to the network.
 */

export type Operation = {
    method: string;
    path: string;
    summary: string;
    description: string | null;
    deprecated: boolean;
    /** Who may call it, as the page prints it. */
    auth: string;
    responses: { status: string; description: string }[];
    parameters: { name: string; where: string; description: string | null; required: boolean }[];
};

export type Section = { tag: string; description: string | null; operations: Operation[] };

type SecurityRequirement = Record<string, string[]>;
type RawParam = { name: string; in: string; description?: string; required?: boolean };
type RawOp = {
    summary?: string;
    description?: string;
    deprecated?: boolean;
    tags?: string[];
    security?: SecurityRequirement[];
    parameters?: RawParam[];
    responses?: Record<string, { description?: string; $ref?: string }>;
};
export type Spec = {
    info: { title: string; version: string; description?: string };
    servers?: { url: string; description?: string }[];
    security?: SecurityRequirement[];
    tags?: { name: string; description?: string }[];
    components?: { responses?: Record<string, { description?: string }> };
    paths: Record<string, Record<string, RawOp | RawParam[]>>;
};

const METHODS = ["get", "post", "patch", "put", "delete", "options", "head"];

/** The scheme names, as the page prints them. */
const SCHEME_LABEL: Record<string, string> = {
    bearer: "bearer token",
    session: "session cookie",
    passcode: "passcode (deprecated)",
    cron: "cron secret",
};

export const parseSpec = (yaml: string): Spec => parse(yaml) as Spec;

/**
 * Who may call an operation, in words. `security: []` means no credential at all; an operation
 * without a `security` key inherits the document's. Both spellings exist in the contract.
 */
export function authLabel(op: { security?: SecurityRequirement[] }, spec: Spec): string {
    const requirements = op.security ?? spec.security ?? [];
    if (requirements.length === 0) return "no key";
    return requirements
        .flatMap((r) => Object.keys(r))
        .map((n) => SCHEME_LABEL[n] ?? n)
        .join(" or ");
}

/** The operations, grouped under the contract's tags in the order the contract lists them. */
export function sections(spec: Spec): Section[] {
    const byTag = new Map<string, Operation[]>();
    for (const tag of spec.tags ?? []) byTag.set(tag.name, []);

    for (const [path, item] of Object.entries(spec.paths)) {
        const shared = (item.parameters as RawParam[] | undefined) ?? [];
        for (const method of METHODS) {
            const raw = item[method] as RawOp | undefined;
            if (!raw) continue;
            // The first tag decides where it is filed; a second would file it twice.
            const tag = raw.tags?.[0] ?? "Other";
            if (!byTag.has(tag)) byTag.set(tag, []);
            byTag.get(tag)!.push({
                method: method.toUpperCase(),
                path,
                summary: raw.summary ?? "",
                description: raw.description?.trim() || null,
                deprecated: raw.deprecated === true,
                auth: authLabel(raw, spec),
                parameters: [...shared, ...(raw.parameters ?? [])].map((p) => ({
                    name: p.name,
                    where: p.in,
                    description: p.description ?? null,
                    required: p.required === true || p.in === "path",
                })),
                responses: Object.entries(raw.responses ?? {}).map(([status, r]) => ({
                    status,
                    description: r.description ?? spec.components?.responses?.[r.$ref?.split("/").pop() ?? ""]?.description ?? "",
                })),
            });
        }
    }

    const described = new Map((spec.tags ?? []).map((t) => [t.name, t.description ?? null]));
    return [...byTag.entries()].filter(([, ops]) => ops.length > 0).map(([tag, operations]) => ({ tag, description: described.get(tag) ?? null, operations }));
}
