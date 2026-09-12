"use client";

import { FlagIcon } from "@/components/app/flag-icon";
import { Select } from "@/components/base/select/select";
import { languagesFor } from "@/lib/languages";
import { cx } from "@/utils/cx";

/**
 * Picking a language, with its flag beside every option and beside the chosen one.
 *
 * The flag and the select had been assembled by hand in three places, and the three had drifted:
 * two put the flag inside the box, one beside it. A language is one control, so it is one
 * component.
 *
 * The kit's Select rather than a native one, and that is the whole reason it exists: a browser
 * draws `<option>` as text and nothing else, so a flag could only ever sit in the closed box:
 * you saw which language was chosen and picked the next one from a list of bare words. This
 * listbox is drawn by the app, so the flags are in it.
 *
 * What that costs, said out loud: a native select opens the phone's own wheel, which is the
 * better control on a phone. This one opens a popover instead. Worth it here because the flag is
 * the fastest way to read a language and there are eleven of them; not a trade to repeat on every
 * select in the app without asking.
 *
 * `printed` is what the catalogue says this card exists in. Empty or absent means "no answer",
 * and then every language is offered rather than none, the same rule the finish and pattern
 * pickers follow. A language already recorded is always kept, whatever the catalogue claims,
 * because a control whose value is not among its options shows blank and would quietly clear an
 * answer somebody gave on purpose.
 */
export function LanguageSelect({
    value,
    onChange,
    printed,
    className,
}: {
    value: string;
    onChange: (code: string) => void;
    /** The languages the card was printed in, when the API has said. */
    printed?: readonly string[] | null;
    className?: string;
}) {
    const options = languagesFor(value, printed);

    /* A card printed in one language only is not a question, the rule every other field of the
       form follows (soleOption): the language is stated beside its flag. */
    if (options.length === 1) {
        const only = options[0]!;
        return (
            <span className={cx("flex items-center gap-2 text-secondary", className)}>
                <FlagIcon language={only.code} size="sm" labelled />
                {only.label}
            </span>
        );
    }

    return (
        <Select
            aria-label="Language"
            size="sm"
            className={cx("w-full", className)}
            selectedKey={value}
            onSelectionChange={(key) => onChange(String(key))}
            items={options.map((l) => ({ id: l.code, label: l.label }))}
            // The chosen language's flag, in the closed box.
            icon={() => <FlagIcon language={value} size="sm" labelled />}
        >
            {(item) => (
                <Select.Item key={item.id} id={item.id} label={item.label} icon={() => <FlagIcon language={String(item.id)} size="sm" labelled />}>
                    {item.label}
                </Select.Item>
            )}
        </Select>
    );
}
