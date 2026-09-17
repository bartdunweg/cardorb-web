"use client";

import { AppErrorState } from "@/components/app/app-error-state";

// The boundary under the root layout: what shows when something above every closer boundary
// throws: a public page's read, or a failure in the app frame itself; its profile and folder
// reads fail soft since 2026-09-05, so they no longer land here. No sidebar exists at this
// level, so the page is the state alone, centred in the viewport.
export default function RootError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
    return (
        <div className="flex min-h-dvh flex-col bg-primary px-4 py-6">
            <AppErrorState retry={retry} home={{ href: "/", label: "Go to Home" }} />
        </div>
    );
}
