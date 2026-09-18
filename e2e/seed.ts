/* Seeds the local Supabase that scripts/e2e-stack.sh started. Plain fetch against the auth admin
   API and PostgREST, with the local service role key: no client library, nothing real touched. */
import { crc32, deflateSync } from "node:zlib";
import fixture from "./fixtures/catalogue.json" with { type: "json" };
import { E2E_USER } from "./support.ts";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");

const headers = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };

const call = async (path: string, init: RequestInit) => {
    const res = await fetch(`${url}${path}`, { ...init, headers: { ...headers, ...init.headers } });
    const text = await res.text();
    if (!res.ok) throw new Error(`${init.method} ${path}: ${res.status} ${text}`);
    // return=minimal answers 201 or 204 with an empty body, not only 204: read as text first, or
    // an empty body's JSON.parse throws "Unexpected end of JSON input".
    return text ? JSON.parse(text) : null;
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

/* A 256 px picture in the avatars bucket, the size an upload through Settings is stored at, so the
   avatars are drawn from a real file (avatar.spec.ts). A solid colour, written as a PNG by hand:
   no image library for one square. */
const png = (side: number): Buffer => {
    const chunk = (type: string, data: Buffer) => {
        const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
        const out = Buffer.alloc(body.length + 8);
        out.writeUInt32BE(data.length, 0);
        body.copy(out, 4);
        out.writeUInt32BE(crc32(body), body.length + 4);
        return out;
    };
    const header = Buffer.alloc(13);
    header.writeUInt32BE(side, 0);
    header.writeUInt32BE(side, 4);
    header.set([8, 2, 0, 0, 0], 8); // 8 bits, RGB, no interlace
    const row = Buffer.concat([Buffer.from([0]), Buffer.alloc(side * 3, Buffer.from([0x2e, 0x7d, 0x5b]))]);
    const pixels = deflateSync(Buffer.concat(Array.from({ length: side }, () => row)));
    return Buffer.concat([
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        chunk("IHDR", header),
        chunk("IDAT", pixels),
        chunk("IEND", Buffer.alloc(0)),
    ]);
};
const avatarPath = `${user.id}/avatar.png`;
const uploaded = await fetch(`${url}/storage/v1/object/avatars/${avatarPath}`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "image/png", "x-upsert": "true" },
    body: new Uint8Array(png(256)),
});
if (!uploaded.ok) throw new Error(`avatar upload: ${uploaded.status} ${await uploaded.text()}`);
await call(`/rest/v1/profiles?id=eq.${user.id}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ avatar_url: `${url}/storage/v1/object/public/avatars/${avatarPath}` }),
});
console.log("seeded a 256 px avatar");

const upsert = (table: string, rows: unknown[], onConflict: string) =>
    rows.length
        ? call(`/rest/v1/${table}?on_conflict=${onConflict}`, {
              method: "POST",
              headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
              body: JSON.stringify(rows),
          })
        : null;

await upsert("catalogue_sets", fixture.sets, "id,language");
await upsert("catalogue_cards", fixture.cards, "id,language");
await upsert("tcgplayer_prices", fixture.prices, "product_id,printing");
console.log(`seeded ${fixture.cards.length} cards of ${fixture.sets[0].id}`);
