"use client";

import type { PropsWithChildren } from "react";
import { useRouter } from "next/navigation";
import { RouterProvider } from "react-aria-components";
import { useStartRoute } from "@/components/app/route-pending";
import { withListQuery } from "@/hooks/use-list-memory";

declare module "react-aria-components" {
    interface RouterConfig {
        routerOptions: NonNullable<Parameters<ReturnType<typeof useRouter>["push"]>[1]>;
    }
}

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
            {children}
        </RouterProvider>
    );
};
