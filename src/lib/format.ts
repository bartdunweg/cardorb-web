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
