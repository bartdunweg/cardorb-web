import de from "flag-icons/flags/4x3/de.svg";
import fr from "flag-icons/flags/4x3/fr.svg";
import gb from "flag-icons/flags/4x3/gb.svg";
import it from "flag-icons/flags/4x3/it.svg";
import jp from "flag-icons/flags/4x3/jp.svg";
import nl from "flag-icons/flags/4x3/nl.svg";
import pt from "flag-icons/flags/4x3/pt.svg";
import Image, { type StaticImageData } from "next/image";
/* Spain is ours, not flag-icons'. Theirs is 80,958 bytes, a hundred times every other flag
   here, because it draws the arms in full: a castle, a lion, chains, a pomegranate and two
   crowned pillars. This is rendered 20 pixels wide and 15 tall, where that whole device is about
   four pixels across and reads as a smudge. The civil flag, same colours and proportions, is
   214 bytes. */
import es from "@/assets/flags/es.svg";
import { languageOf } from "@/lib/languages";
import { cx } from "@/utils/cx";

// A language as its flag, from flag-icons' SVGs: the eight the API knows, imported one by one so
// only these eight files ship (the package's stylesheet would pull in five hundred). The same
// hairline the card thumbnails carry, so a flag reads as a small picture on any surface. The
// name is there for a reader unless the caller has put it beside the flag already.
const FLAGS: Record<string, StaticImageData> = { de, es, fr, gb, it, jp, nl, pt };

export function FlagIcon({
    language,
    size = "sm",
    labelled = false,
    className,
}: {
    language: string | null | undefined;
    size?: "sm" | "md";
    /** The name is already beside the flag, so no hidden one. */
    labelled?: boolean;
    className?: string;
}) {
    const l = languageOf(language);
    const flag = FLAGS[l.country];
    if (!flag) return null;
    return (
        <span className={cx("inline-flex shrink-0 overflow-hidden rounded-xs ring-1 ring-image ring-inset", className)}>
            <Image src={flag} alt="" unoptimized width={20} height={15} className={cx("w-auto", size === "sm" ? "h-3" : "h-4")} />
            {labelled ? null : <span className="sr-only">{l.label}</span>}
        </span>
    );
}
