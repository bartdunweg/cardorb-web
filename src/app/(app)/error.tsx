"use client";

import { AppErrorState } from "@/components/app/app-error-state";

// A dashboard page that threw, shown inside the app layout: the sidebar and tab bar stay, so
// the person can go elsewhere, and Try again repeats this page's reads. The layout's own reads
// (profile, folders) are above this boundary; when those throw, src/app/error.tsx catches it.
export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
    return <AppErrorState reset={reset} home={{ href: "/dashboard", label: "Go to Home" }} />;
}
