import { AuthEmail, EMAIL } from "@/components/emails/_components/layout";

/** Subject: Reset your Card Orb password. */
export const Recovery = () => (
    <AuthEmail
        preview="Choose a new password. The link lasts an hour."
        heading="Reset your password"
        lead="You asked to reset the password for your Card Orb account. Choose a new one on the page behind this button."
        linkType="recovery"
        button="Set new password"
        notes={[
            "The link works once and expires in an hour. If it has expired, ask for a new one from the sign-in page.",
            "Didn't ask for this? You can ignore this email. Your password stays as it is.",
        ]}
        reason={<>This email was sent to {EMAIL} because a password reset was requested for this Card Orb account.</>}
    />
);

export default Recovery;
