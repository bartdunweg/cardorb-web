"use client";

import { parseDate } from "@internationalized/date";
import { Mail01, SearchLg, Star01, Tag01 } from "@untitledui/icons";
import { DatePicker } from "@/components/application/date-picker/date-picker";
import { FileUploadDropZone } from "@/components/application/file-upload/file-upload-base";
import { Checkbox } from "@/components/base/checkbox/checkbox";
import { Input } from "@/components/base/input/input";
import { RadioButton, RadioGroup } from "@/components/base/radio-buttons/radio-buttons";
import { Select, type SelectItemType } from "@/components/base/select/select";
import { NativeSelect } from "@/components/base/select/select-native";
import { Toggle } from "@/components/base/toggle/toggle";
import { Cell, Group, Panel, type SectionSpec } from "./design-section";

const conditions = [
    { value: "nm", label: "Near Mint" },
    { value: "lp", label: "Lightly Played" },
    { value: "mp", label: "Moderately Played" },
];

/** For the ComboBox, which takes its rows as data rather than as children. */
const sets: SelectItemType[] = [
    { id: "base1", label: "Base Set", supportingText: "1999" },
    { id: "swsh3", label: "Darkness Ablaze", supportingText: "2020" },
    { id: "sv4", label: "Paradox Rift", supportingText: "2023" },
    { id: "sv4pt5", label: "Paldean Fates", supportingText: "2024" },
];

