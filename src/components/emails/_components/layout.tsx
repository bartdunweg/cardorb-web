import { Container, Heading, Html, Link, Preview, Section } from "@react-email/components";
import { Body } from "./body";
import { Button } from "./button";
import { Footer } from "./footer";
import { Head } from "./head";
import { Header } from "./header";
import { Tailwind } from "./tailwind";
import { Text } from "./text";

/** Supabase fills these when it sends; they must reach the HTML untouched. */
export const SITE_URL = "{{ .SiteURL }}";
export const TOKEN_HASH = "{{ .TokenHash }}";
export const EMAIL = "{{ .Email }}";
export const NEW_EMAIL = "{{ .NewEmail }}";

interface AuthEmailProps {
    /** The inbox's preview line. */
    preview: string;
    heading: string;
    /** One sentence: what happened and what the button does. */
    lead: React.ReactNode;
    /** The link's `type`, which /auth/confirm turns into a landing page. */
    linkType: "signup" | "recovery" | "email_change";
    button: string;
    /** The small print: how long the link lasts, what ignoring the mail means. */
    notes: React.ReactNode[];
    /** The footer's "sent to … because …" line. */
    reason: React.ReactNode;
}

/**
 * One shape for every mail Card Orb sends, on Untitled UI's simple-welcome-01: wordmark, a
 * heading that says what the mail is for, one sentence, one button, the same link written out
 * for a client that renders no button, the small print, and a footer that says why it came.
 */
export const AuthEmail = ({ preview, heading, lead, linkType, button, notes, reason }: AuthEmailProps) => {
    const href = `${SITE_URL}/auth/confirm?token_hash=${TOKEN_HASH}&type=${linkType}`;
    return (
        <Html lang="en">
            <Tailwind>
                <Head />
                <Preview>{preview}</Preview>
                <Body>
                    <Container align="center" className="w-full max-w-160 bg-primary md:p-8">
                        <Header />
                        <Container align="left" className="max-w-full px-6 py-6">
                            <Heading as="h1" className="m-0 text-xl font-semibold text-primary">
                                {heading}
                            </Heading>
                            <Text className="mt-3 text-md text-secondary">{lead}</Text>
                            <Section className="mt-8">
                                <Button href={href}>{button}</Button>
                            </Section>
                            <Text className="mt-8 text-sm text-tertiary">
                                If the button doesn&apos;t open, copy this link into your browser:
                                <br />
                                <Link href={href} className="break-all text-tertiary underline">
                                    {href}
                                </Link>
                            </Text>
                            {notes.map((note, i) => (
                                <Text key={i} className="mt-4 text-sm text-tertiary">
                                    {note}
                                </Text>
                            ))}
                        </Container>
                        <Footer>{reason}</Footer>
                    </Container>
                </Body>
            </Tailwind>
        </Html>
    );
};
