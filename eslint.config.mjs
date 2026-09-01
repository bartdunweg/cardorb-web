import strakzatUi from "@strakzat/eslint-config-ui";
import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

// eslint-config-next 16 ships native flat configs — import them directly, no FlatCompat.
const eslintConfig = [
    {
        // Lint our own code only. The vendored Untitled UI kit is ours to edit but not to
        // lint-police — keeping it out keeps the dev loop fast and the signal about our code.
        // Our own components live in src/components/app and stay linted.
        ignores: [
            ".next/**",
            "node_modules/**",
            "src/components/base/**",
            "src/components/application/**",
            "src/components/marketing/**",
            "src/components/foundations/**",
            "src/components/shared-assets/**",
            "src/hooks/**",
            "src/utils/**",
            "src/providers/**",
        ],
    },
    ...coreWebVitals,
    ...typescript,
    // Strakzat design-token + jsx-a11y (WCAG 2.2 AA) rules, as errors. Hosted variant: Next's
    // config already registers jsx-a11y, and flat config refuses two plugins under one name.
    ...strakzatUi.configs.strictHosted,
];

export default eslintConfig;
