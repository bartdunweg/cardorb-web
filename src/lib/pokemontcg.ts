// Thin client for the Pokémon TCG API (pokemontcg.io). Keyless works with lower rate limits;
// set POKEMONTCG_API_KEY in .env.local later for higher limits.

export type PokemonCard = {
    id: string;
    name: string;
    setName: string | null;
    number: string | null;
    rarity: string | null;
    imageSmall: string | null;
    imageLarge: string | null;
};

type ApiCard = {
    id: string;
    name: string;
    number?: string;
    rarity?: string;
    set?: { name?: string };
    images?: { small?: string; large?: string };
};

export async function searchPokemonCards(q: string): Promise<PokemonCard[]> {
    const term = q.trim();
    if (!term) return [];

    // Lucene-ish query: prefix/contains match on name. Strip characters that would break it.
    const safe = term.replace(/[^a-zA-Z0-9 &'.-]/g, "").replace(/\s+/g, "*");
    if (!safe) return [];

    const url = `https://api.pokemontcg.io/v2/cards?q=${encodeURIComponent(`name:${safe}*`)}&pageSize=24&orderBy=name`;

    const headers: Record<string, string> = {};
    if (process.env.POKEMONTCG_API_KEY) headers["X-Api-Key"] = process.env.POKEMONTCG_API_KEY;

    const res = await fetch(url, { headers, next: { revalidate: 3600 } });
    if (!res.ok) throw new Error(`Pokémon TCG API error: ${res.status}`);

    const json = (await res.json()) as { data?: ApiCard[] };

    return (json.data ?? []).map((c) => ({
        id: c.id,
        name: c.name,
        setName: c.set?.name ?? null,
        number: c.number ?? null,
        rarity: c.rarity ?? null,
        imageSmall: c.images?.small ?? null,
        imageLarge: c.images?.large ?? null,
    }));
}
