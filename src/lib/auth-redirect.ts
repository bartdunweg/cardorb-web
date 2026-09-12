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
