import type { Metadata } from "next";
import { LegalPage } from "@/components/app/legal-page";
import { parseSpec, sections } from "@/lib/api-reference";
import { API_ORIGIN } from "@/lib/api-shapes";

/**
 * The API reference, drawn from the contract at api.cardorb.com/openapi.yaml.
 *
 * Plain HTML in the site's own theme: no Swagger UI, no Redoc, no script from anywhere. A
 * reference for two clients we wrote ourselves does not need a try-it-out console; it needs to
 * be true, which the API's own contract test sees to, and readable, which is this. The contract
 * is fetched once an hour, so a change there reaches this page without a deploy here.
 */
export const revalidate = 3600;

export const metadata: Metadata = {
    title: "API",
    description: "Every route the Card Orb API answers, what it needs, and what it says back.",
    alternates: { canonical: "/docs/api" },
};

const CONTRACT = `${API_ORIGIN}/openapi.yaml`;

export default async function ApiReferencePage() {
    const res = await fetch(CONTRACT, { next: { revalidate } });
    if (!res.ok) throw new Error(`The contract at ${CONTRACT} answered ${res.status}.`);
    const spec = parseSpec(await res.text());
    const groups = sections(spec);

    return (
        <LegalPage
            title={spec.info.title}
            intro="Every route, what it needs, and what it says back. The contract itself is the source; this page only reads it."
            eyebrow={
                <>
                    Version {spec.info.version} ·{" "}
                    <a href={CONTRACT} className="underline">
                        openapi.yaml
                    </a>
                </>
            }
        >
            {spec.info.description
                ?.trim()
                .split(/\n\s*\n/)
                .map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                ))}

            <h2>Servers</h2>
            <ul>
                {(spec.servers ?? []).map((server) => (
                    <li key={server.url}>
                        <code>{server.url}</code>
                        {server.description ? <> — {server.description}</> : null}
                    </li>
                ))}
            </ul>

            {groups.map((group) => (
                <section key={group.tag}>
                    <h2>{group.tag}</h2>
                    {group.description ? <p>{group.description}</p> : null}

                    {group.operations.map((op) => (
                        <div key={`${op.method} ${op.path}`}>
                            <h3>
                                <code>{op.method}</code> <code>{op.path}</code>
                                {op.deprecated ? <small> deprecated</small> : null}
                            </h3>
                            <p>
                                <strong>{op.summary}</strong> · {op.auth}
                            </p>
                            {op.description ? <p>{op.description}</p> : null}

                            {op.parameters.length > 0 ? (
                                <ul>
                                    {op.parameters.map((p) => (
                                        <li key={`${p.where}:${p.name}`}>
                                            <code>{p.name}</code> <small>{p.required ? `${p.where}, required` : p.where}</small>
                                            {p.description ? <> — {p.description}</> : null}
                                        </li>
                                    ))}
                                </ul>
                            ) : null}

                            <ul>
                                {op.responses.map((r) => (
                                    <li key={r.status}>
                                        <code>{r.status}</code> {r.description}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </section>
            ))}
        </LegalPage>
    );
}
