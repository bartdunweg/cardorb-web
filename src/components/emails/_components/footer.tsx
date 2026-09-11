import { Container, Row } from "@react-email/components";
import { Text } from "./text";

/**
 * The kit's left-aligned footer, cut down to what a transactional mail has to say: who it went
 * to and why, and that a reply goes nowhere. No unsubscribe, because none of these is optional.
 */
export const Footer = ({ children }: { children: React.ReactNode }) => {
    return (
        <Container align="left" className="max-w-full bg-primary px-6 pt-2 pb-8">
            <Row>
                <Text className="text-sm text-tertiary">{children} Replies to this address aren&apos;t read.</Text>
            </Row>
        </Container>
    );
};
