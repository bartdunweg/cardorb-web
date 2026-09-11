import { AuthEmail, EMAIL } from "@/components/emails/_components/layout";

/** Subject: Confirm your Card Orb account. */
export const Confirmation = () => (
    <AuthEmail
        preview="One click and your account is ready."
        heading="Confirm your email address"
        lead="You signed up for Card Orb with this address. Confirm it and you can sign in."
        linkType="signup"
        button="Confirm email address"
        notes={[
            "The link works once and expires in an hour. If it has expired, sign up again with the same address and we'll send a new one.",
            "Didn't sign up? You can ignore this email. The account can't be used without this confirmation.",
        ]}
        reason={<>This email was sent to {EMAIL} because it was used to create a Card Orb account.</>}
    />
);

export default Confirmation;
