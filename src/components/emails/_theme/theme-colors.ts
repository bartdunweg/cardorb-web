import { darkModeColors, lightModeColors, primitiveColors } from "./colors";

export const getThemeColors = (theme: "light" | "dark" = "light") => {
    const colors = theme === "light" ? lightModeColors : darkModeColors;
    return {
        backgroundColor: {
            quaternary: colors["bg-quaternary"],
            "brand-solid": colors["bg-brand-solid"],
            primary: colors["bg-primary"],
            "primary-solid": colors["bg-primary-solid"],
            primary_alt: colors["bg-primary_alt"],
            primary_hover: colors["bg-primary_hover"],
            secondary: {
                DEFAULT: colors["bg-secondary"],
                solid: colors["bg-secondary-solid"],
            },
            secondary_alt: colors["bg-secondary_alt"],
            secondary_hover: colors["bg-secondary_hover"],
            tertiary: colors["bg-tertiary"],
            active: colors["bg-active"],
            overlay: colors["bg-overlay"],
            brand: {
                primary: colors["bg-brand-primary"],
                primary_alt: colors["bg-brand-primary_alt"],
                secondary: colors["bg-brand-secondary"],
                solid: colors["bg-brand-solid"],
                solid_hover: colors["bg-brand-solid_hover"],
                section: colors["bg-brand-section"],
                section_subtle: colors["bg-brand-section_subtle"],
            },
            error: {
                primary: colors["bg-error-primary"],
                secondary: colors["bg-error-secondary"],
                solid: colors["bg-error-solid"],
            },
            warning: {
                primary: colors["bg-warning-primary"],
                secondary: colors["bg-warning-secondary"],
                solid: colors["bg-warning-solid"],
            },
            success: {
                primary: colors["bg-success-primary"],
                secondary: colors["bg-success-secondary"],
                solid: colors["bg-success-solid"],
            },
            "border-brand": colors["border-brand"],
            "border-brand_alt": colors["border-brand_alt"],
        },

        textColor: {
            primary: {
                DEFAULT: colors["text-primary"],
            },
            primary_on: {
                brand: colors["text-primary_on-brand"],
            },
            secondary: colors["text-secondary"],
            secondary_hover: colors["text-secondary_hover"],
            secondary_on: {
                brand: colors["text-secondary_on-brand"],
            },
            tertiary: colors["text-tertiary"],
            tertiary_hover: colors["text-tertiary_hover"],
            tertiary_on: {
                brand: colors["text-tertiary_on-brand"],
            },
            quaternary: colors["text-quaternary"],
            quaternary_on: {
                brand: colors["text-quaternary_on-brand"],
            },
            placeholder: colors["text-placeholder"],
            brand: {
                primary: colors["text-brand-primary"],
                secondary: colors["text-brand-secondary"],
                tertiary: colors["text-brand-tertiary"],
                tertiary_alt: colors["text-brand-tertiary_alt"],
            },
            error: {
                primary: colors["text-error-primary"],
            },
            warning: {
                primary: colors["text-warning-primary"],
            },
            success: {
                primary: colors["text-success-primary"],
            },
            tooltip: {
                "supporting-text": colors["tooltip-supporting-text"],
            },
        },
        borderColor: {
            primary: {
                DEFAULT: colors["border-primary"],
            },
            secondary: colors["border-secondary"],
            tertiary: colors["border-tertiary"],
            brand: {
                DEFAULT: colors["border-brand"],
                solid: colors["bg-brand-solid"],
                solid_hover: colors["bg-brand-solid_hover"],
            },
            error: {
                DEFAULT: colors["border-error"],
            },
            brand_alt: colors["border-brand_alt"],
            error_subtle: colors["border-error_subtle"],
        },
        ringColor: {
            bg: {
                brand: {
                    solid: colors["bg-brand-solid"],
                },
            },
            border: {
                primary: colors["border-primary"],
                secondary: colors["border-secondary"],
                tertiary: colors["border-tertiary"],
                brand: colors["border-brand"],
                error: colors["border-error"],
                brand_alt: colors["border-brand_alt"],
                error_subtle: colors["border-error_subtle"],
            },
        },
        outlineColor: {
            brand: {
                DEFAULT: colors["border-brand"],
            },
            primary: {
                DEFAULT: colors["border-primary"],
            },
            secondary: {
                DEFAULT: colors["border-secondary"],
            },
            error: {
                DEFAULT: colors["border-error"],
            },
        },
        colors: {
            ...primitiveColors,
            bg: {
                primary: colors["bg-primary"],
                "primary-solid": colors["bg-primary-solid"],
                secondary: colors["bg-secondary"],
                tertiary: colors["bg-tertiary"],
                quaternary: colors["bg-quaternary"],
                success: {
                    solid: colors["bg-success-solid"],
                },
            },
            fg: {
                primary: colors["fg-primary"],
                secondary: colors["fg-secondary"],
                secondary_hover: colors["fg-secondary_hover"],
                tertiary: colors["fg-tertiary"],
                tertiary_hover: colors["fg-tertiary_hover"],
                quaternary: colors["fg-quaternary"],
                quaternary_hover: colors["fg-quaternary_hover"],
                white: colors["fg-white"],
                brand: {
                    primary: colors["fg-brand-primary"],
                    primary_alt: colors["fg-brand-primary_alt"],
                    secondary: colors["fg-brand-secondary"],
                },
                error: {
                    primary: colors["fg-error-primary"],
                    secondary: colors["fg-error-secondary"],
                },
                warning: {
                    primary: colors["fg-warning-primary"],
                    secondary: colors["fg-warning-secondary"],
                },
                success: {
                    primary: colors["fg-success-primary"],
                    secondary: colors["fg-success-secondary"],
                },
            },
            focus: {
                ring: {
                    DEFAULT: colors["focus-ring"],
                    error: colors["focus-ring-error"],
                },
            },
            border: {
                secondary: colors["border-secondary"],
            },
            slider: {
                handle: {
                    bg: colors["slider-handle-bg"],
                    border: colors["slider-handle-border"],
                },
            },
            utility: {
                neutral: {
                    50: colors["utility-neutral-50"],
                    100: colors["utility-neutral-100"],
                    200: colors["utility-neutral-200"],
                    300: colors["utility-neutral-300"],
                    400: colors["utility-neutral-400"],
                    500: colors["utility-neutral-500"],
                    600: colors["utility-neutral-600"],
                    700: colors["utility-neutral-700"],
                    800: colors["utility-neutral-800"],
                    900: colors["utility-neutral-900"],
                },
                brand: {
                    50: colors["utility-brand-50"],
                    100: colors["utility-brand-100"],
                    200: colors["utility-brand-200"],
                    300: colors["utility-brand-300"],
                    400: colors["utility-brand-400"],
                    500: colors["utility-brand-500"],
                    600: colors["utility-brand-600"],
                    700: colors["utility-brand-700"],
                    800: colors["utility-brand-800"],
                    900: colors["utility-brand-900"],
                    "50_alt": colors["utility-brand-50_alt"],
                    "100_alt": colors["utility-brand-100_alt"],
                    "200_alt": colors["utility-brand-200_alt"],
                    "300_alt": colors["utility-brand-300_alt"],
                    "400_alt": colors["utility-brand-400_alt"],
                    "500_alt": colors["utility-brand-500_alt"],
                    "600_alt": colors["utility-brand-600_alt"],
                    "700_alt": colors["utility-brand-700_alt"],
                    "800_alt": colors["utility-brand-800_alt"],
                    "900_alt": colors["utility-brand-900_alt"],
                },
                blue: {
                    50: colors["utility-blue-50"],
                    100: colors["utility-blue-100"],
                    200: colors["utility-blue-200"],
                    300: colors["utility-blue-300"],
                    400: colors["utility-blue-400"],
                    500: colors["utility-blue-500"],
                    600: colors["utility-blue-600"],
                    700: colors["utility-blue-700"],
                },
                green: {
                    50: colors["utility-green-50"],
                    100: colors["utility-green-100"],
                    200: colors["utility-green-200"],
                    300: colors["utility-green-300"],
                    400: colors["utility-green-400"],
                    500: colors["utility-green-500"],
                    600: colors["utility-green-600"],
                    700: colors["utility-green-700"],
                },
                yellow: {
                    50: colors["utility-yellow-50"],
                    100: colors["utility-yellow-100"],
                    200: colors["utility-yellow-200"],
                    300: colors["utility-yellow-300"],
                    400: colors["utility-yellow-400"],
                    500: colors["utility-yellow-500"],
                    600: colors["utility-yellow-600"],
                    700: colors["utility-yellow-700"],
                },
                indigo: {
                    50: colors["utility-indigo-50"],
                    100: colors["utility-indigo-100"],
                    200: colors["utility-indigo-200"],
                    300: colors["utility-indigo-300"],
                    400: colors["utility-indigo-400"],
                    500: colors["utility-indigo-500"],
                    600: colors["utility-indigo-600"],
                    700: colors["utility-indigo-700"],
                },
                purple: {
                    50: colors["utility-purple-50"],
                    100: colors["utility-purple-100"],
                    200: colors["utility-purple-200"],
                    300: colors["utility-purple-300"],
                    400: colors["utility-purple-400"],
                    500: colors["utility-purple-500"],
                    600: colors["utility-purple-600"],
                    700: colors["utility-purple-700"],
                },
                pink: {
                    50: colors["utility-pink-50"],
                    100: colors["utility-pink-100"],
                    200: colors["utility-pink-200"],
                    300: colors["utility-pink-300"],
                    400: colors["utility-pink-400"],
                    500: colors["utility-pink-500"],
                    600: colors["utility-pink-600"],
                    700: colors["utility-pink-700"],
                },
                orange: {
                    50: colors["utility-orange-50"],
                    100: colors["utility-orange-100"],
                    200: colors["utility-orange-200"],
                    300: colors["utility-orange-300"],
                    400: colors["utility-orange-400"],
                    500: colors["utility-orange-500"],
                    600: colors["utility-orange-600"],
                    700: colors["utility-orange-700"],
                },
            },
            footer: {
                button: {
                    fg: colors["footer-button-fg"],
                    fg_hover: colors["footer-button-fg_hover"],
                },
            },
            icon: {
                fg: {
                    brand: colors["icon-fg-brand"],
                    brand_on: {
                        brand: colors["icon-fg-brand_on-brand"],
                    },
                },
            },
            "featured-icon": {
                light: {
                    fg: {
                        brand: colors["featured-icon-light-fg-brand"],
                        gray: colors["featured-icon-light-fg-gray"],
                        error: colors["featured-icon-light-fg-error"],
                        warning: colors["featured-icon-light-fg-warning"],
                        success: colors["featured-icon-light-fg-success"],
                    },
                },
            },
            "screen-mockup": {
                border: colors["screen-mockup-border"],
            },
            "slider-handle": {
                bg: colors["slider-handle-bg"],
                border: colors["slider-handle-border"],
            },
        },
    };
};
