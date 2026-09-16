import { z } from "zod";

/**
 * Where a person lands after clicking a link in an auth email.
 *
 * The three emails (`confirmation`, `email-change`, `recovery`) are Supabase templates written
 * for the previous Cardorb app, and their `next=` values name that app's routes: `/cards`,
 * `/settings`, `/settings/password`. Those paths do not exist here, so `next` is not trusted
 * at all: the link's `type` decides, and the mapping lives here where a test can read it.
 */
export const linkParamsSchema = z.object({
    token_hash: z.string().min(1),
    type: z.enum(["signup", "invite", "magiclink", "recovery", "email_change", "email"]),
});

export type LinkParams = z.infer<typeof linkParamsSchema>;

/** The page after a verified link, by what the link was for. */
export function landingFor(type: LinkParams["type"]): string {
    switch (type) {
        case "recovery":
            // A recovery link signs the person in so they can set a new password without
            // knowing the old one; Settings asks for the old one, so it gets its own page.
            return "/reset-password";
        case "email_change":
            return "/dashboard/settings";
        default:
            return "/dashboard";
    }
}

/**
 * What the sign-in page says above its form, by a code in `?error=`. A code and a table rather
 * than the sentence itself in the address: a link could otherwise put any sentence on
 * cardorb.com in the site's own error colour (`/login?error=Your+account+was+locked...`).
 * A code not listed says nothing.
 */
const LOGIN_NOTICES: Record<string, string> = {
    missing: "That link is missing something.",
    expired: "That link has expired. Ask for a new one.",
};

export function loginNoticeFor(code: string | undefined): string | undefined {
    return code ? LOGIN_NOTICES[code] : undefined;
}

/**
 * Proof that a session came from a recovery link, for the page that sets a new password without
 * the old one. The session alone was the proof before, and any session has one: a person at a
 * shared machine, or a lifted cookie, could open /reset-password and take the account. Only
 * /auth/confirm writes this, after Supabase verified a recovery token, and the new password
 * clears it.
 */
export const RECOVERY_COOKIE = "cardorb-recovery";
/** A quarter of an hour: long enough to type a password, short enough not to lie around. */
export const RECOVERY_COOKIE_MAX_AGE = 15 * 60;
