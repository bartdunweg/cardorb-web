import { AuthEmail, EMAIL, NEW_EMAIL } from "@/components/emails/_components/layout";

/** Subject: Confirm your new Card Orb address. Goes to the old address and the new one alike. */
export const EmailChange = () => (
    <AuthEmail
        preview={`Confirm the change to ${NEW_EMAIL}.`}
        heading="Confirm your new email address"
        lead={
            <>
                You asked to change the email address on your Card Orb account from <strong>{EMAIL}</strong> to <strong>{NEW_EMAIL}</strong>. Confirm it to
                finish the change.
            </>
        }
        linkType="email_change"
        button="Confirm new address"
        notes={[
            "The link works once and expires in an hour. Both addresses get this email, and the change goes through once both have confirmed.",
            "Didn't ask for this? You can ignore this email. The address on your account stays as it is.",
        ]}
        reason={<>This email was sent because an address change was requested on the Card Orb account for {EMAIL}.</>}
    />
);

export default EmailChange;
