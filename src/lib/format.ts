// Formats a date as "Feb 26, 2019". Handles ISO timestamps, "YYYY-MM-DD" and pokemontcg's
// "YYYY/MM/DD". Date-only strings are parsed as local time to avoid an off-by-one day.
export function formatDate(value: string | Date | null | undefined): string {
    if (!value) return "";

    let date: Date;
    if (value instanceof Date) {
        date = value;
    } else {
        const dateOnly = value.match(/^(\d{4})[-/](\d{2})[-/](\d{2})$/);
        date = dateOnly ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3])) : new Date(value);
    }

    if (Number.isNaN(date.getTime())) return typeof value === "string" ? value : "";

    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const euros = new Intl.NumberFormat("en-US", { style: "currency", currency: "EUR" });

// Formats a Cardmarket price as "€12.50"; nothing when there is no price to show.
export function formatPrice(value: number | null | undefined): string {
    return value == null ? "" : euros.format(value);
}

const wholeEuros = new Intl.NumberFormat("en-US", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

// Formats what a collection or a folder is worth as "€45,240": a sum of hundreds of prices is
// read to the euro, and the cents would only make it harder to read.
export function formatValue(value: number | null | undefined): string {
    return value == null ? "" : wholeEuros.format(value);
}

const counts = new Intl.NumberFormat("en-US");

// Formats a count as "1,025": every number the app says out loud is grouped, so 1025 cards and
// 1,025 Pokémon never sit on the same screen written two ways.
export function formatCount(value: number): string {
    return counts.format(value);
}

/**
 * Today, as a date field writes it: `YYYY-MM-DD` in the reader's own timezone.
 *
 * Two versions of this existed and disagreed. `toISOString().slice(0, 10)` is UTC, so between
 * midnight and 02:00 in Amsterdam it answers yesterday — a card marked owned just after midnight
 * was recorded as got the day before. The date on screen is the reader's date.
 */
export function today(): string {
    // en-CA is the locale that writes a date the way an <input type="date"> reads one.
    return new Date().toLocaleDateString("en-CA");
}
