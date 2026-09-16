/* Seeds the local Supabase that scripts/e2e-stack.sh started. Plain fetch against the auth admin
   API and PostgREST, with the local service role key: no client library, nothing real touched. */
import fixture from "./fixtures/catalogue.json" with { type: "json" };
import { E2E_USER } from "./support.ts";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");

const headers = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };

const call = async (path: string, init: RequestInit) => {
    const res = await fetch(`${url}${path}`, { ...init, headers: { ...headers, ...init.headers } });
    if (!res.ok) throw new Error(`${init.method} ${path}: ${res.status} ${await res.text()}`);
    return res.status === 204 ? null : res.json();
};

const user = await call("/auth/v1/admin/users", {
    method: "POST",
    body: JSON.stringify({
        email: E2E_USER.email,
        password: E2E_USER.password,
        email_confirm: true,
        user_metadata: { username: E2E_USER.username, display_name: "E2E" },
    }),
});

await call(`/rest/v1/profiles?id=eq.${user.id}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ is_public: true, onboarded_at: new Date().toISOString() }),
});

console.log(`seeded user ${user.id}`);

const upsert = (table: string, rows: unknown[], onConflict: string) =>
    rows.length
        ? call(`/rest/v1/${table}?on_conflict=${onConflict}`, {
              method: "POST",
              headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
              body: JSON.stringify(rows),
          })
        : null;

// scripts/e2e-stack.sh's own placeholder migration inserts a catalogue_cards row per unmatched
// card_price_months id under set_id "e2e-placeholder" (see that script's comment); it shares no
// (id, language) with this fixture's real rows, so merge-duplicates never has to arbitrate
// between them.
await upsert("catalogue_sets", fixture.sets, "id,language");
await upsert("catalogue_cards", fixture.cards, "id,language");
await upsert("tcgplayer_prices", fixture.prices, "product_id,printing");
console.log(`seeded ${fixture.cards.length} cards of ${fixture.sets[0].id}`);
