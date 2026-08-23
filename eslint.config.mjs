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
];

export default eslintConfig;
