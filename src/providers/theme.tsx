"use client";

import { ThemeProvider } from "next-themes";

/** `nonce` signs next-themes' inline script on a page whose CSP names one; the public pages pass none. */
export function Theme({ children, nonce }: { children: React.ReactNode; nonce?: string }) {
    return (
        <ThemeProvider attribute="class" value={{ light: "light-mode", dark: "dark-mode" }} enableSystem nonce={nonce}>
            {children}
        </ThemeProvider>
    );
}
