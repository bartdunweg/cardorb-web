type Outcome = { ok: true } | { ok: false; error: string };

/**
 * Writes that only need to land on the last value asked for.
 *
 * A stepper pressed four times wants the store at n+4, not four calls in a row that may land in
 * any order. One write per key is in the air at a time; a press while it flies replaces what the
 * next one will send, and the presses in between are never sent at all.
 *
 * What comes back is what the flight came to: `true` when every value asked for while it flew has
 * landed, `false` when a write failed (the rest is dropped and the latest ask's `failed` is told
 * why), and `null` when the ask joined a flight already in the air, whose starter gets the answer.
 */
export function settleLatest<T>(write: (key: string, value: T) => Promise<Outcome>) {
    const wants = new Map<string, { value: T; failed: (error: string) => void }>();
    const flying = new Set<string>();
    return async (key: string, value: T, failed: (error: string) => void): Promise<boolean | null> => {
        wants.set(key, { value, failed });
        if (flying.has(key)) return null;
        flying.add(key);
        try {
            for (let want = wants.get(key); want; want = wants.get(key)) {
                wants.delete(key);
                const res = await write(key, want.value);
                if (!res.ok) {
                    (wants.get(key) ?? want).failed(res.error);
                    wants.delete(key);
                    return false;
                }
            }
            return true;
        } finally {
            flying.delete(key);
        }
    };
}
