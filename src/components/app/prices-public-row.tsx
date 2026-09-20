"use client";

import { CurrencyEuro } from "@untitledui/icons";
import { setPricesPublic } from "@/app/(app)/dashboard/settings/actions";
import { SettingSwitchRow } from "@/components/app/setting-switch-row";

/**
 * Whether the public page prices what it shows: each card's price under its name, and what the
 * collection is worth under the owner's. Off by default and its own switch, under Public
 * profile: who may see the cards and who may see what they are worth are two decisions, and a
 * collector who shows one need not show the other.
 *
 * The switch stays live while the profile is private, so it can be set before the page is
 * opened; the line says the page is private then, so nothing reads as shown that is not.
 */
export function PricesPublicRow({
    isPublic,
    pricesPublic,
    onChange,
}: {
    /** Whether the profile itself is public: the line reads differently while it is not. */
    isPublic: boolean;
    pricesPublic: boolean;
    onChange: (pricesPublic: boolean) => void;
}) {
    return (
        <SettingSwitchRow
            icon={CurrencyEuro}
            label="Show prices"
            line={
                !pricesPublic
                    ? "Prices stay private"
                    : isPublic
                      ? "Card prices and your collection’s value are on your public page"
                      : "Shown once your profile is public"
            }
            isSelected={pricesPublic}
            onChange={onChange}
            save={setPricesPublic}
            forgets="profile"
            stillTitle={(still) => (still ? "Prices are still shown" : "Prices are still private")}
        />
    );
}
