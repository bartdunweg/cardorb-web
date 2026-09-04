import { randomInt } from "node:crypto";

/**
 * The username a new account starts with, before the person picks one in Settings.
 *
 * Sign-up asks for an email and a password only, and a profile cannot be without a username:
 * it is the name in `/user/<name>`. So the email's local part becomes the name, in the shape the
 * database checks (`^[a-z0-9][a-z0-9-]{1,29}$`), with four random characters after it so two
 * people with the same local part at different providers do not collide — a collision would fail
 * the whole sign-up, because the profile is written in the same transaction as the account.
 */
export function usernameFromEmail(email: string, suffix = randomSuffix()): string {
    const local = email.split("@")[0] ?? "";
    const base =
        local
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "")
            .replace(/^[^a-z0-9]+/, "")
            .slice(0, 24)
            .replace(/-+$/g, "") || "collector";
    return `${base}-${suffix}`;
}

const ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

function randomSuffix(): string {
    let out = "";
    for (let i = 0; i < 4; i++) out += ALPHABET[randomInt(ALPHABET.length)];
    return out;
}
