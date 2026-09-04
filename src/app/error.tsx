"use client";

import { AppErrorState } from "@/components/app/app-error-state";

// The boundary under the root layout: what shows when a layout's own reads throw — the app
// layout asking the API for the profile and the folders, most often — and nothing closer caught
// it. No sidebar exists at this level, so the page is the state alone, centred in the viewport.
export default function RootError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
    return (
        <div className="flex min-h-dvh flex-col bg-primary px-4 py-6">
            <AppErrorState reset={reset} home={{ href: "/", label: "Go to Home" }} />
        </div>
    );
}
