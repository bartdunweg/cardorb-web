"use client";

import type { PropsWithChildren } from "react";
import { useRouter } from "next/navigation";
import { I18nProvider, RouterProvider } from "react-aria-components";
import { useStartRoute } from "@/components/app/route-pending";
import { withListQuery } from "@/hooks/use-list-memory";

declare module "react-aria-components" {
    interface RouterConfig {
        routerOptions: NonNullable<Parameters<ReturnType<typeof useRouter>["push"]>[1]>;
    }
}

/**
 * The locale every react-aria date and number is written in: the app's own English, the form
 * formatDate (src/lib/format.ts) writes, "Jul 9, 2026", with weeks starting on Monday. Without it
 * react-aria takes the browser's language, so a Dutch phone read "9 jul 2026" and "ma di wo" in an
 * English interface, an English one in Britain "9 Jul 2026" beside "Sep 16, 2026" on the next
 * screen, and the server, which has no browser, wrote its own.
 */
export const LOCALE = "en-US-u-fw-mon";

export const RouteProvider = ({ children }: PropsWithChildren) => {
    const router = useRouter();
    // Every react-aria link in the app follows this one road, so saying where we are going here
    // says it for the sidebar, a card tile and a Back link alike (see route-pending.tsx).
    const start = useStartRoute();

    return (
        <RouterProvider
            navigate={(to, options) => {
                // A link to a list alone goes back to the list as it was left (use-list-memory.ts).
                const href = withListQuery(to);
                start(href);
                router.push(href, options);
            }}
        >
            <I18nProvider locale={LOCALE}>{children}</I18nProvider>
        </RouterProvider>
    );
};