/** Everything you fill in. */
export const formSections: SectionSpec[] = [
    {
        id: "input",
        title: "Input",
        from: "components/base/input/input",
        note: "Label, field and hint in one component; the hint turns into the error message when the field is invalid. Changed from the kit: min, max and step are forwarded, so a number or a date can name its bounds.",
        render: (
            <Panel>
                <Group title="Sizes" cols="wide">
                    <Cell label='size="sm"'>
                        <Input size="sm" label="Display name" placeholder="Your name" />
                    </Cell>
                    <Cell label='size="md"'>
                        <Input size="md" label="Display name" placeholder="Your name" />
                    </Cell>
                    <Cell label='size="lg"'>
                        <Input size="lg" label="Display name" placeholder="Your name" />
                    </Cell>
                </Group>
                <Group title="States" cols="wide">
                    <Cell label="hint">
                        <Input label="Username" placeholder="ash" hint="Shown on your public profile." />
                    </Cell>
                    <Cell label="isRequired">
                        <Input label="Email" placeholder="you@example.com" isRequired />
                    </Cell>
                    <Cell label="isInvalid">
                        <Input label="Email" defaultValue="not-an-email" isInvalid hint="That is not an email address." />
                    </Cell>
                    <Cell label="isDisabled">
                        <Input label="Username" defaultValue="ash" isDisabled />
                    </Cell>
                    <Cell label="tooltip">
                        <Input label="Purchase price" placeholder="0.00" tooltip="What you paid, not what it is worth." />
                    </Cell>
                    <Cell label="shortcut">
                        <Input aria-label="Search cards" placeholder="Search cards" icon={SearchLg} shortcut />
                    </Cell>
                </Group>
                <Group title="Types" cols="wide">
                    <Cell label='icon + type="email"'>
                        <Input label="Email" type="email" placeholder="you@example.com" icon={Mail01} />
                    </Cell>
                    <Cell label='type="password"'>
                        <Input label="Password" type="password" defaultValue="pikachu" />
                    </Cell>
                    <Cell label='type="number" with min/max/step'>
                        <Input label="Dex number" type="number" min={1} max={1025} step={1} placeholder="25" />
                    </Cell>
                </Group>
            </Panel>
        ),
    },
    {
        id: "date-picker",
        title: "DatePicker",
        from: "components/application/date-picker/date-picker",
        note: "A button that says the day and opens the kit's calendar: a month grid, a typed date field and a Today shortcut, then Cancel or Apply. Two shapes, added to the kit: filter is a pill that hugs the day, for a bar of filters; field is a rectangle that fills its wrapper and reads like an input, for a form. Every acquired date in the app is the field, through AcquiredDatePicker, which ends the calendar at today. Replaced the browser's own date field, whose look was the browser's and whose segments fought a year being corrected digit by digit.",
        render: (
            <Panel>
                <Group title="variant=filter" cols="wide">
                    <Cell label="empty">
                        <DatePicker aria-label="Acquired" />
                    </Cell>
                    <Cell label="defaultValue">
                        <DatePicker aria-label="Acquired" defaultValue={parseDate("2026-07-09")} />
                    </Cell>
                    <Cell label="isDisabled">
                        <DatePicker aria-label="Acquired" isDisabled defaultValue={parseDate("2026-07-09")} />
                    </Cell>
                </Group>
                <Group title="variant=field" cols="wide">
                    <Cell label="empty">
                        <DatePicker aria-label="Acquired" variant="field" className="w-full" />
                    </Cell>
                    <Cell label="defaultValue">
                        <DatePicker aria-label="Acquired" variant="field" className="w-full" defaultValue={parseDate("2026-07-09")} />
                    </Cell>
                    <Cell label="isDisabled">
                        <DatePicker aria-label="Acquired" variant="field" className="w-full" isDisabled defaultValue={parseDate("2026-07-09")} />
                    </Cell>
                </Group>
            </Panel>
        ),
    },
    {
        id: "checkbox",
        title: "Checkbox",
        from: "components/base/checkbox/checkbox",
        note: "Two sizes, and the three values a checkbox can hold: off, on, and the indeterminate middle a parent row shows when only some of its children are ticked. In dark mode a ticked box is white and its tick is white too — 1.02:1, invisible. The kit assumes a coloured brand; ours is a grayscale ramp whose solid is near-white in the dark. Toggle already carries the fix for this (its knob flips to black); Checkbox, RadioButton and the checkbox inside Select and Dropdown do not.",
        render: (
            <Panel>
                <Group title="States" cols="tight">
                    <Cell label="unchecked">
                        <Checkbox aria-label="Unchecked" />
                    </Cell>
                    <Cell label="isSelected">
                        <Checkbox aria-label="Checked" defaultSelected />
                    </Cell>
                    <Cell label="isIndeterminate">
                        <Checkbox aria-label="Indeterminate" isIndeterminate />
                    </Cell>
                    <Cell label="isDisabled">
                        <Checkbox aria-label="Disabled" isDisabled />
                    </Cell>
                    <Cell label="isDisabled + isSelected">
                        <Checkbox aria-label="Disabled and checked" isDisabled defaultSelected />
                    </Cell>
                </Group>
                <Group title="Sizes and text" cols="wide">
                    <Cell label='size="sm" + label'>
                        <Checkbox size="sm" label="Only cards I own" defaultSelected />
                    </Cell>
                    <Cell label='size="md" + label'>
                        <Checkbox size="md" label="Only cards I own" defaultSelected />
                    </Cell>
                    <Cell label="label + hint" span={2}>
                        <Checkbox size="md" label="Public profile" hint="Anyone with the link can see the cards you own — never the prices or the notes." />
                    </Cell>
                </Group>
            </Panel>
        ),
    },
    {
        id: "radio-buttons",
        title: "RadioButton",
        from: "components/base/radio-buttons/radio-buttons",
        note: "Always inside a RadioGroup, which passes its size down to every button in it. Selected, in dark mode, it has the same white-on-white problem as Checkbox above: a white circle with a white dot in it.",
        render: (
            <Panel>
                <Group title="States" cols="tight">
                    <Cell label="unselected">
                        <RadioGroup aria-label="Unselected">
                            <RadioButton value="a" aria-label="Unselected" />
                        </RadioGroup>
                    </Cell>
                    <Cell label="isSelected">
                        <RadioGroup aria-label="Selected" defaultValue="a">
                            <RadioButton value="a" aria-label="Selected" />
                        </RadioGroup>
                    </Cell>
                    <Cell label="isDisabled">
                        <RadioGroup aria-label="Disabled" isDisabled>
                            <RadioButton value="a" aria-label="Disabled" />
                        </RadioGroup>
                    </Cell>
                    <Cell label="isDisabled + isSelected">
                        <RadioGroup aria-label="Disabled and selected" isDisabled defaultValue="a">
                            <RadioButton value="a" aria-label="Disabled and selected" />
                        </RadioGroup>
                    </Cell>
                </Group>
                <Group title="Sizes and text" cols="wide">
                    <Cell label='size="sm"'>
                        <RadioGroup size="sm" aria-label="Where it goes, small" defaultValue="collection">
                            <RadioButton value="collection" label="Collection" />
                            <RadioButton value="wishlist" label="Wishlist" />
                        </RadioGroup>
                    </Cell>
                    <Cell label='size="md"'>
                        <RadioGroup size="md" aria-label="Where it goes, medium" defaultValue="collection">
                            <RadioButton value="collection" label="Collection" />
                            <RadioButton value="wishlist" label="Wishlist" />
                        </RadioGroup>
                    </Cell>
                    <Cell label="label + hint">
                        <RadioGroup size="md" aria-label="Where it goes, described" defaultValue="collection">
                            <RadioButton value="collection" label="Collection" hint="A card you hold." />
                            <RadioButton value="wishlist" label="Wishlist" hint="A card you want." />
                        </RadioGroup>
                    </Cell>
                </Group>
            </Panel>
        ),
    },
    {
        id: "toggle",
        title: "Toggle",
        from: "components/base/toggle/toggle",
        note: "A switch that acts the moment it is flipped — never a switch you have to save. Changed from the kit: the knob goes black in dark mode, where the selected track is white.",
        render: (
            <Panel>
                <Group title="States" cols="tight">
                    <Cell label="off">
                        <Toggle aria-label="Off" />
                    </Cell>
                    <Cell label="isSelected">
                        <Toggle aria-label="On" defaultSelected />
                    </Cell>
                    <Cell label="isDisabled">
                        <Toggle aria-label="Disabled" isDisabled />
                    </Cell>
                    <Cell label="isDisabled + isSelected">
                        <Toggle aria-label="Disabled and on" isDisabled defaultSelected />
                    </Cell>
                </Group>
                <Group title="Sizes and shape" cols="tight">
                    <Cell label='size="sm"'>
                        <Toggle size="sm" aria-label="Small" defaultSelected />
                    </Cell>
                    <Cell label='size="md"'>
                        <Toggle size="md" aria-label="Medium" defaultSelected />
                    </Cell>
                    <Cell label='slim size="sm"'>
                        <Toggle slim size="sm" aria-label="Slim, small" defaultSelected />
                    </Cell>
                    <Cell label='slim size="md"'>
                        <Toggle slim size="md" aria-label="Slim, medium" defaultSelected />
                    </Cell>
                </Group>
                <Group title="Text" cols="wide">
                    <Cell label="label">
                        <Toggle size="md" label="Show prices" defaultSelected />
                    </Cell>
                    <Cell label="label + hint" span={2}>
                        <Toggle size="md" label="Public profile" hint="Anyone with the link can see the cards you own." />
                    </Cell>
                </Group>
            </Panel>
        ),
    },
    {
        id: "select",
        title: "Select",
        from: "components/base/select/select",
        note: "The kit's own listbox: it can carry an icon, an avatar and a second line per row, which the browser's select cannot. Click one open — the popover is the component, not a screenshot of it.",
        render: (
            <Panel>
                <Group title="Sizes" cols="wide">
                    <Cell label='size="sm"'>
                        <Select size="sm" label="Condition" defaultSelectedKey="nm">
                            <Select.Item id="nm" label="Near Mint" />
                            <Select.Item id="lp" label="Lightly Played" />
                            <Select.Item id="mp" label="Moderately Played" />
                        </Select>
                    </Cell>
                    <Cell label='size="md"'>
                        <Select size="md" label="Condition" defaultSelectedKey="nm">
                            <Select.Item id="nm" label="Near Mint" />
                            <Select.Item id="lp" label="Lightly Played" />
                            <Select.Item id="mp" label="Moderately Played" />
                        </Select>
                    </Cell>
                    <Cell label='size="lg"'>
                        <Select size="lg" label="Condition" defaultSelectedKey="nm">
                            <Select.Item id="nm" label="Near Mint" />
                            <Select.Item id="lp" label="Lightly Played" />
                            <Select.Item id="mp" label="Moderately Played" />
                        </Select>
                    </Cell>
                </Group>
                <Group title="Contents and states" cols="wide">
                    <Cell label="placeholder + hint">
                        <Select label="Binder" placeholder="Pick a binder" hint="Cards you file by hand.">
                            <Select.Item id="kanto" label="Kanto" />
                            <Select.Item id="johto" label="Johto" />
                        </Select>
                    </Cell>
                    <Cell label="icon + supportingText">
                        <Select label="Finish" defaultSelectedKey="holo">
                            <Select.Item id="holo" label="Holofoil" supportingText="Shiny picture" icon={Star01} />
                            <Select.Item id="reverse" label="Reverse holo" supportingText="Shiny card" icon={Star01} />
                            <Select.Item id="normal" label="Normal" supportingText="No foil" icon={Tag01} />
                        </Select>
                    </Cell>
                    <Cell label="isDisabled item + tooltip">
                        <Select label="Grade" tooltip="Only a graded copy can carry one." placeholder="Pick a grade">
                            <Select.Item id="psa10" label="PSA 10" />
                            <Select.Item id="psa9" label="PSA 9" />
                            <Select.Item id="bgs10" label="BGS 10" isDisabled />
                        </Select>
                    </Cell>
                    <Cell label="isDisabled">
                        <Select label="Condition" defaultSelectedKey="nm" isDisabled>
                            <Select.Item id="nm" label="Near Mint" />
                        </Select>
                    </Cell>
                    <Cell label="isRequired">
                        <Select label="Language" placeholder="Pick a language" isRequired>
                            <Select.Item id="en" label="English" />
                            <Select.Item id="ja" label="Japanese" />
                        </Select>
                    </Cell>
                    <Cell label="isInvalid + hint">
                        <Select label="Language" placeholder="Pick a language" isInvalid hint="Pick the language the card is printed in.">
                            <Select.Item id="en" label="English" />
                            <Select.Item id="ja" label="Japanese" />
                        </Select>
                    </Cell>
                </Group>
                <Group title="Select.ComboBox" hint="the same listbox with a field over it, so a long list can be typed at" cols="wide">
                    <Cell label="items + shortcut">
                        <Select.ComboBox label="Set" placeholder="Find a set" items={sets}>
                            {(item) => <Select.Item {...item} />}
                        </Select.ComboBox>
                    </Cell>
                    <Cell label="shortcut={false} + hint">
                        <Select.ComboBox label="Set" placeholder="Find a set" shortcut={false} hint="Type three letters of the name." items={sets}>
                            {(item) => <Select.Item {...item} />}
                        </Select.ComboBox>
                    </Cell>
                    <Cell label="isDisabled">
                        <Select.ComboBox label="Set" placeholder="Find a set" shortcut={false} isDisabled items={sets}>
                            {(item) => <Select.Item {...item} />}
                        </Select.ComboBox>
                    </Cell>
                </Group>
            </Panel>
        ),
    },
    {
        id: "native-select",
        title: "NativeSelect",
        from: "components/base/select/select-native",
        note: "The browser's own select, dressed like the kit's. It is what the app reaches for inside a form on a phone, where the native wheel beats any listbox. Changed from the kit: room on the right for the chevron, which the sm and md sizes did not have.",
        render: (
            <Panel>
                <Group title="Sizes" cols="wide">
                    <Cell label='size="sm"'>
                        <NativeSelect size="sm" label="Condition" options={conditions} />
                    </Cell>
                    <Cell label='size="md"'>
                        <NativeSelect size="md" label="Condition" options={conditions} />
                    </Cell>
                    <Cell label='size="lg"'>
                        <NativeSelect size="lg" label="Condition" options={conditions} />
                    </Cell>
                </Group>
                <Group title="States" cols="wide">
                    <Cell label="hint">
                        <NativeSelect label="Condition" hint="Near Mint unless you say otherwise." options={conditions} />
                    </Cell>
                    <Cell label="disabled">
                        <NativeSelect label="Condition" options={conditions} disabled />
                    </Cell>
                    <Cell label="defaultValue">
                        <NativeSelect label="Condition" options={conditions} defaultValue="lp" />
                    </Cell>
                </Group>
            </Panel>
        ),
    },
    {
        id: "file-upload",
        title: "FileUploadDropZone",
        from: "components/application/file-upload/file-upload-base",
        note: "Drag a file onto it, or click to open the picker. The app uses it once, for the CSV import.",
        render: (
            <Panel>
                <Group title="States" cols="wide">
                    <Cell label="default" span={2}>
                        <FileUploadDropZone className="w-full" accept=".csv,text/csv" allowsMultiple={false} />
                    </Cell>
                    <Cell label="hint" span={2}>
                        <FileUploadDropZone
                            className="w-full"
                            accept=".csv,text/csv"
                            allowsMultiple={false}
                            hint="CSV, up to 2 MB. Commas or semicolons — all fine."
                        />
                    </Cell>
                    <Cell label="isDisabled" span={2}>
                        <FileUploadDropZone className="w-full" isDisabled hint="Not while an import is running." />
                    </Cell>
                </Group>
            </Panel>
        ),
    },
];
