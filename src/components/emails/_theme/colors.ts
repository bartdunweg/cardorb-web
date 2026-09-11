import twColors from "tailwindcss/colors";

/** Converts oklch(...) to hex. Handles the format used by Tailwind v4. */
const toHex = (color: string): string => {
    if (color.startsWith("#")) return color;

    // Tailwind writes an achromatic hue as `none` (oklch(98.5% 0 none)); it is 0 for the maths.
    const m = color.replace(/\bnone\b/, "0").match(/oklch\(([\d.]+)%?\s+([\d.]+)\s+([\d.]+)\)/);
    if (!m) return color;

    const [, lightness, C, H] = m.map(Number);
    const L = lightness > 1 ? lightness / 100 : lightness; // normalize percentage

    // OKLab from OKLCH
    const a = C * Math.cos((H * Math.PI) / 180);
    const b = C * Math.sin((H * Math.PI) / 180);

    // OKLab to linear sRGB
    const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
    const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
    const s_ = L - 0.0894841775 * a - 1.291485548 * b;

    const l3 = l_ * l_ * l_;
    const m3 = m_ * m_ * m_;
    const s3 = s_ * s_ * s_;

    let r = 4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
    let g = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
    let bl = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3;

    // Linear to sRGB gamma
    const gamma = (x: number) => (x >= 0.0031308 ? 1.055 * Math.pow(x, 1 / 2.4) - 0.055 : 12.92 * x);
    r = Math.round(Math.max(0, Math.min(1, gamma(r))) * 255);
    g = Math.round(Math.max(0, Math.min(1, gamma(g))) * 255);
    bl = Math.round(Math.max(0, Math.min(1, gamma(bl))) * 255);

    return `#${[r, g, bl].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
};

/** Converts a Tailwind color scale to hex values */
const hexScale = (scale: Record<string, string>): Record<string, string> => Object.fromEntries(Object.entries(scale).map(([k, v]) => [k, toHex(v)]));

/** Generates flat utility color entries like { "utility-blue-50": "#eff6ff", ... } */
const utilityScale = (name: string, scale: Record<string, string>) => {
    const entries: Record<string, string> = {};
    for (const [step, value] of Object.entries(scale)) {
        if (["50", "100", "200", "300", "400", "500", "600", "700", "800", "900", "950"].includes(step)) {
            entries[`utility-${name}-${step}`] = toHex(value);
        }
    }
    return entries;
};

// Pre-convert Tailwind scales from oklch to hex
const neutral = hexScale(twColors.neutral);
const red = hexScale(twColors.red);
const green = hexScale(twColors.green);
const blue = hexScale(twColors.blue);
const yellow = hexScale(twColors.yellow);
const orange = hexScale(twColors.orange);
const indigo = hexScale(twColors.indigo);
const purple = hexScale(twColors.purple);
const pink = hexScale(twColors.pink);

export const primitiveColors: Record<string, string> = {
    "alpha-black": "#000000",
    "alpha-white": "#ffffff",
    black: "#000000",
    "brand-50": neutral[50],
    "brand-100": neutral[100],
    "brand-200": neutral[200],
    "brand-300": neutral[300],
    "brand-400": neutral[400],
    "brand-500": neutral[500],
    "brand-600": neutral[600],
    "brand-700": neutral[700],
    "brand-800": neutral[800],
    "brand-900": neutral[900],
    "brand-950": neutral[950],
    transparent: "#000000",
    white: "#ffffff",
};

export const lightModeColors: Record<string, string> = {
    "bg-active": neutral[50],
    "bg-brand-primary": primitiveColors["brand-50"],
    "bg-brand-primary_alt": primitiveColors["brand-50"],
    "bg-brand-secondary": primitiveColors["brand-100"],
    "bg-brand-section": primitiveColors["brand-800"],
    "bg-brand-section_subtle": primitiveColors["brand-700"],
    "bg-brand-solid": primitiveColors["brand-950"],
    "bg-brand-solid_hover": primitiveColors["brand-700"],
    "bg-error-primary": red[50],
    "bg-error-secondary": red[100],
    "bg-error-solid": red[600],
    "bg-error-solid_hover": red[700],
    "bg-overlay": neutral[950],
    "bg-primary": "#ffffff",
    "bg-primary_alt": "#ffffff",
    "bg-primary_hover": neutral[50],
    "bg-primary-solid": neutral[950],
    "bg-quaternary": neutral[200],
    "bg-secondary": neutral[50],
    "bg-secondary_alt": neutral[50],
    "bg-secondary_hover": neutral[100],
    "bg-secondary-solid": neutral[600],
    "bg-success-primary": green[50],
    "bg-success-secondary": green[100],
    "bg-success-solid": green[600],
    "bg-tertiary": neutral[100],
    "bg-warning-primary": yellow[50],
    "bg-warning-secondary": yellow[100],
    "bg-warning-solid": yellow[600],
    "border-brand": primitiveColors["brand-500"],
    "border-brand_alt": primitiveColors["brand-600"],
    "border-error": red[500],
    "border-error_subtle": red[300],
    "border-primary": neutral[300],
    "border-secondary": neutral[200],
    "border-secondary_alt": "#000000",
    "border-tertiary": neutral[100],
    "featured-icon-light-fg-brand": primitiveColors["brand-600"],
    "featured-icon-light-fg-error": red[600],
    "featured-icon-light-fg-gray": neutral[500],
    "featured-icon-light-fg-success": green[600],
    "featured-icon-light-fg-warning": yellow[600],
    "fg-brand-primary": primitiveColors["brand-600"],
    "fg-brand-primary_alt": primitiveColors["brand-600"],
    "fg-brand-secondary": primitiveColors["brand-500"],
    "fg-brand-secondary_alt": primitiveColors["brand-500"],
    "fg-brand-secondary_hover": primitiveColors["brand-600"],
    "fg-error-primary": red[600],
    "fg-error-secondary": red[500],
    "fg-primary": neutral[900],
    "fg-quaternary": neutral[400],
    "fg-quaternary_hover": neutral[500],
    "fg-secondary": neutral[700],
    "fg-secondary_hover": neutral[800],
    "fg-success-primary": green[600],
    "fg-success-secondary": green[500],
    "fg-tertiary": neutral[600],
    "fg-tertiary_hover": neutral[700],
    "fg-warning-primary": yellow[600],
    "fg-warning-secondary": yellow[500],
    "fg-white": "#ffffff",
    "focus-ring": primitiveColors["brand-500"],
    "focus-ring-error": red[500],
    "footer-button-fg": primitiveColors["brand-200"],
    "footer-button-fg_hover": "#ffffff",
    "icon-fg-brand": primitiveColors["brand-600"],
    "icon-fg-brand_on-brand": primitiveColors["brand-200"],
    "screen-mockup-border": neutral[900],
    "slider-handle-bg": "#ffffff",
    "slider-handle-border": primitiveColors["brand-600"],
    "text-brand-primary": primitiveColors["brand-900"],
    "text-brand-secondary": primitiveColors["brand-700"],
    "text-brand-secondary_hover": primitiveColors["brand-800"],
    "text-brand-tertiary": primitiveColors["brand-600"],
    "text-brand-tertiary_alt": primitiveColors["brand-600"],
    "text-editor-icon-fg": neutral[400],
    "text-editor-icon-fg_active": neutral[500],
    "text-error-primary": red[600],
    "text-error-primary_hover": red[700],
    "text-placeholder": neutral[500],
    "text-primary": neutral[900],
    "text-primary_on-brand": "#ffffff",
    "text-quaternary": neutral[500],
    "text-quaternary_on-brand": primitiveColors["brand-300"],
    "text-secondary": neutral[700],
    "text-secondary_hover": neutral[800],
    "text-secondary_on-brand": primitiveColors["brand-200"],
    "text-success-primary": green[600],
    "text-tertiary": neutral[600],
    "text-tertiary_hover": neutral[700],
    "text-tertiary_on-brand": primitiveColors["brand-200"],
    "text-warning-primary": yellow[600],
    "text-white": "#ffffff",
    "toggle-border": neutral[300],
    "toggle-slim-border_pressed": primitiveColors["brand-600"],
    "toggle-slim-border_pressed-hover": primitiveColors["brand-700"],
    "tooltip-supporting-text": neutral[300],

    // Utility colors — light mode maps directly to the Tailwind scale
    ...utilityScale("neutral", neutral),
    ...utilityScale("blue", blue),
    ...utilityScale("green", green),
    ...utilityScale("red", red),
    ...utilityScale("yellow", yellow),
    ...utilityScale("orange", orange),
    ...utilityScale("indigo", indigo),
    ...utilityScale("purple", purple),
    ...utilityScale("pink", pink),

    // Utility brand uses our custom brand primitives
    "utility-brand-50": primitiveColors["brand-50"],
    "utility-brand-100": primitiveColors["brand-100"],
    "utility-brand-200": primitiveColors["brand-200"],
    "utility-brand-300": primitiveColors["brand-300"],
    "utility-brand-400": primitiveColors["brand-400"],
    "utility-brand-500": primitiveColors["brand-500"],
    "utility-brand-600": primitiveColors["brand-600"],
    "utility-brand-700": primitiveColors["brand-700"],
    "utility-brand-800": primitiveColors["brand-800"],
    "utility-brand-900": primitiveColors["brand-900"],
    "utility-brand-50_alt": primitiveColors["brand-50"],
    "utility-brand-100_alt": primitiveColors["brand-100"],
    "utility-brand-200_alt": primitiveColors["brand-200"],
    "utility-brand-300_alt": primitiveColors["brand-300"],
    "utility-brand-400_alt": primitiveColors["brand-400"],
    "utility-brand-500_alt": primitiveColors["brand-500"],
    "utility-brand-600_alt": primitiveColors["brand-600"],
    "utility-brand-700_alt": primitiveColors["brand-700"],
    "utility-brand-800_alt": primitiveColors["brand-800"],
    "utility-brand-900_alt": primitiveColors["brand-900"],
};

/** Dark mode inverts utility scales and overrides semantic tokens */
export const darkModeColors: Record<string, string> = {
    ...lightModeColors,

    "bg-active": neutral[800],
    "bg-brand-primary_alt": neutral[900],
    "bg-brand-section": neutral[900],
    "bg-brand-section_subtle": neutral[950],
    "bg-error-primary": red[950],
    "bg-error-secondary": red[600],
    "bg-error-solid_hover": red[500],
    "bg-overlay": neutral[800],
    "bg-primary": neutral[950],
    "bg-primary_alt": neutral[900],
    "bg-primary_hover": neutral[800],
    "bg-primary-solid": neutral[900],
    "bg-quaternary": neutral[700],
    "bg-secondary": neutral[900],
    "bg-secondary_alt": neutral[950],
    "bg-secondary_hover": neutral[800],
    "bg-success-primary": green[950],
    "bg-success-secondary": green[600],
    "bg-tertiary": neutral[800],
    "bg-warning-primary": yellow[950],
    "bg-warning-secondary": yellow[600],
    "border-brand_alt": neutral[700],
    "border-error": red[400],
    "border-error_subtle": red[500],
    "border-primary": neutral[700],
    "border-secondary": neutral[800],
    "border-secondary_alt": neutral[800],
    "border-tertiary": neutral[800],
    "featured-icon-light-fg-error": red[200],
    "featured-icon-light-fg-gray": neutral[200],
    "featured-icon-light-fg-success": green[200],
    "featured-icon-light-fg-warning": yellow[200],
    "fg-brand-primary_alt": neutral[300],
    "fg-brand-secondary_alt": neutral[600],
    "fg-brand-secondary_hover": neutral[500],
    "fg-error-primary": red[500],
    "fg-error-secondary": red[400],
    "fg-primary": "#ffffff",
    "fg-quaternary": neutral[600],
    "fg-quaternary_hover": neutral[500],
    "fg-secondary": neutral[300],
    "fg-secondary_hover": neutral[200],
    "fg-success-primary": green[500],
    "fg-success-secondary": green[400],
    "fg-tertiary": neutral[400],
    "fg-tertiary_hover": neutral[300],
    "fg-warning-primary": yellow[500],
    "fg-warning-secondary": yellow[400],
    "footer-button-fg": neutral[300],
    "footer-button-fg_hover": neutral[100],
    "icon-fg-brand": neutral[400],
    "icon-fg-brand_on-brand": neutral[400],
    "screen-mockup-border": neutral[700],
    "slider-handle-border": neutral[950],
    "text-brand-primary": neutral[50],
    "text-brand-secondary": neutral[300],
    "text-brand-secondary_hover": neutral[200],
    "text-brand-tertiary": neutral[400],
    "text-brand-tertiary_alt": neutral[50],
    "text-editor-icon-fg_active": "#ffffff",
    "text-error-primary": red[400],
    "text-error-primary_hover": red[300],
    "text-primary": neutral[50],
    "text-primary_on-brand": neutral[50],
    "text-quaternary": neutral[400],
    "text-quaternary_on-brand": neutral[400],
    "text-secondary": neutral[300],
    "text-secondary_hover": neutral[200],
    "text-secondary_on-brand": neutral[300],
    "text-success-primary": green[400],
    "text-tertiary": neutral[400],
    "text-tertiary_hover": neutral[300],
    "text-tertiary_on-brand": neutral[400],
    "text-warning-primary": yellow[400],
    "tooltip-supporting-text": neutral[300],

    // Utility colors — dark mode inverts the scales
    ...utilityScale("neutral", {
        "50": neutral[900],
        "100": neutral[800],
        "200": neutral[700],
        "300": neutral[700],
        "400": neutral[600],
        "500": neutral[500],
        "600": neutral[400],
        "700": neutral[300],
        "800": neutral[200],
        "900": neutral[100],
    }),
    ...utilityScale("blue", {
        "50": blue[950],
        "100": blue[900],
        "200": blue[800],
        "300": blue[700],
        "400": blue[600],
        "500": blue[500],
        "600": blue[400],
        "700": blue[300],
    }),
    ...utilityScale("green", {
        "50": green[950],
        "100": green[900],
        "200": green[800],
        "300": green[700],
        "400": green[600],
        "500": green[500],
        "600": green[400],
        "700": green[300],
    }),
    ...utilityScale("red", {
        "50": red[950],
        "100": red[900],
        "200": red[800],
        "300": red[700],
        "400": red[600],
        "500": red[500],
        "600": red[400],
        "700": red[300],
    }),
    ...utilityScale("yellow", {
        "50": yellow[950],
        "100": yellow[900],
        "200": yellow[800],
        "300": yellow[700],
        "400": yellow[600],
        "500": yellow[500],
        "600": yellow[400],
        "700": yellow[300],
    }),
    ...utilityScale("orange", {
        "50": orange[950],
        "100": orange[900],
        "200": orange[800],
        "300": orange[700],
        "400": orange[600],
        "500": orange[500],
        "600": orange[400],
        "700": orange[300],
    }),
    ...utilityScale("indigo", {
        "50": indigo[950],
        "100": indigo[900],
        "200": indigo[800],
        "300": indigo[700],
        "400": indigo[600],
        "500": indigo[500],
        "600": indigo[400],
        "700": indigo[300],
    }),
    ...utilityScale("purple", {
        "50": purple[950],
        "100": purple[900],
        "200": purple[800],
        "300": purple[700],
        "400": purple[600],
        "500": purple[500],
        "600": purple[400],
        "700": purple[300],
    }),
    ...utilityScale("pink", {
        "50": pink[950],
        "100": pink[900],
        "200": pink[800],
        "300": pink[700],
        "400": pink[600],
        "500": pink[500],
        "600": pink[400],
        "700": pink[300],
    }),

    // Utility brand alt uses neutral scale in dark mode
    "utility-brand-50_alt": neutral[900],
    "utility-brand-100_alt": neutral[800],
    "utility-brand-200_alt": neutral[700],
    "utility-brand-300_alt": neutral[700],
    "utility-brand-400_alt": neutral[600],
    "utility-brand-500_alt": neutral[500],
    "utility-brand-600_alt": neutral[400],
    "utility-brand-700_alt": neutral[300],
    "utility-brand-800_alt": neutral[200],
    "utility-brand-900_alt": neutral[100],
};
