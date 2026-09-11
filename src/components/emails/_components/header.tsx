import { Container, Row } from "@react-email/components";
import { Text } from "./text";

/**
 * The kit's left-aligned header with the wordmark set in text. No image: half the mail clients
 * block remote pictures until the reader allows them, and a broken box above "click this link"
 * is the last thing a message that has to look genuine can afford.
 */
export const Header = () => {
    return (
        <Container align="left" className="max-w-full bg-primary px-6 pt-6 pb-2">
            <Row>
                <Text className="text-md font-semibold text-primary">Card Orb</Text>
            </Row>
        </Container>
    );
};
