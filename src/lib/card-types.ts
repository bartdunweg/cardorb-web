/** The energy types a card can carry, as the catalogue names them, in the order the game lists them. */
export const CARD_TYPES = ["Grass", "Fire", "Water", "Lightning", "Psychic", "Fighting", "Darkness", "Metal", "Fairy", "Dragon", "Colorless"] as const;
export type CardType = (typeof CARD_TYPES)[number];
