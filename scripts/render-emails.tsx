/**
 * Renders src/emails/*.tsx to the static HTML Supabase sends.
 *
 *   pnpm emails:render [out-dir]
 *
 * The output is what goes into cardorb-api/supabase/templates/; the Go placeholders
 * ({{ .SiteURL }}, {{ .TokenHash }}, …) pass through as text and Supabase fills them.
 * Without an argument it writes to emails-out/, which is ignored by git.
 */
import { render } from "@react-email/components";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Confirmation } from "../src/emails/confirmation";
import { EmailChange } from "../src/emails/email-change";
import { Recovery } from "../src/emails/recovery";

const out = process.argv[2] ?? "emails-out";
mkdirSync(out, { recursive: true });

const emails = {
    "confirmation.html": Confirmation,
    "recovery.html": Recovery,
    "email-change.html": EmailChange,
};

async function main() {
    for (const [file, Email] of Object.entries(emails)) {
        // React escapes & in attributes to &amp;, which every mail client decodes; the Go
        // placeholders carry no character React touches.
        const html = await render(<Email />);
        writeFileSync(join(out, file), html);
        console.log(`${join(out, file)} ${html.length} bytes`);
    }
}

void main();
